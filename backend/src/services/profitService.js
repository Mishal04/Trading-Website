const Investment = require('../models/Investment');
const InvestorInvestment = require('../models/InvestorInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const CronLock = require('../models/CronLock');
const profitBasedCommissionService = require('./profitBasedCommissionService');
const { getInvestmentPhase, getDailyRateForPhase, getMonthlyRatePhase3 } = require('../../config/investorConstants');

/**
 * distributeInvestorShare
 *
 * Takes the 60% investor pool amount from a profit injection and distributes
 * it pro-rata to every user who has at least one active investment, weighted
 * by their total active capital vs the system-wide total active capital.
 *
 * Formula per user:
 *   userShare = (userActiveCapital / totalActiveCapital) * investorShareAmount
 *
 * @param {number} investorShareAmount  – the 60% slice of the injected gross profit
 * @param {string} adminUserId          – ID of the admin who triggered the injection (for audit)
 * @param {string} note                 – optional label carried into Transaction descriptions
 * @returns {{ distributed: number, userCount: number, skipped: number, details: Array }}
 */
const distributeInvestorShare = async (investorShareAmount, adminUserId, note = '') => {
  console.log(`--- Starting Investor Share Distribution: $${investorShareAmount} ---`);

  if (!investorShareAmount || investorShareAmount <= 0) {
    console.log('Investor share amount is 0 or negative — skipping distribution.');
    return { distributed: 0, userCount: 0, skipped: 0, details: [] };
  }

  // ── 1. Aggregate active capital per user ─────────────────────────────────
  // Group all active investments by userId and sum their amounts.
  // We do this in one aggregation to avoid N+1 queries.
  const activeCapitalByUser = await Investment.aggregate([
    { $match: { status: 'active', isActive: true } },
    {
      $group: {
        _id:           '$userId',
        activeCapital: { $sum: '$amount' }
      }
    }
  ]);

  if (activeCapitalByUser.length === 0) {
    console.log('No active investments found — investor share not distributed.');
    return { distributed: 0, userCount: 0, skipped: 0, details: [] };
  }

  // ── 2. Compute total active capital across all users ──────────────────────
  const totalActiveCapital = activeCapitalByUser.reduce(
    (sum, row) => sum + row.activeCapital, 0
  );

  if (totalActiveCapital <= 0) {
    console.log('Total active capital is 0 — investor share not distributed.');
    return { distributed: 0, userCount: 0, skipped: 0, details: [] };
  }

  console.log(`  Active investors: ${activeCapitalByUser.length}, Total capital: $${totalActiveCapital}`);

  // ── 3. Distribute proportionally ─────────────────────────────────────────
  let totalDistributed = 0;
  let userCount        = 0;
  let skipped          = 0;
  const details        = [];

  for (const row of activeCapitalByUser) {
    const userId       = row._id;
    const userCapital  = row.activeCapital;

    // Calculate this user's proportional share (4 decimal places)
    const userShare = Number(
      ((userCapital / totalActiveCapital) * investorShareAmount).toFixed(4)
    );

    if (userShare <= 0) {
      skipped++;
      continue;
    }

    // Verify the user account is still active before crediting
    const user = await User.findById(userId).select('name email isActive');
    if (!user || !user.isActive) {
      console.log(`  Skipping inactive/missing user ${userId}`);
      skipped++;
      continue;
    }

    // Credit wallet.profit atomically
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'wallet.profit':   userShare,
        totalProfitEarned: userShare
      }
    });

    // Create audit transaction
    await Transaction.create({
      userId,
      type:        'profit',
      amount:      userShare,
      status:      'completed',
      description: note
        ? `Investor profit share from injection: "${note}" ($${userShare} on $${userCapital} capital)`
        : `Investor profit share — $${userShare} on $${userCapital} active capital`,
      metadata: {
        source:           'profit_injection',
        userActiveCapital: userCapital,
        totalActiveCapital,
        investorShareAmount,
        proportion:        Number((userCapital / totalActiveCapital).toFixed(6))
      }
    });

    // Notify the investor
    await Notification.create({
      userId,
      title:   'Profit Share Credited',
      message: `$${userShare.toFixed(2)} has been credited to your profit wallet from the latest trading profit distribution.`,
      type:    'profit'
    });

    totalDistributed += userShare;
    userCount++;
    details.push({ userId, name: user.name, capital: userCapital, share: userShare });
  }

  console.log(`--- Investor Share Distribution Complete: $${totalDistributed.toFixed(4)} distributed to ${userCount} users (${skipped} skipped) ---`);
  return { distributed: totalDistributed, userCount, skipped, details };
};

/**
 * calculateDailyProfits
 *
 * Cron-driven daily profit run — credits each active investment's daily rate
 * directly to the investor's wallet.roi, then distributes 21-level commissions
 * to all qualifying uplines ONCE per investor (not per investment).
 *
 * TWO-PHASE ALGORITHM:
 * 1. PHASE 1: Process all ROI credits per investment, aggregating by investor
 * 2. PHASE 2: Process commissions ONCE per investor using their total daily ROI
 *
 * This prevents duplicate commission calculations when an investor has multiple investments.
 */
const calculateDailyProfits = async () => {
  console.log('--- Starting Daily Profit Calculation ---');
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // ── 1. Acquire Distributed Lock ───────────────────────────────────────────
  let lock;
  try {
    lock = await CronLock.create({
      jobName: 'dailyProfits',
      dateKey,
      lockedAt: now,
      status: 'running',
      instanceId: `pid_${process.pid}_${Math.random().toString(36).substring(2, 8)}`
    });
  } catch (err) {
    if (err.code === 11000) {
      console.log(`[CronLock] Daily profit cron already running on another instance for ${dateKey}, skipping.`);
      return { processedCount: 0, totalProfitDistributed: 0, skipped: true };
    }
    console.error('[CronLock] Error acquiring distributed lock:', err);
    throw err;
  }

  let processedCount = 0;
  let totalProfitDistributed = 0;
  const investorDailyRoiMap = {}; // Maps investorId → { totalRoi, investor, investments[] }

  try {
    // ── PHASE 1: Process all ROI credits ──────────────────────────────────────
    console.log('\n--- PHASE 1: Processing ROI Credits ---');

    // Fetch all active investor investments not yet processed today
    const investorInvestments = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active',
      lastRoiDate: { $lt: startOfToday }
    }).populate('userId');

    for (const investment of investorInvestments) {
      try {
        const investor = investment.userId;
        if (!investor) continue;

        // SKIP TEST USERS: Do not pay users named Test_Final_* or emails ending @test.com
        if (investor.name && investor.name.startsWith('Test_Final_')) {
          continue;
        }
        if (investor.email && investor.email.endsWith('@test.com')) {
          continue;
        }

        // ── DETECT CURRENT PHASE and calculate correct rate ────────────────
        const phase = getInvestmentPhase(investment.createdAt);
        let dailyRoiAmount = 0;
        let rateUsed = 0;
        let phaseDescription = '';

        if (phase === 1 || phase === 2) {
          // Phase 1 or 2: Use daily rate
          const phaseRate = getDailyRateForPhase(investment.packageNumber, investment.createdAt);
          if (phaseRate && phaseRate > 0) {
            rateUsed = phaseRate;
            dailyRoiAmount = Number(((investment.amount * phaseRate) / 100).toFixed(4));
            phaseDescription = `Phase ${phase} (${phase === 1 ? 'Plan A' : 'Plan B'})`;
          }
        } else if (phase === 3) {
          // Phase 3: Convert monthly rate to daily
          const monthlyRate = getMonthlyRatePhase3();
          const dailyEquivalent = monthlyRate / 30.44; // Average days per month
          rateUsed = dailyEquivalent;
          dailyRoiAmount = Number(((investment.amount * dailyEquivalent) / 100).toFixed(4));
          phaseDescription = `Phase 3 (Monthly: ${(monthlyRate * 100).toFixed(1)}% → ${(dailyEquivalent * 100).toFixed(4)}% daily)`;
        }

        if (dailyRoiAmount <= 0) continue;

        // Check if investment's personal cap already reached
        if (investment.capReached) continue;

        // Atomic guard: update lastRoiDate only if not updated today AND cap not reached
        const updatedInvestment = await InvestorInvestment.findOneAndUpdate(
          {
            _id: investment._id,
            userId: investor._id,
            status: 'active',
            capReached: false,
            lastRoiDate: { $lt: startOfToday }
          },
          {
            $set: { lastRoiDate: now },
            $inc: { totalRoiEarned: dailyRoiAmount }
          },
          { new: true }
        );

        if (!updatedInvestment) {
          // Already processed or cap was reached concurrently
          continue;
        }

        // Check if this credit hit the 3x cap on this specific investment
        let investmentCapReached = false;
        if (updatedInvestment.totalRoiEarned >= updatedInvestment.incomeCap) {
          investmentCapReached = true;
          await InvestorInvestment.findByIdAndUpdate(investment._id, {
            $set: { capReached: true, status: 'completed' }
          });
        }

        // Credit investor's ROI wallet on User model
        await User.findByIdAndUpdate(investor._id, {
          $inc: {
            'wallet.roi': dailyRoiAmount,
            totalRoiEarned: dailyRoiAmount
          }
        });

        // Record ROI transaction
        await Transaction.create({
          userId: investor._id,
          type: 'profit',
          amount: dailyRoiAmount,
          status: 'completed',
          description: `Daily ROI (${(rateUsed * 100).toFixed(4)}%) from ${phaseDescription} investment $${investment.amount}${investmentCapReached ? ' (cap reached)' : ''}`,
          referenceId: investment._id,
          referenceModel: 'InvestorInvestment'
        });

        // Send ROI notification
        await Notification.create({
          userId: investor._id,
          title: 'ROI Credited',
          message: `You earned $${dailyRoiAmount} ROI from your ${phaseDescription} investment!${investmentCapReached ? ' (Income cap reached)' : ''}`,
          type: 'profit'
        });

        // Track this investor's daily ROI aggregate for commission calculation
        const investorId = investor._id.toString();
        if (!investorDailyRoiMap[investorId]) {
          investorDailyRoiMap[investorId] = {
            totalRoi: 0,
            investor: investor,
            investments: []
          };
        }
        investorDailyRoiMap[investorId].totalRoi += dailyRoiAmount;
        investorDailyRoiMap[investorId].investments.push(investment);

        processedCount++;
        totalProfitDistributed += dailyRoiAmount;

      } catch (err) {
        console.error(`Error processing ROI for investor investment ${investment._id}:`, err);
      }
    }

    console.log(`✓ PHASE 1 Complete: ${processedCount} investments processed, $${totalProfitDistributed.toFixed(2)} ROI distributed`);

    // ── PHASE 2: Process commissions ONCE per investor ────────────────────────
    console.log(`\n--- PHASE 2: Processing Commissions (${Object.keys(investorDailyRoiMap).length} investors) ---`);

    for (const investorId in investorDailyRoiMap) {
      try {
        const { totalRoi, investor, investments } = investorDailyRoiMap[investorId];

        // Database guard: check if commissions already processed for this investor today
        const alreadyProcessedComm = await Transaction.findOne({
          userId: investor._id,
          type: 'commission',
          createdAt: { $gte: startOfToday }
        });

        if (alreadyProcessedComm) {
          console.log(`  ⊘ ${investor.name}: already has commission transaction today, skipping`);
          continue;
        }

        // Validate investor has upline
        if (!investor.ancestorPath || investor.ancestorPath.length === 0) {
          continue;
        }

        // Fetch full investor hierarchy for commission calculation
        const investorFull = await User.findById(investor._id).populate('ancestorPath');
        if (!investorFull) {
          continue;
        }

        // Use first processed investment as reference (commissions based on aggregated ROI, not specific investment)
        const refInvestment = investments[0];

        try {
          const commResult = await profitBasedCommissionService.distributeProfitBasedCommissions(
            refInvestment,
            totalRoi,  // Use AGGREGATED daily ROI across all investor's investments
            investorFull
          );

          if (commResult.totalPaid > 0) {
            console.log(
              `  ✓ ${investor.name}: ${commResult.levelsProcessed} levels, ` +
              `$${commResult.totalPaid.toFixed(4)} total (base ROI: $${totalRoi.toFixed(4)}, ` +
              `${investments.length} investment${investments.length > 1 ? 's' : ''})`
            );
          } else {
            console.log(
              `  - ${investor.name}: no commissions (totalRoi: $${totalRoi.toFixed(4)})`
            );
          }

        } catch (comErr) {
          console.error(`  ✗ ${investor.name}: commission error:`, comErr.message);
        }

      } catch (err) {
        console.error(`Error processing investor ${investorId} for commissions:`, err);
      }
    }

    console.log(`✓ PHASE 2 Complete: ${Object.keys(investorDailyRoiMap).length} investors processed for commissions`);

    // Mark lock as successfully completed
    if (lock) {
      await CronLock.findByIdAndUpdate(lock._id, {
        status: 'completed',
        releasedAt: new Date()
      });
    }

    console.log(`\n--- Daily Profit Calculation Complete ---`);
    console.log(`  Investments: ${processedCount}`);
    console.log(`  ROI Distributed: $${totalProfitDistributed.toFixed(2)}`);
    console.log(`  Investors Processed: ${Object.keys(investorDailyRoiMap).length}`);
    console.log(`\n`);

    return {
      processedCount,
      totalProfitDistributed,
      investorsWithCommissions: Object.keys(investorDailyRoiMap).length
    };

  } catch (outerErr) {
    if (lock) {
      await CronLock.findByIdAndUpdate(lock._id, {
        status: 'failed',
        releasedAt: new Date(),
        error: outerErr.message
      });
    }
    console.error('Fatal error in calculateDailyProfits:', outerErr);
    throw outerErr;
  }
};

module.exports = {
  distributeInvestorShare,
  calculateDailyProfits
};

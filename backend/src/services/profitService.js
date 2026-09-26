const Investment = require('../models/Investment');
const InvestorInvestment = require('../models/InvestorInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const CronLock = require('../models/CronLock');
const commissionService = require('./commissionService');

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
 * directly to the investor's wallet.profit, then distributes 21-level commissions
 * to all qualifying uplines.
 *
 * NOTE: This is separate from the admin profit injection flow. Daily profits are
 * based on each investment's individual dailyRate. The injection flow distributes
 * a lump realized-profit amount proportionally across all active investors.
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

  try {
    // ── PASS 1: Legacy User Portal Investment records (old Tier 1-4 system) ────
    // MUTUALLY EXCLUSIVE: investorId != null, userId not checked
    // These investments credit to wallet.profit, distribute 21-level commissions
    const investments = await Investment.find({
      isActive: true,
      status: 'active',
      lastProfitDate: { $lt: startOfToday }
    }).populate('userId');

    for (const investment of investments) {
      try {
        const investor = investment.userId;
        if (!investor || !investor.isActive) continue;

        const dailyProfitAmount = Number(((investment.amount * investment.dailyRate) / 100).toFixed(4));
        if (dailyProfitAmount <= 0) continue;

        // Atomic document-level guard: update lastProfitDate only if it still hasn't been updated today
        const updatedInvestment = await Investment.findOneAndUpdate(
          {
            _id: investment._id,
            isActive: true,
            status: 'active',
            lastProfitDate: { $lt: startOfToday }
          },
          {
            $set: { lastProfitDate: now },
            $inc: { totalProfitEarned: dailyProfitAmount }
          },
          { new: true }
        );

        if (!updatedInvestment) {
          // Already processed concurrently
          continue;
        }

        // Credit investor's profit wallet
        await User.findByIdAndUpdate(investor._id, {
          $inc: {
            'wallet.profit': dailyProfitAmount,
            totalProfitEarned: dailyProfitAmount
          }
        });

        // Record profit transaction
        await Transaction.create({
          userId: investor._id,
          type: 'profit',
          amount: dailyProfitAmount,
          status: 'completed',
          description: `Daily profit (${investment.dailyRate}%) from package ${investment.packageName}`,
          referenceId: investment._id,
          referenceModel: 'Investment'
        });

        // Send profit notification
        await Notification.create({
          userId: investor._id,
          title: 'Daily Profit Credited',
          message: `You earned $${dailyProfitAmount} daily profit from your $${investment.amount} investment!`,
          type: 'profit'
        });

        // Distribute 21-level commissions to uplines
        await commissionService.distributeLevelCommissions(investment, dailyProfitAmount, investor);

        processedCount++;
        totalProfitDistributed += dailyProfitAmount;
      } catch (err) {
        console.error(`Error processing profit for investment ${investment._id}:`, err);
      }
    }

    // ── PASS 2: Phase 2 Investor Plan A/B records (new unified User model) ───────
    // MUTUALLY EXCLUSIVE: userId != null, investorId is null or not checked
    // These investments credit to wallet.roi, NO commission distribution
    const investorInvestments = await InvestorInvestment.find({
      userId: { $ne: null },  // CRITICAL: Must have userId set (Phase 2 records)
      status: 'active',
      isActive: true,
      lastRoiDate: { $lt: startOfToday }
    }).populate('userId');

    for (const investment of investorInvestments) {
      try {
        const investor = investment.userId;
        if (!investor || !investor.isActive) continue;

        const dailyRoiAmount = Number(((investment.amount * investment.dailyRate) / 100).toFixed(4));
        if (dailyRoiAmount <= 0) continue;

        // Check if investment's personal cap already reached
        if (investment.capReached) continue;

        // Atomic guard: update lastRoiDate only if not updated today AND cap not reached
        const updatedInvestment = await InvestorInvestment.findOneAndUpdate(
          {
            _id: investment._id,
            userId: investor._id,
            status: 'active',
            isActive: true,
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
          type: 'roi',
          amount: dailyRoiAmount,
          status: 'completed',
          description: `Daily ROI (${(investment.dailyRate * 100).toFixed(4)}%) from Plan ${investment.plan} investment $${investment.amount}${investmentCapReached ? ' (cap reached)' : ''}`,
          referenceId: investment._id,
          referenceModel: 'InvestorInvestment'
        });

        // Send ROI notification
        await Notification.create({
          userId: investor._id,
          title: 'ROI Credited',
          message: `You earned $${dailyRoiAmount} ROI from your Plan ${investment.plan} investment!${investmentCapReached ? ' (Income cap reached)' : ''}`,
          type: 'profit'
        });

        // NO commission distribution for investor ROI (Investor Portal never did this)

        processedCount++;
        totalProfitDistributed += dailyRoiAmount;
      } catch (err) {
        console.error(`Error processing ROI for investor investment ${investment._id}:`, err);
      }
    }

    // Mark lock as successfully completed
    if (lock) {
      await CronLock.findByIdAndUpdate(lock._id, {
        status: 'completed',
        releasedAt: new Date()
      });
    }

    console.log(`--- Daily Profit Calculation Complete: Processed ${processedCount} investments, total $${totalProfitDistributed.toFixed(2)} distributed ---`);
    return { processedCount, totalProfitDistributed };
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

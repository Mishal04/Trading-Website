const Investment = require('../models/Investment');
const InvestorInvestment = require('../models/InvestorInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const CronLock = require('../models/CronLock');

const { getInvestmentPhase, getDailyRateForPhase, getMonthlyRatePhase3 } = require('../../config/investorConstants');

const distributeInvestorShare = async (investorShareAmount, adminUserId, note = '') => {
  console.log(`--- Starting Investor Share Distribution: $${investorShareAmount} ---`);

  if (!investorShareAmount || investorShareAmount <= 0) {
    console.log('Investor share amount is 0 or negative — skipping distribution.');
    return { distributed: 0, userCount: 0, skipped: 0, details: [] };
  }

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

  const totalActiveCapital = activeCapitalByUser.reduce(
    (sum, row) => sum + row.activeCapital, 0
  );

  if (totalActiveCapital <= 0) {
    console.log('Total active capital is 0 — investor share not distributed.');
    return { distributed: 0, userCount: 0, skipped: 0, details: [] };
  }

  console.log(`  Active investors: ${activeCapitalByUser.length}, Total capital: $${totalActiveCapital}`);

  let totalDistributed = 0;
  let userCount        = 0;
  let skipped          = 0;
  const details        = [];

  for (const row of activeCapitalByUser) {
    const userId       = row._id;
    const userCapital  = row.activeCapital;

    const userShare = Number(
      ((userCapital / totalActiveCapital) * investorShareAmount).toFixed(4)
    );

    if (userShare <= 0) {
      skipped++;
      continue;
    }

    const user = await User.findById(userId).select('name email isActive');
    if (!user || !user.isActive) {
      console.log(`  Skipping inactive/missing user ${userId}`);
      skipped++;
      continue;
    }

    await User.findByIdAndUpdate(userId, {
      $inc: {
        'wallet.profit':   userShare,
        totalProfitEarned: userShare
      }
    });

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

const calculateDailyProfits = async () => {
  console.log('--- Starting Daily Profit Calculation ---');
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
  const investorDailyRoiMap = {};

  try {
    console.log('\n--- PHASE 1: Processing ROI Credits ---');

    // Get users with wallet.capital (active invested capital)
    const usersWithCapital = await User.find({
      'wallet.capital': { $gt: 0 },
      isActive: true
    }).select('_id name email wallet directCount ancestorPath')
      .populate('ancestorPath', '_id name email wallet directCount');

    console.log(`✓ Found ${usersWithCapital.length} users with active invested capital`);

    // Helper function to get daily rate based on investment amount
    const getDailyRateByAmount = (amount) => {
      if (amount >= 10000) return 0.0125;  // 1.25% for $10k-$25k
      if (amount >= 6000) return 0.01;    // 1% for $6k-$9k
      if (amount >= 1000) return 0.01;    // 1% for $1k-$5k
      if (amount >= 100) return 0.01;     // 1% for $100-$900
      return 0;
    };

    // Process wallet.capital users
    for (const user of usersWithCapital) {
      try {
        if (user.name && user.name.startsWith('Test_Final_')) continue;
        if (user.email && user.email.endsWith('@test.com')) continue;

        const capitalAmount = user.wallet?.capital || 0;
        if (capitalAmount <= 0) continue;

        // Get daily rate based on investment tier
        const dailyRate = getDailyRateByAmount(capitalAmount);
        if (dailyRate <= 0) continue;

        const dailyRoiAmount = Number((capitalAmount * dailyRate).toFixed(4));

        if (dailyRoiAmount <= 0) continue;

        // Credit ROI to wallet
        await User.findByIdAndUpdate(user._id, {
          $inc: {
            'wallet.profit': dailyRoiAmount,
            totalRoiEarned: dailyRoiAmount
          }
        });

        await Transaction.create({
          userId: user._id,
          type: 'profit',
          amount: dailyRoiAmount,
          status: 'completed',
          description: `Daily ROI (${(dailyRate * 100).toFixed(2)}%) from active invested capital $${capitalAmount}`,
          referenceId: user._id,
          referenceModel: 'User'
        });

        await Notification.create({
          userId: user._id,
          title: 'ROI Credited',
          message: `You earned $${dailyRoiAmount} ROI from your active invested capital!`,
          type: 'profit'
        });

        const investorId = user._id.toString();
        if (!investorDailyRoiMap[investorId]) {
          investorDailyRoiMap[investorId] = {
            totalRoi: 0,
            investor: { _id: user._id, name: user.name, email: user.email, ancestorPath: user.ancestorPath },
            investments: []
          };
        }
        investorDailyRoiMap[investorId].totalRoi += dailyRoiAmount;

        processedCount++;
        totalProfitDistributed += dailyRoiAmount;

      } catch (err) {
        console.error(`Error processing wallet.capital for user ${user._id}:`, err);
      }
    }

    console.log(`✓ PHASE 1 Complete: ${processedCount} users processed, $${totalProfitDistributed.toFixed(2)} ROI distributed`);

    // ── PHASE 2: Process Commissions (DEPTH-BASED 21-LEVEL) ────
    console.log(`\n--- PHASE 2: Processing Commissions (${Object.keys(investorDailyRoiMap).length} investors) ---`);

    // Check if commissions already exist today - if so, skip to prevent duplicates
    const anyCommToday = await Transaction.findOne({
      type: 'commission',
      createdAt: { $gte: startOfToday }
    });

    if (anyCommToday) {
      console.log(`⊘ COMMISSIONS ALREADY PROCESSED TODAY - SKIPPING TO PREVENT DUPLICATES`);
    } else {
      let totalCommissionsPaid = 0;
      let investorsProcessed = 0;

      const LEVEL_RATES = require('../../config/constants').LEVEL_RATES;
      const constants = require('../../config/constants');

      // For each investor who earned ROI today
      for (const investorId in investorDailyRoiMap) {
        try {
          const { totalRoi, investor } = investorDailyRoiMap[investorId];

          if (!investor || !investor.ancestorPath || investor.ancestorPath.length === 0) {
            continue;
          }

          // ── PHASE 2 LOGIC: Depth-based 21-level commission WITH UNLOCK CHECK ──
          // Walk up ancestorPath and pay each upline based on NETWORK POSITION (depth)
          // BUT only if the upline has unlocked that level based on directCount
          // networkPosition = index + 1 in ancestorPath
          // rate = LEVEL_RATES[networkPosition]
          // commission = (dailyRoiAmount * rate) / 100
          
          for (let positionIndex = 0; positionIndex < investor.ancestorPath.length; positionIndex++) {
            try {
              const networkPosition = positionIndex + 1;  // L1, L2, L3, ...
              
              if (networkPosition > 21) break;  // Only up to L21

              const uplineId = investor.ancestorPath[positionIndex];
              const upline = await User.findById(uplineId)
                .select('_id name email isActive totalInvested wallet directCount');

              if (!upline) {
                console.log(`    L${networkPosition}: Upline not found (${uplineId})`);
                continue;
              }

              if (!upline.isActive) {
                console.log(`    L${networkPosition}: ${upline.name} inactive`);
                continue;
              }

              // ✅ CHECK: Is this level unlocked for this upline based on directCount?
              const isLevelUnlocked = constants.isLevelUnlocked(networkPosition, upline.directCount || 0);
              if (!isLevelUnlocked) {
                console.log(`    L${networkPosition}: ${upline.name} has not unlocked this level (directCount: ${upline.directCount || 0})`);
                continue;
              }

              // Get rate for this network position (depth-based, not upline's personal level)
              // LEVEL_RATES is 1-indexed: LEVEL_RATES[1] = L1, LEVEL_RATES[21] = L21
              const ratePercent = LEVEL_RATES[networkPosition];
              
              if (!ratePercent || ratePercent <= 0) {
                console.log(`    L${networkPosition}: Invalid rate`);
                continue;
              }

              const commissionAmount = Number(((totalRoi * ratePercent) / 100).toFixed(4));
              
              if (commissionAmount <= 0) {
                continue;
              }

              // Credit commission to upline wallet
              await User.findByIdAndUpdate(uplineId, {
                $inc: {
                  'wallet.commission': commissionAmount,
                  totalEarned: commissionAmount
                }
              });

              // Create transaction
              await Transaction.create({
                userId: uplineId,
                type: 'commission',
                amount: commissionAmount,
                status: 'completed',
                description: `L${networkPosition} commission (${(ratePercent).toFixed(2)}%) from ${investor.name}'s $${totalRoi.toFixed(4)} daily ROI`,
                level: networkPosition,
                referenceId: investor._id,
                referenceModel: 'User'
              });

              // Notification
              await Notification.create({
                userId: uplineId,
                title: 'Commission Received',
                message: `You earned $${commissionAmount.toFixed(2)} in Level ${networkPosition} commission!`,
                type: 'commission'
              });

              totalCommissionsPaid += commissionAmount;

              console.log(`    L${networkPosition} → ${upline.name}: $${commissionAmount.toFixed(4)}`);

            } catch (levelErr) {
              console.error(`Error processing L${positionIndex + 1}:`, levelErr.message);
            }
          }

          investorsProcessed++;

        } catch (err) {
          console.error(`Error processing commissions for investor ${investorId}:`, err);
        }
      }

      console.log(`✓ PHASE 2 Complete: ${investorsProcessed} investors processed, $${totalCommissionsPaid.toFixed(2)} total commissions`);
    }

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

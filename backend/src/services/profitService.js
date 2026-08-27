const Investment = require('../models/Investment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
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
 * directly to the investor's wallet.profit, then distributes 25-level commissions
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

  const investments = await Investment.find({
    isActive: true,
    status: 'active',
    lastProfitDate: { $lt: startOfToday }
  }).populate('userId');

  let processedCount = 0;
  let totalProfitDistributed = 0;

  for (const investment of investments) {
    try {
      const investor = investment.userId;
      if (!investor || !investor.isActive) continue;

      const dailyProfitAmount = Number(((investment.amount * investment.dailyRate) / 100).toFixed(4));
      if (dailyProfitAmount <= 0) continue;

      // Update investment stats
      investment.totalProfitEarned += dailyProfitAmount;
      investment.lastProfitDate = now;
      await investment.save();

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

      // Distribute 25-level commissions to uplines
      await commissionService.distributeLevelCommissions(investment, dailyProfitAmount, investor);

      processedCount++;
      totalProfitDistributed += dailyProfitAmount;
    } catch (err) {
      console.error(`Error processing profit for investment ${investment._id}:`, err);
    }
  }

  console.log(`--- Daily Profit Calculation Complete: Processed ${processedCount} investments, total $${totalProfitDistributed.toFixed(2)} distributed ---`);
  return { processedCount, totalProfitDistributed };
};

module.exports = {
  distributeInvestorShare,
  calculateDailyProfits
};

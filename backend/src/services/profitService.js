const Investment = require('../models/Investment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const commissionService = require('./commissionService');

/**
  Calculate daily profits for all active investments
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
  calculateDailyProfits
};

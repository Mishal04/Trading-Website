const User = require('../models/User');
const CommissionLog = require('../models/CommissionLog');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const SystemPool = require('../models/SystemPool');

// 25-Level Rates (Sum = 10.00%)
const LEVEL_RATES = [
  1.50, // Level 1
  1.00, // Level 2
  0.75, // Level 3
  0.50, // Level 4
  0.50, // Level 5
  0.35, 0.35, 0.35, 0.35, 0.35, // Levels 6-10
  0.30, 0.30, 0.30, 0.30, 0.30, // Levels 11-15
  0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25 // Levels 16-25
];

// Leadership Salary Tiers
const LEADERSHIP_TIERS = [
  { target: 1000000, salary: 10000 },
  { target: 500000, salary: 5000 },
  { target: 250000, salary: 2500 },
  { target: 100000, salary: 1000 },
  { target: 50000, salary: 500 },
  { target: 25000, salary: 250 },
  { target: 10000, salary: 100 }
];

// Performance Reward Tiers
const PERFORMANCE_TIERS = [
  { target: 5000000, reward: 125000 },
  { target: 2500000, reward: 60000 },
  { target: 1000000, reward: 25000 },
  { target: 500000, reward: 12500 },
  { target: 250000, reward: 5000 },
  { target: 100000, reward: 2000 },
  { target: 50000, reward: 750 },
  { target: 25000, reward: 300 },
  { target: 10000, reward: 100 }
];

/**
  Calculate investment package details based on amount
 */
const getInvestmentPackage = (amount) => {
  let tier = 1;
  let packageName = 'Tier 1';
  let dailyRate = 0.35;

  if (amount >= 7500) {
    tier = 3;
    packageName = 'Tier 3 ($7,500+)';
    const interpolated = 1.50 + ((amount - 7500) / 10000) * (2.00 - 1.50);
    dailyRate = Math.min(2.00, Number(interpolated.toFixed(4)));
  } else if (amount >= 1000) {
    tier = 2;
    packageName = 'Tier 2 ($1,000 - $5,000)';
    const interpolated = 1.00 + ((amount - 1000) / 4000) * (1.25 - 1.00);
    dailyRate = Number(interpolated.toFixed(4));
  } else {
    tier = 1;
    packageName = 'Tier 1 ($100 - $500)';
    const interpolated = 0.35 + ((amount - 100) / 400) * (0.50 - 0.35);
    dailyRate = Number(interpolated.toFixed(4));
  }

  return { tier, packageName, dailyRate };
};

/**
  Check 60/40 Business Rule qualification for a required target volume
 */
const check6040Qualification = (strongTeam, otherTeam, targetVolume) => {
  const maxStrongAllowed = targetVolume * 0.60;
  const minOtherRequired = targetVolume * 0.40;

  const effectiveStrong = Math.min(strongTeam, maxStrongAllowed);
  const effectiveOther = otherTeam;

  return (effectiveStrong + effectiveOther) >= targetVolume && effectiveOther >= minOtherRequired;
};

/**
  Distribute 25-level commissions when profit is generated
  Fix: Checks that upline user is active (isActive: true) and has an active investment (totalInvestment > 0)
 */
const distributeLevelCommissions = async (investment, dailyProfitAmount, investor) => {
  if (!investor.ancestorPath || investor.ancestorPath.length === 0) {
    return;
  }

  for (let i = 0; i < investor.ancestorPath.length && i < 25; i++) {
    const ancestorId = investor.ancestorPath[i];
    const level = i + 1;
    const ratePercent = LEVEL_RATES[i] || 0.25;
    const commissionAmount = Number(((dailyProfitAmount * ratePercent) / 100).toFixed(4));

    if (commissionAmount <= 0) continue;

    // Requirement 3 Fix: Check if upline is active and has totalInvestment > 0
    const ancestor = await User.findById(ancestorId);
    if (!ancestor || !ancestor.isActive || (ancestor.totalInvestment || 0) <= 0) {
      continue; // Skip inactive or non-investor upline
    }

    // Credit ancestor commission wallet
    await User.findByIdAndUpdate(ancestorId, {
      $inc: {
        'wallet.commission': commissionAmount,
        [`commissions.levelCommissions.${i}`]: commissionAmount
      }
    });

    // Log commission
    await CommissionLog.create({
      recipientId: ancestorId,
      sourceUserId: investor._id,
      investmentId: investment._id,
      level,
      commissionType: 'level',
      rate: ratePercent,
      baseAmount: dailyProfitAmount,
      commissionAmount,
      description: `Level ${level} commission (${ratePercent}%) from ${investor.name}`
    });

    // Create transaction
    await Transaction.create({
      userId: ancestorId,
      type: 'commission',
      amount: commissionAmount,
      status: 'completed',
      description: `Level ${level} commission (${ratePercent}%) from ${investor.name}'s investment profit`,
      referenceId: investment._id,
      referenceModel: 'Investment'
    });

    // Create notification
    await Notification.create({
      userId: ancestorId,
      title: 'Commission Received',
      message: `You earned $${commissionAmount} in Level ${level} commission from your team!`,
      type: 'commission'
    });
  }
};

/**
  Distribute Monthly Leadership Salary Pool
  Requirement 4 Fix: Pool-safe — checks available SystemPool.salaryPool and deducts paid amounts.
 */
const distributeLeadershipSalary = async () => {
  const pool = await SystemPool.getSingleton();
  let availablePool = pool.salaryPool || 0;

  if (availablePool <= 0) {
    console.log('Leadership Salary Pool is empty ($0). Skipping distribution.');
    return 0;
  }

  const users = await User.find({ isActive: true, totalInvestment: { $gt: 0 } });
  let totalDistributed = 0;

  for (const user of users) {
    if (availablePool <= 0) break;

    const { strongTeam, otherTeam } = user.teamBusiness || { strongTeam: 0, otherTeam: 0 };
    
    let salaryEarned = 0;
    for (const tier of LEADERSHIP_TIERS) {
      if (check6040Qualification(strongTeam, otherTeam, tier.target)) {
        salaryEarned = tier.salary;
        break;
      }
    }

    if (salaryEarned > 0) {
      // Cap payout at remaining available pool balance
      const actualPayout = Math.min(salaryEarned, availablePool);
      if (actualPayout <= 0) continue;

      await User.findByIdAndUpdate(user._id, {
        $inc: {
          'wallet.commission': actualPayout,
          'commissions.leadershipSalary': actualPayout
        }
      });

      availablePool -= actualPayout;
      totalDistributed += actualPayout;

      await CommissionLog.create({
        recipientId: user._id,
        commissionType: 'leadership_salary',
        baseAmount: user.teamBusiness.total,
        commissionAmount: actualPayout,
        description: `Monthly Leadership Salary payout of $${actualPayout}`
      });

      await Transaction.create({
        userId: user._id,
        type: 'commission',
        amount: actualPayout,
        status: 'completed',
        description: `Monthly Leadership Salary payout`
      });

      await Notification.create({
        userId: user._id,
        title: 'Leadership Salary Paid',
        message: `Congratulations! You received your monthly Leadership Salary of $${actualPayout}!`,
        type: 'commission'
      });
    }
  }

  // Deduct total paid salary from SystemPool in DB
  if (totalDistributed > 0) {
    pool.salaryPool = Math.max(0, pool.salaryPool - totalDistributed);
    pool.lastUpdated = new Date();
    await pool.save();
  }

  return totalDistributed;
};

/**
  Distribute Monthly Performance Reward Pool
  Requirement 4 Fix: Pool-safe — checks available SystemPool.rewardPool and deducts paid amounts.
 */
const distributePerformanceReward = async () => {
  const pool = await SystemPool.getSingleton();
  let availablePool = pool.rewardPool || 0;

  if (availablePool <= 0) {
    console.log('Performance Reward Pool is empty ($0). Skipping distribution.');
    return 0;
  }

  const users = await User.find({ isActive: true, totalInvestment: { $gt: 0 } });
  let totalDistributed = 0;

  for (const user of users) {
    if (availablePool <= 0) break;

    const { strongTeam, otherTeam } = user.teamBusiness || { strongTeam: 0, otherTeam: 0 };

    let rewardEarned = 0;
    for (const tier of PERFORMANCE_TIERS) {
      if (check6040Qualification(strongTeam, otherTeam, tier.target)) {
        rewardEarned = tier.reward;
        break;
      }
    }

    if (rewardEarned > 0) {
      // Cap payout at remaining available pool balance
      const actualPayout = Math.min(rewardEarned, availablePool);
      if (actualPayout <= 0) continue;

      await User.findByIdAndUpdate(user._id, {
        $inc: {
          'wallet.commission': actualPayout,
          'commissions.performanceReward': actualPayout
        }
      });

      availablePool -= actualPayout;
      totalDistributed += actualPayout;

      await CommissionLog.create({
        recipientId: user._id,
        commissionType: 'performance_reward',
        baseAmount: user.teamBusiness.total,
        commissionAmount: actualPayout,
        description: `Monthly Performance Reward payout of $${actualPayout}`
      });

      await Transaction.create({
        userId: user._id,
        type: 'commission',
        amount: actualPayout,
        status: 'completed',
        description: `Monthly Performance Reward payout`
      });

      await Notification.create({
        userId: user._id,
        title: 'Performance Reward Paid',
        message: `Congratulations! You received your Performance Reward of $${actualPayout}!`,
        type: 'commission'
      });
    }
  }

  // Deduct total paid rewards from SystemPool in DB
  if (totalDistributed > 0) {
    pool.rewardPool = Math.max(0, pool.rewardPool - totalDistributed);
    pool.lastUpdated = new Date();
    await pool.save();
  }

  return totalDistributed;
};

module.exports = {
  LEVEL_RATES,
  LEADERSHIP_TIERS,
  PERFORMANCE_TIERS,
  getInvestmentPackage,
  check6040Qualification,
  distributeLevelCommissions,
  distributeLeadershipSalary,
  distributePerformanceReward
};

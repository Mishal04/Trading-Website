const User = require('../models/User');
const CommissionLog = require('../models/CommissionLog');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const SystemPool = require('../models/SystemPool');
const constants = require('../../config/constants');

// Reference 21-Level Rates (Sum = 80.00%) from constants.js as single source of truth
const LEVEL_RATES = constants.LEVEL_RATES;

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
 * Returns package details for a regular User investment.
 * Uses permanent flat standard rates per tier — no calendar-based switching.
 * @param {number} amount - must be one of the discrete allowed amounts
 * @returns {{ tier, packageName, dailyRate, packageNumber, rateTier } | null}
 */
const getInvestmentPackage = (amount) => {
  const packages = constants.USER_PACKAGES;
  let packageNumber = null;

  for (const [pkgNum, amounts] of Object.entries(packages)) {
    if (amounts.includes(Number(amount))) {
      packageNumber = Number(pkgNum);
      break;
    }
  }

  if (!packageNumber) return null;

  const dailyRate = constants.USER_DAILY_RATES.standard[packageNumber];

  const tierNames = {
    1: 'Tier 1 ($100–$900)',
    2: 'Tier 2 ($1,000–$5,000)',
    3: 'Tier 3 ($6,000–$9,000)',
    4: 'Tier 4 ($10,000+)'
  };

  return {
    tier:        packageNumber,
    packageName: tierNames[packageNumber],
    dailyRate,
    packageNumber,
    rateTier:    'standard'
  };
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
  Ensure upline has current unlockedLevels based on directCount
  
  This prevents stale unlockedLevels from being used during commission checks.
  Recalculates from scratch based on current LEVEL_UNLOCK_RULES.
  
  @param {Object} upline - User document with directCount field
  @returns {number} Current unlocked levels
 */
const getCurrentUnlockedLevels = (upline) => {
  const rules = constants.LEVEL_UNLOCK_RULES;
  const direct = upline.directCount || 0;
  
  if (direct >= 10) {
    return 21;
  } else if (direct > 0) {
    return rules[direct] || 0;
  } else {
    return 0;
  }
};

/**
  UNIFIED 21-Level Commission Distribution
  
  This function is the SINGLE SOURCE OF TRUTH for all 21-level commission distribution.
  It replaces the duplicate logic in profitService PASS 1 and PASS 2.
  
  Handles:
  - Level unlock checking (unlockedLevels must be >= level)
  - Active upline validation (isActive + totalInvested > 0)
  - Income cap enforcement
  - Commission calculation and logging
  - Debug logging for verification
  
  @param {Object} investment - Investment or InvestorInvestment document
  @param {number} baseAmount - Daily profit/ROI amount to distribute from
  @param {Object} investor - User document with ancestorPath
  @param {string} investmentType - 'Investment' or 'InvestorInvestment' for logging
  @param {boolean} enforceUnlockedLevels - true for Phase 2 (InvestorInvestment), false for Phase 1 (Investment)
 */
const distributeLevelCommissionsWithChecks = async (investment, baseAmount, investor, investmentType = 'Investment', enforceUnlockedLevels = true) => {
  if (!investor.ancestorPath || investor.ancestorPath.length === 0) {
    return; // No ancestors, no commissions
  }

  for (let i = 0; i < investor.ancestorPath.length && i < LEVEL_RATES.length; i++) {
    const ancestorId = investor.ancestorPath[i];
    const level = i + 1;
    const ratePercent = LEVEL_RATES[i] || 0;

    if (ratePercent <= 0) continue;

    const commissionAmount = Number(((baseAmount * ratePercent) / 100).toFixed(4));
    if (commissionAmount <= 0) continue;

    try {
      // Fetch upline with all necessary fields
      const upline = await User.findById(ancestorId).select('name email isActive totalInvested directCount unlockedLevels role totalEarned');
      
      if (!upline) {
        console.log(`[COMMISSION DEBUG] L${level} | Upline not found (${ancestorId})`);
        continue;
      }

      if (!upline.isActive) {
        console.log(`[COMMISSION DEBUG] L${level} | Upline ${upline.name} inactive`);
        continue;
      }

      if ((upline.totalInvested || 0) <= 0) {
        console.log(`[COMMISSION DEBUG] L${level} | Upline ${upline.name} no investment`);
        continue;
      }

      // ENFORCE LEVEL UNLOCK REQUIREMENT (Phase 2 behavior)
      // For Phase 1 (Investment), this check can be skipped for backwards compatibility
      // Always recalculate unlockedLevels fresh to avoid stale data
      if (enforceUnlockedLevels) {
        const currentUnlocked = getCurrentUnlockedLevels(upline);
        if (currentUnlocked < level) {
          console.log(`[COMMISSION DEBUG] L${level} | Upline ${upline.name} locked (currentUnlocked=${currentUnlocked} < level=${level}, directCount=${upline.directCount})`);
          continue;
        }
      }

      // Check income cap for upline if they have reached it
      if (upline.hasReachedIncomeCap && upline.hasReachedIncomeCap()) {
        console.log(`[COMMISSION DEBUG] L${level} | Upline ${upline.name} income cap reached (earned=${upline.totalEarned})`);
        continue;
      }

      // Credit upline commission wallet
      await User.findByIdAndUpdate(ancestorId, {
        $inc: {
          'wallet.commission': commissionAmount,
          [`commissions.levelCommissions.${i}`]: commissionAmount,
          totalEarned: commissionAmount
        }
      });

      // Log commission record
      await CommissionLog.create({
        recipientId: ancestorId,
        sourceUserId: investor._id,
        investmentId: investment._id,
        level,
        commissionType: 'level',
        rate: ratePercent,
        baseAmount,
        commissionAmount,
        description: `Level ${level} commission (${ratePercent}%) from ${investor.name}'s ${investmentType} daily earnings`
      });

      // Create transaction record
      await Transaction.create({
        userId: ancestorId,
        type: 'commission',
        amount: commissionAmount,
        status: 'completed',
        description: `Level ${level} commission (${ratePercent}%) from ${investor.name}'s ${investmentType} daily earnings`,
        referenceId: investment._id,
        referenceModel: investmentType
      });

      // Create user notification
      await Notification.create({
        userId: ancestorId,
        title: 'Commission Received',
        message: `You earned $${commissionAmount.toFixed(2)} in Level ${level} commission from your downline!`,
        type: 'commission'
      });

      // Debug logging for verification
      const currentUnlocked = getCurrentUnlockedLevels(upline);
      console.log(`[COMMISSION DEBUG] L${level} | Rate=${ratePercent}% | Base=$${baseAmount.toFixed(4)} | Commission=$${commissionAmount.toFixed(4)} | Upline: ${upline.name} | DirectCount: ${upline.directCount} | UnlockedLevels: ${currentUnlocked}`);

    } catch (err) {
      console.error(`Error distributing L${level} commission for ${investmentType} ${investment._id}:`, err);
    }
  }
};

/**
  Distribute 21-level commissions when profit is generated
  Fix: Checks that upline user is active (isActive: true) and has an active investment (totalInvestment > 0)
  LEGACY: Used only for PASS 1 (Investment) records. For Phase 2, use distributeLevelCommissionsWithChecks()
 */
const distributeLevelCommissions = async (investment, dailyProfitAmount, investor) => {
  // DELEGATE TO UNIFIED FUNCTION with enforceUnlockedLevels=false for legacy Investment records
  // This maintains backward compatibility while consolidating logic
  return distributeLevelCommissionsWithChecks(investment, dailyProfitAmount, investor, 'Investment', false);
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

  const users = await User.find({ isActive: true, totalInvested: { $gt: 0 } });
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

  const users = await User.find({ isActive: true, totalInvested: { $gt: 0 } });
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
  getCurrentUnlockedLevels,
  distributeLevelCommissions,
  distributeLevelCommissionsWithChecks,
  distributeLeadershipSalary,
  distributePerformanceReward
};

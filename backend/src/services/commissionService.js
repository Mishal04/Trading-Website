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
  Check if a level is currently unlocked for an upline.
  Uses REVERSE unlock order: L21 unlocks first, L1 unlocks last.
  
  This replaces the old `unlockedLevels >= level` check which assumed L1-first order.
  
  @param {Object} upline - User document with directCount field
  @param {number} level - Network level to check (1-21)
  @returns {boolean} True if level is unlocked
 */
const isLevelUnlockedForUpline = (upline, level) => {
  const directCount = upline.directCount || 0;
  return constants.isLevelUnlocked(level, directCount);
};

/**
  UNIFIED 21-Level Commission Distribution with PERSONAL COMMISSION LEVEL
  
  NEW SYSTEM: Each user earns commissions at their PERSONAL commission level,
  not based on network position.
  
  Example:
  - Metha has 2 directs → Personal Level L18 → Earns 0.9% from ALL downline at position 1
  - User with 10 directs → Personal Level L1 → Earns 25% from ALL downline at position 1
  
  @param {Object} investment - Investment or InvestorInvestment document
  @param {number} baseAmount - Daily profit/ROI amount to distribute from
  @param {Object} investor - User document with ancestorPath
  @param {string} investmentType - 'Investment' or 'InvestorInvestment' for logging
  @param {boolean} enforceUnlockedLevels - Ignored (not used in personal level system)
 */
const distributeLevelCommissionsWithChecks = async (investment, baseAmount, investor, investmentType = 'Investment', enforceUnlockedLevels = true) => {
  if (!investor.ancestorPath || investor.ancestorPath.length === 0) {
    return; // No ancestors, no commissions
  }

  // ✅ CRITICAL FIX: ONLY pay commission to DIRECT REFERRALS (L1)
  // Do NOT pay from entire ancestorPath - only first position (direct referral)
  
  const ancestorId = investor.ancestorPath[0]; // Only L1 (direct referral)
  const networkPosition = 1;
  
  try {
    // Fetch upline (direct referrer)
    const upline = await User.findById(ancestorId).select('name email isActive totalInvested unlockedLevels role totalEarned');
    
    if (!upline) {
      console.log(`[COMMISSION DEBUG] Position ${networkPosition} | Upline not found (${ancestorId})`);
      return;
    }

    if (!upline.isActive) {
      console.log(`[COMMISSION DEBUG] Position ${networkPosition} | Upline ${upline.name} inactive`);
      return;
    }

    if ((upline.totalInvested || 0) <= 0) {
      console.log(`[COMMISSION DEBUG] Position ${networkPosition} | Upline ${upline.name} no investment`);
      return;
    }

    // Determine payout level and rate based on upline's unlockedLevels
    // unlockedLevels directly indicates how many direct referrals they have
    // 
    // 1 Direct: L1 @ 25%
    // 2 Directs: L2 @ 15%
    // 3 Directs: L3 @ 10%
    // 4-5 Directs: L4-5 @ 5%
    // 6-10 Directs: L6-10 @ 2%
    // 11-20 Directs: L11-20 @ 0.9%
    // 21+ Directs: L21 @ 1%
    
    const unlockedLevels = upline.unlockedLevels || 0;
    
    if (unlockedLevels === 0) {
      // No unlocked levels (no direct referrals), no commission
      console.log(`[COMMISSION DEBUG] Position ${networkPosition} | ${upline.name} no unlocked levels`);
      return;
    }

    // Determine rate based on unlockedLevels (direct referral count)
    let ratePercent;
    let payoutLevel;
    
    if (unlockedLevels >= 21) {
      ratePercent = 1; // 21+ Directs → L21 @ 1%
      payoutLevel = 21;
    } else if (unlockedLevels >= 11) {
      ratePercent = 0.9; // 11-20 Directs → L11-20 @ 0.9%
      payoutLevel = unlockedLevels;
    } else if (unlockedLevels >= 6) {
      ratePercent = 2; // 6-10 Directs → L6-10 @ 2%
      payoutLevel = unlockedLevels;
    } else if (unlockedLevels >= 4) {
      ratePercent = 5; // 4-5 Directs → L4-5 @ 5%
      payoutLevel = unlockedLevels;
    } else if (unlockedLevels === 3) {
      ratePercent = 10; // 3 Directs → L3 @ 10%
      payoutLevel = 3;
    } else if (unlockedLevels === 2) {
      ratePercent = 15; // 2 Directs → L2 @ 15%
      payoutLevel = 2;
    } else if (unlockedLevels === 1) {
      ratePercent = 25; // 1 Direct → L1 @ 25%
      payoutLevel = 1;
    } else {
      console.log(`[COMMISSION DEBUG] Position ${networkPosition} | ${upline.name} invalid unlockedLevels (${unlockedLevels})`);
      return;
    }
    
    if (!ratePercent || ratePercent <= 0) {
      console.log(`[COMMISSION DEBUG] Position ${networkPosition} | ${upline.name} invalid rate for L${payoutLevel}`);
      return;
    }

    const commissionAmount = Number(((baseAmount * ratePercent) / 100).toFixed(4));
    if (commissionAmount <= 0) return;

    // Check income cap
    if (upline.hasReachedIncomeCap && upline.hasReachedIncomeCap()) {
      console.log(`[COMMISSION DEBUG] Position ${networkPosition} | ${upline.name} income cap reached`);
      return;
    }

    // Credit commission to direct referrer only
    await User.findByIdAndUpdate(ancestorId, {
      $inc: {
        'wallet.commission': commissionAmount,
        totalEarned: commissionAmount
      }
    });

    // Log commission
    await CommissionLog.create({
      recipientId: ancestorId,
      sourceUserId: investor._id,
      investmentId: investment._id,
      level: payoutLevel,
      commissionType: 'level',
      rate: ratePercent,
      baseAmount,
      commissionAmount,
      description: `Direct referral commission - L${payoutLevel} (${ratePercent}%) from ${investor.name}'s $${baseAmount} investment`
    });

    // Transaction record
    await Transaction.create({
      userId: ancestorId,
      type: 'commission',
      amount: commissionAmount,
      status: 'completed',
      description: `Direct referral commission - L${payoutLevel} (${ratePercent}%) from ${investor.name}'s $${baseAmount} investment`,
      referenceId: investment._id,
      referenceModel: investmentType
    });

    // Notification
    await Notification.create({
      userId: ancestorId,
      title: 'Commission Received',
      message: `You earned $${commissionAmount.toFixed(2)} in Level ${payoutLevel} commission from direct referral ${investor.name}!`,
      type: 'commission'
    });

    console.log(`[COMMISSION DEBUG] Direct Referral | L${payoutLevel} | Rate=${ratePercent}% | Base=$${baseAmount.toFixed(4)} | Commission=$${commissionAmount.toFixed(4)} | From: ${investor.name} → ${upline.name}`);

  } catch (err) {
    console.error(`[COMMISSION DEBUG] Error processing direct referral commission:`, err.message);
  }
};

/**
  Distribute 21-level commissions when profit is generated
  LEGACY: Used only for PASS 1 (Investment) records. For Phase 2, use distributeLevelCommissionsWithChecks()
 */
const distributeLevelCommissions = async (investment, dailyProfitAmount, investor) => {
  // DELEGATE TO UNIFIED FUNCTION for legacy Investment records
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

/**
 * Distribute leg commission to users based on total direct downline leg volume
 * Called once on Monday 4 PM
 * User earns commission based on unlockedLevels from TOTAL direct referral leg volume
 * 
 * Example: Faisal has 6 directs, 2 invested $300 each = $600 total leg
 * Faisal at Level 10 gets 2% of $600 = $12
 */
const distributeLegCommissions = async () => {
  console.log('[LEG COMMISSION] Starting leg commission distribution...');

  try {
    // Get all users with downline
    const users = await User.find(
      { directCount: { $gt: 0 } },
      { _id: 1, name: 1, unlockedLevels: 1, directCount: 1, totalInvested: 1 }
    );

    let totalCommissionPaid = 0;

    for (const user of users) {
      try {
        // Skip if no unlocked levels
        if (!user.unlockedLevels || user.unlockedLevels === 0) {
          console.log(`[LEG COMMISSION] ${user.name}: Skipped (unlockedLevels = 0)`);
          continue;
        }

        // Get ALL DIRECT downline members (ancestorPath length = 1, meaning direct referral)
        // Use simple query instead of $expr for better performance
        const allDownline = await User.find({ ancestorPath: user._id });
        const directDownline = allDownline.filter(d => d.ancestorPath?.length === 1);

        if (directDownline.length === 0) {
          console.log(`[LEG COMMISSION] ${user.name}: No direct downline members`);
          continue;
        }

        // Calculate TOTAL leg volume from all directs (not just strongest)
        let totalLegVolume = 0;
        directDownline.forEach(member => {
          totalLegVolume += (member.totalInvested || 0);
        });

        if (totalLegVolume <= 0) {
          console.log(`[LEG COMMISSION] ${user.name}: Total leg volume is 0`);
          continue;
        }

        // Determine commission rate from unlockedLevels
        // unlockedLevels tells how many levels are unlocked (starting from top L21 going down)
        // Lowest level = 22 - unlockedLevels
        // Then get the rate for that lowest unlocked level
        
        let lowestLevel = 22 - (user.unlockedLevels || 0);
        let rate = 0;

        if (lowestLevel <= 1) {
          rate = 25; // L1
        } else if (lowestLevel <= 2) {
          rate = 15; // L2
        } else if (lowestLevel <= 3) {
          rate = 10; // L3
        } else if (lowestLevel <= 5) {
          rate = 5; // L4-5
        } else if (lowestLevel <= 10) {
          rate = 2; // L6-10
        } else if (lowestLevel <= 20) {
          rate = 0.9; // L11-20
        } else if (lowestLevel <= 21) {
          rate = 1; // L21
        } else {
          // No levels unlocked
          rate = 0;
          lowestLevel = 0;
        }

        // Calculate commission from TOTAL leg volume
        const commissionAmount = Number(((totalLegVolume * rate) / 100).toFixed(2));

        if (commissionAmount <= 0) {
          console.log(`[LEG COMMISSION] ${user.name}: Commission amount is 0`);
          continue;
        }

        // Credit commission to user
        await User.findByIdAndUpdate(user._id, {
          $inc: {
            'wallet.commission': commissionAmount,
            totalEarned: commissionAmount
          }
        });

        // Log commission
        await CommissionLog.create({
          recipientId: user._id,
          commissionType: 'level',  // Changed from 'leg' to 'level'
          rate: rate,
          baseAmount: totalLegVolume,
          commissionAmount,
          description: `Leg commission Level ${lowestLevel} (${rate}%) from total direct leg volume ($${totalLegVolume})`
        });

        // Transaction record
        await Transaction.create({
          userId: user._id,
          type: 'commission',
          amount: commissionAmount,
          status: 'completed',
          description: `Leg commission Level ${lowestLevel} (${rate}%) from total direct leg volume ($${totalLegVolume})`
        });

        // Notification
        await Notification.create({
          userId: user._id,
          title: 'Leg Commission Received',
          message: `You earned $${commissionAmount.toFixed(2)} leg commission (Level ${lowestLevel} @ ${rate}%) from direct referral leg ($${totalLegVolume})!`,
          type: 'commission'
        });

        totalCommissionPaid += commissionAmount;

        console.log(`[LEG COMMISSION] ${user.name}: L${lowestLevel} @ ${rate}% | Total Leg: $${totalLegVolume} | Commission: $${commissionAmount.toFixed(2)}`);

      } catch (err) {
        console.error(`[LEG COMMISSION] Error processing ${user.name}:`, err.message);
      }
    }

    console.log(`[LEG COMMISSION] Total leg commissions paid: $${totalCommissionPaid.toFixed(2)}`);
    return totalCommissionPaid;

  } catch (err) {
    console.error('[LEG COMMISSION] Fatal error:', err.message);
    throw err;
  }
};


/**
 * DAILY COMMISSION: Pay direct referrer daily based on investor's daily ROI
 * Called every day as part of daily profit calculation
 */


/**
 * DAILY COMMISSION - CORRECT LOGIC
 * Levels unlock from L21 DOWN to L1 in pairs (2 levels per direct)
 * 1 Direct = L21+L20, use L20 (1%)
 * 2 Directs = L21+L20+L19+L18, use L18 (0.9%)
 * 3 Directs = L21-L16, use L16 (0.9%)
 * ... and so on
 */
const distributeDailyDirectReferralCommission = async (investment, dailyRoiAmount, investor, investmentType = 'InvestorInvestment') => {
  if (!investor.ancestorPath || investor.ancestorPath.length === 0) {
    return;
  }

  const directReferrerId = investor.ancestorPath[0];
  
  try {
    const directReferrer = await User.findById(directReferrerId).select('name email isActive totalInvested unlockedLevels role totalEarned');
    
    if (!directReferrer || !directReferrer.isActive || (directReferrer.totalInvested || 0) <= 0) {
      return;
    }

    const directCount = directReferrer.directCount || 0;
    if (directCount === 0) return;

    // Calculate which level to use based on direct count
    // Levels unlock 2 at a time from L21 down to L1
    // 1 direct unlocks L21, L20 -> use L20 (position 20)
    // 2 directs unlock L21, L20, L19, L18 -> use L18 (position 18)
    // etc.
    const lowestUnlockedLevel = 21 - (directCount * 2) + 2; // +2 because we use the LOWEST of each pair
    const payoutLevel = Math.max(1, Math.min(21, lowestUnlockedLevel));

    // Get commission rate for this level
    let commissionRate;
    if (payoutLevel === 1) {
      commissionRate = 25; // L1
    } else if (payoutLevel === 2) {
      commissionRate = 15; // L2
    } else if (payoutLevel === 3) {
      commissionRate = 10; // L3
    } else if (payoutLevel >= 4 && payoutLevel <= 5) {
      commissionRate = 5; // L4-5
    } else if (payoutLevel >= 6 && payoutLevel <= 10) {
      commissionRate = 2; // L6-10
    } else if (payoutLevel >= 11 && payoutLevel <= 20) {
      commissionRate = 0.9; // L11-20
    } else if (payoutLevel === 21) {
      commissionRate = 1; // L21
    } else {
      return;
    }

    // Calculate daily commission = commission rate � investment amount
    const dailyCommission = Number(((investment.amount * commissionRate) / 100).toFixed(4));
    if (dailyCommission <= 0) return;

    if (directReferrer.hasReachedIncomeCap && directReferrer.hasReachedIncomeCap()) {
      return;
    }

    await User.findByIdAndUpdate(directReferrerId, {
      $inc: {
        'wallet.commission': dailyCommission,
        totalEarned: dailyCommission
      }
    });

    await Transaction.create({
      userId: directReferrerId,
      type: 'commission',
      amount: dailyCommission,
      status: 'completed',
      description: `Daily commission - L${payoutLevel} (${commissionRate}%) from direct referral ${investor.name}'s $${investment.amount} investment`,
      referenceId: investment._id,
      referenceModel: investmentType
    });

    await Notification.create({
      userId: directReferrerId,
      title: 'Daily Commission Received',
      message: `You earned $${dailyCommission.toFixed(2)} commission from direct referral ${investor.name}!`,
      type: 'commission'
    });

    console.log(`[DAILY COMMISSION] L${payoutLevel} (${commissionRate}%) | $${dailyCommission.toFixed(4)} | From: ${investor.name} ? ${directReferrer.name}`);

  } catch (err) {
    console.error(`[DAILY COMMISSION] Error:`, err.message);
  }
};
module.exports = {
  LEVEL_RATES,
  LEADERSHIP_TIERS,
  PERFORMANCE_TIERS,
  getInvestmentPackage,
  check6040Qualification,
  isLevelUnlockedForUpline,
  distributeLevelCommissions,
  distributeLevelCommissionsWithChecks,
  distributeDailyDirectReferralCommission,
  distributeLegCommissions,
  distributeLeadershipSalary,
  distributePerformanceReward
};

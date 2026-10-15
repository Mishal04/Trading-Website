/**
 * profitBasedCommissionService.js
 * 
 * NEW PROFIT-BASED 21-LEVEL COMMISSION ENGINE
 * 
 * Replaces investment-based commission logic with profit-based calculation.
 * Commission = team member's daily ROI profit × level rate (not investment amount)
 * 
 * KEY CONCEPTS:
 * - Each person is their own tree root with no personal level
 * - Their directs are L1 for them, those directs' referrals are L2, etc.
 * - Level unlocking: 1 direct → L1+L2, 2 → L1-L4, 3 → L1-L6, 5 → L1-L10, 10+ → L1-L21
 * - Pay only unlocked levels (traverse full referral tree depth-first, not just L1)
 * - Only process members with active investments (if $0 daily ROI → $0 commission)
 */

const User = require('../models/User');
const InvestorInvestment = require('../models/InvestorInvestment');
const CommissionLog = require('../models/CommissionLog');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const constants = require('../../config/constants');

// Reference 21-Level Rates from constants.js
const LEVEL_RATES = constants.LEVEL_RATES;

/**
 * OPTIMIZED: Find all team members at a specific referral depth from an upline.
 * Uses ancestorPath to avoid recursive queries (massive performance boost).
 * 
 * @param {ObjectId} uplineId - The upline member (tree root for this calculation)
 * @param {number} targetDepth - Which level to find (1-21)
 * @returns {Promise<Array>} Array of User documents at targetDepth with active investments
 */
async function findTeamMembersAtDepth(uplineId, targetDepth) {
  // Use ancestorPath to find members at exact depth
  // ancestorPath[0] = direct upline, ancestorPath[1] = 2nd level, etc.
  // So if ancestorPath[targetDepth-1] === uplineId, they're at targetDepth level
  
  const query = {
    isActive: true,
    totalInvested: { $gt: 0 },
    [`ancestorPath.${targetDepth - 1}`]: uplineId  // Check if upline is at the correct depth
  };
  
  const membersAtTarget = await User.find(query).select('_id name isActive totalInvested');
  return membersAtTarget;
}

/**
 * Calculate commissions for all unlocked levels for a single investor.
 * This is called after daily ROI is credited to the investor.
 * 
 * ALGORITHM:
 * 1. Get investor's upline (direct referrer)
 * 2. For each UNLOCKED level (L1-L21):
 *    a. Find all team members at that depth relative to upline
 *    b. For each member: commission = investor's daily ROI × level rate
 *    c. Credit commission to upline member
 * 
 * @param {Object} investor - User document with ancestorPath and totalInvested
 * @param {number} dailyRoiProfit - Daily ROI amount (e.g., $1.50 from daily calculation)
 * @returns {Promise<Object>} { totalPaid: number, levelsProcessed: number, details: Array }
 */
async function calculateProfitBasedCommissions(investor, dailyRoiProfit) {
  const result = {
    totalPaid: 0,
    levelsProcessed: 0,
    details: []
  };

  // ── VALIDATION ────────────────────────────────────────────────────────
  if (!investor || !investor._id) {
    return result;  // Invalid investor
  }

  if (!investor.ancestorPath || investor.ancestorPath.length === 0) {
    return result;  // No upline, no commissions
  }

  if (dailyRoiProfit <= 0) {
    return result;  // No profit, no commissions
  }

  if ((investor.totalInvested || 0) <= 0) {
    return result;  // No active investment, no commissions
  }

  // ── STEP 1: Get the direct upline (investor's referrer) ────────────────
  const uplineId = investor.ancestorPath[0];
  const upline = await User.findById(uplineId).select('name email isActive totalInvested directCount role');

  if (!upline || !upline.isActive || (upline.totalInvested || 0) <= 0) {
    return result;  // Upline not active or has no investment, no commissions
  }

  // ── STEP 2: Determine upline's unlocked levels ─────────────────────────
  // Levels unlock from L21 downward based on upline's direct referral count
  const unlockedLevelNumbers = constants.getUnlockedLevelNumbers(upline.directCount || 0);

  if (unlockedLevelNumbers.length === 0) {
    return result;  // Upline has no unlocked levels yet
  }

  // ── STEP 3: Process each unlocked level ───────────────────────────────
  for (const level of unlockedLevelNumbers) {
    try {
      // Find all team members at this depth relative to upline
      const membersAtLevel = await findTeamMembersAtDepth(uplineId, level);

      if (membersAtLevel.length === 0) {
        continue;  // No members at this level
      }

      // Get the commission rate for this level (LEVEL_RATES is 1-indexed)
      const ratePercent = LEVEL_RATES[level];

      if (!ratePercent || ratePercent <= 0) {
        continue;  // Invalid rate for this level
      }

      // ── Calculate commission for each member at this level ──────────────
      for (const member of membersAtLevel) {
        try {
          // Get member's active investments to calculate their daily ROI
          const memberInvs = await InvestorInvestment.find({ userId: member._id, status: 'active' }).lean();
          let memberDailyRoi = 0;
          memberInvs.forEach(inv => {
            memberDailyRoi += inv.amount * inv.dailyRate;
          });

          if (memberDailyRoi <= 0) {
            continue;  // Member has no active profit
          }

          // Commission = member's daily ROI profit × level rate
          const commissionAmount = Number(((memberDailyRoi * ratePercent) / 100).toFixed(4));

          if (commissionAmount <= 0) {
            continue;
          }

          // ── CRITICAL: Check if commission already exists for this (upline, member, level) today ────
          // This prevents duplicates when multiple team members trigger commission calculations
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          const existingComm = await Transaction.findOne({
            userId: uplineId,
            type: 'commission',
            amount: commissionAmount,
            description: { $regex: `L${level}.*from ${member.name}` },
            createdAt: { $gte: startOfToday }
          });

          if (existingComm) {
            // Commission already created for this level from this member today
            continue;
          }

          // ── Check upline's income cap (upline must not be over cap) ────
          if (upline.hasReachedIncomeCap && upline.hasReachedIncomeCap()) {
            console.log(`[PROFIT-BASED-COMM] L${level} Upline ${upline.name} income cap reached, skipping`);
            continue;
          }

          // ── Credit commission to upline ───────────────────────────────
          await User.findByIdAndUpdate(uplineId, {
            $inc: {
              'wallet.commission': commissionAmount,
              totalEarned: commissionAmount
            }
          });

          // ── Log commission transaction ────────────────────────────────
          await CommissionLog.create({
            recipientId: uplineId,
            sourceUserId: investor._id,
            level: level,
            commissionType: 'profit_based_level',
            rate: ratePercent,
            baseAmount: memberDailyRoi,
            commissionAmount,
            description: `L${level} profit-based commission (${ratePercent}%) from ${member.name}'s $${memberDailyRoi.toFixed(2)} daily ROI`
          });

          // ── Create audit transaction ──────────────────────────────────
          await Transaction.create({
            userId: uplineId,
            type: 'commission',
            amount: commissionAmount,
            status: 'completed',
            description: `L${level} profit-based commission (${ratePercent}%) from ${member.name}'s $${memberDailyRoi.toFixed(2)} daily ROI`,
            referenceId: investor._id,
            referenceModel: 'User'
          });

          // ── Send notification ─────────────────────────────────────────
          await Notification.create({
            userId: uplineId,
            title: 'Commission Received',
            message: `You earned $${commissionAmount.toFixed(2)} in Level ${level} commission from ${member.name}'s daily ROI!`,
            type: 'commission'
          });

          result.totalPaid += commissionAmount;
          result.details.push({
            level,
            rate: ratePercent,
            upline: upline.name,
            teamMember: member.name,
            memberDailyRoi,
            commissionAmount
          });

          console.log(
            `[PROFIT-BASED-COMM] L${level} | Rate=${ratePercent}% | Base=$${memberDailyRoi.toFixed(2)} | ` +
            `Commission=$${commissionAmount.toFixed(4)} | From: ${member.name} → ${upline.name}`
          );

        } catch (memberErr) {
          console.error(`[PROFIT-BASED-COMM] Error processing L${level} member ${member._id}:`, memberErr.message);
        }
      }

      result.levelsProcessed++;

    } catch (levelErr) {
      console.error(`[PROFIT-BASED-COMM] Error processing level ${level}:`, levelErr.message);
    }
  }

  return result;
}

/**
 * Process daily commissions for investor investments.
 * Called from profitService.js after daily ROI is credited.
 * 
 * ENTRY POINT: Use this function in profitService.js calculateDailyProfits()
 * 
 * @param {Object} investment - InvestorInvestment document
 * @param {number} dailyRoiAmount - Daily ROI profit calculated for this investment
 * @param {Object} investor - User document with complete hierarchy data
 * @returns {Promise<Object>} Result with totalPaid, levelsProcessed, details
 */
async function distributeProfitBasedCommissions(investment, dailyRoiAmount, investor) {
  if (!investment || !investor) {
    return { totalPaid: 0, levelsProcessed: 0, details: [] };
  }

  try {
    const result = await calculateProfitBasedCommissions(investor, dailyRoiAmount);
    return result;
  } catch (err) {
    console.error('[PROFIT-BASED-COMM] Fatal error in distributeProfitBasedCommissions:', err);
    return { totalPaid: 0, levelsProcessed: 0, details: [], error: err.message };
  }
}

/**
 * BATCH COMMISSION RUN: Recalculate all commissions for all investors.
 * Use this for testing or monthly reconciliation.
 * 
 * Iterates through all InvestorInvestment records with daily ROI and recalculates
 * commissions from scratch (meant for admin use, not automated).
 * 
 * @returns {Promise<Object>} Aggregated statistics
 */
async function batchRecalculateCommissions() {
  console.log('[BATCH-RECALC] Starting batch commission recalculation...');

  const InvestorInvestment = require('../models/InvestorInvestment');
  
  const result = {
    totalProcessed: 0,
    totalCommissionsPaid: 0,
    usersWithCommissions: 0,
    startTime: new Date(),
    endTime: null
  };

  try {
    // Get all active investor investments that have earned ROI
    const investments = await InvestorInvestment.find({
      userId: { $ne: null },
      status: { $in: ['active', 'completed'] },
      totalRoiEarned: { $gt: 0 }
    }).populate('userId');

    console.log(`[BATCH-RECALC] Found ${investments.length} investments with ROI earned`);

    for (const investment of investments) {
      try {
        const investor = investment.userId;
        if (!investor || !investor.isActive) continue;

        // Calculate daily ROI for this investment (using current phase)
        // For simplicity in batch run, use average daily rate
        let avgDailyRoi = (investment.totalRoiEarned / investment.amount) * 100; // Rough estimate
        if (avgDailyRoi <= 0) continue;

        const commissionResult = await calculateProfitBasedCommissions(investor, avgDailyRoi);
        
        if (commissionResult.totalPaid > 0) {
          result.totalCommissionsPaid += commissionResult.totalPaid;
          result.usersWithCommissions++;
        }
        result.totalProcessed++;

      } catch (investErr) {
        console.error(`[BATCH-RECALC] Error processing investment ${investment._id}:`, investErr.message);
      }
    }

    result.endTime = new Date();
    console.log(
      `[BATCH-RECALC] Complete. ` +
      `Processed: ${result.totalProcessed}, ` +
      `Total Commissions: $${result.totalCommissionsPaid.toFixed(2)}, ` +
      `Users: ${result.usersWithCommissions}`
    );

    return result;

  } catch (err) {
    console.error('[BATCH-RECALC] Fatal error:', err);
    result.endTime = new Date();
    result.error = err.message;
    return result;
  }
}

module.exports = {
  findTeamMembersAtDepth,
  calculateProfitBasedCommissions,
  distributeProfitBasedCommissions,
  batchRecalculateCommissions
};

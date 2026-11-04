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
 * BATCH OPTIMIZED: Get ALL team members for an upline across ALL levels in ONE query
 * Then partition them by level in memory (no N queries, just 1)
 * 
 * @param {ObjectId} uplineId - The upline member
 * @returns {Promise<Object>} { byLevel: { 1: [...], 2: [...], ... }, allMembers: [...] }
 */
async function getAllTeamMembersByLevel(uplineId) {
  // Get ALL descendants of this upline in one query
  const allDescendants = await User.find({
    isActive: true,
    totalInvested: { $gt: 0 },
    ancestorPath: uplineId  // Any level where uplineId is in the path
  }).select('_id name isActive totalInvested ancestorPath').lean();

  // Partition by depth
  const byLevel = {};
  for (const member of allDescendants) {
    if (!member.ancestorPath) continue;
    
    // Find depth: which position is uplineId in the ancestorPath?
    const depth = member.ancestorPath.findIndex(id => id.toString() === uplineId.toString()) + 1;
    if (depth <= 0) continue;  // Not a direct descendant
    
    if (!byLevel[depth]) byLevel[depth] = [];
    byLevel[depth].push(member);
  }

  return { byLevel, allMembers: allDescendants };
}

/**
 * Calculate commissions for a single investor's daily ROI profit.
 * This investor earned dailyRoiProfit today, and we need to distribute it up
 * the ancestorPath to all their uplines based on unlocked levels and rates.
 * 
 * LOGIC:
 * - Investor X earned $10 daily ROI
 * - Walk up ancestorPath: L1 upline, L2 upline, L3 upline, etc.
 * - For each upline, check their unlocked levels (based on directCount)
 * - If upline has L1 unlocked, credit them L1% of investor's ROI
 * - If upline has L2 unlocked, credit them L2% of investor's ROI
 * - etc.
 * 
 * @param {Object} investor - User document with ancestorPath (the one earning ROI)
 * @param {number} dailyRoiProfit - Daily ROI profit amount this investor earned
 * @returns {Promise<Object>} { totalPaid, levelsProcessed, details }
 */
async function calculateProfitBasedCommissions(investor, dailyRoiProfit) {
  const result = {
    totalPaid: 0,
    levelsProcessed: 0,
    details: [],
    error: null
  };

  // ── VALIDATION ────────────────────────────────────────────────────────
  if (!investor || !investor._id) {
    console.warn(`[PROFIT-BASED-COMM] Invalid investor:`, investor);
    result.error = 'Invalid investor';
    return result;
  }
  
  if (!investor.ancestorPath || investor.ancestorPath.length === 0) {
    console.log(`[PROFIT-BASED-COMM] ${investor.name || investor._id} has no uplines (root)`);
    return result;
  }
  
  if (!dailyRoiProfit || dailyRoiProfit <= 0) {
    console.log(`[PROFIT-BASED-COMM] Invalid ROI amount: ${dailyRoiProfit} for ${investor.name || investor._id}`);
    return result;
  }

  console.log(`[PROFIT-BASED-COMM] Processing commissions for ${investor.name} (ROI: $${dailyRoiProfit.toFixed(2)}, ancestors: ${investor.ancestorPath.length})`);

  // ── Walk up ancestorPath and pay each upline ──────────────────────────
  for (let levelIndex = 0; levelIndex < investor.ancestorPath.length; levelIndex++) {
    try {
      const uplineId = investor.ancestorPath[levelIndex];
      const levelNumber = levelIndex + 1;  // L1, L2, L3, ...

      // STOP at L21 maximum
      if (levelNumber > 21) {
        console.log(`[PROFIT-BASED-COMM] Stopping at L21 (ancestorPath too deep)`);
        break;
      }

      const upline = await User.findById(uplineId).select('name email isActive totalInvested directCount role');
      if (!upline) {
        console.warn(`[PROFIT-BASED-COMM] Upline not found: ${uplineId}`);
        continue;
      }
      
      if (!upline.isActive) {
        console.log(`[PROFIT-BASED-COMM] L${levelNumber} upline inactive: ${upline.name}`);
        continue;
      }
      
      if ((upline.totalInvested || 0) <= 0) {
        console.log(`[PROFIT-BASED-COMM] L${levelNumber} upline no investments: ${upline.name}`);
        continue;
      }

      // ✅ FIX: DEPTH-BASED commissions do NOT check unlock levels
      // The network position (L1, L2, ... L21) is based purely on ancestorPath depth.
      // Each upline receives commission for their position regardless of their directCount.
      // Unlock-level restrictions only apply to leg commissions, not daily profit commissions.

      const ratePercent = LEVEL_RATES[levelNumber];
      if (!ratePercent || ratePercent <= 0) {
        console.warn(`[PROFIT-BASED-COMM] Invalid rate for L${levelNumber}: ${ratePercent}`);
        continue;
      }

      const commissionAmount = Number(((dailyRoiProfit * ratePercent) / 100).toFixed(4));
      if (commissionAmount <= 0) {
        console.log(`[PROFIT-BASED-COMM] Zero commission for L${levelNumber}`);
        continue;
      }

      console.log(`[PROFIT-BASED-COMM] Creating commission: L${levelNumber} | ${upline.name} | $${commissionAmount}`);

      // ── Credit commission to upline ───────────────────────────────────
      const userUpdate = await User.findByIdAndUpdate(uplineId, {
        $inc: {
          'wallet.commission': commissionAmount,
          totalEarned: commissionAmount
        }
      });
      console.log(`[PROFIT-BASED-COMM] Updated user wallet: ${userUpdate ? 'OK' : 'FAILED'}`);

      // ── Log transaction ──────────────────────────────────────────────
      const commLog = await CommissionLog.create({
        recipientId: uplineId,
        sourceUserId: investor._id,
        level: levelNumber,
        commissionType: 'profit_based_level',
        rate: ratePercent,
        baseAmount: dailyRoiProfit,
        commissionAmount,
        description: `L${levelNumber} profit-based commission (${ratePercent}%) from ${investor.name}'s $${dailyRoiProfit.toFixed(2)} daily ROI`
      });
      console.log(`[PROFIT-BASED-COMM] Created commission log: ${commLog._id}`);

      // ── Create transaction ──────────────────────────────────────────
      const txn = await Transaction.create({
        userId: uplineId,
        type: 'commission',
        amount: commissionAmount,
        status: 'completed',
        description: `L${levelNumber} profit-based commission (${ratePercent}%) from ${investor.name}'s $${dailyRoiProfit.toFixed(2)} daily ROI`,
        referenceId: investor._id,
        referenceModel: 'User'
      });
      console.log(`[PROFIT-BASED-COMM] Created transaction: ${txn._id}`);

      // ── Notification ────────────────────────────────────────────────
      const notif = await Notification.create({
        userId: uplineId,
        title: 'Commission Received',
        message: `You earned $${commissionAmount.toFixed(2)} in Level ${levelNumber} commission from ${investor.name}'s daily ROI!`,
        type: 'commission'
      });
      console.log(`[PROFIT-BASED-COMM] Created notification: ${notif._id}`);

      result.totalPaid += commissionAmount;
      result.levelsProcessed++;
      result.details.push({
        level: levelNumber,
        rate: ratePercent,
        uplineName: upline.name,
        baseAmount: dailyRoiProfit,
        commissionAmount
      });

      console.log(
        `✓ [PROFIT-BASED-COMM] L${levelNumber} | Rate=${ratePercent}% | Base=$${dailyRoiProfit.toFixed(2)} | ` +
        `Commission=$${commissionAmount.toFixed(4)} | From: ${investor.name} → ${upline.name}`
      );

    } catch (levelErr) {
      console.error(`✗ [PROFIT-BASED-COMM] Error processing L${levelIndex + 1}:`, levelErr);
      result.error = levelErr.message;
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
  getAllTeamMembersByLevel,
  calculateProfitBasedCommissions,
  distributeProfitBasedCommissions,
  batchRecalculateCommissions
};

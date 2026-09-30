// backend/src/services/incomeService.js
// Service functions for ROI, level unlocking, caps, and income distribution

const mongoose = require('mongoose');
const User = require('../models/User');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const CommissionLog = require('../models/CommissionLog');
const Notification = require('../models/Notification');
const constants = require('../../config/constants');

/**
 * Get ROI percent (daily or monthly) based on investment amount and date.
 * Returns an object { rate: number, period: 'daily'|'monthly' }
 */
function getRoiPercent(amount, date = new Date()) {
  const periods = constants.ROI_PERIODS;
  const target = periods.find(p => {
    const start = p.start;
    const end = p.end ? p.end : null;
    return date >= start && (end === null || date <= end);
  });
  if (!target) return { rate: 0, period: 'daily' };

  const rateObj = target.rates.find(r => amount >= r.min && amount <= r.max);
  if (!rateObj) return { rate: 0, period: 'daily' };

  if (rateObj.daily) {
    return { rate: rateObj.daily, period: 'daily' };
  }
  if (rateObj.monthly) {
    return { rate: rateObj.monthly, period: 'monthly' };
  }
  return { rate: 0, period: 'daily' };
}

/**
 * Determine income cap multiplier based on investment and referral status.
 * NEW LOGIC:
 * - No investment: cap = 0 (cannot earn)
 * - Has investment: cap = 3X
 * - Has investment AND at least one referral who also invested: cap = 5X
 */
async function getCapMultiplier(user) {
  // User must have at least one approved/active investment for any earning
  if (!user.totalInvested || user.totalInvested <= 0) {
    return 0; // No cap — cannot earn
  }

  // Check if user has at least one active referral (direct referral who has invested)
  const activeReferralCount = await User.countDocuments({
    referredBy: user._id,
    totalInvested: { $gt: 0 }
  });

  // If user has at least one referral who invested, cap is 5X; otherwise 3X
  return activeReferralCount > 0 ? 5 : 3;
}

/**
 * Check if user can still earn ROI/level income (not exceeding cap).
 * NEW LOGIC:
 * - Cap = 3X if user has investment but no active referrals
 * - Cap = 5X if user has investment AND at least one active referral
 */
async function canEarnMore(user) {
  const capMultiplier = await getCapMultiplier(user);
  if (capMultiplier === 0) return false; // No investment, cannot earn
  
  const cap = user.totalInvested * capMultiplier;
  return user.totalEarned < cap;
}

/**
 * Credit ROI to investor, respecting income cap (3X or 5X based on investment + referral status).
 */
async function creditRoiToInvestor(userId, investmentId, amount) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  const canEarn = await canEarnMore(user);
  if (!canEarn) {
    return { credited: 0, capped: true };
  }
  
  const capMultiplier = await getCapMultiplier(user);
  const cap = user.totalInvested * capMultiplier;
  const remaining = cap - user.totalEarned;
  const credit = Math.min(amount, remaining);

  await User.findByIdAndUpdate(userId, {
    $inc: {
      'wallet.profit': credit,
      totalEarned: credit
    }
  });

  await Transaction.create({
    userId,
    type: 'ROI',
    amount: credit,
    status: 'completed',
    description: `ROI credit for investment ${investmentId}`,
    referenceId: investmentId,
    referenceModel: 'Investment'
  });

  return { credited: credit, capped: credit < amount };
}

/**
 * Credit level commission to upline, respecting income cap (3X or 5X based on investment + referral status).
 */
async function creditCommissionToUpline(upline, sourceUser, levelIdx, ratePercent, levelAmount, baseAmount) {
  const canEarn = await canEarnMore(upline);
  if (!canEarn) {
    return { credited: 0, capped: true };
  }
  
  const capMultiplier = await getCapMultiplier(upline);
  const cap = upline.totalInvested * capMultiplier;
  const remaining = Math.max(0, cap - (upline.totalEarned || 0));
  const credit = Number(Math.min(levelAmount, remaining).toFixed(4));
  if (credit <= 0) return { credited: 0, capped: true };

  const level = levelIdx + 1;

  // Credit upline commission wallet
  await User.findByIdAndUpdate(upline._id, {
    $inc: {
      'wallet.commission': credit,
      totalEarned: credit,
      [`commissions.levelCommissions.${levelIdx}`]: credit
    }
  });

  // Create Transaction of type 'commission'
  await Transaction.create({
    userId: upline._id,
    type: 'commission',
    amount: credit,
    status: 'completed',
    description: `Level ${level} commission (${ratePercent}%) from ${sourceUser.name || 'referral'}`,
    referenceId: sourceUser._id,
    referenceModel: 'User'
  });

  // Create CommissionLog
  await CommissionLog.create({
    recipientId: upline._id,
    sourceUserId: sourceUser._id,
    level,
    commissionType: 'level',
    rate: ratePercent,
    baseAmount,
    commissionAmount: credit,
    description: `Level ${level} commission (${ratePercent}%) from ${sourceUser.name || 'referral'}`
  });

  // Create Notification
  await Notification.create({
    userId: upline._id,
    title: 'Commission Received',
    message: `You earned $${credit} in Level ${level} commission from your team!`,
    type: 'commission'
  });

  return { credited: credit, capped: credit < levelAmount };
}

/**
 * DEPRECATED: Use commissionService.distributeLevelCommissionsWithChecks() instead.
 * 
 * This function is kept for backwards compatibility with admin manual credit endpoints.
 * It delegates to the centralized commission distribution service.
 * 
 * Distributes level income using REVERSE commission unlock order:
 * L21 unlocks first, L1 unlocks last (based on directCount).
 */
async function distributeLevelIncome(sourceUserId, baseAmount) {
  // Delegate to centralized commission service
  const sourceUser = await User.findById(sourceUserId).select('name email ancestorPath directCount _id');
  if (!sourceUser) throw new Error('Source user not found');
  
  // For backwards compatibility, call the centralized service
  // This ensures single source of truth for commission logic
  const commissionService = require('./commissionService');
  
  // Create a temporary investment-like object for compatibility
  const tempInvestment = {
    _id: sourceUser._id,
    userId: sourceUser._id
  };
  
  await commissionService.distributeLevelCommissionsWithChecks(
    tempInvestment,
    baseAmount,
    sourceUser,
    'ManualCredit',
    true
  );
  
  return { success: true, message: 'Commission distributed via centralized service' };
}

module.exports = {
  getRoiPercent,
  getCapMultiplier,
  canEarnMore,
  creditRoiToInvestor,
  creditCommissionToUpline,
  distributeLevelIncome
};

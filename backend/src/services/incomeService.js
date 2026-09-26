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
 * Determine unlocked levels based on direct referral count.
 */
function getUnlockedLevels(directCount) {
  if (directCount >= 10) return 21;
  const rules = constants.LEVEL_UNLOCK_RULES;
  return rules[directCount] || 0;
}

/**
 * Check if user can still earn ROI/level income (not exceeding cap).
 * Cap is 3X for locked users, 5X for users with networkerAccessGranted.
 */
function canEarnMore(user) {
  // Determine cap multiplier: 3X if no networker access, 5X if networker access granted
  const capMultiplier = user.networkerAccessGranted ? 5 : 3;
  const cap = user.totalInvested * capMultiplier;
  return user.totalEarned < cap;
}

/**
 * Credit ROI to investor, respecting income cap (3X or 5X based on networkerAccessGranted).
 */
async function creditRoiToInvestor(userId, investmentId, amount) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (!canEarnMore(user)) {
    return { credited: 0, capped: true };
  }
  // Determine cap multiplier: 3X if no networker access, 5X if networker access granted
  const capMultiplier = user.networkerAccessGranted ? 5 : 3;
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
 * Credit level commission to upline, respecting income cap (3X or 5X based on networkerAccessGranted).
 */
async function creditCommissionToUpline(upline, sourceUser, levelIdx, ratePercent, levelAmount, baseAmount) {
  if (!canEarnMore(upline)) {
    return { credited: 0, capped: true };
  }
  // Determine cap multiplier: 3X if no networker access, 5X if networker access granted
  const capMultiplier = upline.networkerAccessGranted ? 5 : 3;
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
 * Distribute level income up the upline chain.
 */
async function distributeLevelIncome(sourceUserId, baseAmount) {
  const sourceUser = await User.findById(sourceUserId).select('name email ancestorPath role unlockedLevels');
  if (!sourceUser) throw new Error('Source user not found');

  const rates = constants.LEVEL_RATES;
  const maxLevels = Math.min(rates.length, sourceUser.ancestorPath.length);
  const results = [];

  for (let i = 0; i < maxLevels; i++) {
    const uplineId = sourceUser.ancestorPath[i];
    const levelIdx = i; // 0 = L1
    const ratePercent = rates[levelIdx];
    if (!ratePercent) continue;
    const upline = await User.findById(uplineId);
    if (!upline || !upline.isActive) continue;
    if (upline.unlockedLevels < levelIdx + 1) continue;
    const levelAmount = Number(((baseAmount * ratePercent) / 100).toFixed(4));
    if (levelAmount <= 0) continue;
    if (upline.getIncomeCap && upline.hasReachedIncomeCap && upline.hasReachedIncomeCap()) continue;

    const creditInfo = await creditCommissionToUpline(upline, sourceUser, levelIdx, ratePercent, levelAmount, baseAmount);
    if (creditInfo.credited > 0) {
      results.push({ uplineId, level: levelIdx + 1, amount: creditInfo.credited });
    }
  }
  return results;
}

module.exports = {
  getRoiPercent,
  getUnlockedLevels,
  canEarnMore,
  creditRoiToInvestor,
  creditCommissionToUpline,
  distributeLevelIncome
};

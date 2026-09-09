// backend/src/services/incomeService.js
// Service functions for ROI, level unlocking, caps, and income distribution

const mongoose = require('mongoose');
const User = require('../models/User');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
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
 */
function canEarnMore(user) {
  const cap = user.getIncomeCap ? user.getIncomeCap() : user.totalInvested * (user.role === 'working_leader' ? constants.INCOME_CAPS.working_leader : constants.INCOME_CAPS.investor);
  return user.totalEarned < cap;
}

/**
 * Credit ROI to investor, respecting income cap.
 */
async function creditRoiToInvestor(userId, investmentId, amount) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (!canEarnMore(user)) {
    return { credited: 0, capped: true };
  }
  const cap = user.getIncomeCap();
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
 * Distribute level income up the upline chain.
 */
async function distributeLevelIncome(sourceUserId, baseAmount) {
  const sourceUser = await User.findById(sourceUserId).select('ancestorPath role unlockedLevels');
  if (!sourceUser) throw new Error('Source user not found');

  const rates = constants.LEVEL_RATES;
  const maxLevels = Math.min(rates.length, sourceUser.ancestorPath.length);
  const results = [];

  for (let i = 0; i < maxLevels; i++) {
    const uplineId = sourceUser.ancestorPath[i];
    const levelIdx = i; // 0 = L1
    const rate = rates[levelIdx];
    if (!rate) continue;
    const upline = await User.findById(uplineId);
    if (!upline) continue;
    if (upline.unlockedLevels < levelIdx + 1) continue;
    const levelAmount = baseAmount * rate;
    if (upline.getIncomeCap && upline.hasReachedIncomeCap && upline.hasReachedIncomeCap()) continue;
    const creditInfo = await creditRoiToInvestor(uplineId, sourceUserId, levelAmount);
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
  distributeLevelIncome
};

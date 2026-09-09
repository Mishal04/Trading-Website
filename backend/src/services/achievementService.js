const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { ACHIEVEMENT_TIERS } = require('../../config/constants');

/**
 * Helper to check 60/40 qualification:
 * - Target = targetVolume
 * - Strong leg max allowed = 60% of targetVolume
 * - Other legs min required = 40% of targetVolume
 */
const check6040Qualification = (strongTeam, otherTeam, targetVolume) => {
  const maxStrongAllowed = targetVolume * 0.60;
  const minOtherRequired = targetVolume * 0.40;

  const effectiveStrong = Math.min(strongTeam, maxStrongAllowed);
  const effectiveOther = otherTeam;

  return (effectiveStrong + effectiveOther) >= targetVolume && effectiveOther >= minOtherRequired;
};

/**
 * Calculate the user's strong team and other team BV from their direct referral legs.
 */
const calculateLegVolumes = async (userId) => {
  const directReferrals = await User.find({ referredBy: userId })
    .select('totalInvested teamBusiness');

  const legs = directReferrals.map((ref) => ({
    teamVolume: (ref.teamBusiness?.total || 0) + (ref.totalInvested || 0)
  }));

  legs.sort((a, b) => b.teamVolume - a.teamVolume);

  const strongTeam = legs.length > 0 ? legs[0].teamVolume : 0;
  const otherTeam = legs.slice(1).reduce((sum, leg) => sum + leg.teamVolume, 0);
  const total = strongTeam + otherTeam;

  return { strongTeam, otherTeam, total };
};

/**
 * Check qualification for all achievement tiers for a given user.
 */
const checkUserAchievements = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const { strongTeam, otherTeam, total } = await calculateLegVolumes(userId);

  // Update user team business fields if different
  user.teamBusiness = { strongTeam, otherTeam, total };
  await user.save();

  const claimedSet = new Set(user.achievementsClaimed || []);

  const results = ACHIEVEMENT_TIERS.map((tier) => {
    const isQualified = check6040Qualification(strongTeam, otherTeam, tier.bv);
    const isClaimed = claimedSet.has(tier.name);
    return {
      tierName: tier.name,
      bvRequired: tier.bv,
      rewardAmount: tier.reward, // Fixed tier reward amount from constants
      isQualified,
      isClaimed,
      canClaim: isQualified && !isClaimed
    };
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      achievementsClaimed: user.achievementsClaimed || []
    },
    volumes: { strongTeam, otherTeam, total },
    tiers: results
  };
};

/**
 * Claim all eligible achievements or a specific tier for a user.
 * - Pays the FIXED tier reward amount from constants (e.g. Pioneer = $20, Builder = $100)
 * - 60/40 rule applies only for BV qualification
 * - Credits wallet.profit
 * - Pushes tier name to achievementsClaimed[]
 * - Does NOT increase totalEarned
 */
const claimUserAchievements = async (userId, specificTierName = null) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const { strongTeam, otherTeam, total } = await calculateLegVolumes(userId);
  const claimedSet = new Set(user.achievementsClaimed || []);

  let eligibleTiers = ACHIEVEMENT_TIERS.filter((tier) => {
    if (claimedSet.has(tier.name)) return false;
    if (specificTierName && tier.name !== specificTierName) return false;
    return check6040Qualification(strongTeam, otherTeam, tier.bv);
  });

  if (eligibleTiers.length === 0) {
    return {
      claimedCount: 0,
      totalRewarded: 0,
      claimedTiers: [],
      message: 'No eligible unclaimed achievements found'
    };
  }

  let totalRewarded = 0;
  const claimedTiers = [];

  for (const tier of eligibleTiers) {
    const fixedReward = tier.reward;

    // 1. Credit wallet.profit and record in achievementsClaimed. DO NOT increment totalEarned!
    user.wallet.profit = Number((user.wallet.profit + fixedReward).toFixed(4));
    if (!user.achievementsClaimed) user.achievementsClaimed = [];
    user.achievementsClaimed.push(tier.name);

    totalRewarded += fixedReward;
    claimedTiers.push({ tier: tier.name, reward: fixedReward });

    // 2. Create Transaction audit record
    await Transaction.create({
      userId: user._id,
      type: 'profit',
      amount: fixedReward,
      status: 'completed',
      description: `Achievement reward: ${tier.name} ($${fixedReward} USDT)`,
      metadata: {
        achievementTier: tier.name,
        bvRequired: tier.bv,
        rewardAmount: fixedReward,
        teamVolumes: { strongTeam, otherTeam, total }
      }
    });

    // 3. Create Notification
    await Notification.create({
      userId: user._id,
      title: `Achievement Unlocked: ${tier.name}!`,
      message: `Congratulations! You qualified for the ${tier.name} rank and received $${fixedReward} USDT credited to your Profit wallet.`,
      type: 'reward'
    });
  }

  await user.save();

  return {
    claimedCount: claimedTiers.length,
    totalRewarded,
    claimedTiers,
    newProfitBalance: user.wallet.profit,
    achievementsClaimed: user.achievementsClaimed
  };
};

module.exports = {
  check6040Qualification,
  calculateLegVolumes,
  checkUserAchievements,
  claimUserAchievements
};

const User = require('../models/User');
const InvestorInvestment = require('../models/InvestorInvestment');
const Investment = require('../models/Investment');
const commissionService = require('../services/commissionService');
const constants = require('../../config/constants');

/**
 * DISPLAY ONLY: Show ONLY wallet.capital where users actually earn commissions
 * InvestorInvestment & Investment records are DISABLED to avoid confusion
 * Only display invested amount if user is earning commissions from it
 */
const getActiveInvestedMap = async (userIds) => {
  const map = new Map();

  // ONLY show wallet.capital - this is what actually generates commissions (1% daily ROI)
  const users = await User.find({ _id: { $in: userIds } }).select('_id wallet').lean();
  users.forEach((u) => {
    const walletCapital = u.wallet?.capital || 0;
    if (walletCapital > 0) {
      map.set(String(u._id), walletCapital);
    }
  });

  return map;
};


/**
 * GET /api/team/business
 *
 * Returns the direct-referral leg breakdown and 60/40 qualification status.
 * Uses referredBy (direct referrals only) to build leg list.
 */
const getTeamBusiness = async (req, res) => {
  try {
    const userId = req.user._id;

    // Direct referrals: users whose referredBy === current user
    const directReferrals = await User.find({ referredBy: userId })
      .select('_id name email referralCode teamBusiness isActive isVerified createdAt');

    // Batch fetch active investments for all direct referrals (display only)
    const investedMap = await getActiveInvestedMap(directReferrals.map((r) => r._id));

    // Calculate active investments for each direct referral
    const legsPromises = directReferrals.map(async (ref) => {
      // DISPLAY ONLY: fetch live investment amounts from real records
      const directInvestment = investedMap.get(String(ref._id)) || 0;

      return {
        userId:          ref._id,
        name:            ref.name,
        email:           ref.email,
        referralCode:    ref.referralCode,
        isActive:        ref.isActive,
        isVerified:      ref.isVerified,
        joinedAt:        ref.createdAt,
        directInvestment,
        // Leg volume = this person's own investment + their entire team below them
        teamVolume: (ref.teamBusiness?.total || 0) + directInvestment,
      };
    });

    const legs = await Promise.all(legsPromises);

    // Sort descending to identify Strong vs Other legs
    legs.sort((a, b) => b.teamVolume - a.teamVolume);

    const strongTeamVolume = legs.length > 0 ? legs[0].teamVolume : 0;
    const otherTeamVolume  = legs.slice(1).reduce((sum, leg) => sum + leg.teamVolume, 0);
    const totalTeamVolume  = strongTeamVolume + otherTeamVolume;

    // Persist recalculated values back to the user document
    await User.findByIdAndUpdate(userId, {
      'teamBusiness.strongTeam': strongTeamVolume,
      'teamBusiness.otherTeam':  otherTeamVolume,
      'teamBusiness.total':      totalTeamVolume,
    });

    return res.json({
      success: true,
      data: {
        totalTeamVolume,
        strongTeamVolume,
        otherTeamVolume,
        legsCount: legs.length,
        legs,
        qualifications: {
          tier10k:  commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 10000),
          tier25k:  commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 25000),
          tier50k:  commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 50000),
          tier100k: commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 100000),
          tier250k: commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 250000),
          tier500k: commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 500000),
          tier1M:   commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 1000000),
        },
      },
    });
  } catch (error) {
    console.error('Get team business error:', error);
    return res.status(500).json({ success: false, message: 'Server error calculating team business' });
  }
};

/**
 * GET /api/team/downline
 *
 * Returns the full multi-level downline tree.
 *
 * Strategy (dual-source, most reliable):
 *   PRIMARY:   Users who have `userId` in their ancestorPath array.
 *              - Level = index of userId in their ancestorPath + 1
 *   FALLBACK:  Users whose `referredBy === userId` who were NOT found above.
 *              - These are Level 1 direct referrals with incomplete ancestorPath
 *              (can happen if they registered before ancestorPath was set, or
 *               if the referrer had no ancestorPath themselves at signup time).
 *
 * Query params:
 *   maxLevel (default 25) – depth limit
 *   level    (optional)   – filter to a single level
 */
const getDownline = async (req, res) => {
  try {
    const userId    = req.user._id;
    const maxLevel  = Math.min(parseInt(req.query.maxLevel, 10) || 25, 25);
    const levelFilter = req.query.level ? parseInt(req.query.level, 10) : null;

    // ── PRIMARY: users who have current user in their ancestorPath ──────────
    const byAncestorPath = await User.find({ ancestorPath: userId })
      .select('name email referralCode totalInvested investmentLevel isVerified isActive createdAt ancestorPath referredBy directCount wallet')
      .sort({ createdAt: -1 })
      .lean();

    // Build a Set of IDs already found via ancestorPath
    const foundIds = new Set(byAncestorPath.map((u) => u._id.toString()));

    // ── FALLBACK: direct referrals missing from the primary set ─────────────
    const byReferredBy = await User.find({
      referredBy: userId,
      _id: { $nin: Array.from(foundIds).map((id) => require('mongoose').Types.ObjectId.createFromHexString(id)) },
    })
      .select('name email referralCode totalInvested investmentLevel isVerified isActive createdAt ancestorPath referredBy directCount wallet')
      .sort({ createdAt: -1 })
      .lean();

    // ── Merge both sets ──────────────────────────────────────────────────────
    const allUsers = [...byAncestorPath, ...byReferredBy];

    // Batch fetch active investments for all downline users (display only)
    const investedMap = await getActiveInvestedMap(allUsers.map((u) => u._id));

    const structuredDownline = await Promise.all(
      allUsers.map(async (user) => {
        let level = 1; // default for fallback users

        if (user.ancestorPath && user.ancestorPath.length > 0) {
          const idx = user.ancestorPath.findIndex(
            (id) => id.toString() === userId.toString()
          );
          if (idx !== -1) {
            level = idx + 1;
          }
          // If not found in ancestorPath but referredBy matches → Level 1
        }

        // DISPLAY ONLY: fetch live investment amounts from real records
        const totalInvested = investedMap.get(String(user._id)) || 0;

        // Calculate current commission level based on directCount
        const currentCommissionLevel = constants.getCurrentCommissionLevel(user.directCount || 0);

        return {
          id:              user._id,
          name:            user.name,
          email:           user.email,
          referralCode:    user.referralCode,
          totalInvested,
          investmentLevel: user.investmentLevel || 'none',
          isVerified:      user.isVerified,
          isActive:        user.isActive,
          joinedAt:        user.createdAt,
          level,
          directCount:     user.directCount || 0,
          currentCommissionLevel,
        };
      })
    );

    // Filter and sort after all promises resolve
    const filtered = structuredDownline
      .filter((u) => {
        if (u.level > maxLevel) return false;
        // Note: frontend handles currentCommissionLevel filtering
        return true;
      })
      // Sort by level asc, then by join date desc within each level
      .sort((a, b) => a.level - b.level || new Date(b.joinedAt) - new Date(a.joinedAt));

    // Group count by level for quick stats
    const levelCounts = {};
    filtered.forEach((u) => {
      levelCounts[u.level] = (levelCounts[u.level] || 0) + 1;
    });

    return res.json({
      success: true,
      data: {
        totalDownlineCount: filtered.length,
        levelCounts,
        downline: filtered,
      },
    });
  } catch (error) {
    console.error('Get downline error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching downline tree' });
  }
};

/**
 * GET /api/team/stats
 *
 * Summary counts for the dashboard header / overview panel.
 * Uses referredBy for direct counts (most reliable single source).
 */
const getTeamStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const user   = await User.findById(userId);

    // Direct referral counts — referredBy is always set on registration
    const directCount       = await User.countDocuments({ referredBy: userId });
    const activeDirectCount = await User.countDocuments({ referredBy: userId, totalInvested: { $gt: 0 } });

    // Total team depth — union of ancestorPath + direct fallback
    const byAncestorCount = await User.countDocuments({ ancestorPath: userId });
    // Users who only have referredBy (not in ancestorPath) — avoid double-counting
    const fallbackCount = await User.countDocuments({
      referredBy: userId,
      ancestorPath: { $not: { $elemMatch: { $eq: userId } } },
    });
    const totalTeamCount = byAncestorCount + fallbackCount;

    // Sync direct referral count on user document
    await User.findByIdAndUpdate(userId, {
      'referrals.count':       directCount,
      'referrals.activeCount': activeDirectCount,
    });

    return res.json({
      success: true,
      data: {
        referralCode:    user.referralCode,
        directCount,
        activeDirectCount,
        totalTeamCount,
        teamBusiness:    user.teamBusiness || { strongTeam: 0, otherTeam: 0, total: 0 },
      },
    });
  } catch (error) {
    console.error('Get team stats error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching team stats' });
  }
};

module.exports = {
  getTeamBusiness,
  getDownline,
  getTeamStats,
};

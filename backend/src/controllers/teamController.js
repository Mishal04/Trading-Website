const User = require('../models/User');
const commissionService = require('../services/commissionService');

/**
  GET /api/team/business
  Get team business volume breakdown and 60/40 rule status
 */
const getTeamBusiness = async (req, res) => {
  try {
    const userId = req.user._id;

    // Direct legs business breakdown
    const directReferrals = await User.find({ referredBy: userId })
      .select('name email referralCode totalInvestment teamBusiness');

    let legs = directReferrals.map(ref => ({
      userId: ref._id,
      name: ref.name,
      email: ref.email,
      directInvestment: ref.totalInvestment || 0,
      teamVolume: (ref.teamBusiness ? ref.teamBusiness.total : 0) + (ref.totalInvestment || 0)
    }));

    // Sort legs descending by volume to identify Strong Team vs Other Team
    legs.sort((a, b) => b.teamVolume - a.teamVolume);

    const strongTeamVolume = legs.length > 0 ? legs[0].teamVolume : 0;
    const otherTeamVolume = legs.slice(1).reduce((sum, leg) => sum + leg.teamVolume, 0);
    const totalTeamVolume = strongTeamVolume + otherTeamVolume;

    // Update user record with calculated team business
    await User.findByIdAndUpdate(userId, {
      'teamBusiness.strongTeam': strongTeamVolume,
      'teamBusiness.otherTeam': otherTeamVolume,
      'teamBusiness.total': totalTeamVolume
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
          tier10k: commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 10000),
          tier25k: commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 25000),
          tier50k: commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 50000),
          tier100k: commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 100000),
          tier250k: commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 250000),
          tier500k: commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 500000),
          tier1M: commissionService.check6040Qualification(strongTeamVolume, otherTeamVolume, 1000000)
        }
      }
    });
  } catch (error) {
    console.error('Get team business error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error calculating team business'
    });
  }
};

/**
  GET /api/team/downline
  Get referral downline tree (up to 25 levels deep)
 */
const getDownline = async (req, res) => {
  try {
    const userId = req.user._id;
    const maxLevel = parseInt(req.query.maxLevel, 10) || 25;
    const levelFilter = req.query.level ? parseInt(req.query.level, 10) : null;

    // Find all users who have current user in their ancestorPath
    const downlineUsers = await User.find({ ancestorPath: userId })
      .select('name email referralCode totalInvestment investmentLevel isVerified createdAt ancestorPath')
      .sort({ createdAt: -1 });

    const structuredDownline = downlineUsers.map(user => {
      // Index of userId in ancestorPath determines level depth (0 = Level 1 direct)
      const levelIndex = user.ancestorPath.findIndex(id => id.toString() === userId.toString());
      const level = levelIndex !== -1 ? levelIndex + 1 : 1;

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        totalInvestment: user.totalInvestment,
        investmentLevel: user.investmentLevel,
        isVerified: user.isVerified,
        joinedAt: user.createdAt,
        level
      };
    }).filter(user => {
      if (user.level > maxLevel) return false;
      if (levelFilter && user.level !== levelFilter) return false;
      return true;
    });

    // Group count by level
    const levelCounts = {};
    structuredDownline.forEach(u => {
      levelCounts[u.level] = (levelCounts[u.level] || 0) + 1;
    });

    return res.json({
      success: true,
      data: {
        totalDownlineCount: structuredDownline.length,
        levelCounts,
        downline: structuredDownline
      }
    });
  } catch (error) {
    console.error('Get downline error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching downline tree'
    });
  }
};

/**
  GET /api/team/stats
  Summary of team statistics
 */
const getTeamStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    const directCount = await User.countDocuments({ referredBy: userId });
    const activeDirectCount = await User.countDocuments({ referredBy: userId, totalInvestment: { $gt: 0 } });
    const totalTeamCount = await User.countDocuments({ ancestorPath: userId });

    return res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        directCount,
        activeDirectCount,
        totalTeamCount,
        teamBusiness: user.teamBusiness || { strongTeam: 0, otherTeam: 0, total: 0 }
      }
    });
  } catch (error) {
    console.error('Get team stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching team stats'
    });
  }
};

module.exports = {
  getTeamBusiness,
  getDownline,
  getTeamStats
};

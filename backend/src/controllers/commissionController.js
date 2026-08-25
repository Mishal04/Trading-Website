const CommissionLog = require('../models/CommissionLog');
const User = require('../models/User');

/**
  GET /api/commissions/my
  Get logged-in user's commission history
 */
const getMyCommissions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { recipientId: req.user._id };
    if (req.query.type) query.commissionType = req.query.type;

    const total = await CommissionLog.countDocuments(query);
    const commissions = await CommissionLog.find(query)
      .populate('sourceUserId', 'name email referralCode')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      data: {
        commissions,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get my commissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching commissions'
    });
  }
};

/**
  GET /api/commissions/level/:level
  Get commissions filtered by level (1 to 25)
 */
const getCommissionsByLevel = async (req, res) => {
  try {
    const level = parseInt(req.params.level, 10);
    if (isNaN(level) || level < 1 || level > 25) {
      return res.status(400).json({
        success: false,
        message: 'Level must be between 1 and 25'
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {
      recipientId: req.user._id,
      level,
      commissionType: 'level'
    };

    const total = await CommissionLog.countDocuments(query);
    const commissions = await CommissionLog.find(query)
      .populate('sourceUserId', 'name email referralCode')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      data: {
        level,
        commissions,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get commissions by level error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching level commissions'
    });
  }
};

/**
  GET /api/commissions/summary
  Get detailed summary of commissions by type and level
 */
const getCommissionSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    const levelSummary = await CommissionLog.aggregate([
      { $match: { recipientId: userId, commissionType: 'level' } },
      { $group: { _id: '$level', total: { $sum: '$commissionAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const typeSummary = await CommissionLog.aggregate([
      { $match: { recipientId: userId } },
      { $group: { _id: '$commissionType', total: { $sum: '$commissionAmount' }, count: { $sum: 1 } } }
    ]);

    return res.json({
      success: true,
      data: {
        walletCommission: user.wallet ? user.wallet.commission : 0,
        commissionsByLevel: levelSummary,
        commissionsByType: typeSummary,
        userLevelCommissionsArray: user.commissions ? user.commissions.levelCommissions : []
      }
    });
  } catch (error) {
    console.error('Get commission summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating commission summary'
    });
  }
};

module.exports = {
  getMyCommissions,
  getCommissionsByLevel,
  getCommissionSummary
};

const User = require('../models/User');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

/**
  GET /api/dashboard/stats
  Get overall summary statistics for user dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('-password');

    const activeInvestmentsCount = await Investment.countDocuments({ userId, status: 'active' });
    const totalInvestments = user.totalInvestment || 0;
    const totalProfitEarned = user.totalProfitEarned || 0;

    const wallet = user.wallet || { capital: 0, profit: 0, commission: 0 };
    const totalBalance = wallet.capital + wallet.profit + wallet.commission;

    const recentTransactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(5);

    const unreadNotificationsCount = await Notification.countDocuments({ userId, isRead: false });

    return res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          referralCode: user.referralCode,
          investmentLevel: user.investmentLevel,
          accountType: user.accountType,
          isVerified: user.isVerified
        },
        wallet: {
          capital: wallet.capital,
          profit: wallet.profit,
          commission: wallet.commission,
          totalBalance
        },
        investments: {
          totalInvested: totalInvestments,
          activeCount: activeInvestmentsCount,
          totalProfitEarned
        },
        team: {
          directCount: user.referrals ? user.referrals.count : 0,
          teamBusiness: user.teamBusiness || { strongTeam: 0, otherTeam: 0, total: 0 }
        },
        unreadNotificationsCount,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard statistics'
    });
  }
};

/**
  GET /api/transactions
  Get logged-in user's full transaction history
 */
const getUserTransactions = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50)); // cap at 100
    const skip  = (page - 1) * limit;

    const query = { userId: req.user._id };
    if (req.query.type) query.type = req.query.type;

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      data: {
        transactions,
        pagination: { total, page, pages: Math.ceil(total / limit), limit }
      }
    });
  } catch (error) {
    console.error('Get user transactions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching transactions'
    });
  }
};

module.exports = {
  getDashboardStats,
  getUserTransactions
};

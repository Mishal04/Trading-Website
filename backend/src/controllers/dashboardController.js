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

module.exports = {
  getDashboardStats
};

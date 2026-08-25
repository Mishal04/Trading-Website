const { validationResult } = require('express-validator');
const User = require('../models/User');
const Investment = require('../models/Investment');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const CommissionLog = require('../models/CommissionLog');
const Notification = require('../models/Notification');
const SystemPool = require('../models/SystemPool');

/**
  GET /api/admin/users
  View all users with search and pagination (Admin Only)
 */
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { referralCode: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.isVerified !== undefined) query.isVerified = req.query.isVerified === 'true';

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      data: {
        users,
        pagination: { total, page, pages: Math.ceil(total / limit), limit }
      }
    });
  } catch (error) {
    console.error('Admin get all users error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
};

/**
  GET /api/admin/investments
  View all investments system-wide (Admin Only)
 */
const getAllInvestments = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;

    const total = await Investment.countDocuments(query);
    const investments = await Investment.find(query)
      .populate('userId', 'name email referralCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      data: {
        investments,
        pagination: { total, page, pages: Math.ceil(total / limit), limit }
      }
    });
  } catch (error) {
    console.error('Admin get all investments error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching investments' });
  }
};

/**
  POST /api/admin/profit/inject
  Inject gross realized trading profit and split:
  - 60% → Investor Share (SystemPool.investorPool)
  - 10% → Level Commission Pool (SystemPool.levelPool)
  - 6%  → Leadership Salary Pool (SystemPool.salaryPool)
  - 4%  → Performance Reward Pool (SystemPool.rewardPool)
  - 20% → Trader Share (SystemPool.traderSharePool)
 */
const injectRealizedProfit = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { amount, note } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Gross realized profit amount must be greater than 0'
      });
    }

    const grossProfit = Number(amount);
    const investorShare = Number((grossProfit * 0.60).toFixed(4));
    const levelPoolShare = Number((grossProfit * 0.10).toFixed(4));
    const salaryPoolShare = Number((grossProfit * 0.06).toFixed(4));
    const rewardPoolShare = Number((grossProfit * 0.04).toFixed(4));
    const traderShare = Number((grossProfit * 0.20).toFixed(4));

    const pool = await SystemPool.getSingleton();

    pool.totalRealizedProfit += grossProfit;
    pool.investorPool += investorShare;
    pool.levelPool += levelPoolShare;
    pool.salaryPool += salaryPoolShare;
    pool.rewardPool += rewardPoolShare;
    pool.traderSharePool += traderShare;
    pool.lastUpdated = new Date();

    await pool.save();

    // Log Transaction for audit
    await Transaction.create({
      userId: req.user._id,
      type: 'adjustment',
      amount: grossProfit,
      status: 'completed',
      description: note || `Admin injected realized trading profit of $${grossProfit}`,
      metadata: {
        investorShare,
        levelPoolShare,
        salaryPoolShare,
        rewardPoolShare,
        traderShare
      }
    });

    return res.json({
      success: true,
      message: `Successfully injected $${grossProfit} realized trading profit into system pools`,
      data: {
        grossProfit,
        breakdown: {
          investorShare60: investorShare,
          levelPool10: levelPoolShare,
          salaryPool6: salaryPoolShare,
          rewardPool4: rewardPoolShare,
          traderShare20: traderShare
        },
        currentSystemPools: pool
      }
    });
  } catch (error) {
    console.error('Admin profit injection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during profit injection'
    });
  }
};

/**
  PUT /api/admin/withdrawals/:id
  Approve or Reject a withdrawal request (Admin Only)
 */
const updateWithdrawalStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const withdrawalId = req.params.id;

    if (!['approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, rejected, or completed.'
      });
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    if (withdrawal.status === 'completed' || withdrawal.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal is already ${withdrawal.status}`
      });
    }

    // If rejected, refund the deducted amount back to user's wallet
    if (status === 'rejected') {
      await User.findByIdAndUpdate(withdrawal.userId, {
        $inc: { [`wallet.${withdrawal.type}`]: withdrawal.amount }
      });

      await Transaction.create({
        userId: withdrawal.userId,
        type: 'adjustment',
        amount: withdrawal.amount,
        status: 'completed',
        description: `Refund for rejected withdrawal request (${withdrawal.type})`,
        referenceId: withdrawal._id,
        referenceModel: 'Withdrawal'
      });

      await Notification.create({
        userId: withdrawal.userId,
        title: 'Withdrawal Rejected',
        message: `Your withdrawal request of $${withdrawal.amount} was rejected. Funds have been refunded to your wallet.`,
        type: 'error'
      });
    } else if (status === 'completed' || status === 'approved') {
      await Notification.create({
        userId: withdrawal.userId,
        title: 'Withdrawal Processed',
        message: `Your withdrawal request of $${withdrawal.amount} has been ${status}!`,
        type: 'success'
      });
    }

    withdrawal.status = status;
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user._id;
    if (adminNote) withdrawal.adminNote = adminNote;

    await withdrawal.save();

    return res.json({
      success: true,
      message: `Withdrawal status updated to ${status}`,
      data: { withdrawal }
    });
  } catch (error) {
    console.error('Admin update withdrawal error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating withdrawal' });
  }
};

/**
  POST /api/admin/commission/adjust
  Manual commission or wallet adjustment (Admin Only)
 */
const manualCommissionAdjustment = async (req, res) => {
  try {
    const { userId, amount, walletType, description } = req.body;

    if (!userId || !amount || !walletType) {
      return res.status(400).json({
        success: false,
        message: 'userId, amount, and walletType (capital/profit/commission) are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndUpdate(userId, {
      $inc: { [`wallet.${walletType}`]: amount }
    });

    await CommissionLog.create({
      recipientId: userId,
      commissionType: 'manual_adjustment',
      baseAmount: amount,
      commissionAmount: amount,
      description: description || 'Admin manual wallet adjustment'
    });

    await Transaction.create({
      userId,
      type: 'adjustment',
      amount,
      status: 'completed',
      description: description || `Admin adjustment to ${walletType} wallet`
    });

    return res.json({
      success: true,
      message: `Successfully adjusted ${walletType} wallet by $${amount}`
    });
  } catch (error) {
    console.error('Admin manual adjustment error:', error);
    return res.status(500).json({ success: false, message: 'Server error adjusting wallet' });
  }
};

/**
  GET /api/admin/stats
  System-wide analytics (Admin Only)
 */
const getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ totalInvestment: { $gt: 0 } });
    const totalInvestments = await Investment.countDocuments();
    const activeInvestmentsCount = await Investment.countDocuments({ status: 'active' });

    const investmentSum = await Investment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const profitSum = await Transaction.aggregate([
      { $match: { type: 'profit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const commissionSum = await Transaction.aggregate([
      { $match: { type: 'commission', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pendingWithdrawalsCount = await Withdrawal.countDocuments({ status: 'pending' });

    const pool = await SystemPool.getSingleton();

    return res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalInvestments,
        activeInvestmentsCount,
        totalInvestmentVolume: investmentSum[0] ? investmentSum[0].total : 0,
        totalProfitDistributed: profitSum[0] ? profitSum[0].total : 0,
        totalCommissionDistributed: commissionSum[0] ? commissionSum[0].total : 0,
        pendingWithdrawalsCount,
        systemPools: pool
      }
    });
  } catch (error) {
    console.error('Admin get stats error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching admin stats' });
  }
};

module.exports = {
  getAllUsers,
  getAllInvestments,
  injectRealizedProfit,
  updateWithdrawalStatus,
  manualCommissionAdjustment,
  getSystemStats
};

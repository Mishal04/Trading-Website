const { validationResult } = require('express-validator');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { isWithinDubaiWithdrawalWindow } = require('../config/cronJobs');

/**
 * Check if current time is within allowed withdrawal window (Sat-Sun, 9 PM - 12 AM Dubai time)
 * Dubai timezone: UTC+4 (no DST)
 */
const isWithinWithdrawalWindow = () => {
  if (process.env.SKIP_WITHDRAWAL_TIME_CHECK === 'true') {
    return true;
  }

  return isWithinDubaiWithdrawalWindow();
};

/**
  POST /api/withdrawals/request
  Submit a withdrawal request
 */
const requestWithdrawal = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { amount, type, walletAddress } = req.body;
    const userId = req.user._id;

    if (!isWithinWithdrawalWindow()) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal requests are only allowed on Saturday-Sunday, 9 PM to 12 AM (Dubai timezone)'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal amount must be greater than $0'
      });
    }

    const user = await User.findById(userId);
    const userWallet = user.wallet || { capital: 0, profit: 0, commission: 0 };
    const availableBalance = userWallet[type] || 0;

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${type} balance. Available: $${availableBalance}`
      });
    }

    // Deduct balance from user wallet
    await User.findByIdAndUpdate(userId, {
      $inc: { [`wallet.${type}`]: -amount }
    });

    // Create Withdrawal document
    const withdrawal = new Withdrawal({
      userId,
      amount,
      type,
      walletAddress: walletAddress || '',
      network: req.body.network,
      status: 'pending',
      requestedAt: new Date()
    });

    await withdrawal.save();

    // Create Transaction log
    await Transaction.create({
      userId,
      type: 'withdrawal',
      amount,
      status: 'pending',
      description: `Withdrawal request ($${amount} from ${type} balance)`,
      referenceId: withdrawal._id,
      referenceModel: 'Withdrawal'
    });

    // Send Notification
    await Notification.create({
      userId,
      title: 'Withdrawal Requested',
      message: `Your withdrawal request of $${amount} (${type}) has been submitted for review.`,
      type: 'warning'
    });

    return res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: { withdrawal }
    });
  } catch (error) {
    console.error('Request withdrawal error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing withdrawal request'
    });
  }
};

/**
  GET /api/withdrawals/history
  Get user's withdrawal history (paginated)
 */
const getWithdrawalHistory = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10)); // cap at 100
    const skip  = (page - 1) * limit;

    const query = { userId: req.user._id };
    if (req.query.status) query.status = req.query.status;

    const total = await Withdrawal.countDocuments(query);
    const withdrawals = await Withdrawal.find(query)
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get withdrawal history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching withdrawal history'
    });
  }
};

/**
  GET /api/withdrawals/:id
  Get single withdrawal details
 */
const getWithdrawalById = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    return res.json({
      success: true,
      data: { withdrawal }
    });
  } catch (error) {
    console.error('Get withdrawal details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching withdrawal details'
    });
  }
};

module.exports = {
  requestWithdrawal,
  getWithdrawalHistory,
  getWithdrawalById,
  isWithinWithdrawalWindow
};

const { validationResult } = require('express-validator');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const InvestorInvestment = require('../models/InvestorInvestment');
const { isWithinDubaiWithdrawalWindow } = require('../config/cronJobs');

/**
 * Check if withdrawal request should be processed today or queued for next day
 * Rule: Requests submitted before 12 AM Dubai time processed same day
 *       Requests submitted after 12 AM Dubai time queued for next day
 * No day-of-week restrictions — withdrawals allowed any day of the week
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
    const { amount, type, walletAddress, network } = req.body;
    const userId = req.user._id;

    // Validate network
    if (!network || !['BEP20', 'TRC20'].includes(network)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid network (BEP20 or TRC20)'
      });
    }

    // Validate type
    if (!type || !['capital', 'profit', 'commission'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid withdrawal type'
      });
    }

    if (!isWithinWithdrawalWindow()) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal requests submitted after 12 AM Dubai time are processed the next day. Submit before 12 AM for same-day processing.'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal amount must be greater than $0'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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

    // If withdrawing from capital, reduce active investment amounts proportionally
    if (type === 'capital') {
      const activeInvestments = await InvestorInvestment.find({
        userId,
        status: 'active'
      });

      if (activeInvestments.length > 0) {
        // Calculate total invested amount
        const totalInvested = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);

        if (totalInvested > 0) {
          // Reduce each investment proportionally
          for (const investment of activeInvestments) {
            const proportionOfTotal = investment.amount / totalInvested;
            const amountToDeduct = Number((amount * proportionOfTotal).toFixed(2));

            // Reduce the investment amount
            const newAmount = Math.max(0, investment.amount - amountToDeduct);
            const actualDeduction = investment.amount - newAmount;

            await InvestorInvestment.findByIdAndUpdate(investment._id, {
              $set: { amount: newAmount },
              // Reduce total ROI earned proportionally
              $inc: { totalRoiEarned: -(actualDeduction * investment.dailyRate * 7) } // Rough estimate: 7 days average
            });
          }
        }
      }
    }

    // Create Withdrawal document
    const withdrawal = new Withdrawal({
      userId,
      amount,
      type,
      network,
      walletAddress: walletAddress || '',
      status: 'pending',
      requestedAt: new Date()
    });

    await withdrawal.save();

    // Create Transaction log
    let transactionDesc = `Withdrawal request ($${amount} from ${type} balance)`;
    if (type === 'capital') {
      transactionDesc += ` — investment amount(s) reduced proportionally`;
    }
    
    await Transaction.create({
      userId,
      type: 'withdrawal',
      amount,
      status: 'pending',
      description: transactionDesc,
      referenceId: withdrawal._id,
      referenceModel: 'Withdrawal'
    });

    // Send Notification
    let notificationMsg = `Your withdrawal request of $${amount} (${type}) has been submitted for review.`;
    if (type === 'capital') {
      notificationMsg += ` Your investment amount(s) have been reduced proportionally.`;
    }
    
    await Notification.create({
      userId,
      title: 'Withdrawal Requested',
      message: notificationMsg,
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
      message: error.message || 'Server error processing withdrawal request'
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

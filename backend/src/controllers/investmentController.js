const { validationResult } = require('express-validator');
const Investment = require('../models/Investment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const commissionService = require('../services/commissionService');

/**
  POST /api/investments/create
  Create a new investment package
 */
const createInvestment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { amount } = req.body;
    const userId = req.user._id;

    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum investment amount is $100'
      });
    }

    const { tier, packageName, dailyRate } = commissionService.getInvestmentPackage(amount);
    const dailyProfit = Number(((amount * dailyRate) / 100).toFixed(4));
    const { paymentProof } = req.body;

    // New investments start as 'pending' — admin must approve before they go active
    const investment = new Investment({
      userId,
      amount,
      tier,
      packageName,
      dailyRate,
      dailyProfit,
      isActive: false,
      status: 'pending',
      paymentProof: paymentProof || ''
    });

    await investment.save();

    // Record Transaction (pending until admin approves)
    await Transaction.create({
      userId,
      type: 'investment',
      amount,
      status: 'pending',
      description: `Investment of $${amount} in ${packageName} — awaiting admin approval`,
      referenceId: investment._id,
      referenceModel: 'Investment'
    });

    // Notify user their submission is under review
    await Notification.create({
      userId,
      title: 'Investment Submitted',
      message: `Your investment of $${amount} in ${packageName} is under review. You will be notified once approved.`,
      type: 'info'
    });

    return res.status(201).json({
      success: true,
      message: 'Investment submitted successfully. Awaiting admin approval.',
      data: { investment }
    });
  } catch (error) {
    console.error('Create investment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating investment'
    });
  }
};

/**
  GET /api/investments/my
  Get logged-in user's investments (paginated)
 */
const getMyInvestments = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10)); // cap at 100
    const skip  = (page - 1) * limit;

    const query = { userId: req.user._id };
    if (req.query.status) query.status = req.query.status;

    const total = await Investment.countDocuments(query);
    const investments = await Investment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      data: {
        investments,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get my investments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching investments'
    });
  }
};

/**
  GET /api/investments/:id
  Get single investment details
 */
const getInvestmentById = async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    return res.json({
      success: true,
      data: { investment }
    });
  } catch (error) {
    console.error('Get investment details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching investment details'
    });
  }
};

/**
  POST /api/investments/withdraw
  Cancel / withdraw an active investment
 */
const withdrawInvestment = async (req, res) => {
  try {
    const { investmentId } = req.body;
    if (!investmentId) {
      return res.status(400).json({
        success: false,
        message: 'Investment ID is required'
      });
    }

    const investment = await Investment.findOne({
      _id: investmentId,
      userId: req.user._id,
      isActive: true
    });

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Active investment not found'
      });
    }

    investment.isActive = false;
    investment.status = 'withdrawn';
    await investment.save();

    return res.json({
      success: true,
      message: 'Investment closed successfully',
      data: { investment }
    });
  } catch (error) {
    console.error('Withdraw investment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error withdrawing investment'
    });
  }
};

module.exports = {
  createInvestment,
  getMyInvestments,
  getInvestmentById,
  withdrawInvestment
};

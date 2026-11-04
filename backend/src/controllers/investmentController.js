const { validationResult } = require('express-validator');
const Investment = require('../models/Investment');
const InvestorInvestment = require('../models/InvestorInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const commissionService = require('../services/commissionService');
const { USER_PACKAGES } = require('../../config/constants');
const { getInvestorPackageInfo, INVESTOR_INCOME_CAP } = require('../../config/investorConstants');

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

    const numAmount = Number(amount);
    const allAllowedAmounts = Object.values(USER_PACKAGES).flat();
    if (!allAllowedAmounts.includes(numAmount)) {
      return res.status(400).json({
        success: false,
        message: `$${numAmount} is not a valid package amount. Please select one of the available package amounts.`
      });
    }

    const { tier, packageName, dailyRate, packageNumber, rateTier } = commissionService.getInvestmentPackage(amount);
    const dailyProfit = Number(((amount * dailyRate) / 100).toFixed(4));

    // Extract all payment proof fields
    const { paymentProof, transactionId, paymentNote } = req.body;

    // New investments start as 'pending' — admin must approve before they go active
    const investment = new Investment({
      userId,
      amount,
      tier,
      packageName,
      dailyRate,
      dailyProfit,
      packageNumber,
      rateTier,
      isActive:      false,
      status:        'pending',
      transactionId: (transactionId || '').trim(),
      paymentProof:  (paymentProof  || '').trim(),
      paymentNote:   (paymentNote   || '').trim(),
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

/**
 * POST /api/investments/plan
 * Create a unified Plan A/B investment for a User (Phase 2).
 * Uses InvestorInvestment model with userId ref.
 */
const createPlanInvestment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { amount, paymentProof, transactionId, paymentNote } = req.body;
    const userId = req.user._id;

    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum investment amount is $100'
      });
    }

    const numAmount = Number(amount);

    // Get user's current plan
    const user = await User.findById(userId).select('plan joinDate totalInvested');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Look up package info using Plan A/B logic
    const pkgInfo = getInvestorPackageInfo(numAmount, user.plan);
    if (!pkgInfo) {
      return res.status(400).json({
        success: false,
        message: `$${numAmount} is not a valid investment amount for Plan ${user.plan}. Valid amounts: Plan A ($100-900), Plan B ($1000-5000, $6000-9000, $10000-25000)`
      });
    }

    const incomeCap = Number((numAmount * INVESTOR_INCOME_CAP).toFixed(4));

    // Create InvestorInvestment record linked to User via userId
    const investment = new InvestorInvestment({
      userId,                    // NEW: Phase 2 user model link
      investorId: null,          // NULL: legacy investor portal (not used here)
      amount: numAmount,
      plan: user.plan,
      packageNumber: pkgInfo.packageNumber,
      dailyRate: pkgInfo.dailyRate,
      incomeCap,
      paymentProof: (paymentProof || '').trim(),
      transactionId: (transactionId || '').trim(),
      paymentNote: (paymentNote || '').trim(),
      status: 'pending'          // Admin must approve
    });

    await investment.save();

    // If this is user's first investment, set joinDate
    const updateFields = { $inc: { totalInvested: numAmount } };
    if (!user.joinDate) {
      updateFields.$set = { joinDate: new Date() };
    }
    await User.findByIdAndUpdate(userId, updateFields);

    // Record Transaction for audit
    await Transaction.create({
      userId,
      type: 'investment',
      amount: numAmount,
      status: 'pending',
      description: `Plan ${user.plan} investment of $${numAmount} (package ${pkgInfo.packageNumber}, ${(pkgInfo.dailyRate * 100).toFixed(4)}% daily) — awaiting admin approval`,
      referenceId: investment._id,
      referenceModel: 'InvestorInvestment'
    });

    // Notify user
    await Notification.create({
      userId,
      title: 'Investment Submitted',
      message: `Your Plan ${user.plan} investment of $${numAmount} is under review. You will be notified once approved.`,
      type: 'info'
    });

    return res.status(201).json({
      success: true,
      message: 'Investment submitted successfully. Awaiting admin approval.',
      data: { investment }
    });
  } catch (error) {
    console.error('Create plan investment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating investment'
    });
  }
};

module.exports = {
  createInvestment,
  getMyInvestments,
  getInvestmentById,
  withdrawInvestment,
  createPlanInvestment
};


/**
 * POST /api/investments/upload-proof
 * Upload transaction proof for an investment (stored as base64 in database)
 */
const uploadProof = async (req, res) => {
  try {
    const fs = require('fs');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { investmentId, transactionId, paymentNote } = req.body;

    if (!investmentId) {
      return res.status(400).json({
        success: false,
        message: 'Investment ID is required'
      });
    }

    // Find investment (can be Investment or InvestorInvestment)
    let investment = await InvestorInvestment.findById(investmentId);
    let model = 'InvestorInvestment';

    if (!investment) {
      investment = await Investment.findById(investmentId);
      model = 'Investment';
    }

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    console.log('Upload proof - Investment found:', {
      investmentId,
      investmentUserId: investment.userId?.toString(),
      investmentInvestorId: investment.investorId?.toString(),
      reqUserId: req.user._id.toString(),
      reqUserRole: req.user.role,
      model
    });

    // Only owner or admin can upload proof
    const isOwner = investment.userId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      console.log('Permission denied for upload proof');
      // Clean up file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to upload proof for this investment'
      });
    }

    // Convert file to base64
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64String = fileBuffer.toString('base64');
    const mimeType = req.file.mimetype;
    const paymentProofData = `data:${mimeType};base64,${base64String}`;

    console.log('Uploading proof as base64:', {
      investmentId,
      fileName: req.file.filename,
      mimeType,
      size: fileBuffer.length
    });

    // Update investment with base64 proof
    const updateData = {
      paymentProof: paymentProofData,
      transactionId: (transactionId || '').trim(),
      paymentNote: (paymentNote || '').trim()
    };

    const updatedInvestment = await (model === 'InvestorInvestment' ? InvestorInvestment : Investment).findByIdAndUpdate(
      investmentId,
      updateData,
      { new: true }
    );

    console.log('Proof uploaded successfully as base64:', {
      investmentId,
      dataLength: paymentProofData.length
    });

    // Delete file from disk
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment proof uploaded successfully',
      data: {
        proofStored: true,
        filename: req.file.filename,
        originalname: req.file.originalname
      }
    });
  } catch (error) {
    console.error('Upload proof error:', error);
    
    // Clean up uploaded file if error occurs
    if (req.file && require('fs').existsSync(req.file.path)) {
      require('fs').unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while uploading proof'
    });
  }
};

// Update exports to include uploadProof
module.exports.uploadProof = uploadProof;

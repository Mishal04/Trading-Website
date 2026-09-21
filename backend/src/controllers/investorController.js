const jwt = require('jsonwebtoken');
const Investor = require('../models/Investor');
const User = require('../models/User');
const InvestorInvestment = require('../models/InvestorInvestment');
const {
  getInvestorPackageInfo,
  INVESTOR_INCOME_CAP,
  INVESTOR_MONTHLY_RATE,
  INVESTOR_SWITCH_MONTHS
} = require('../../config/investorConstants');

// ─── helpers ─────────────────────────────────────────────────────────────────

const generateInvestorToken = (id) =>
  jwt.sign({ id, type: 'investor' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });

const safeInvestor = (inv) => ({
  id:           inv._id,
  _id:          inv._id,
  name:         inv.name,
  email:        inv.email,
  phone:        inv.phone,
  plan:         inv.plan,
  wallet:       inv.wallet,
  totalInvested: inv.totalInvested,
  totalRoiEarned: inv.totalRoiEarned,
  joinDate:     inv.joinDate,
  isActive:     inv.isActive,
  accountType:  'investor',
  createdAt:    inv.createdAt
});

// ─── POST /api/investors/auth/register ───────────────────────────────────────

const registerInvestor = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existing = await Investor.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An investor account already exists with this email' });
    }

    const investor = await Investor.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone || '',
      plan: 'A'  // default plan; admin can change it later
    });

    const token = generateInvestorToken(investor._id);

    return res.status(201).json({
      success: true,
      message: 'Investor account created successfully.',
      data: { investor: safeInvestor(investor), token }
    });
  } catch (error) {
    console.error('Investor register error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// ─── POST /api/investors/auth/login ──────────────────────────────────────────

const loginInvestor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const investor = await Investor.findOne({ email: email.toLowerCase() }).select('+password');
    if (!investor) {
      // Cross-check: is this email a regular user account instead?
      const regularUser = await User.findOne({ email: email.toLowerCase() });
      if (regularUser) {
        return res.status(401).json({
          success: false,
          message: 'This email is registered as a regular user, not an investor. Please use the User Login page, or register a new investor account.'
        });
      }
      // Email not found in either collection � safe to tell the user to register
      return res.status(401).json({ success: false, message: 'No investor account found with this email. Please register as a new investor.' });
    }

    const isMatch = await investor.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!investor.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Please contact support.' });
    }

    investor.lastLogin = new Date();
    await investor.save();

    const token = generateInvestorToken(investor._id);

    return res.json({
      success: true,
      data: { investor: safeInvestor(investor), token }
    });
  } catch (error) {
    console.error('Investor login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// ─── GET /api/investors/auth/me ───────────────────────────────────────────────

const getInvestorMe = async (req, res) => {
  try {
    return res.json({ success: true, data: { investor: safeInvestor(req.investor) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/investors/investments/create ───────────────────────────────────

const createInvestorInvestment = async (req, res) => {
  try {
    const { amount, paymentProof, transactionId, paymentNote } = req.body;
    const investor = req.investor;

    if (!amount || isNaN(amount) || Number(amount) < 100) {
      return res.status(400).json({ success: false, message: 'Amount must be at least $100' });
    }

    const pkgInfo = getInvestorPackageInfo(Number(amount), investor.plan);
    if (!pkgInfo) {
      return res.status(400).json({
        success: false,
        message: `$${amount} is not a valid package amount for Plan ${investor.plan}. Check the package table for valid amounts.`
      });
    }

    const incomeCap = Number(amount) * INVESTOR_INCOME_CAP;

    const investment = await InvestorInvestment.create({
      investorId:    investor._id,
      amount:        Number(amount),
      plan:          investor.plan,
      packageNumber: pkgInfo.packageNumber,
      dailyRate:     pkgInfo.dailyRate,
      incomeCap,
      paymentProof:  paymentProof || '',
      transactionId: transactionId || '',
      paymentNote:   paymentNote || ''
    });

    return res.status(201).json({
      success: true,
      message: 'Investment submitted for admin approval.',
      data: { investment }
    });
  } catch (error) {
    console.error('Create investor investment error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating investment' });
  }
};

// ─── GET /api/investors/investments/my ───────────────────────────────────────

const getMyInvestments = async (req, res) => {
  try {
    const investments = await InvestorInvestment.find({ investorId: req.investor._id })
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: { investments } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching investments' });
  }
};

// ─── GET /api/investors/dashboard ────────────────────────────────────────────

const getInvestorDashboard = async (req, res) => {
  try {
    const investor = req.investor;

    const investments = await InvestorInvestment.find({
      investorId: investor._id,
      status: { $in: ['active', 'pending', 'completed'] }
    }).sort({ createdAt: -1 });

    // Determine 6-month switch status
    let sixMonthsReached = false;
    if (investor.joinDate) {
      const switchDate = new Date(investor.joinDate);
      switchDate.setMonth(switchDate.getMonth() + INVESTOR_SWITCH_MONTHS);
      sixMonthsReached = new Date() >= switchDate;
    }

    const activeInvestments = investments.filter(i => i.status === 'active');
    const pendingInvestments = investments.filter(i => i.status === 'pending');

    return res.json({
      success: true,
      data: {
        investor: safeInvestor(investor),
        wallet: investor.wallet,
        stats: {
          totalInvested: investor.totalInvested,
          totalRoiEarned: investor.totalRoiEarned,
          activeCount: activeInvestments.length,
          pendingCount: pendingInvestments.length
        },
        sixMonthsReached,
        investments
      }
    });
  } catch (error) {
    console.error('Investor dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching dashboard' });
  }
};

// ─── POST /api/investors/investments/withdraw-principal ───────────────────────

const withdrawPrincipal = async (req, res) => {
  try {
    const { investmentId, walletAddress, network } = req.body;
    if (!investmentId) {
      return res.status(400).json({ success: false, message: 'investmentId is required' });
    }

    const investment = await InvestorInvestment.findOne({
      _id: investmentId,
      investorId: req.investor._id
    });

    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }
    if (investment.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Only active investments can have principal withdrawn' });
    }
    if (investment.principalWithdrawn) {
      return res.status(400).json({ success: false, message: 'Principal already withdrawn for this investment' });
    }

    // Mark principal withdrawn — deduct capital from wallet
    investment.principalWithdrawn = true;
    investment.principalWithdrawnAt = new Date();
    investment.status = 'completed';
    await investment.save();

    // Deduct from investor wallet.capital
    await Investor.findByIdAndUpdate(req.investor._id, {
      $inc: { 'wallet.capital': -investment.amount, totalInvested: -investment.amount }
    });

    return res.json({
      success: true,
      message: `Principal of $${investment.amount} withdrawal initiated. Contact admin to process transfer to ${walletAddress || 'your wallet'}.`,
      data: { investment }
    });
  } catch (error) {
    console.error('Investor principal withdraw error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing withdrawal' });
  }
};

// ─── POST /api/investors/investments/withdraw-roi ────────────────────────────

const withdrawRoi = async (req, res) => {
  try {
    const { amount, walletAddress, network } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }
    if (Number(amount) > req.investor.wallet.roi) {
      return res.status(400).json({ success: false, message: 'Insufficient ROI balance' });
    }

    // Deduct from wallet (actual transfer handled by admin)
    await Investor.findByIdAndUpdate(req.investor._id, {
      $inc: { 'wallet.roi': -Number(amount) }
    });

    return res.json({
      success: true,
      message: `ROI withdrawal of $${amount} submitted. Contact admin to process transfer.`,
      data: { amountRequested: Number(amount) }
    });
  } catch (error) {
    console.error('Investor ROI withdraw error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  registerInvestor,
  loginInvestor,
  getInvestorMe,
  createInvestorInvestment,
  getMyInvestments,
  getInvestorDashboard,
  withdrawPrincipal,
  withdrawRoi
};

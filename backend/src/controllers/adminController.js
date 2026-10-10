const { validationResult } = require('express-validator');
const User = require('../models/User');
const InvestorInvestment = require('../models/InvestorInvestment');
const Investment = require('../models/Investment');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const CommissionLog = require('../models/CommissionLog');
const Notification = require('../models/Notification');
const SystemPool = require('../models/SystemPool');
const commissionService = require('../services/commissionService');
const profitService = require('../services/profitService');
const { creditRoiToInvestor, distributeLevelIncome } = require('../services/incomeService');
const achievementService = require('../services/achievementService');
const { DIRECT_REFERRAL_COMMISSION_RATE } = require('../../config/constants');
const { INVESTOR_INCOME_CAP } = require('../../config/investorConstants');

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Apply team-business credits to all uplines when an investment is approved. */
const _updateTeamBusiness = async (investor, amount) => {
  if (!investor.ancestorPath || investor.ancestorPath.length === 0) return;

  const directReferrerId = investor.ancestorPath[0];
  await User.findByIdAndUpdate(directReferrerId, {
    $inc: {
      'teamBusiness.total': amount,
      'referrals.totalBusiness': amount
    }
  });

  for (let i = 1; i < investor.ancestorPath.length; i++) {
    await User.findByIdAndUpdate(investor.ancestorPath[i], {
      $inc: { 'teamBusiness.total': amount }
    });
  }
};

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

/**
 * System-wide analytics for the admin dashboard overview card.
 */
const getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalInvestmentsOld,
      totalInvestmentsNew,
      activeInvestmentsOld,
      activeInvestmentsNew,
      pendingInvestmentsOld,
      pendingInvestmentsNew,
      pendingWithdrawalsCount,
      investmentSum,
      investorInvestmentSum,
      profitSum,
      commissionSum,
      pool
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ totalInvested: { $gt: 0 } }),
      Investment.countDocuments(),
      InvestorInvestment.countDocuments(),
      Investment.countDocuments({ status: 'active' }),
      InvestorInvestment.countDocuments({ status: 'active' }),
      Investment.countDocuments({ status: 'pending' }),
      InvestorInvestment.countDocuments({ status: 'pending' }),
      Withdrawal.countDocuments({ status: 'pending' }),
      Investment.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      InvestorInvestment.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { type: 'profit', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { type: 'commission', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      SystemPool.getSingleton()
    ]);

    const totalInvestmentsCount = totalInvestmentsOld + totalInvestmentsNew;
    const activeInvestmentsCount = activeInvestmentsOld + activeInvestmentsNew;
    const pendingInvestmentsCount = pendingInvestmentsOld + pendingInvestmentsNew;

    return res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalInvestments: totalInvestmentsCount,
        activeInvestmentsCount,
        pendingInvestmentsCount,
        totalInvestmentVolume: (investmentSum[0]?.total ?? 0) + (investorInvestmentSum[0]?.total ?? 0),
        totalProfitDistributed: profitSum[0]?.total ?? 0,
        totalCommissionDistributed: commissionSum[0]?.total ?? 0,
        pendingWithdrawalsCount,
        systemPools: pool
      }
    });
  } catch (error) {
    console.error('Admin get stats error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching admin stats' });
  }
};

// ─── GET /api/admin/pools ─────────────────────────────────────────────────────

/**
 * Return the current SystemPool balances (singleton document).
 */
const getSystemPools = async (req, res) => {
  try {
    const pool = await SystemPool.getSingleton();
    return res.json({ success: true, data: { pool } });
  } catch (error) {
    console.error('Admin get pools error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching system pools' });
  }
};

// ─── GET /api/admin/users ────────────────────────────────────────────────────

/**
 * List all users with search + pagination.
 */
const getAllUsers = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20)); // cap at 100
    const skip  = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      query.$or = [
        { name:         { $regex: req.query.search, $options: 'i' } },
        { email:        { $regex: req.query.search, $options: 'i' } },
        { referralCode: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.isVerified !== undefined) {
      query.isVerified = req.query.isVerified === 'true';
    }
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

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

// ─── PATCH /api/admin/users/:id/toggle ───────────────────────────────────────

/**
 * Activate or deactivate a user account.
 */
const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent admin from deactivating their own account
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.json({
      success: true,
      message: `User account ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    });
  } catch (error) {
    console.error('Admin toggle user error:', error);
    return res.status(500).json({ success: false, message: 'Server error toggling user status' });
  }
};

// ─── GET /api/admin/users/:id/upline-downline ────────────────────────────────

/**
 * Get a user's upline (ancestors) and downline (direct referrals + full team).
 */
const getUserUplineDownline = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let uplineData = {
      parent: null,
      ancestors: []
    };

    // Get direct parent (upline)
    if (user.referredBy) {
      const parent = await User.findById(user.referredBy).select('firstName lastName email referralCode totalInvested wallet isActive');
      uplineData.parent = parent;
    }

    // Get full ancestor chain
    if (user.ancestorPath && user.ancestorPath.length > 0) {
      const ancestors = await User.find({
        _id: { $in: user.ancestorPath }
      }).select('firstName lastName email referralCode totalInvested wallet isActive');
      
      // Sort ancestors by their position in ancestorPath (oldest first)
      uplineData.ancestors = user.ancestorPath.map(ancestorId => 
        ancestors.find(a => a._id.toString() === ancestorId.toString())
      ).filter(Boolean);
    }

    // Get direct referrals (downline) - users who have this user as referredBy
    const directReferrals = await User.find({ 
      referredBy: userId 
    }).select('firstName lastName email referralCode totalInvested wallet isActive');

    // Count total team size (all descendants)
    // This is a recursive count: all users in ancestorPath that include this userId
    const allDescendants = await User.find({
      ancestorPath: { $in: [userId] }
    });
    
    const teamSize = allDescendants.length;

    return res.json({
      success: true,
      data: {
        upline: uplineData,
        downline: {
          directReferrals,
          teamSize
        }
      }
    });
  } catch (error) {
    console.error('Admin get upline/downline error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching network' });
  }
};


/**
 * List all investments, optionally filtered by status, with pagination.
 */
const getAllInvestments = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20)); // cap at 100
    const skip  = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;

    // Fetch both old Investment and new InvestorInvestment models
    const [oldTotal, oldInvestments, newTotal, newInvestments] = await Promise.all([
      Investment.countDocuments(query),
      Investment.find(query)
        .populate('userId', 'name email referralCode')
        .sort({ createdAt: -1 }),
      InvestorInvestment.countDocuments(query),
      InvestorInvestment.find(query)
        .populate('userId', 'name email referralCode')
        .sort({ createdAt: -1 })
    ]);

    // Merge and sort by createdAt
    const allInvestments = [
      ...oldInvestments.map(inv => ({ ...inv.toObject?.() || inv, _model: 'Investment' })),
      ...newInvestments.map(inv => ({ ...inv.toObject?.() || inv, _model: 'InvestorInvestment' }))
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);

    const total = oldTotal + newTotal;

    return res.json({
      success: true,
      data: {
        investments: allInvestments,
        pagination: { total, page, pages: Math.ceil(total / limit), limit }
      }
    });
  } catch (error) {
    console.error('Admin get all investments error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching investments' });
  }
};

// ─── PATCH /api/admin/investments/:id/approve ────────────────────────────────

/**
 * Approve a pending investment.
 *
 * Flow:
 *  1. Set investment status → 'active', isActive → true, record approvedBy/At
 *  2. Credit user wallet.capital with the investment amount
 *  3. Update user totalInvestment + investmentLevel
 *  4. Credit upline teamBusiness volumes (up to 21 levels)
 *  5. Mark the pending Transaction as completed
 *  6. Notify investor
 */
const approveInvestment = async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id);
    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }
    if (investment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Investment is already '${investment.status}' — only pending investments can be approved`
      });
    }

    // 1. Activate investment
    investment.status    = 'active';
    investment.isActive  = true;
    investment.startDate = new Date();
    // Set lastProfitDate to yesterday so profit calculation runs TODAY (not tomorrow)
    // Profit cron checks: lastProfitDate < startOfToday; if set to now(), it will be >= startOfToday
    const yesterdayForProfit = new Date();
    yesterdayForProfit.setDate(yesterdayForProfit.getDate() - 1);
    investment.lastProfitDate = yesterdayForProfit;
    investment.approvedBy = req.user._id;
    investment.approvedAt = new Date();
    await investment.save();

    // 2 + 3. Credit investor wallet & update stats
    const investor = await User.findById(investment.userId);
    let newLevel = 'basic';
    if (investment.amount >= 7500) newLevel = 'premium';
    else if (investment.amount >= 1000) newLevel = 'standard';

    await User.findByIdAndUpdate(investment.userId, {
      $inc: {
        totalInvested:      investment.amount,
        'wallet.capital':   investment.amount
      },
      investmentLevel: newLevel
    });

    // 4. Team-business volume for uplines
    if (investor) await _updateTeamBusiness(investor, investment.amount);

    // 5. Update the pending transaction to completed
    await Transaction.findOneAndUpdate(
      { referenceId: investment._id, referenceModel: 'Investment', status: 'pending' },
      {
        status: 'completed',
        description: `Investment of $${investment.amount} in ${investment.packageName} approved`
      }
    );

    // 6. AUTO-UNLOCK: Grant Networker access when investment becomes active
    await User.findByIdAndUpdate(investment.userId, {
      networkerAccessGranted: true,
      networkerAccessGrantedAt: new Date(),
      networkerAccessGrantedBy: req.user._id
    });

    // 7. Notify investor
    await Notification.create({
      userId: investment.userId,
      title:   'Investment Approved ✓',
      message: `Your investment of $${investment.amount} in ${investment.packageName} has been approved and is now active! Networker access unlocked.`,
      type:    'success'
    });

    // ── Direct referral commission ───────────────────────────────────────
    // Separate from the 21-level daily profit commission system.
    // Fires once here at approval time; level commissions run
    // independently on the daily cron and are NOT affected by this block.
    if (investor && investor.referredBy) {
      const directRatePercent = DIRECT_REFERRAL_COMMISSION_RATE * 100;
      const directCommission = Number(
        (investment.amount * DIRECT_REFERRAL_COMMISSION_RATE).toFixed(4)
      );

      if (directCommission > 0) {
        // Credit referrer's commission wallet instantly
        await User.findByIdAndUpdate(investor.referredBy, {
          $inc: { 'wallet.commission': directCommission }
        });

        // Record a distinct transaction so it's identifiable in history
        await Transaction.create({
          userId:         investor.referredBy,
          type:           'direct_referral',
          amount:         directCommission,
          status:         'completed',
          description:    `${directRatePercent}% direct referral commission from ${investor.name || investor.email}'s investment of $${investment.amount}`,
          referenceId:    investment._id,
          referenceModel: 'Investment'
        });

        // Notify referrer
        await Notification.create({
          userId:  investor.referredBy,
          title:   'Direct Referral Commission Earned',
          message: `You earned $${directCommission.toFixed(2)} (${directRatePercent}%) direct commission from your referral's investment of $${investment.amount}!`,
          type:    'commission'
        });
      }
    }
    // ── end direct referral commission ────────────────────────────────────

    return res.json({
      success: true,
      message: `Investment of $${investment.amount} approved successfully`,
      data: { investment }
    });
  } catch (error) {
    console.error('Admin approve investment error:', error);
    return res.status(500).json({ success: false, message: 'Server error approving investment' });
  }
};

// ─── PATCH /api/admin/investments/:id/reject ─────────────────────────────────

/**
 * Reject a pending investment with an optional admin note.
 */
const rejectInvestment = async (req, res) => {
  try {
    const { adminNote } = req.body;

    const investment = await Investment.findById(req.params.id);
    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }
    if (investment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Investment is already '${investment.status}' — only pending investments can be rejected`
      });
    }

    investment.status    = 'rejected';
    investment.isActive  = false;
    investment.adminNote = adminNote || '';
    await investment.save();

    // Mark associated transaction as rejected
    await Transaction.findOneAndUpdate(
      { referenceId: investment._id, referenceModel: 'Investment', status: 'pending' },
      {
        status:      'rejected',
        description: `Investment of $${investment.amount} rejected by admin`
      }
    );

    // Notify investor
    await Notification.create({
      userId:  investment.userId,
      title:   'Investment Rejected',
      message: `Your investment of $${investment.amount} was rejected.${adminNote ? ` Reason: ${adminNote}` : ' Please contact support for more information.'}`,
      type:    'error'
    });

    return res.json({
      success: true,
      message: 'Investment rejected',
      data: { investment }
    });
  } catch (error) {
    console.error('Admin reject investment error:', error);
    return res.status(500).json({ success: false, message: 'Server error rejecting investment' });
  }
};

// ─── PATCH /api/admin/investments/plan/:id/approve ──────────────────────────
/**
 * Approve a Plan A/B investment (InvestorInvestment model).
 * Similar to approveInvestment but for the Phase 2 unified model.
 */
const approvePlanInvestment = async (req, res) => {
  try {
    const investment = await InvestorInvestment.findById(req.params.id);
    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }
    if (investment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Investment is already '${investment.status}' — only pending investments can be approved`
      });
    }

    // 1. Activate investment
    investment.status    = 'active';
    investment.startDate = new Date();
    // Set lastRoiDate to yesterday so profit calculation runs TODAY (not tomorrow)
    // Profit cron checks: lastRoiDate < startOfToday; if set to now(), it will be >= startOfToday
    const yesterdayForRoi = new Date();
    yesterdayForRoi.setDate(yesterdayForRoi.getDate() - 1);
    investment.lastRoiDate = yesterdayForRoi;
    investment.approvedBy = req.user._id;
    investment.approvedAt = new Date();
    await investment.save();

    // 2. Credit user wallet with investment amount
    await User.findByIdAndUpdate(investment.userId, {
      $inc: { 'wallet.capital': investment.amount }
    });

    // 3. Update the pending transaction to completed
    await Transaction.findOneAndUpdate(
      { referenceId: investment._id, referenceModel: 'InvestorInvestment', status: 'pending' },
      {
        status: 'completed',
        description: `Plan ${investment.plan} investment of $${investment.amount} approved`
      }
    );

    // 4. AUTO-UNLOCK: Grant Networker access when investment becomes active
    await User.findByIdAndUpdate(investment.userId, {
      networkerAccessGranted: true,
      networkerAccessGrantedAt: new Date(),
      networkerAccessGrantedBy: req.user._id
    });

    // 5. Notify investor
    await Notification.create({
      userId: investment.userId,
      title:   'Investment Approved ✓',
      message: `Your Plan ${investment.plan} investment of $${investment.amount} has been approved and is now active! Networker access unlocked.`,
      type:    'success'
    });

    // 6. Credit direct referral commission to referrer
    const investor = await User.findById(investment.userId);
    if (investor && investor.referredBy) {
      const directRatePercent = DIRECT_REFERRAL_COMMISSION_RATE * 100;
      const directCommission = Number(
        (investment.amount * DIRECT_REFERRAL_COMMISSION_RATE).toFixed(4)
      );

      if (directCommission > 0) {
        await User.findByIdAndUpdate(investor.referredBy, {
          $inc: { 'wallet.commission': directCommission }
        });

        await Transaction.create({
          userId:         investor.referredBy,
          type:           'direct_referral',
          amount:         directCommission,
          status:         'completed',
          description:    `${directRatePercent}% direct referral commission from ${investor.name || investor.email}'s Plan ${investment.plan} investment of $${investment.amount}`,
          referenceId:    investment._id,
          referenceModel: 'InvestorInvestment'
        });

        await Notification.create({
          userId:  investor.referredBy,
          title:   'Direct Referral Commission Earned',
          message: `You earned $${directCommission.toFixed(2)} (${directRatePercent}%) direct commission from your referral's Plan ${investment.plan} investment of $${investment.amount}!`,
          type:    'commission'
        });
      }
    }

    return res.json({
      success: true,
      message: `Plan ${investment.plan} investment of $${investment.amount} approved successfully`,
      data: { investment }
    });
  } catch (error) {
    console.error('Admin approve plan investment error:', error);
    return res.status(500).json({ success: false, message: 'Server error approving investment' });
  }
};

// ─── GET /api/admin/withdrawals ──────────────────────────────────────────────

/**
 * List all withdrawal requests, optionally filtered by status, with pagination.
 */
const getAllWithdrawals = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20)); // cap at 100
    const skip  = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;

    const [total, withdrawals] = await Promise.all([
      Withdrawal.countDocuments(query),
      Withdrawal.find(query)
        .populate('userId', 'name email referralCode')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    return res.json({
      success: true,
      data: {
        withdrawals,
        pagination: { total, page, pages: Math.ceil(total / limit), limit }
      }
    });
  } catch (error) {
    console.error('Admin get all withdrawals error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching withdrawals' });
  }
};

// ─── PATCH /api/admin/withdrawals/:id/approve ────────────────────────────────

const approveWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }
    if (!['pending', 'processing'].includes(withdrawal.status)) {
      return res.status(400).json({
        success: false,
        message: `Withdrawal is already '${withdrawal.status}'`
      });
    }

    withdrawal.status      = 'approved';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user._id;
    if (req.body.adminNote) withdrawal.adminNote = req.body.adminNote;
    await withdrawal.save();

    // Update the corresponding Transaction record to reflect the new status
    await Transaction.updateOne(
      { referenceId: withdrawal._id, referenceModel: 'Withdrawal' },
      { status: 'approved' }
    );

    await Notification.create({
      userId:  withdrawal.userId,
      title:   'Withdrawal Approved',
      message: `Your withdrawal of $${withdrawal.amount} has been approved and is being processed.`,
      type:    'success'
    });

    return res.json({
      success: true,
      message: 'Withdrawal approved',
      data: { withdrawal }
    });
  } catch (error) {
    console.error('Admin approve withdrawal error:', error);
    return res.status(500).json({ success: false, message: 'Server error approving withdrawal' });
  }
};

// ─── PATCH /api/admin/withdrawals/:id/reject ─────────────────────────────────

const rejectWithdrawal = async (req, res) => {
  try {
    const { adminNote } = req.body;

    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }
    if (['completed', 'rejected'].includes(withdrawal.status)) {
      return res.status(400).json({
        success: false,
        message: `Withdrawal is already '${withdrawal.status}'`
      });
    }

    // Refund amount back to user wallet
    await User.findByIdAndUpdate(withdrawal.userId, {
      $inc: { [`wallet.${withdrawal.type}`]: withdrawal.amount }
    });

    // Update the original Transaction record to reflect rejection
    await Transaction.updateOne(
      { referenceId: withdrawal._id, referenceModel: 'Withdrawal' },
      { status: 'rejected' }
    );

    // Create a new adjustment transaction for the refund
    await Transaction.create({
      userId:       withdrawal.userId,
      type:         'adjustment',
      amount:       withdrawal.amount,
      status:       'completed',
      description:  `Refund for rejected ${withdrawal.type} withdrawal`,
      referenceId:  withdrawal._id,
      referenceModel: 'Withdrawal'
    });

    withdrawal.status      = 'rejected';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user._id;
    withdrawal.adminNote   = adminNote || '';
    await withdrawal.save();

    await Notification.create({
      userId:  withdrawal.userId,
      title:   'Withdrawal Rejected',
      message: `Your withdrawal of $${withdrawal.amount} was rejected. $${withdrawal.amount} has been refunded to your ${withdrawal.type} wallet.`,
      type:    'error'
    });

    return res.json({
      success: true,
      message: 'Withdrawal rejected and amount refunded',
      data: { withdrawal }
    });
  } catch (error) {
    console.error('Admin reject withdrawal error:', error);
    return res.status(500).json({ success: false, message: 'Server error rejecting withdrawal' });
  }
};

// ─── PATCH /api/admin/withdrawals/:id/complete ───────────────────────────────

const completeWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }
    if (withdrawal.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Withdrawal is already completed' });
    }
    if (withdrawal.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'Cannot complete a rejected withdrawal' });
    }

    withdrawal.status      = 'completed';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user._id;
    if (req.body.adminNote) withdrawal.adminNote = req.body.adminNote;
    await withdrawal.save();

    // Update the corresponding Transaction record to reflect the new status
    await Transaction.updateOne(
      { referenceId: withdrawal._id, referenceModel: 'Withdrawal' },
      { status: 'completed' }
    );

    await Notification.create({
      userId:  withdrawal.userId,
      title:   'Withdrawal Completed',
      message: `Your withdrawal of $${withdrawal.amount} has been completed successfully!`,
      type:    'success'
    });

    return res.json({
      success: true,
      message: 'Withdrawal marked as completed',
      data: { withdrawal }
    });
  } catch (error) {
    console.error('Admin complete withdrawal error:', error);
    return res.status(500).json({ success: false, message: 'Server error completing withdrawal' });
  }
};

// ─── PUT /api/admin/withdrawals/:id  (legacy single-action route, kept for compat) ──

/**
 * Legacy: approve / reject / complete in one route.
 * New code should use the dedicated PATCH routes above.
 */
const updateWithdrawalStatus = async (req, res) => {
  const { status } = req.body;
  if (status === 'approved')  return approveWithdrawal(req, res);
  if (status === 'rejected')  return rejectWithdrawal(req, res);
  if (status === 'completed') return completeWithdrawal(req, res);
  return res.status(400).json({
    success: false,
    message: 'Invalid status. Must be approved, rejected, or completed.'
  });
};

/**
 * POST /api/admin/roi/credit
 * Credit ROI to a user's profit wallet, respecting income caps, and distribute level income.
 */
const creditRoi = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const { userId, investmentId, amount } = req.body;
  if (!userId || !investmentId || !amount) {
    return res.status(400).json({ success: false, message: 'userId, investmentId and amount are required' });
  }
  try {
    // Credit ROI to the investor's profit wallet (income cap enforced inside service)
    const creditInfo = await creditRoiToInvestor(userId, investmentId, Number(amount));
    // Distribute level income up the upline chain based on the credited amount
    const levelResults = await distributeLevelIncome(userId, creditInfo.credited);
    return res.json({
      success: true,
      message: `ROI credit processed (credited: $${creditInfo.credited})`,
      data: { creditInfo, levelResults }
    });
  } catch (error) {
    console.error('Admin ROI credit error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing ROI credit' });
  }
};


/**
 * Inject gross realized trading profit, split into system pools, then
 * immediately distribute the 60% investor share to active investors
 * proportionally by their active capital.
 *
 * Pool split:
 *   60% → investorPool  (then distributed to users; remainder stays in pool)
 *   10% → levelPool
 *    6% → salaryPool
 *    4% → rewardPool
 *   20% → traderSharePool
 */
const injectRealizedProfit = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }

  try {
    const { amount, note } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Gross realized profit amount must be > 0' });
    }

    const gross         = Number(amount);
    const investorShare = Number((gross * 0.60).toFixed(4));
    const levelShare    = Number((gross * 0.10).toFixed(4));
    const salaryShare   = Number((gross * 0.06).toFixed(4));
    const rewardShare   = Number((gross * 0.04).toFixed(4));
    const traderShare   = Number((gross * 0.20).toFixed(4));

    // ── 1. Update system pools ──────────────────────────────────────────────
    const pool = await SystemPool.getSingleton();
    pool.totalRealizedProfit += gross;
    pool.investorPool        += investorShare;  // will be reduced by actual distributed amount below
    pool.levelPool           += levelShare;
    pool.salaryPool          += salaryShare;
    pool.rewardPool          += rewardShare;
    pool.traderSharePool     += traderShare;
    pool.lastUpdated          = new Date();
    await pool.save();

    // ── 2. Create audit transaction for the injection itself ───────────────
    await Transaction.create({
      userId:      req.user._id,
      type:        'adjustment',
      amount:      gross,
      status:      'completed',
      description: note || `Admin injected $${gross} realized trading profit`,
      metadata:    { investorShare, levelShare, salaryShare, rewardShare, traderShare }
    });

    // ── 3. Distribute the 60% investor share to active investors ───────────
    // Each active investor receives:
    //   (their active capital / total active capital) × investorShare
    const distribution = await profitService.distributeInvestorShare(
      investorShare,
      req.user._id,
      note || ''
    );

    // ── 4. Deduct the actually-distributed amount from investorPool ────────
    // Any rounding residual stays in the pool as a buffer.
    if (distribution.distributed > 0) {
      await SystemPool.findOneAndUpdate(
        {},
        { $inc: { investorPool: -distribution.distributed }, $set: { lastUpdated: new Date() } }
      );
      pool.investorPool = Math.max(0, pool.investorPool - distribution.distributed);
    }

    // Re-fetch pool for accurate response figures
    const updatedPool = await SystemPool.getSingleton();

    return res.json({
      success: true,
      message: `Successfully injected $${gross} — $${distribution.distributed.toFixed(4)} distributed to ${distribution.userCount} investor${distribution.userCount !== 1 ? 's' : ''}`,
      data: {
        grossProfit: gross,
        breakdown: {
          investorShare60:  investorShare,
          levelPool10:      levelShare,
          salaryPool6:      salaryShare,
          rewardPool4:      rewardShare,
          traderShare20:    traderShare
        },
        investorDistribution: {
          totalDistributed: distribution.distributed,
          userCount:        distribution.userCount,
          skippedCount:     distribution.skipped,
          // Only include per-user breakdown if there are ≤50 investors (avoid huge payloads)
          perUser: distribution.userCount <= 50 ? distribution.details : []
        },
        currentSystemPools: updatedPool
      }
    });
  } catch (error) {
    console.error('Admin profit injection error:', error);
    return res.status(500).json({ success: false, message: 'Server error during profit injection' });
  }
};

// ─── POST /api/admin/commission/adjust ───────────────────────────────────────

const manualCommissionAdjustment = async (req, res) => {
  // Respect express-validator errors wired up in adminRoutes
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const { userId, amount, walletType, description } = req.body;

    // Sanitize description — strip any HTML/script tags
    const safeDescription = description
      ? String(description).replace(/<[^>]*>/g, '').trim().slice(0, 200)
      : null;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await User.findByIdAndUpdate(userId, { $inc: { [`wallet.${walletType}`]: Number(amount) } });

    await CommissionLog.create({
      recipientId:      userId,
      commissionType:   'manual_adjustment',
      baseAmount:       Number(amount),
      commissionAmount: Number(amount),
      description:      safeDescription || 'Admin manual wallet adjustment'
    });

    await Transaction.create({
      userId,
      type:        'adjustment',
      amount:      Number(amount),
      status:      'completed',
      description: safeDescription || `Admin adjustment to ${walletType} wallet`
    });

    return res.json({ success: true, message: `Successfully adjusted ${walletType} wallet by $${amount}` });
  } catch (error) {
    console.error('Admin manual adjustment error:', error);
    return res.status(500).json({ success: false, message: 'Server error adjusting wallet' });
  }
};

// ─── PATCH /api/admin/users/:id/networker-access ─────────────────────────────

/**
 * Toggle the Networker section access flag for a user.
 * ONLY an admin can call this — never automatic.
 * The 21-level commission engine is completely unaffected by this flag.
 *
 * Body: { grant: boolean }  — true to grant, false to revoke.
 * If body is omitted the flag is toggled from its current value.
 */
const toggleNetworkerAccess = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Explicit grant/revoke from body, or toggle if not provided
    const newValue = req.body.grant !== undefined
      ? Boolean(req.body.grant)
      : !user.networkerAccessGranted;

    user.networkerAccessGranted   = newValue;
    user.networkerAccessGrantedAt = newValue ? new Date() : null;
    user.networkerAccessGrantedBy = newValue ? req.user._id : null;
    await user.save();

    return res.json({
      success: true,
      message: `Networker access ${newValue ? 'granted' : 'revoked'} for ${user.name}`,
      data: {
        userId:                   user._id,
        name:                     user.name,
        email:                    user.email,
        networkerAccessGranted:   user.networkerAccessGranted,
        networkerAccessGrantedAt: user.networkerAccessGrantedAt,
        networkerAccessGrantedBy: user.networkerAccessGrantedBy
      }
    });
  } catch (error) {
    console.error('Admin toggle networker access error:', error);
    return res.status(500).json({ success: false, message: 'Server error toggling networker access' });
  }
};

/**
 * PATCH /api/admin/users/:id/plan
 * Set the investor plan tier (A or B) for a user.
 * Mirrors the existing updateInvestorPlan endpoint from investorAdminController.
 */
const updateUserPlan = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !['A', 'B'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Plan must be A or B' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.plan = plan;
    await user.save();

    return res.json({
      success: true,
      message: `User plan updated to ${plan}`,
      data: { userId: user._id, name: user.name, plan: user.plan }
    });
  } catch (error) {
    console.error('Admin update user plan error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating user plan' });
  }
};

/**
 * PATCH /api/admin/users/:id/role
 * Update user role: 'investor' | 'working_leader'
 * Accepts { accountType: "investor" | "working_leader" } or { role: "..." }
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const targetRole = req.body.accountType || req.body.role;

    if (!targetRole || !['investor', 'working_leader'].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be either "investor" or "working_leader"'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = targetRole;
    await user.save();

    return res.json({
      success: true,
      message: `User role successfully updated to ${targetRole}`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          accountType: user.accountType
        }
      }
    });
  } catch (error) {
    console.error('Admin update user role error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating user role' });
  }
};

/**
 * POST /api/admin/achievements/check/:userId
 * Check achievement qualifications for a user based on 60/40 BV rule.
 */
const checkAchievements = async (req, res) => {
  try {
    const userId = req.params.userId || req.body.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const data = await achievementService.checkUserAchievements(userId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Admin check achievements error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error checking achievements' });
  }
};

/**
 * POST /api/admin/achievements/claim or POST /api/admin/achievements/check/:userId
 * Claim qualified achievement rewards for a user:
 * Fixed tier amounts from constants, credit wallet.profit, push to achievementsClaimed, do NOT increase totalEarned.
 */
const claimAchievements = async (req, res) => {
  try {
    const userId = req.params.userId || req.body.userId;
    const tierName = req.body.tierName || null;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const result = await achievementService.claimUserAchievements(userId, tierName);
    return res.json({
      success: true,
      message: result.claimedCount > 0
        ? `Successfully claimed ${result.claimedCount} achievement reward(s) totalling $${result.totalRewarded} USDT`
        : 'No new eligible achievements to claim',
      data: result
    });
  } catch (error) {
    console.error('Admin claim achievements error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error claiming achievements' });
  }
};

/**
 * POST /api/admin/users/:id/credit-roi
 * Manually credit daily/monthly ROI to a user's Plan A/B investment.
 * Enforces 3x income cap and handles per-investment cap tracking.
 *
 * Request body: { investmentId, amount }
 * where investmentId is an InvestorInvestment._id with userId set.
 */
const creditUserRoi = async (req, res) => {
  try {
    const { investmentId, amount } = req.body;
    const userId = req.params.id;

    if (!investmentId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'investmentId and amount > 0 required'
      });
    }

    // Find the specific investment linked to this user
    const investment = await InvestorInvestment.findOne({
      _id: investmentId,
      userId,
      status: 'active'
    });

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Active investment not found for this user'
      });
    }

    if (investment.capReached) {
      return res.status(400).json({
        success: false,
        message: 'Income cap already reached for this investment'
      });
    }

    const roiAmount = Number(amount);
    const remaining = investment.incomeCap - investment.totalRoiEarned;
    const credited = Math.min(roiAmount, remaining);

    // Update investment's ROI tracking
    investment.totalRoiEarned += credited;
    investment.lastRoiDate = new Date();

    // Check if this investment hit its 3x cap
    if (investment.totalRoiEarned >= investment.incomeCap) {
      investment.capReached = true;
      investment.status = 'completed';
    }

    await investment.save();

    // Credit to User's wallet.roi and totalRoiEarned
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'wallet.roi': credited,
        totalRoiEarned: credited
      }
    });

    // Create audit transaction
    await Transaction.create({
      userId,
      type: 'profit',
      amount: credited,
      status: 'completed',
      description: `Admin ROI credit of $${credited.toFixed(4)} for investment $${investment.amount}${investment.capReached ? ' (cap reached)' : ''}`,
      referenceId: investment._id,
      referenceModel: 'InvestorInvestment'
    });

    // Notify user
    await Notification.create({
      userId,
      title: 'ROI Credited',
      message: `$${credited.toFixed(2)} ROI has been credited to your wallet${investment.capReached ? ' (income cap reached)' : ''}.`,
      type: 'profit'
    });

    return res.json({
      success: true,
      message: `ROI of $${credited.toFixed(4)} credited${investment.capReached ? ' (cap reached)' : ''}`,
      data: {
        credited,
        capReached: investment.capReached,
        totalEarned: investment.totalRoiEarned,
        incomeCap: investment.incomeCap
      }
    });
  } catch (error) {
    console.error('Admin credit user ROI error:', error);
    return res.status(500).json({ success: false, message: 'Server error crediting ROI' });
  }
};

/**
 * PATCH /api/admin/users/:id
 * Update user profile: name, email, phoneNumber, bankDetails
 * Validates email uniqueness
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, phoneNumber, bankDetails, walletAddress, oldTransactionIds } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Validate and update name if provided
    if (name !== undefined && name !== null) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Name must be a non-empty string' });
      }
      user.name = name.trim();
    }

    // Validate and update email if provided
    if (email !== undefined && email !== null) {
      const trimmedEmail = email.toLowerCase().trim();
      
      // Check email format
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }

      // Check if email is already in use by another user
      if (user.email !== trimmedEmail) {
        const existingUser = await User.findOne({ email: trimmedEmail });
        if (existingUser) {
          return res.status(409).json({ success: false, message: 'Email already in use' });
        }
      }

      user.email = trimmedEmail;
    }

    // Validate and update password if provided
    if (password !== undefined && password !== null) {
      const trimmedPassword = String(password).trim();
      if (trimmedPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      user.password = trimmedPassword;  // Will be hashed by pre-save hook
    }

    // Update phone number if provided
    if (phoneNumber !== undefined) {
      user.phoneNumber = phoneNumber ? phoneNumber.trim() : null;
    }

    // Update wallet address if provided
    if (walletAddress !== undefined) {
      user.walletAddress = walletAddress ? walletAddress.trim() : null;
    }

    // Update old transaction IDs if provided
    if (oldTransactionIds !== undefined) {
      user.oldTransactionIds = oldTransactionIds ? oldTransactionIds.trim() : null;
    }

    // Update bank details if provided
    if (bankDetails !== undefined && bankDetails !== null) {
      if (typeof bankDetails !== 'object' || Array.isArray(bankDetails)) {
        return res.status(400).json({ success: false, message: 'Bank details must be an object' });
      }
      
      user.bankDetails = {
        accountName: bankDetails.accountName ? bankDetails.accountName.trim() : null,
        accountNumber: bankDetails.accountNumber ? bankDetails.accountNumber.trim() : null,
        bankName: bankDetails.bankName ? bankDetails.bankName.trim() : null,
        ifscCode: bankDetails.ifscCode ? bankDetails.ifscCode.toUpperCase().trim() : null
      };
    }

    await user.save();

    return res.json({
      success: true,
      message: 'User profile updated successfully',
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        walletAddress: user.walletAddress,
        oldTransactionIds: user.oldTransactionIds,
        bankDetails: user.bankDetails
      }
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating user' });
  }
};

/**
 * GET /api/admin/users/:id/transactions
 * Fetch user's transaction history (deposits + withdrawals + ROI, etc.)
 * Ordered by date descending (newest first)
 */
const getUserTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Verify user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const transactions = await Transaction.find({ userId: id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await Transaction.countDocuments({ userId: id });

    return res.json({
      success: true,
      message: 'User transactions retrieved',
      data: {
        userId: id,
        userName: user.name,
        transactions,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Admin get user transactions error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching transactions' });
  }
};

/**
 * POST /api/admin/users/:id/deposit
 * Admin deposits funds into a user's wallet
 * Accepts: walletType (capital/profit/commission/roi), amount, note
 */
const adminDepositToUser = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { id } = req.params;
    const { walletType, amount, note } = req.body;

    console.log('📝 Deposit request:', { id, walletType, amount, note, adminId: req.user._id });

    // Validation
    if (!walletType || !['capital', 'profit', 'commission', 'roi'].includes(walletType)) {
      return res.status(400).json({ success: false, message: 'Valid walletType required: capital, profit, commission, or roi' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('👤 Found user:', user.name);

    // Add to wallet
    const previousBalance = user.wallet[walletType] || 0;
    user.wallet[walletType] = (user.wallet[walletType] || 0) + amount;
    await user.save();

    console.log('💰 Wallet updated:', { walletType, previousBalance, newBalance: user.wallet[walletType] });

    // Create transaction record
    const transaction = new Transaction({
      userId: id,
      type: 'admin_deposit',
      description: `Admin deposit to ${walletType} wallet: ${note || '(no note)'}`,
      walletType,
      amount,
      status: 'completed',
      metadata: {
        adminId: req.user._id,
        adminEmail: req.user.email,
        note,
        previousBalance,
        newBalance: user.wallet[walletType]
      }
    });
    await transaction.save();

    console.log('✅ Transaction saved:', transaction._id);

    // ── IF depositing to capital, create InvestorInvestment so it earns daily ROI ────
    let investmentId = null;
    if (walletType === 'capital') {
      const InvestorInvestment = require('../models/InvestorInvestment');
      const investorConstants = require('../../config/investorConstants');
      
      // Use phase-aware package info to get correct Phase 1 (Plan A) rate
      const packageInfo = investorConstants.getInvestorPackageInfo(amount, 'A');
      
      if (!packageInfo) {
        console.warn(`⚠️  Amount $${amount} does not fit investor package tiers (100-25000)`);
        // Still create record but mark as needs admin review
        return res.status(400).json({ 
          success: false, 
          message: `Admin deposit amount $${amount} is outside standard investor package ranges (100-25000)` 
        });
      }

      const packageNumber = packageInfo.packageNumber;
      const dailyRate = packageInfo.dailyRate / 100; // Convert from percentage to decimal (1.00 → 0.01)

      // Create InvestorInvestment record so cron picks it up for daily ROI
      const investment = new InvestorInvestment({
        userId: id,
        amount: amount,
        plan: 'A',  // Admin deposits use Plan A rates (Phase 1)
        packageNumber: packageNumber,
        dailyRate: dailyRate,
        incomeCap: amount * 3,  // 3x income cap
        status: 'active',
        startDate: new Date(),
        // Set lastRoiDate to yesterday so profit calculation runs TODAY (not tomorrow)
        // Profit cron checks: lastRoiDate < startOfToday; if set to now(), it will be >= startOfToday
        lastRoiDate: (() => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return yesterday;
        })(),
        approvedBy: req.user._id,
        approvedAt: new Date(),
        paymentNote: `Admin deposit: ${note || '(no note)'}`,
        adminNote: `Auto-created investment from admin capital deposit of $${amount}. Phase 1 (Plan A) - will transition to Plan B at 6mo, then 8-10% monthly at 12mo.`
      });
      
      const savedInvestment = await investment.save();
      investmentId = savedInvestment._id;
      
      console.log(`✅ Created InvestorInvestment: ${investmentId} | Amount: $${amount} | Package: ${packageNumber} | Phase 1 Daily Rate: ${(dailyRate * 100).toFixed(2)}%`);
    
    // ── Calculate and credit direct referral commission (5%) ────
    if (user.referredBy) {
      const commissionPercentage = 0.05; // 5%
      const commissionAmount = Number((amount * commissionPercentage).toFixed(2));
      
      const referrer = await User.findById(user.referredBy);
      if (referrer) {
        // Credit commission to referrer
        await User.findByIdAndUpdate(user.referredBy, {
          $inc: { 'wallet.commission': commissionAmount }
        });
        
        // Create commission transaction for referrer
        await Transaction.create({
          userId: user.referredBy,
          type: 'commission',
          description: `Direct referral commission (5%) from ${user.name}'s admin capital deposit of $${amount}`,
          amount: commissionAmount,
          status: 'completed',
          referenceId: transaction._id,
          referenceModel: 'Transaction',
          metadata: {
            commissionType: 'direct_referral',
            depositAmount: amount,
            commissionRate: '5%',
            referredUserId: user._id,
            referredUserName: user.name
          }
        });
        
        // Create notification for referrer
        await Notification.create({
          userId: user.referredBy,
          title: 'Direct Referral Commission',
          message: `You earned $${commissionAmount} commission from ${user.name}'s admin deposit of $${amount}`,
          type: 'commission'
        });
        
        console.log(`✅ Credited $${commissionAmount} commission to ${referrer.name}`);
      }
    }
    }

    // ── AUTO-UNLOCK: Grant Networker access when capital is deposited ────
    if (walletType === 'capital') {
      await User.findByIdAndUpdate(id, {
        networkerAccessGranted: true,
        networkerAccessGrantedAt: new Date(),
        networkerAccessGrantedBy: req.user._id
      });
    }

    return res.json({
      success: true,
      message: `Deposited $${amount} to ${user.name}'s ${walletType} wallet${walletType === 'capital' ? ' (earning daily ROI)' : ''}`,
      data: {
        userId: id,
        userName: user.name,
        walletType,
        previousBalance,
        amount,
        newBalance: user.wallet[walletType],
        transactionId: transaction._id,
        investmentId: investmentId  // Return investment ID if created
      }
    });
  } catch (error) {
    console.error('❌ Admin deposit to user error:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ success: false, message: 'Server error processing deposit' });
  }
};

/**
 * POST /api/admin/users/:id/withdraw
 * Admin withdraws funds from a user's wallet
 * Accepts: walletType (capital/profit/commission/roi), amount, note
 */
const adminWithdrawFromUser = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { id } = req.params;
    const { walletType, amount, note } = req.body;

    // Validation
    if (!walletType || !['capital', 'profit', 'commission', 'roi'].includes(walletType)) {
      return res.status(400).json({ success: false, message: 'Valid walletType required: capital, profit, commission, or roi' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check sufficient balance
    const currentBalance = user.wallet[walletType] || 0;
    if (currentBalance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${currentBalance.toFixed(2)}, Requested: $${amount.toFixed(2)}`
      });
    }

    // Deduct from wallet
    user.wallet[walletType] = currentBalance - amount;
    await user.save();

    // Create transaction record
    const transaction = new Transaction({
      userId: id,
      type: 'admin_withdrawal',
      description: `Admin withdrawal from ${walletType} wallet: ${note || '(no note)'}`,
      walletType,
      amount: -amount,  // Negative to indicate withdrawal
      status: 'completed',
      metadata: {
        adminId: req.user._id,
        adminEmail: req.user.email,
        note,
        previousBalance: currentBalance,
        newBalance: user.wallet[walletType]
      }
    });
    await transaction.save();

    return res.json({
      success: true,
      message: `Withdrew $${amount} from ${user.name}'s ${walletType} wallet`,
      data: {
        userId: id,
        userName: user.name,
        walletType,
        previousBalance: currentBalance,
        amount,
        newBalance: user.wallet[walletType],
        transactionId: transaction._id
      }
    });
  } catch (error) {
    console.error('Admin withdrawal from user error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing withdrawal' });
  }
};

/**
 * POST /api/admin/users/:id/impersonate
 * Admin generates an impersonation token to temporarily "become" a user
 * Returns a token that can be used to log in as that user
 */
const generateImpersonationToken = async (req, res) => {
  try {
    // Check if user is authenticated and is admin
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { id } = req.params;

    // Verify target user exists
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Import JWT and ImpersonationLog here
    const jwt = require('jsonwebtoken');
    const ImpersonationLog = require('../models/ImpersonationLog');

    // Calculate expiry time (30 minutes from now)
    const expiryTime = new Date(Date.now() + 30 * 60 * 1000);

    // Create special impersonation token with metadata
    const impersonationToken = jwt.sign(
      {
        id: targetUser._id,
        email: targetUser.email,
        type: 'user',
        impersonated: true,
        impersonatedBy: req.user._id,
        impersonatedByEmail: req.user.email,
        impersonationStarted: new Date().toISOString(),
        expiresIn: '30m'  // 30 minute session
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30m' }
    );

    // Create impersonation log entry
    const impersonationLog = new ImpersonationLog({
      adminId: req.user._id,
      adminEmail: req.user.email,
      userId: targetUser._id,
      userEmail: targetUser.email,
      sessionStartTime: new Date(),
      sessionExpiryTime: expiryTime,
      status: 'active'
    });

    await impersonationLog.save();

    console.log(`✅ Admin ${req.user.email} (${req.user._id}) is impersonating ${targetUser.email} (${targetUser._id})`);
    console.log(`📋 Impersonation log created: ${impersonationLog._id}`);

    return res.json({
      success: true,
      message: `Generated impersonation token for ${targetUser.name}`,
      data: {
        token: impersonationToken,
        user: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          impersonatedBy: req.user.name,
          expiresIn: '30 minutes'
        }
      }
    });
  } catch (error) {
    console.error('❌ Generate impersonation token error:', error);
    return res.status(500).json({ success: false, message: 'Server error generating impersonation token' });
  }
};

/**
 * GET /api/admin/impersonation-logs
 * Retrieve all impersonation sessions with optional filters
 */
const getImpersonationLogs = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { adminId, userId, status, limit = 50, skip = 0 } = req.query;
    const ImpersonationLog = require('../models/ImpersonationLog');

    // Build filter
    const filter = {};
    if (adminId) filter.adminId = adminId;
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const logs = await ImpersonationLog.find(filter)
      .sort({ sessionStartTime: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('adminId', 'name email')
      .populate('userId', 'name email')
      .lean();

    const total = await ImpersonationLog.countDocuments(filter);

    return res.json({
      success: true,
      message: 'Impersonation logs retrieved',
      data: {
        logs,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get impersonation logs error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching logs' });
  }
};

/**
 * GET /api/admin/users/:id/payment-info
 * Get user's latest payment information for display in admin edit modal
 * Returns: latest wallet address from withdrawals, latest transaction ID from investments, etc.
 */
const getUserPaymentInfo = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📋 getUserPaymentInfo called for user:', id);
    
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get current system wallet (admin rotatable wallet)
    const SystemWallet = require('../models/SystemWallet');
    const currentSystemWallet = await SystemWallet.getCurrentWallet();

    // Get latest 5 withdrawals with wallet addresses
    const latestWithdrawals = await require('../models/Withdrawal').find({
      userId: id,
      walletAddress: { $exists: true, $ne: '' }
    }).sort({ requestedAt: -1 }).limit(5);

    console.log('💳 Latest withdrawals:', latestWithdrawals.length);

    // Get latest 5 investments with transaction IDs
    const latestInvestments = await require('../models/Investment').find({
      userId: id,
      transactionId: { $exists: true, $ne: '' }
    }).sort({ createdAt: -1 }).limit(5);

    console.log('📊 Latest investments:', latestInvestments.length);

    // Get the most recent withdrawal
    const latestWithdrawal = latestWithdrawals[0];
    const latestInvestment = latestInvestments[0];

    const responseData = {
      userId: id,
      storedWalletAddress: user.walletAddress || null,
      storedBankDetails: user.bankDetails || null,
      
      // Current system-wide crypto wallet (admin rotatable)
      currentSystemWallet: currentSystemWallet ? {
        _id: currentSystemWallet._id,
        address: currentSystemWallet.address,
        network: currentSystemWallet.network,
        label: currentSystemWallet.label,
        notes: currentSystemWallet.notes,
        isCurrent: currentSystemWallet.isCurrent
      } : null,
      
      // Latest withdrawal info
      latestWithdrawal: latestWithdrawal ? {
        _id: latestWithdrawal._id,
        amount: latestWithdrawal.amount,
        walletAddress: latestWithdrawal.walletAddress,
        network: latestWithdrawal.network,
        type: latestWithdrawal.type,
        status: latestWithdrawal.status,
        requestedAt: latestWithdrawal.requestedAt
      } : null,
      
      // All recent withdrawals for reference
      recentWithdrawals: latestWithdrawals.map(w => ({
        _id: w._id,
        amount: w.amount,
        walletAddress: w.walletAddress,
        network: w.network,
        type: w.type,
        requestedAt: w.requestedAt
      })),
      
      // Latest investment info
      latestInvestment: latestInvestment ? {
        _id: latestInvestment._id,
        amount: latestInvestment.amount,
        transactionId: latestInvestment.transactionId,
        paymentProof: latestInvestment.paymentProof,
        paymentNote: latestInvestment.paymentNote,
        packageName: latestInvestment.packageName,
        createdAt: latestInvestment.createdAt
      } : null,
      
      // All recent investments for reference
      recentInvestments: latestInvestments.map(inv => ({
        _id: inv._id,
        amount: inv.amount,
        transactionId: inv.transactionId,
        packageName: inv.packageName,
        createdAt: inv.createdAt
      }))
    };

    console.log('✅ Returning payment info:', responseData);

    return res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('❌ Get user payment info error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching payment info' });
  }
};

/**
 * ─── SYSTEM WALLET MANAGEMENT ──────────────────────────────────────────────────
 * Admin can manage rotating crypto wallets
 */

// GET all system wallets
const getAllWallets = async (req, res) => {
  try {
    const SystemWallet = require('../models/SystemWallet');
    
    const wallets = await SystemWallet.find()
      .sort({ isCurrent: -1, createdAt: -1 });
    
    return res.json({
      success: true,
      data: { wallets }
    });
  } catch (error) {
    console.error('Get wallets error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET current active wallet (what clients see)
const getCurrentWallet = async (req, res) => {
  try {
    const SystemWallet = require('../models/SystemWallet');
    
    const wallet = await SystemWallet.getCurrentWallet();
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'No active wallet configured'
      });
    }
    
    return res.json({
      success: true,
      data: { wallet }
    });
  } catch (error) {
    console.error('Get current wallet error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST create new wallet
const createWallet = async (req, res) => {
  try {
    const { address, network, label, notes } = req.body;
    const SystemWallet = require('../models/SystemWallet');
    
    // Validation
    if (!address || !network || !label) {
      return res.status(400).json({
        success: false,
        message: 'Address, network, and label are required'
      });
    }
    
    // Check if wallet already exists
    const existing = await SystemWallet.findOne({ address });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address already exists'
      });
    }
    
    // Create new wallet
    const wallet = new SystemWallet({
      address,
      network,
      label,
      notes: notes || '',
      createdBy: req.user._id,
      lastModifiedBy: req.user._id,
      isActive: true,
      isCurrent: false  // Don't auto-set as current
    });
    
    await wallet.save();
    
    console.log(`✅ Created wallet: ${label} (${network})`);
    
    return res.status(201).json({
      success: true,
      message: 'Wallet created successfully',
      data: { wallet }
    });
  } catch (error) {
    console.error('Create wallet error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT set wallet as current
const setCurrentWallet = async (req, res) => {
  try {
    const { walletId } = req.body;
    const SystemWallet = require('../models/SystemWallet');
    
    if (!walletId) {
      return res.status(400).json({
        success: false,
        message: 'Wallet ID is required'
      });
    }
    
    const wallet = await SystemWallet.findById(walletId);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Set as current (this also deactivates the old one)
    await wallet.setAsCurrent();
    
    console.log(`✅ Set current wallet: ${wallet.label}`);
    
    return res.json({
      success: true,
      message: `Wallet '${wallet.label}' is now active`,
      data: { wallet }
    });
  } catch (error) {
    console.error('Set current wallet error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT update wallet
const updateWallet = async (req, res) => {
  try {
    const { walletId } = req.params;
    const { label, notes, isActive } = req.body;
    const SystemWallet = require('../models/SystemWallet');
    
    const wallet = await SystemWallet.findById(walletId);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Update fields
    if (label) wallet.label = label;
    if (notes !== undefined) wallet.notes = notes;
    if (isActive !== undefined) wallet.isActive = isActive;
    
    wallet.lastModifiedBy = req.user._id;
    await wallet.save();
    
    console.log(`✅ Updated wallet: ${wallet.label}`);
    
    return res.json({
      success: true,
      message: 'Wallet updated successfully',
      data: { wallet }
    });
  } catch (error) {
    console.error('Update wallet error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE wallet (archive it)
const deleteWallet = async (req, res) => {
  try {
    const { walletId } = req.params;
    const SystemWallet = require('../models/SystemWallet');
    
    const wallet = await SystemWallet.findById(walletId);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Can't delete current wallet
    if (wallet.isCurrent) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the current active wallet. Set another wallet as current first.'
      });
    }
    
    // Archive instead of delete
    wallet.status = 'archived';
    wallet.isActive = false;
    wallet.lastModifiedBy = req.user._id;
    await wallet.save();
    
    console.log(`✅ Archived wallet: ${wallet.label}`);
    
    return res.json({
      success: true,
      message: 'Wallet archived successfully',
      data: { wallet }
    });
  } catch (error) {
    console.error('Delete wallet error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * ─── ADMIN SETTINGS (Bank Details, etc.) ───────────────────────────────────
 * Global settings for admin/company bank account
 */

// GET admin settings (bank details) - PUBLIC endpoint, anyone can see
const getAdminSettings = async (req, res) => {
  try {
    const AdminSettings = require('../models/AdminSettings');
    const settings = await AdminSettings.getCurrent();
    
    return res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    console.error('Get admin settings error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT update admin settings (bank details) - ADMIN ONLY
const updateAdminSettings = async (req, res) => {
  try {
    const { bankDetails } = req.body;
    const AdminSettings = require('../models/AdminSettings');
    
    let settings = await AdminSettings.getCurrent();
    
    if (bankDetails) {
      // Archive current bank details to history before updating
      settings.archiveCurrentAsHistory();
      
      // Update with new bank details
      settings.bankDetails = {
        accountName: bankDetails.accountName || null,
        accountNumber: bankDetails.accountNumber || null,
        bankName: bankDetails.bankName || null,
        ifscCode: bankDetails.ifscCode || null,
        branch: bankDetails.branch || null,
        accountType: bankDetails.accountType || null
      };
    }
    
    settings.lastUpdatedBy = req.user._id;
    settings.lastUpdatedAt = new Date();
    await settings.save();
    
    console.log(`✅ Updated admin settings and archived previous values to history`);
    
    return res.json({
      success: true,
      message: 'Admin settings updated successfully',
      data: { settings }
    });
  } catch (error) {
    console.error('Update admin settings error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getSystemStats,
  getSystemPools,
  getAllUsers,
  toggleUserActive,
  updateUserRole,
  getAllInvestments,
  approveInvestment,
  approvePlanInvestment,
  rejectInvestment,
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  completeWithdrawal,
  updateWithdrawalStatus,
  injectRealizedProfit,
  manualCommissionAdjustment,
  creditRoi,
  checkAchievements,
  claimAchievements,
  toggleNetworkerAccess,
  updateUserPlan,
  creditUserRoi,
  updateUser,
  getUserTransactions,
  adminDepositToUser,
  adminWithdrawFromUser,
  generateImpersonationToken,
  getImpersonationLogs,
  getUserPaymentInfo,
  getUserUplineDownline,
  getAllWallets,
  getCurrentWallet,
  createWallet,
  setCurrentWallet,
  updateWallet,
  deleteWallet,
  getAdminSettings,
  updateAdminSettings
};

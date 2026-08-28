const { validationResult } = require('express-validator');
const User = require('../models/User');
const Investment = require('../models/Investment');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const CommissionLog = require('../models/CommissionLog');
const Notification = require('../models/Notification');
const SystemPool = require('../models/SystemPool');
const commissionService = require('../services/commissionService');
const profitService = require('../services/profitService');

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
      totalInvestments,
      activeInvestmentsCount,
      pendingInvestmentsCount,
      pendingWithdrawalsCount,
      investmentSum,
      profitSum,
      commissionSum,
      pool
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ totalInvestment: { $gt: 0 } }),
      Investment.countDocuments(),
      Investment.countDocuments({ status: 'active' }),
      Investment.countDocuments({ status: 'pending' }),
      Withdrawal.countDocuments({ status: 'pending' }),
      Investment.aggregate([
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

    return res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalInvestments,
        activeInvestmentsCount,
        pendingInvestmentsCount,
        totalInvestmentVolume: investmentSum[0]?.total ?? 0,
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

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('-password')
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

// ─── GET /api/admin/investments ──────────────────────────────────────────────

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

    const [total, investments] = await Promise.all([
      Investment.countDocuments(query),
      Investment.find(query)
        .populate('userId', 'name email referralCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

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

// ─── PATCH /api/admin/investments/:id/approve ────────────────────────────────

/**
 * Approve a pending investment.
 *
 * Flow:
 *  1. Set investment status → 'active', isActive → true, record approvedBy/At
 *  2. Credit user wallet.capital with the investment amount
 *  3. Update user totalInvestment + investmentLevel
 *  4. Credit upline teamBusiness volumes (up to 25 levels)
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
    investment.lastProfitDate = new Date();
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
        totalInvestment:    investment.amount,
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

    // 6. Notify investor
    await Notification.create({
      userId: investment.userId,
      title:   'Investment Approved ✓',
      message: `Your investment of $${investment.amount} in ${investment.packageName} has been approved and is now active!`,
      type:    'success'
    });

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

// ─── POST /api/admin/profit/inject ───────────────────────────────────────────

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

module.exports = {
  getSystemStats,
  getSystemPools,
  getAllUsers,
  toggleUserActive,
  getAllInvestments,
  approveInvestment,
  rejectInvestment,
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  completeWithdrawal,
  updateWithdrawalStatus,
  injectRealizedProfit,
  manualCommissionAdjustment
};

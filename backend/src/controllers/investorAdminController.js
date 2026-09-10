const Investor = require('../models/Investor');
const InvestorInvestment = require('../models/InvestorInvestment');
const {
  getInvestorPackageInfo,
  INVESTOR_INCOME_CAP,
  INVESTOR_MONTHLY_RATE,
  INVESTOR_SWITCH_MONTHS
} = require('../../config/investorConstants');

// ─── GET /api/admin/investors ─────────────────────────────────────────────────

const getAllInvestors = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      query.$or = [
        { name:  { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.plan) query.plan = req.query.plan;

    const [total, investors] = await Promise.all([
      Investor.countDocuments(query),
      Investor.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    return res.json({
      success: true,
      data: {
        investors,
        pagination: { total, page, pages: Math.ceil(total / limit), limit }
      }
    });
  } catch (error) {
    console.error('Admin get all investors error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching investors' });
  }
};

// ─── PATCH /api/admin/investors/:id/plan ─────────────────────────────────────

const updateInvestorPlan = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !['A', 'B'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Plan must be A or B' });
    }

    const investor = await Investor.findById(req.params.id).select('-password');
    if (!investor) {
      return res.status(404).json({ success: false, message: 'Investor not found' });
    }

    investor.plan = plan;
    await investor.save();

    return res.json({
      success: true,
      message: `Investor plan updated to Plan ${plan}`,
      data: { investor }
    });
  } catch (error) {
    console.error('Admin update investor plan error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating plan' });
  }
};

// ─── PATCH /api/admin/investors/:id/toggle ────────────────────────────────────

const toggleInvestorActive = async (req, res) => {
  try {
    const investor = await Investor.findById(req.params.id).select('-password');
    if (!investor) {
      return res.status(404).json({ success: false, message: 'Investor not found' });
    }
    investor.isActive = !investor.isActive;
    await investor.save();
    return res.json({
      success: true,
      message: `Investor ${investor.isActive ? 'activated' : 'deactivated'}`,
      data: { investor }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /api/admin/investors/:id/investments ─────────────────────────────────

const getInvestorInvestments = async (req, res) => {
  try {
    const investor = await Investor.findById(req.params.id).select('-password');
    if (!investor) {
      return res.status(404).json({ success: false, message: 'Investor not found' });
    }

    const investments = await InvestorInvestment.find({ investorId: req.params.id })
      .sort({ createdAt: -1 });

    // 6-month switch check
    let sixMonthsReached = false;
    if (investor.joinDate) {
      const switchDate = new Date(investor.joinDate);
      switchDate.setMonth(switchDate.getMonth() + INVESTOR_SWITCH_MONTHS);
      sixMonthsReached = new Date() >= switchDate;
    }

    return res.json({
      success: true,
      data: { investor, investments, sixMonthsReached }
    });
  } catch (error) {
    console.error('Admin get investor investments error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /api/admin/investors/investments ─────────────────────────────────────
// All investor investments (admin overview)

const getAllInvestorInvestments = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.plan)   query.plan   = req.query.plan;

    const [total, investments] = await Promise.all([
      InvestorInvestment.countDocuments(query),
      InvestorInvestment.find(query)
        .populate('investorId', 'name email plan')
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
    console.error('Admin get all investor investments error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /api/admin/investors/investments/:id/approve ──────────────────────

const approveInvestorInvestment = async (req, res) => {
  try {
    const investment = await InvestorInvestment.findById(req.params.id);
    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }
    if (investment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Investment is already '${investment.status}'`
      });
    }

    const investor = await Investor.findById(investment.investorId);
    if (!investor) {
      return res.status(404).json({ success: false, message: 'Investor not found' });
    }

    // Activate investment
    investment.status    = 'active';
    investment.startDate = new Date();
    investment.lastRoiDate = new Date();
    investment.approvedBy  = req.user._id;
    investment.approvedAt  = new Date();

    // Check if 6 months already passed (edge case)
    const sixMonthDate = new Date(investment.startDate);
    sixMonthDate.setMonth(sixMonthDate.getMonth() + INVESTOR_SWITCH_MONTHS);
    investment.sixMonthSwitchDate = sixMonthDate;

    await investment.save();

    // Credit investor wallet.capital + update stats
    const updateFields = {
      $inc: {
        'wallet.capital': investment.amount,
        totalInvested: investment.amount
      }
    };
    // Set joinDate on first ever approval
    if (!investor.joinDate) {
      updateFields.$set = { joinDate: new Date() };
    }
    await Investor.findByIdAndUpdate(investment.investorId, updateFields);

    return res.json({
      success: true,
      message: `Investment of $${investment.amount} approved`,
      data: { investment }
    });
  } catch (error) {
    console.error('Admin approve investor investment error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /api/admin/investors/investments/:id/reject ───────────────────────

const rejectInvestorInvestment = async (req, res) => {
  try {
    const { adminNote } = req.body;
    const investment = await InvestorInvestment.findById(req.params.id);
    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }
    if (investment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Investment is already '${investment.status}'`
      });
    }

    investment.status    = 'rejected';
    investment.adminNote = adminNote || '';
    await investment.save();

    return res.json({ success: true, message: 'Investment rejected', data: { investment } });
  } catch (error) {
    console.error('Admin reject investor investment error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/admin/investors/:id/credit-roi ────────────────────────────────
/**
 * Manually credit daily/monthly ROI to an investor.
 * Enforces 3x income cap and handles 6-month switch.
 */
const creditInvestorRoi = async (req, res) => {
  try {
    const { investmentId, amount } = req.body;
    if (!investmentId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'investmentId and amount > 0 required' });
    }

    const investment = await InvestorInvestment.findOne({
      _id: investmentId,
      investorId: req.params.id,
      status: 'active'
    });
    if (!investment) {
      return res.status(404).json({ success: false, message: 'Active investment not found' });
    }
    if (investment.capReached) {
      return res.status(400).json({ success: false, message: 'Income cap already reached for this investment' });
    }

    const roiAmount = Number(amount);
    const remaining = investment.incomeCap - investment.totalRoiEarned;
    const credited  = Math.min(roiAmount, remaining);

    investment.totalRoiEarned += credited;
    investment.lastRoiDate = new Date();

    if (investment.totalRoiEarned >= investment.incomeCap) {
      investment.capReached = true;
      investment.status = 'completed';
    }

    // Check 6-month switch
    if (!investment.isMonthlyMode && investment.sixMonthSwitchDate && new Date() >= investment.sixMonthSwitchDate) {
      investment.isMonthlyMode = true;
    }

    await investment.save();

    // Credit investor ROI wallet
    await Investor.findByIdAndUpdate(req.params.id, {
      $inc: { 'wallet.roi': credited, totalRoiEarned: credited }
    });

    return res.json({
      success: true,
      message: `ROI of $${credited.toFixed(4)} credited${investment.capReached ? ' (cap reached)' : ''}`,
      data: { credited, capReached: investment.capReached }
    });
  } catch (error) {
    console.error('Admin credit investor ROI error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllInvestors,
  updateInvestorPlan,
  toggleInvestorActive,
  getInvestorInvestments,
  getAllInvestorInvestments,
  approveInvestorInvestment,
  rejectInvestorInvestment,
  creditInvestorRoi
};

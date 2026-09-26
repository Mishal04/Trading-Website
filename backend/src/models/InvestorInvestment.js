const mongoose = require('mongoose');

/**
 * Investor Investment model.
 * Completely separate from the normal MLM Investment model.
 * Tracks package, plan, daily ROI, monthly ROI (after 6 months), and principal state.
 */
const investorInvestmentSchema = new mongoose.Schema({
  // ── Phase 1 (legacy): Investor Portal separate system ──────────────────────
  investorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investor',
    default: null,
    index: true
  },
  // ── Phase 2 (new): Unified User model system ──────────────────────────────
  // After migration, investorId will be null and userId will be set.
  // During migration, either investorId or userId is set (never both).
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  plan: {
    type: String,
    enum: ['A', 'B'],
    required: true
  },
  packageNumber: {
    type: Number,
    enum: [1, 2, 3, 4],
    required: true
  },
  dailyRate: {
    type: Number,
    required: true   // e.g. 0.0075 for 0.75%
  },
  // After 6 months this flips to monthly mode at 8%
  isMonthlyMode: {
    type: Boolean,
    default: false
  },
  monthlyRate: {
    type: Number,
    default: 0.08   // 8% per month fixed
  },
  totalRoiEarned: {
    type: Number,
    default: 0
  },
  // 3x income cap enforcement
  incomeCap: {
    type: Number,
    required: true   // amount * 3
  },
  capReached: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  // Date when 6-month switch happened / will happen
  sixMonthSwitchDate: {
    type: Date
  },
  lastRoiDate: {
    type: Date,
    default: Date.now
  },
  // Principal withdrawal
  principalWithdrawn: {
    type: Boolean,
    default: false
  },
  principalWithdrawnAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled', 'rejected'],
    default: 'pending',
    index: true
  },
  paymentProof: { type: String, default: '' },
  transactionId: { type: String, default: '', trim: true },
  paymentNote:   { type: String, default: '', trim: true },
  adminNote:     { type: String, default: '' },
  // Always 'standard' — time-based rate switching was removed; field kept for
  // schema compatibility with existing records (all existing docs have 'standard').
  rateTier: {
    type: String,
    enum: ['standard', 'reduced'],
    default: 'standard'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: { type: Date }
}, { timestamps: true });

investorInvestmentSchema.index({ investorId: 1, status: 1 });
investorInvestmentSchema.index({ userId: 1, status: 1 });
investorInvestmentSchema.index({ lastRoiDate: 1, status: 1 });

const InvestorInvestment = mongoose.model('InvestorInvestment', investorInvestmentSchema);
module.exports = InvestorInvestment;

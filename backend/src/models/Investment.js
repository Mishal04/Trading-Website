const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Investment amount is required'],
    min: [100, 'Minimum investment amount is $100']
  },
  tier: {
    type: Number,
    required: true,
    enum: [1, 2, 3]
  },
  packageName: {
    type: String,
    required: true
  },
  dailyRate: {
    type: Number,
    required: true
  },
  dailyProfit: {
    type: Number,
    required: true
  },
  totalProfitEarned: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  lastProfitDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'withdrawn', 'cancelled', 'rejected'],
    default: 'pending',
    index: true
  },
  // Payment proof: TXID string or image URL submitted by the user
  paymentProof: {
    type: String,
    default: ''
  },
  // Transaction / reference ID from the payment method (JazzCash, bank, crypto etc.)
  transactionId: {
    type: String,
    default: '',
    trim: true
  },
  // Optional message from user to admin
  paymentNote: {
    type: String,
    default: '',
    trim: true
  },
  adminNote: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, { timestamps: true });

investmentSchema.index({ userId: 1, isActive: 1 });
investmentSchema.index({ lastProfitDate: 1, isActive: 1 });

const Investment = mongoose.model('Investment', investmentSchema);
module.exports = Investment;

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
    enum: ['active', 'completed', 'withdrawn', 'cancelled'],
    default: 'active',
    index: true
  }
}, { timestamps: true });

investmentSchema.index({ userId: 1, isActive: 1 });
investmentSchema.index({ lastProfitDate: 1, isActive: 1 });

const Investment = mongoose.model('Investment', investmentSchema);
module.exports = Investment;

const mongoose = require('mongoose');

const commissionLogSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sourceUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  investmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investment'
  },
  level: {
    type: Number,
    min: 1,
    max: 25
  },
  commissionType: {
    type: String,
    enum: ['level', 'leadership_salary', 'performance_reward', 'manual_adjustment'],
    required: true,
    index: true
  },
  rate: {
    type: Number,
    default: 0
  },
  baseAmount: {
    type: Number,
    required: true
  },
  commissionAmount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

commissionLogSchema.index({ recipientId: 1, level: 1 });
commissionLogSchema.index({ recipientId: 1, date: -1 });

const CommissionLog = mongoose.model('CommissionLog', commissionLogSchema);
module.exports = CommissionLog;

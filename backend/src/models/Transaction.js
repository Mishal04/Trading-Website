const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['investment', 'profit', 'commission', 'withdrawal', 'adjustment'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'rejected'],
    default: 'completed',
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['Investment', 'Withdrawal', 'CommissionLog', 'User']
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, date: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;

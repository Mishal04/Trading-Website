const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Withdrawal amount is required'],
    min: [10, 'Minimum withdrawal amount is $10']
  },
  type: {
    type: String,
    enum: ['capital', 'profit', 'commission'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'processing', 'completed'],
    default: 'pending',
    index: true
  },
  walletAddress: {
    type: String,
    default: ''
  },
  paymentMethod: {
    type: String,
    default: 'crypto'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminNote: {
    type: String,
    default: ''
  }
}, { timestamps: true });

withdrawalSchema.index({ userId: 1, requestedAt: -1 });

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
module.exports = Withdrawal;

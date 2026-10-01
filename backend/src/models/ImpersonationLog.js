const mongoose = require('mongoose');

const impersonationLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true
  },
  sessionStartTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  sessionExpiryTime: {
    type: Date,
    required: true
  },
  sessionEndTime: {
    type: Date,
    default: null  // Null until admin exits impersonation
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'exited'],
    default: 'active',
    index: true
  },
  actionsPerformed: [
    {
      action: String,
      timestamp: { type: Date, default: Date.now },
      endpoint: String,
      result: String  // success or error
    }
  ],
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Index for querying impersonation logs by date range
impersonationLogSchema.index({ sessionStartTime: -1, adminId: 1 });
impersonationLogSchema.index({ userId: 1, sessionStartTime: -1 });

const ImpersonationLog = mongoose.model('ImpersonationLog', impersonationLogSchema);
module.exports = ImpersonationLog;

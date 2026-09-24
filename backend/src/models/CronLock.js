const mongoose = require('mongoose');

const cronLockSchema = new mongoose.Schema({
  jobName: {
    type: String,
    required: true,
    index: true
  },
  dateKey: {
    type: String,
    required: true,
    index: true
  },
  lockedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed'],
    default: 'running'
  },
  instanceId: {
    type: String,
    default: ''
  },
  releasedAt: {
    type: Date
  },
  error: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Ensure exact atomic uniqueness: only one process can lock a specific job on a specific dateKey
cronLockSchema.index({ jobName: 1, dateKey: 1 }, { unique: true });

const CronLock = mongoose.model('CronLock', cronLockSchema);
module.exports = CronLock;

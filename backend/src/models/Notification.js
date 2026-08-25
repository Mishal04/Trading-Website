const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'profit', 'commission', 'withdrawal'],
    default: 'info'
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;

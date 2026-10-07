const mongoose = require('mongoose');

const SystemWalletSchema = new mongoose.Schema(
  {
    // Wallet address (Bitcoin, Ethereum, USDT, etc.)
    address: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    // Network/Coin type
    network: {
      type: String,
      enum: ['Bitcoin', 'Ethereum', 'USDT-BSC', 'USDT-TRC20', 'BNB', 'Other'],
      required: true
    },

    // Human-readable label
    label: {
      type: String,
      required: true,
      trim: true
    },

    // Is this wallet currently active?
    isActive: {
      type: Boolean,
      default: true
    },

    // Only one wallet should be marked as current at a time
    isCurrent: {
      type: Boolean,
      default: false,
      index: true  // Fast lookup for current wallet
    },

    // When was this wallet activated
    activatedAt: {
      type: Date,
      default: Date.now
    },

    // When was this wallet deactivated (if at all)
    deactivatedAt: {
      type: Date,
      default: null
    },

    // Admin notes about this wallet
    notes: {
      type: String,
      default: ''
    },

    // Track which admin created/updated
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Audit trail
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Status: active, inactive, archived
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for finding current wallet
SystemWalletSchema.index({ isCurrent: 1, isActive: 1 });
SystemWalletSchema.index({ network: 1, isActive: 1 });

// Virtual to show active status with label
SystemWalletSchema.virtual('displayStatus').get(function () {
  if (this.isCurrent) return 'Current';
  if (this.isActive) return 'Active';
  return 'Inactive';
});

// Static method to get current wallet
SystemWalletSchema.statics.getCurrentWallet = async function () {
  return this.findOne({ isCurrent: true, isActive: true });
};

// Static method to get current wallet by network
SystemWalletSchema.statics.getCurrentWalletByNetwork = async function (network) {
  return this.findOne({ network, isCurrent: true, isActive: true });
};

// Static method to get all active wallets
SystemWalletSchema.statics.getActiveWallets = async function () {
  return this.find({ isActive: true, status: 'active' }).sort({ createdAt: -1 });
};

// Instance method to set as current
SystemWalletSchema.methods.setAsCurrent = async function () {
  // Deactivate any existing current wallet
  await this.constructor.updateMany(
    { isCurrent: true },
    { isCurrent: false, deactivatedAt: new Date() }
  );

  // Set this as current
  this.isCurrent = true;
  this.isActive = true;
  this.activatedAt = new Date();
  this.deactivatedAt = null;
  return this.save();
};

module.exports = mongoose.model('SystemWallet', SystemWalletSchema);

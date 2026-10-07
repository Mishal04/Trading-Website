const mongoose = require('mongoose');

const AdminSettingsSchema = new mongoose.Schema(
  {
    // Bank account details (company/admin account for deposits)
    bankDetails: {
      accountName: {
        type: String,
        default: null
      },
      accountNumber: {
        type: String,
        default: null
      },
      bankName: {
        type: String,
        default: null
      },
      ifscCode: {
        type: String,
        default: null
      },
      branch: {
        type: String,
        default: null
      },
      accountType: {
        type: String,
        default: null
      }
    },

    // Last updated by admin
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Last updated timestamp
    lastUpdatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Static method to get current admin settings
AdminSettingsSchema.statics.getCurrent = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      bankDetails: {
        accountName: null,
        accountNumber: null,
        bankName: null,
        ifscCode: null,
        branch: null,
        accountType: null
      }
    });
  }
  return settings;
};

module.exports = mongoose.model('AdminSettings', AdminSettingsSchema);

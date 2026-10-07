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

    // History of bank details changes
    bankHistory: [
      {
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
        },
        changedAt: {
          type: Date,
          default: Date.now
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    ],

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

// Static method to get current admin settings with auto-population from hardcoded constants
AdminSettingsSchema.statics.getCurrent = async function () {
  let settings = await this.findOne();
  if (!settings) {
    // Extract hardcoded bank details from constants
    const HARDCODED_BANK_DETAILS = {
      accountName: 'OBO ENTERPRISES',
      accountNumber: '1603020000000728',
      bankName: 'UTKARSH SFB',
      ifscCode: 'UTKS0001603',
      branch: 'Kharghar',
      accountType: 'CURRENT'
    };

    // Create new settings with hardcoded values pre-populated
    settings = await this.create({
      bankDetails: HARDCODED_BANK_DETAILS,
      bankHistory: [
        {
          ...HARDCODED_BANK_DETAILS,
          changedAt: new Date(),
          changedBy: null  // System-initialized
        }
      ]
    });

    console.log('✅ [AdminSettings] Auto-populated with hardcoded bank details');
  }
  return settings;
};

// Instance method to archive current bank details before updating
AdminSettingsSchema.methods.archiveCurrentAsHistory = function () {
  if (this.bankDetails?.accountName) {
    // Only archive if there's actual data
    this.bankHistory.push({
      accountName: this.bankDetails.accountName,
      accountNumber: this.bankDetails.accountNumber,
      bankName: this.bankDetails.bankName,
      ifscCode: this.bankDetails.ifscCode,
      branch: this.bankDetails.branch,
      accountType: this.bankDetails.accountType,
      changedAt: new Date(),
      changedBy: this.lastUpdatedBy
    });
  }
};

module.exports = mongoose.model('AdminSettings', AdminSettingsSchema);

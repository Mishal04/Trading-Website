const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  referralCode: {
    type: String,
    unique: true,
    required: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  investmentLevel: {
    type: String,
    enum: ['none', 'basic', 'standard', 'premium'],
    default: 'none'
  },

  totalProfitEarned: {
    type: Number,
    default: 0
  },
  teamBusiness: {
    strongTeam: { type: Number, default: 0 },
    otherTeam: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  commissions: {
    levelCommissions: { type: [Number], default: Array(25).fill(0) },
    leadershipSalary: { type: Number, default: 0 },
    performanceReward: { type: Number, default: 0 }
  },
  referrals: {
    count: { type: Number, default: 0 },
    activeCount: { type: Number, default: 0 },
    totalBusiness: { type: Number, default: 0 }
  },
  ancestorPath: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  wallet: {
    capital:    { type: Number, default: 0 },
    profit:     { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    roi:        { type: Number, default: 0 }   // Investor ROI balance (Phase 2: absorbed from Investor.wallet.roi)
  },
  lastLogin: Date,
  isActive: { type: Boolean, default: true },
  // Role determines income cap multiplier
  role: {
    type: String,
    enum: ['investor', 'working_leader'],
    default: 'investor'
  },
  // Total amount the user has invested (sum of active investments)
  totalInvested: { type: Number, default: 0 },
  // Total earned from ROI and level income (excludes achievement rewards)
  totalEarned: { type: Number, default: 0 },
  // Number of direct referrals
  directCount: { type: Number, default: 0 },
  // Unlocked referral levels based on directCount
  unlockedLevels: { type: Number, default: 0 },
  // Achievements already claimed (tier names)
  achievementsClaimed: { type: [String], default: [] },
  accountType: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  // ── Phase 2 merge fields: Investor plan data absorbed into User ──────────
  // Investor plan tier (A = first 6 months, B = next 6 months). Default 'A'.
  // Set by admin; mirrors Investor.plan from the legacy Investor collection.
  plan: {
    type: String,
    enum: ['A', 'B'],
    default: 'A'
  },
  // Date from which the 6-month plan switch rule is measured.
  // Set when the user's first investor investment is approved.
  joinDate: { type: Date, default: null },
  // Cumulative ROI earned on investor-style investments (3× cap tracking).
  totalRoiEarned: { type: Number, default: 0 },

  // ── Networker section access ─────────────────────────────────────────────
  // NEVER toggled automatically — only set by admin via PATCH /api/admin/users/:id/networker-access.
  // Controls UI/route visibility for the Networker dashboard section ONLY.
  // The 21-level commission engine reads ancestorPath/isActive/totalInvested —
  // it NEVER reads this field, so commission accrues regardless of this flag.
  networkerAccessGranted: { type: Boolean, default: false },
  // Audit trail for who granted/revoked access and when.
  networkerAccessGrantedAt: { type: Date, default: null },
  networkerAccessGrantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

// Mongoose 9: async pre-hooks do not receive `next` — just return early
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return; // password unchanged, skip hashing
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateReferralCode = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

// Helper methods for income cap and level unlocking
userSchema.methods.getIncomeCap = function() {
  const caps = require('../../config/constants').INCOME_CAPS;
  return this.totalInvested * (this.role === 'working_leader' ? caps.working_leader : caps.investor);
};

userSchema.methods.hasReachedIncomeCap = function() {
  return this.totalEarned >= this.getIncomeCap();
};

userSchema.methods.recomputeUnlockedLevels = function() {
  const rules = require('../../config/constants').LEVEL_UNLOCK_RULES;
  const direct = this.directCount || 0;
  if (direct >= 10) {
    this.unlockedLevels = 21;
  } else {
    this.unlockedLevels = rules[direct] || 0;
  }
};


const User = mongoose.model('User', userSchema);
module.exports = User;

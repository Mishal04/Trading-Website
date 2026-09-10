const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Investor user — completely separate from the normal MLM User model.
 * Has its own wallet (capital + roi), plan (A|B), joining date for 6-month rule.
 */
const investorSchema = new mongoose.Schema({
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
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  // Plan assigned by admin: A (higher rates) or B (lower rates)
  plan: {
    type: String,
    enum: ['A', 'B'],
    default: 'A'
  },
  // Wallet balances
  wallet: {
    capital: { type: Number, default: 0 },  // principal deposited
    roi:     { type: Number, default: 0 },  // accumulated ROI earnings
  },
  // Lifetime stats
  totalInvested:    { type: Number, default: 0 },
  totalRoiEarned:   { type: Number, default: 0 },
  // Date from which 6-month rule is measured (set when first investment is approved)
  joinDate: {
    type: Date
  },
  isActive:   { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false }, // optional email verification
  lastLogin:  { type: Date },
  // accountType identifies this as an investor (not a normal user)
  accountType: {
    type: String,
    default: 'investor',
    immutable: true
  }
}, { timestamps: true });

// Hash password before save
investorSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

investorSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Investor = mongoose.model('Investor', investorSchema);
module.exports = Investor;

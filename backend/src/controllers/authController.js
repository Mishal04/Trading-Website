const crypto = require('crypto');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const {
  generateToken,
  generateVerificationToken,
  generateResetToken
} = require('../utils/authUtils');
const {
  sendVerificationEmail,
  sendPasswordResetEmail
} = require('../services/emailService');

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * SHA-256 hash a raw token before storing it in the database.
 * The raw token travels in the email link; the DB only holds the hash.
 * On lookup: hash the incoming token and compare — same as bcrypt for passwords
 * but faster because these tokens are already high-entropy random values.
 */
const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

/** Generate a unique referral code that doesn't already exist in the DB. */
const generateUniqueReferralCode = async () => {
  const user = new User();
  let code = user.generateReferralCode();
  let exists = await User.findOne({ referralCode: code });
  while (exists) {
    code = user.generateReferralCode();
    exists = await User.findOne({ referralCode: code });
  }
  return code;
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { email, password, referralCode } = req.body;
    const name = req.body.name || req.body.fullName;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = new User({
      name,
      email,
      password,
      referralCode: await generateUniqueReferralCode()
    });

    // Link referral chain if a valid sponsor code was provided
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        user.referredBy   = referrer._id;
        user.ancestorPath = [referrer._id, ...(referrer.ancestorPath || [])].slice(0, 25);
        await User.findByIdAndUpdate(referrer._id, {
          $inc: { 'referrals.count': 1, 'referrals.activeCount': 1 }
        });
      }
    }

    // Generate raw token, store only the SHA-256 hash (#7)
    const rawVerificationToken = generateVerificationToken();
    user.verificationToken        = hashToken(rawVerificationToken);
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 h

    await user.save();

    // Send the RAW token in the email link
    try {
      await sendVerificationEmail(user.email, user.name, rawVerificationToken);
    } catch (emailErr) {
      console.warn('Verification email could not be sent (SMTP warning):', emailErr.message);
    }

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id:           user._id,
          name:         user.name,
          email:        user.email,
          referralCode: user.referralCode,
          isVerified:   user.isVerified
        },
        token
      },
      message: 'Registration successful. Please check your email to verify your account.'
    });
  } catch (error) {
    // #5 — never leak error.message in production (could expose Mongoose/DB internals)
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.'
    });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      // Generic message — don't confirm whether the email exists
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Please contact support.' });
    }

    user.lastLogin = Date.now();
    await user.save();

    const token = generateToken(user._id);

    return res.json({
      success: true,
      data: {
        user: {
          id:           user._id,
          name:         user.name,
          email:        user.email,
          referralCode: user.referralCode,
          isVerified:   user.isVerified,
          accountType:  user.accountType,
          wallet:       user.wallet || { capital: 0, profit: 0, commission: 0 }
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// ─── POST /api/auth/verify ────────────────────────────────────────────────────

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }

    // Hash the incoming raw token before looking up in DB (#7)
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      verificationToken:        hashedToken,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.isVerified               = true;
    user.verificationToken        = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    const jwtToken = generateToken(user._id);

    return res.json({
      success: true,
      data: {
        user: { id: user._id, name: user.name, email: user.email, isVerified: true },
        token: jwtToken
      },
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};

// ─── POST /api/auth/resend-verification ──────────────────────────────────────

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    // #4 — always return the same response whether the email exists or not
    // This prevents account enumeration ("email not found" / "already verified")
    const SAFE_RESPONSE = {
      success: true,
      message: 'If that email is registered and unverified, a new verification link has been sent.'
    };

    const user = await User.findOne({ email });
    if (!user || user.isVerified) {
      // Still return 200 with the safe message — no info leaked
      return res.json(SAFE_RESPONSE);
    }

    const rawToken = generateVerificationToken();
    user.verificationToken        = hashToken(rawToken);   // store hash (#7)
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    try {
      await sendVerificationEmail(user.email, user.name, rawToken);
    } catch (emailErr) {
      console.warn('Resend verification email failed:', emailErr.message);
    }

    return res.json(SAFE_RESPONSE);
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // #4 — same response regardless of whether email exists, to prevent enumeration
    const SAFE_RESPONSE = {
      success: true,
      message: 'If that email is registered, a password reset link has been sent.'
    };

    const user = await User.findOne({ email });
    if (!user) {
      // Return 200 — attacker cannot distinguish "found" from "not found"
      return res.json(SAFE_RESPONSE);
    }

    const rawResetToken = generateResetToken();
    user.resetPasswordToken   = hashToken(rawResetToken); // store hash (#7)
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, user.name, rawResetToken);
    } catch (emailErr) {
      console.warn('Password reset email failed:', emailErr.message);
    }

    return res.json(SAFE_RESPONSE);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Hash the incoming raw token before DB lookup (#7)
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    user.password             = newPassword; // pre-save hook will hash it
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword
};

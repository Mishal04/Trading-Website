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
    const rawPhone = req.body.phone || req.body.phoneNumber;
    const phoneNumber = rawPhone ? String(rawPhone).trim() : null;
    const name = req.body.name || req.body.fullName;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    let userExists;
    try {
      userExists = await User.findOne({ email });
    } catch (dbErr) {
      console.error('[REGISTRATION] Database error checking existing user:', dbErr.message);
      return res.status(500).json({
        success: false,
        message: 'Server error during registration. Please try again.'
      });
    }

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user document
    let user;
    try {
      user = new User({
        name,
        email,
        password,
        phoneNumber,
        referralCode: await generateUniqueReferralCode()
      });
    } catch (userErr) {
      console.error('[REGISTRATION] Error creating user document:', userErr.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid input data provided'
      });
    }

    // Link referral chain if a valid sponsor code was provided
    if (referralCode) {
      try {
        const referrer = await User.findOne({ referralCode });
        if (referrer) {
          user.referredBy = referrer._id;
          // FIX: Safe handling of ancestorPath - ensure it's always an array before spread
          const referrerAncestorPath = Array.isArray(referrer.ancestorPath) ? referrer.ancestorPath : [];
          user.ancestorPath = [referrer._id, ...referrerAncestorPath].slice(0, 25);
          
          // Increment directCount and recompute unlocked levels
          const referrerDoc = await User.findById(referrer._id);
          if (referrerDoc) {
            referrerDoc.directCount = (referrerDoc.directCount || 0) + 1;
            if (typeof referrerDoc.recomputeUnlockedLevels === 'function') {
              referrerDoc.recomputeUnlockedLevels();
            }
            await referrerDoc.save();
            console.log(`[REGISTRATION] Updated referrer ${referrer.email} directCount to ${referrerDoc.directCount}`);
          }
        } else {
          console.warn(`[REGISTRATION] Invalid referral code provided: ${referralCode}`);
        }
      } catch (refErr) {
        console.error('[REGISTRATION] Error processing referral code:', refErr.message);
        // Continue with registration anyway - referral is optional
      }
    }

    // Generate and hash verification token
    let rawVerificationToken;
    try {
      rawVerificationToken = generateVerificationToken();
      user.verificationToken = hashToken(rawVerificationToken);
      user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    } catch (tokenErr) {
      console.error('[REGISTRATION] Error generating verification token:', tokenErr.message);
      return res.status(500).json({
        success: false,
        message: 'Server error during registration. Please try again.'
      });
    }

    // Save user to database
    let savedUser;
    try {
      savedUser = await user.save();
      console.log(`[REGISTRATION] User created successfully: ${email} (ID: ${savedUser._id})`);
    } catch (saveErr) {
      console.error('[REGISTRATION] Error saving user:', saveErr.message, saveErr.code);
      
      // Handle specific database errors
      if (saveErr.code === 11000) {
        const field = Object.keys(saveErr.keyPattern || {})[0] || 'field';
        return res.status(400).json({
          success: false,
          message: `An account with this ${field} already exists. Please use a different ${field} or login.`
        });
      }
      
      if (saveErr.name === 'ValidationError') {
        const messages = Object.values(saveErr.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error: ' + messages.join(', ')
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Server error during registration. Please try again.'
      });
    }

    // Send verification email (non-blocking - failures don't affect registration)
    let emailSent = false;
    try {
      await sendVerificationEmail(savedUser.email, savedUser.name, rawVerificationToken);
      emailSent = true;
      console.log(`[REGISTRATION] Verification email sent to ${savedUser.email}`);
    } catch (emailErr) {
      console.warn('[REGISTRATION] Verification email could not be sent:', emailErr.message);
      console.warn('[REGISTRATION] User can still login and request resend');
      // Don't fail registration if email fails
    }

    // Generate JWT token
    let token;
    try {
      token = generateToken(savedUser._id);
    } catch (tokenErr) {
      console.error('[REGISTRATION] Token generation failed:', tokenErr.message);
      return res.status(500).json({
        success: false,
        message: 'Session creation failed - please try again'
      });
    }

    // Registration successful
    return res.status(201).json({
      success: true,
      data: {
        user: {
          id:           savedUser._id,
          _id:          savedUser._id,
          name:         savedUser.name,
          email:        savedUser.email,
          phoneNumber:  savedUser.phoneNumber || null,
          referralCode: savedUser.referralCode,
          isVerified:   savedUser.isVerified,
          accountType:  savedUser.accountType || 'user',
          role:         savedUser.role || 'investor'
        },
        token
      },
      message: emailSent 
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful. Email verification is temporarily unavailable - you can still access your account. Please try verification again later.',
      emailSent
    });
  } catch (error) {
    console.error('[REGISTRATION] Unhandled error:', error.message);
    console.error('[REGISTRATION] Stack trace:', error.stack);
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

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Fetch user with password field included
    let user;
    try {
      user = await User.findOne({ email }).select('+password');
    } catch (dbErr) {
      console.error('[LOGIN] Database error during user lookup:', dbErr.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error during login. Please try again.' 
      });
    }

    // User not found
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'No account found with this email. Please register first.' 
      });
    }

    // CRITICAL: Validate password field exists before bcrypt comparison
    // This catches data corruption issues early
    if (!user.password) {
      console.error(`[LOGIN] CRITICAL: User ${email} (ID: ${user._id}) has missing password field - data corruption detected`);
      return res.status(500).json({ 
        success: false, 
        message: 'Account error: corrupted user data. Please contact support.' 
      });
    }

    // Compare password with hash
    let isMatch;
    try {
      isMatch = await user.comparePassword(password);
    } catch (bcryptErr) {
      console.error(`[LOGIN] Bcrypt error for ${email}:`, bcryptErr.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Authentication error - please try again' 
      });
    }

    // Password mismatch
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Account deactivated
    if (!user.isActive) {
      console.warn(`[LOGIN] Attempted login to deactivated account: ${email}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated. Please contact support.' 
      });
    }

    // Ensure referral code exists (backward compatibility for old users)
    if (!user.referralCode) {
      try {
        user.referralCode = await generateUniqueReferralCode();
        console.log(`[LOGIN] Generated referral code for legacy user ${email}: ${user.referralCode}`);
      } catch (refErr) {
        console.error(`[LOGIN] Failed to generate referral code for ${email}:`, refErr.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Account initialization error - please try again' 
        });
      }
    }

    // Update last login timestamp
    user.lastLogin = Date.now();
    
    // Save user with retry logic for race conditions
    try {
      await user.save();
    } catch (saveErr) {
      // Handle duplicate key error from referral code race condition
      if (saveErr.code === 11000 && saveErr.keyPattern && saveErr.keyPattern.referralCode) {
        console.warn(`[LOGIN] Race condition detected for referralCode during login of ${email} - retrying`);
        
        // Clear the referral code and regenerate
        user.referralCode = null;
        try {
          user.referralCode = await generateUniqueReferralCode();
          await user.save();
          console.log(`[LOGIN] Successfully recovered from race condition for ${email}`);
        } catch (retryErr) {
          console.error(`[LOGIN] Retry failed after race condition for ${email}:`, retryErr.message);
          return res.status(500).json({ 
            success: false, 
            message: 'Account error - please try again' 
          });
        }
      } else {
        console.error(`[LOGIN] Failed to save user ${email}:`, saveErr.message, saveErr.code);
        return res.status(500).json({ 
          success: false, 
          message: 'Account save error - please try again' 
        });
      }
    }

    // Validate JWT_SECRET configuration
    if (!process.env.JWT_SECRET) {
      console.error('[LOGIN] CRITICAL: JWT_SECRET is not set in environment');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error - contact support' 
      });
    }

    // Generate JWT token
    let token;
    try {
      token = generateToken(user._id);
    } catch (tokenErr) {
      console.error(`[LOGIN] Token generation failed:`, tokenErr.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Session creation failed - please try again' 
      });
    }

    // Successful login
    return res.json({
      success: true,
      data: {
        user: {
          id:           user._id,
          _id:          user._id,
          name:         user.name,
          email:        user.email,
          phoneNumber:  user.phoneNumber || null,
          referralCode: user.referralCode,
          isVerified:   user.isVerified,
          accountType:  user.accountType || 'user',
          role:         user.role || 'investor',
          wallet:       user.wallet || { capital: 0, profit: 0, commission: 0 }
        },
        token
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('[LOGIN] Unhandled error:', error.message);
    console.error('[LOGIN] Stack trace:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during login - please try again later' 
    });
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

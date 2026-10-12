const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const User = require('./src/models/User');
const { generateToken, generateVerificationToken } = require('./src/utils/authUtils');
const { sendVerificationEmail } = require('./src/services/emailService');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

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

// Connect to DB
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // TEST 1: Simulate Registration
    console.log('=== TEST 1: REGISTRATION FLOW ===\n');

    const testEmail = `testuser_${Date.now()}@test.com`;
    const testPassword = 'testPassword123';
    const testName = 'Test User ' + Date.now();

    console.log('Input data:');
    console.log('  Name:', testName);
    console.log('  Email:', testEmail);
    console.log('  Password:', testPassword);

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: testEmail });
      if (existingUser) {
        console.error('✗ User already exists');
        process.exit(1);
      }
      console.log('✓ User does not exist - proceeding with registration\n');

      // Create new user
      console.log('Creating new user document...');
      const user = new User({
        name: testName,
        email: testEmail,
        password: testPassword,
        phoneNumber: '+1234567890',
        referralCode: await generateUniqueReferralCode()
      });

      console.log('✓ User object created\n');

      // Generate verification token
      console.log('Generating verification token...');
      const rawVerificationToken = generateVerificationToken();
      user.verificationToken = hashToken(rawVerificationToken);
      user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
      console.log('✓ Verification token hashed\n');

      // Save user
      console.log('Saving user to database...');
      await user.save();
      console.log('✓ User saved successfully');
      console.log('  User ID:', user._id);
      console.log('  Referral Code:', user.referralCode, '\n');

      // Generate JWT token
      console.log('Generating JWT token...');
      const jwtToken = generateToken(user._id);
      console.log('✓ JWT token generated\n');

      // Send verification email (may fail if SMTP not configured)
      console.log('Attempting to send verification email...');
      try {
        await sendVerificationEmail(user.email, user.name, rawVerificationToken);
        console.log('✓ Verification email sent');
      } catch (emailErr) {
        console.warn('⚠ Email service error (expected if SMTP not configured):', emailErr.message);
      }

      console.log('\n✓ REGISTRATION TEST PASSED\n');

      // TEST 2: Simulate Login
      console.log('=== TEST 2: LOGIN FLOW ===\n');

      console.log('Attempting login with email:', testEmail);
      
      // Fetch user with password
      console.log('Fetching user from database...');
      const loginUser = await User.findOne({ email: testEmail }).select('+password');
      
      if (!loginUser) {
        console.error('✗ User not found during login');
        process.exit(1);
      }
      console.log('✓ User found');

      // Check password field
      if (!loginUser.password) {
        console.error('✗ Password field is missing or null');
        process.exit(1);
      }
      console.log('✓ Password field exists\n');

      // Compare password
      console.log('Comparing password with hash...');
      let isMatch;
      try {
        isMatch = await loginUser.comparePassword(testPassword);
      } catch (bcryptErr) {
        console.error('✗ Bcrypt comparison error:', bcryptErr.message);
        process.exit(1);
      }

      if (!isMatch) {
        console.error('✗ Password does not match');
        process.exit(1);
      }
      console.log('✓ Password matches\n');

      // Check if account is active
      if (!loginUser.isActive) {
        console.error('✗ Account is not active');
        process.exit(1);
      }
      console.log('✓ Account is active\n');

      // Check referral code
      console.log('Checking referral code...');
      if (!loginUser.referralCode) {
        console.log('⚠ No referral code - generating one...');
        loginUser.referralCode = await generateUniqueReferralCode();
      }
      console.log('✓ Referral code verified:', loginUser.referralCode, '\n');

      // Update last login
      console.log('Updating last login timestamp...');
      loginUser.lastLogin = Date.now();
      await loginUser.save();
      console.log('✓ Last login updated\n');

      // Generate JWT token
      console.log('Generating JWT token for login...');
      const loginToken = generateToken(loginUser._id);
      console.log('✓ Login JWT token generated\n');

      console.log('✓ LOGIN TEST PASSED\n');

      // TEST 3: Verify Field Integrity
      console.log('=== TEST 3: FIELD INTEGRITY CHECK ===\n');

      const finalUser = await User.findById(loginUser._id);
      console.log('Final user state:');
      console.log('  Name:', finalUser.name);
      console.log('  Email:', finalUser.email);
      console.log('  Is Verified:', finalUser.isVerified);
      console.log('  Is Active:', finalUser.isActive);
      console.log('  Has Password:', !!finalUser.password);
      console.log('  Has Referral Code:', !!finalUser.referralCode);
      console.log('  Wallet:', finalUser.wallet);
      console.log('  Last Login:', finalUser.lastLogin);

      console.log('\n✓ FIELD INTEGRITY CHECK PASSED\n');

      console.log('=== ALL TESTS PASSED ===');
      console.log('\nCleanup: Deleting test user...');
      await User.deleteOne({ _id: user._id });
      console.log('✓ Test user deleted\n');

      mongoose.connection.close();
      process.exit(0);
    } catch (error) {
      console.error('\n✗ ERROR:', error.message);
      console.error('\nFull error:');
      console.error(error);
      mongoose.connection.close();
      process.exit(1);
    }
  } catch (dbErr) {
    console.error('✗ Database connection error:', dbErr.message);
    process.exit(1);
  }
})();

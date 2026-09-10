/**
 * One-time script to create an admin user (or promote an existing user).
 * Run: node scripts/makeAdmin.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'info.solvex1@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD;
const ADMIN_NAME     = process.env.ADMIN_NAME || 'Super Admin';

async function main() {
  if (!ADMIN_PASSWORD) {
    console.error('Error: ADMIN_SEED_PASSWORD environment variable is required.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Dynamically load model after connection
  const User = require('../src/models/User');

  let user = await User.findOne({ email: ADMIN_EMAIL });

  if (user) {
    // Promote existing user to admin
    user.accountType = 'admin';
    user.isVerified  = true;
    user.isActive    = true;
    await user.save();
    console.log(`✓ Existing user promoted to admin: ${ADMIN_EMAIL}`);
  } else {
    // Create a brand-new admin user
    const referralCode = 'ADMIN001';
    user = await User.create({
      name:         ADMIN_NAME,
      email:        ADMIN_EMAIL,
      password:     ADMIN_PASSWORD,   // pre-save hook will hash it
      referralCode,
      accountType:  'admin',
      isVerified:   true,
      isActive:     true,
    });
    console.log(`✓ Admin user created: ${ADMIN_EMAIL}`);
  }

  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log('\nDone. You can now log in at /login with these credentials.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

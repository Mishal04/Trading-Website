/**
 * Seed / Promote Admin Account
 * 
 * Run:
 *   ADMIN_SEED_PASSWORD=yourpassword npm run seed:admin
 * 
 * (from backend folder, with .env loaded if needed)
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from possible .env locations
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'info.solvex1@gmail.com').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || 'Solvex Admin';

async function seedAdmin() {
  if (!ADMIN_PASSWORD || !ADMIN_PASSWORD.trim()) {
    console.error('\n✖ Error: ADMIN_SEED_PASSWORD environment variable is required.');
    console.error('Usage: ADMIN_SEED_PASSWORD=yourpassword npm run seed:admin\n');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('\n✖ Error: MONGODB_URI environment variable is missing.');
    console.error('Ensure .env is configured or pass MONGODB_URI in the environment.\n');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    let user = await User.findOne({ email: ADMIN_EMAIL });

    if (user) {
      // User exists — update role/accountType to admin and reset password
      user.accountType = 'admin';
      user.isVerified = true;
      user.isActive = true;
      user.password = ADMIN_PASSWORD; // Triggers bcrypt hash in pre-save hook
      await user.save();

      console.log(`\n✓ Existing user successfully updated with admin privileges:`);
      console.log(`   Email:       ${ADMIN_EMAIL}`);
      console.log(`   AccountType: admin`);
      console.log(`   Status:      Active & Email Verified`);
    } else {
      // User does not exist — create new admin account
      const referralCode = 'SOLVEX' + Math.floor(1000 + Math.random() * 9000);
      user = await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD, // Triggers bcrypt hash in pre-save hook
        referralCode,
        accountType: 'admin',
        isVerified: true,
        isActive: true,
      });

      console.log(`\n✓ New admin user successfully created:`);
      console.log(`   Email:        ${ADMIN_EMAIL}`);
      console.log(`   AccountType:  admin`);
      console.log(`   ReferralCode: ${referralCode}`);
      console.log(`   Status:       Active & Email Verified`);
    }

    console.log('\nAdmin configuration complete. You can now log in at /login.\n');
  } catch (error) {
    console.error('\n✖ Failed to seed admin account:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seedAdmin();

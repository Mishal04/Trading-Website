/**
 * Check if admin user exists and verify credentials
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const User = require('../src/models/User');

  const adminEmail = 'info.solvex1@gmail.com';
  const admin = await User.findOne({ email: adminEmail });

  if (!admin) {
    console.log(`❌ Admin user NOT found: ${adminEmail}`);
    console.log('\nTo create admin user, set ADMIN_SEED_PASSWORD in .env and run:');
    console.log('  node scripts/makeAdmin.js');
  } else {
    console.log(`✓ Admin user found: ${adminEmail}`);
    console.log(`  Name: ${admin.name}`);
    console.log(`  Account Type: ${admin.accountType}`);
    console.log(`  Is Active: ${admin.isActive}`);
    console.log(`  Is Verified: ${admin.isVerified}`);
    console.log(`  Has Password Hash: ${!!admin.password}`);
    
    // Test password from env var — never hardcode credentials in source files
    const testPassword = process.env.ADMIN_SEED_PASSWORD;
    if (testPassword) {
      const isMatch = await admin.comparePassword(testPassword);
      console.log(`\n  Env ADMIN_SEED_PASSWORD matches: ${isMatch ? '✓ YES' : '❌ NO'}`);
    } else {
      console.log('\n  Set ADMIN_SEED_PASSWORD env var to test password match.');
    }
    
    if (admin.accountType !== 'admin') {
      console.log(`\n⚠️  User exists but accountType is '${admin.accountType}', not 'admin'`);
      console.log('  Fixing now...');
      admin.accountType = 'admin';
      admin.isActive = true;
      admin.isVerified = true;
      await admin.save();
      console.log('  ✓ Updated to admin with active verified status');
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

/**
 * Fix admin user password
 * Reads credentials from environment variables — never hardcode them here.
 * Usage: ADMIN_SEED_PASSWORD=<your-new-password> node scripts/fixAdminPassword.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'info.solvex1@gmail.com';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;

  if (!adminPassword) {
    console.error('Error: ADMIN_SEED_PASSWORD environment variable is required.');
    console.error('Usage: ADMIN_SEED_PASSWORD=<your-password> node scripts/fixAdminPassword.js');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const User = require('../src/models/User');
  
  const admin = await User.findOne({ email: adminEmail });

  if (!admin) {
    console.log(`❌ Admin user NOT found: ${adminEmail}`);
    process.exit(1);
  }

  console.log(`✓ Found admin user: ${adminEmail}`);
  console.log(`  Current password hash exists: ${!!admin.password}`);
  
  // Update password (will be hashed by pre-save hook)
  admin.password = adminPassword;
  admin.accountType = 'admin';
  admin.isActive = true;
  admin.isVerified = true;
  
  await admin.save();
  console.log('\n✓ Admin password updated successfully');
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: [set from ADMIN_SEED_PASSWORD env var]`);
  console.log(`  Account Type: admin`);
  console.log(`  Status: Active & Verified`);
  console.log('\nYou can now login at /login');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

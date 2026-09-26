/**
 * Admin script: Reset a user's password to a known plaintext value
 * 
 * Usage: node scripts/resetUserPassword.js <email> <newPassword>
 * Example: node scripts/resetUserPassword.js sania@gmail.com Solvex@123
 * 
 * The password will be properly hashed (single hash) by the User model's pre-save hook.
 */

require('dotenv').config({ path: `${__dirname}/../.env` });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function main() {
  try {
    const email = process.argv[2];
    const newPassword = process.argv[3];

    if (!email || !newPassword) {
      console.error('❌ Usage: node resetUserPassword.js <email> <newPassword>');
      console.error('   Example: node resetUserPassword.js sania@gmail.com Solvex@123');
      process.exit(1);
    }

    console.log('🔄 Connecting to database...');
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI not found in .env');
    await mongoose.connect(uri);
    console.log('✅ Connected\n');

    console.log(`🔍 Finding user: ${email}`);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      await mongoose.connection.close();
      process.exit(1);
    }
    console.log(`✅ Found user: ${user.name} (ID: ${user._id})\n`);

    // Set new password (will be hashed by pre-save hook)
    console.log(`🔐 Setting new password...`);
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    console.log(`✅ Password updated successfully\n`);

    console.log('📋 User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Status: ${user.isActive ? 'Active' : 'Inactive'}`);
    console.log(`   Account Type: ${user.accountType}`);
    console.log(`   Plan: ${user.plan}`);
    console.log(`\n✨ User can now login with:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();

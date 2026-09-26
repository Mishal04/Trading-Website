/**
 * Create a test user with Networker access already granted
 * For testing the Networker section of the dashboard
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const User = require('../src/models/User');

  const testEmail = `networkertester_${Date.now()}@test.com`;
  const testPassword = 'Test@12345';

  try {
    // Check if user already exists
    let user = await User.findOne({ email: testEmail });
    if (user) {
      console.log(`User ${testEmail} already exists`);
      process.exit(0);
    }

    // Create new test user with Networker access
    user = await User.create({
      name: 'Networker Test User',
      email: testEmail,
      password: testPassword,
      isActive: true,
      isVerified: true,
      accountType: 'user',
      role: 'investor',
      totalInvested: 1000, // Set some investment to show on dashboard
      totalEarned: 500,
      'wallet.capital': 1000,
      'wallet.profit': 500,
      'wallet.commission': 250,
      directCount: 3, // Has 3 direct referrals
      unlockedLevels: 6, // Has 6 levels unlocked
      networkerAccessGranted: true, // 🔑 NETWORKER ACCESS GRANTED
      networkerAccessGrantedAt: new Date(),
      networkerAccessGrantedBy: new mongoose.Types.ObjectId(),
      referralCode: `TEST${Date.now()}`
    });

    console.log('✅ TEST NETWORKER USER CREATED\n');
    console.log('========================================');
    console.log('EMAIL:    ' + testEmail);
    console.log('PASSWORD: ' + testPassword);
    console.log('========================================\n');
    console.log('User Details:');
    console.log('  Name: Networker Test User');
    console.log('  Status: Active & Verified');
    console.log('  Networker Access: GRANTED ✓');
    console.log('  Total Invested: $1,000');
    console.log('  Total Earned: $500');
    console.log('  Profit Wallet: $500');
    console.log('  Commission Wallet: $250');
    console.log('  Direct Referrals: 3');
    console.log('  Unlocked Levels: 6 / 21');
    console.log('\nYou can now login at /login and test the Networker section');
    console.log('The referral link will be visible (not gated)');
    console.log('The 5X cap will apply to earnings\n');

  } catch (err) {
    console.error('Error creating test user:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();

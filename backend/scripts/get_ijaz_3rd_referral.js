/**
 * Get Ijaz's 3rd Referral
 * Find who Ijaz has referred
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-platform', {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
});

const run = async () => {
  try {
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('FINDING IJAZ\'S REFERRALS');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    const ijazId = mongoose.Types.ObjectId.createFromHexString('6abbbe4613c9d1497e58e0f3');
    
    // Find all users referred by Ijaz
    const referrals = await User.find({ referredBy: ijazId })
      .select('name email totalInvested directCount isActive createdAt')
      .sort({ createdAt: 1 });

    console.log(`Total Referrals: ${referrals.length}\n`);

    if (referrals.length === 0) {
      console.log('No referrals found\n');
      process.exit(0);
    }

    referrals.forEach((ref, i) => {
      console.log(`${i + 1}. ${ref.name}`);
      console.log(`   Email: ${ref.email}`);
      console.log(`   Investment: $${Number(ref.totalInvested || 0).toLocaleString()}`);
      console.log(`   Direct Count: ${ref.directCount || 0}`);
      console.log(`   Status: ${ref.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   Joined: ${new Date(ref.createdAt).toLocaleDateString()}\n`);
    });

    console.log('═══════════════════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
};

run();

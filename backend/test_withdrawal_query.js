const mongoose = require('mongoose');
require('dotenv').config();

const Withdrawal = require('./src/models/Withdrawal');
const User = require('./src/models/User');

async function findMuskanWithdrawal() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log('🔌 Connecting to:', uri.substring(0, 50) + '...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Find Muskan
    const muskan = await User.findOne({ name: 'muskan' });
    if (!muskan) {
      console.log('❌ Muskan not found');
      process.exit(1);
    }

    console.log('\n👤 Found Muskan:', muskan._id, muskan.email);
    console.log('Current stored wallet:', muskan.walletAddress);

    // Find all her withdrawals
    const withdrawals = await Withdrawal.find({ userId: muskan._id }).sort({ requestedAt: -1 });
    console.log('\n💳 Total withdrawals:', withdrawals.length);

    if (withdrawals.length > 0) {
      console.log('\n📋 Withdrawal Details:');
      withdrawals.forEach((w, idx) => {
        console.log(`\nWithdrawal #${idx + 1}:`);
        console.log(`  ID: ${w._id}`);
        console.log(`  Amount: $${w.amount}`);
        console.log(`  Type: ${w.type}`);
        console.log(`  Network: ${w.network}`);
        console.log(`  Wallet Address: "${w.walletAddress}"`);
        console.log(`  Status: ${w.status}`);
        console.log(`  Requested: ${w.requestedAt}`);
      });
    } else {
      console.log('⚠️ No withdrawals found');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

findMuskanWithdrawal();

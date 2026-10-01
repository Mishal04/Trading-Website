const mongoose = require('mongoose');
require('dotenv').config();

// Import models and controller
const User = require('./src/models/User');
const Withdrawal = require('./src/models/Withdrawal');
const Investment = require('./src/models/Investment');

async function testGetUserPaymentInfo() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    // Find Muskan
    const muskan = await User.findOne({ name: 'muskan' });
    if (!muskan) {
      console.log('❌ Muskan not found');
      process.exit(1);
    }

    const id = muskan._id;
    console.log('👤 Testing getUserPaymentInfo for Muskan:', id);
    console.log('Email:', muskan.email);
    console.log('Stored walletAddress:', muskan.walletAddress);

    // Simulate what the endpoint does
    console.log('\n🔍 Querying latest withdrawal...');
    const latestWithdrawal = await Withdrawal.findOne({
      userId: id,
      walletAddress: { $exists: true, $ne: '' }
    }).sort({ requestedAt: -1 });

    console.log('✅ Latest withdrawal:', latestWithdrawal ? {
      _id: latestWithdrawal._id,
      amount: latestWithdrawal.amount,
      walletAddress: latestWithdrawal.walletAddress,
      network: latestWithdrawal.network,
      status: latestWithdrawal.status
    } : 'None');

    console.log('\n🔍 Querying latest investment...');
    const latestInvestment = await Investment.findOne({
      userId: id,
      transactionId: { $exists: true, $ne: '' }
    }).sort({ createdAt: -1 });

    console.log('✅ Latest investment:', latestInvestment ? {
      _id: latestInvestment._id,
      amount: latestInvestment.amount,
      transactionId: latestInvestment.transactionId,
      status: latestInvestment.status
    } : 'None');

    // Build response like the API does
    const response = {
      success: true,
      data: {
        userId: id,
        storedWalletAddress: muskan.walletAddress || null,
        latestWithdrawalAddress: latestWithdrawal?.walletAddress || null,
        latestWithdrawalNetwork: latestWithdrawal?.network || null,
        latestInvestmentTxId: latestInvestment?.transactionId || null,
        latestInvestmentAmount: latestInvestment?.amount || null,
        bankDetails: muskan.bankDetails || null
      }
    };

    console.log('\n📤 API Response:');
    console.log(JSON.stringify(response, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testGetUserPaymentInfo();

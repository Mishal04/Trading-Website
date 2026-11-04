const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('KHALID - REMOVE DUPLICATE Oct 16, 9:14 PM TRANSACTION');
    console.log('═'.repeat(100) + '\n');

    const khalid = await User.findOne({ email: 'khalid2970935@gmail.com' });
    if (!khalid) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${khalid.name} (${khalid.email})\n`);

    // Find Oct 16 transactions around 9:14 PM
    console.log('STEP 1: Finding Oct 16 9:14 PM wallet.capital ROI transactions...\n');
    
    const oct16914Txs = await Transaction.find({
      userId: khalid._id,
      type: 'profit',
      description: { $regex: 'wallet capital', $options: 'i' },
      createdAt: {
        $gte: new Date(2026, 9, 16, 21, 0, 0),   // 9 PM
        $lt: new Date(2026, 9, 16, 22, 0, 0)    // 10 PM
      }
    }).sort({ createdAt: -1 });

    console.log(`Found ${oct16914Txs.length} transactions between 9-10 PM:\n`);
    oct16914Txs.forEach((tx, i) => {
      console.log(`${i + 1}. Amount: $${tx.amount}`);
      console.log(`   Time: ${new Date(tx.createdAt).toLocaleString()}`);
      console.log(`   ID: ${tx._id}\n`);
    });

    if (oct16914Txs.length <= 1) {
      console.log('⚠️ Only one or fewer transactions in this time range\n');
      mongoose.connection.close();
      process.exit(0);
    }

    // Remove the second one (older), keep the first (newer)
    console.log('STEP 2: Removing duplicate transaction...\n');
    
    const txToDelete = oct16914Txs[oct16914Txs.length - 1];
    console.log(`Removing: ${new Date(txToDelete.createdAt).toLocaleString()}`);
    await Transaction.findByIdAndDelete(txToDelete._id);
    console.log(`✓ Deleted 1 transaction\n`);

    // Adjust wallet
    await User.findByIdAndUpdate(khalid._id, {
      $inc: {
        'wallet.profit': -1
      }
    });
    console.log(`✓ Adjusted wallet.profit: -$1\n`);

    // Display final transactions
    console.log('═'.repeat(100));
    console.log('FINAL TRANSACTION HISTORY');
    console.log('═'.repeat(100) + '\n');

    const allTxs = await Transaction.find({
      userId: khalid._id,
      type: 'profit'
    }).sort({ createdAt: -1 }).limit(8);

    allTxs.forEach((t, i) => {
      const date = new Date(t.createdAt).toLocaleString();
      console.log(`${i + 1}. +$${t.amount.toFixed(2)} - ${t.description}`);
      console.log(`   ${date}\n`);
    });

    console.log('═'.repeat(100));
    console.log('FINAL WALLET STATE');
    console.log('═'.repeat(100));
    
    const finalWallet = await User.findById(khalid._id).select('wallet');
    console.log(`wallet.capital: $${finalWallet.wallet?.capital || 0}`);
    console.log(`wallet.profit: $${finalWallet.wallet?.profit || 0}`);
    console.log(`wallet.commission: $${finalWallet.wallet?.commission || 0}`);
    console.log('═'.repeat(100) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();

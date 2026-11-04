const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('KHALID - REMOVE DUPLICATE Oct 16 TRANSACTION');
    console.log('═'.repeat(100) + '\n');

    const khalid = await User.findOne({ email: 'khalid2970935@gmail.com' });
    if (!khalid) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${khalid.name} (${khalid.email})\n`);

    // Find Oct 16 transactions at 4 PM
    console.log('STEP 1: Finding Oct 16 wallet.capital ROI transactions...\n');
    
    const oct16Txs = await Transaction.find({
      userId: khalid._id,
      type: 'profit',
      description: { $regex: 'wallet capital', $options: 'i' },
      createdAt: {
        $gte: new Date(2026, 9, 16, 0, 0, 0),
        $lt: new Date(2026, 9, 17, 0, 0, 0)
      }
    }).sort({ createdAt: -1 });

    console.log(`Found ${oct16Txs.length} Oct 16 transactions:\n`);
    oct16Txs.forEach((tx, i) => {
      console.log(`${i + 1}. Amount: $${tx.amount}`);
      console.log(`   Time: ${new Date(tx.createdAt).toLocaleString()}`);
      console.log(`   ID: ${tx._id}\n`);
    });

    if (oct16Txs.length <= 1) {
      console.log('⚠️ Only one or fewer Oct 16 transactions - nothing to remove\n');
      mongoose.connection.close();
      process.exit(0);
    }

    // Keep the first one (most recent), remove the rest
    console.log('STEP 2: Removing duplicate transactions...\n');
    
    let totalRemoved = 0;
    for (let i = 1; i < oct16Txs.length; i++) {
      const tx = oct16Txs[i];
      console.log(`Removing transaction from ${new Date(tx.createdAt).toLocaleString()}`);
      await Transaction.findByIdAndDelete(tx._id);
      totalRemoved += tx.amount;
    }
    
    console.log(`✓ Deleted ${oct16Txs.length - 1} duplicate transaction(s)\n`);

    // Adjust wallet
    await User.findByIdAndUpdate(khalid._id, {
      $inc: {
        'wallet.profit': -totalRemoved
      }
    });
    console.log(`✓ Adjusted wallet.profit: -$${totalRemoved}\n`);

    // Display final transactions
    console.log('═'.repeat(100));
    console.log('FINAL TRANSACTION HISTORY');
    console.log('═'.repeat(100) + '\n');

    const allTxs = await Transaction.find({
      userId: khalid._id,
      type: 'profit'
    }).sort({ createdAt: -1 }).limit(5);

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

const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('KHALID TRANSACTION FIX - Oct 14 & Oct 16 at 4 PM');
    console.log('═'.repeat(100) + '\n');

    const khalid = await User.findOne({ email: 'khalid2970935@gmail.com' });
    if (!khalid) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${khalid.name} (${khalid.email})\n`);

    // Delete all existing wallet.capital ROI transactions for Khalid
    console.log('STEP 1: Removing old transactions...\n');
    
    const oldTxs = await Transaction.find({
      userId: khalid._id,
      type: 'profit',
      description: { $regex: 'wallet capital', $options: 'i' }
    });

    console.log(`Found ${oldTxs.length} wallet.capital ROI transactions to remove:`);
    let totalToRemove = 0;
    
    for (const tx of oldTxs) {
      console.log(`  - $${tx.amount} on ${new Date(tx.createdAt).toLocaleString()}`);
      totalToRemove += tx.amount;
      await Transaction.findByIdAndDelete(tx._id);
    }
    console.log(`✓ Deleted ${oldTxs.length} transactions\n`);

    // Adjust wallet
    await User.findByIdAndUpdate(khalid._id, {
      $inc: {
        'wallet.profit': -totalToRemove
      }
    });
    console.log(`✓ Adjusted wallet.profit: -$${totalToRemove}\n`);

    // Add new transactions for Oct 14 at 4 PM and Oct 16 at 4 PM
    console.log('STEP 2: Adding corrected transactions...\n');

    // Oct 14, 2026 at 4 PM (16:00)
    const date14 = new Date(2026, 9, 14, 16, 0, 0);
    
    // Oct 16, 2026 at 4 PM (16:00)
    const date16 = new Date(2026, 9, 16, 16, 0, 0);

    const txData = [
      {
        date: date14,
        dateLabel: 'Oct 14, 2026 4:00 PM'
      },
      {
        date: date16,
        dateLabel: 'Oct 16, 2026 4:00 PM'
      }
    ];

    for (const tx of txData) {
      const newTx = await Transaction.create({
        userId: khalid._id,
        type: 'profit',
        amount: 1,
        status: 'completed',
        description: 'Daily ROI (1.00%) from wallet capital $100',
        referenceId: khalid._id,
        referenceModel: 'User',
        createdAt: tx.date,
        updatedAt: tx.date,
        metadata: {
          source: 'wallet_capital_roi',
          capital: 100,
          rate: 0.01,
          proportion: 1
        }
      });

      console.log(`✓ Created: ${tx.dateLabel}`);
      console.log(`  Amount: $${newTx.amount}`);
      console.log(`  Description: ${newTx.description}\n`);
    }

    // Update wallet
    console.log('STEP 3: Updating wallet.profit...\n');

    const currentWallet = await User.findById(khalid._id).select('wallet');
    const currentProfit = currentWallet.wallet?.profit || 0;
    const newProfit = currentProfit + 2; // +$1 for Oct 14 + $1 for Oct 16

    await User.findByIdAndUpdate(khalid._id, {
      $set: {
        'wallet.profit': newProfit
      }
    });

    console.log(`wallet.profit: $${currentProfit} + $2 = $${newProfit}\n`);

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

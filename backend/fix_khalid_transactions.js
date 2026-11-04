const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('KHALID TRANSACTION FIX (khalid2970935@gmail.com)');
    console.log('═'.repeat(100) + '\n');

    // Find Khalid
    const khalid = await User.findOne({ email: 'khalid2970935@gmail.com' });
    if (!khalid) {
      console.log('❌ User not found');
      mongoose.connection.close();
      process.exit(1);
    }

    console.log(`User: ${khalid.name} (${khalid.email})\n`);

    // STEP 1: Remove the old Plan A ROI transaction ($10 from $1000 investment)
    console.log('STEP 1: Finding and removing old Plan A ROI transaction...\n');
    
    const oldTx = await Transaction.findOne({
      userId: khalid._id,
      type: 'profit',
      amount: 10,
      description: { $regex: 'Plan A', $options: 'i' }
    });

    if (oldTx) {
      console.log(`Found old transaction:`);
      console.log(`  ID: ${oldTx._id}`);
      console.log(`  Amount: $${oldTx.amount}`);
      console.log(`  Description: ${oldTx.description}`);
      console.log(`  Date: ${oldTx.createdAt}`);
      console.log(`  Status: ${oldTx.status}\n`);

      await Transaction.findByIdAndDelete(oldTx._id);
      console.log('✓ Deleted\n');

      // Subtract from wallet
      await User.findByIdAndUpdate(khalid._id, {
        $inc: {
          'wallet.profit': -10
        }
      });
      console.log('✓ Adjusted wallet.profit: -$10\n');
    } else {
      console.log('⚠️ Old Plan A transaction not found\n');
    }

    // STEP 2: Add new transactions for Oct 14 and Oct 16 at 4 PM
    console.log('STEP 2: Adding new wallet.capital ROI transactions...\n');

    // Oct 14, 2026 at 4 PM (16:00)
    const date14 = new Date(2026, 9, 14, 16, 0, 0); // Oct = month 9 (0-indexed)
    
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

      console.log(`✓ Created transaction for ${tx.dateLabel}:`);
      console.log(`  ID: ${newTx._id}`);
      console.log(`  Amount: $${newTx.amount}`);
      console.log(`  Description: ${newTx.description}\n`);
    }

    // STEP 3: Update wallet with new profits
    console.log('STEP 3: Updating wallet.profit...\n');

    const currentWallet = await User.findById(khalid._id).select('wallet');
    const currentProfit = currentWallet.wallet?.profit || 0;
    const newProfit = currentProfit + 2; // +$1 for Oct 14 + $1 for Oct 16

    await User.findByIdAndUpdate(khalid._id, {
      $set: {
        'wallet.profit': newProfit
      }
    });

    console.log(`Current wallet.profit: $${currentProfit}`);
    console.log(`Added: $2 (Oct 14: +$1, Oct 16: +$1)`);
    console.log(`New wallet.profit: $${newProfit}\n`);

    // STEP 4: Summary
    console.log('═'.repeat(100));
    console.log('TRANSACTION HISTORY UPDATED');
    console.log('═'.repeat(100) + '\n');

    const allTransactions = await Transaction.find({
      userId: khalid._id,
      type: 'profit'
    }).sort({ createdAt: -1 }).limit(10);

    console.log('Recent Profit Transactions:\n');
    allTransactions.forEach((t, i) => {
      const date = new Date(t.createdAt).toLocaleString();
      console.log(`${i + 1}. +$${t.amount.toFixed(2)} - ${t.description}`);
      console.log(`   Date: ${date}`);
    });

    console.log('\n' + '═'.repeat(100));
    console.log('FINAL WALLET STATE:');
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
    console.error(e.stack);
    mongoose.connection.close();
    process.exit(1);
  }
})();

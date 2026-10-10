/**
 * restore_by_transaction_history.js
 * 
 * RESTORE each user's ROI based on their ACTUAL transaction history
 * Example:
 * - Anees: approved Oct 8 → got ROI only on Oct 9 = 1 day
 * - Naveed: approved Sep 27 → got ROI Oct 1-9 = multiple days
 * 
 * Sum up all their "Daily ROI" transactions = their current correct balance
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(120));
    console.log('✅ RESTORE: Each User ROI Based on Their Transaction History');
    console.log('='.repeat(120) + '\n');

    const allUsers = await User.find({});
    console.log(`Processing ${allUsers.length} users...\n`);

    let restored = 0;
    const examples = [];

    for (const user of allUsers) {
      // Get ALL "Daily ROI" transactions for this user (from any date)
      const roiTransactions = await Transaction.find({
        userId: user._id,
        type: 'profit',
        description: { $regex: 'Daily ROI', $options: 'i' },
        status: 'completed'
      }).sort({ createdAt: 1 });

      if (roiTransactions.length === 0) {
        continue; // No ROI
      }

      // Sum all ROI transactions
      let totalRoi = 0;
      roiTransactions.forEach(trans => {
        totalRoi += trans.amount;
      });

      // Update wallet to exact transaction sum
      await User.findByIdAndUpdate(user._id, {
        $set: { 'wallet.roi': parseFloat(totalRoi.toFixed(2)) }
      });

      restored++;

      if (examples.length < 8) {
        examples.push({
          name: user.name || user.email,
          transactions: roiTransactions.length,
          dates: {
            first: roiTransactions[0].createdAt.toLocaleDateString(),
            last: roiTransactions[roiTransactions.length - 1].createdAt.toLocaleDateString()
          },
          total: totalRoi
        });
      }
    }

    console.log(`Restored ROI for ${restored} users based on their transaction history\n`);
    console.log('Examples:\n');
    examples.forEach(ex => {
      console.log(`  ${ex.name}:`);
      console.log(`    ${ex.transactions} transactions from ${ex.dates.first} to ${ex.dates.last}`);
      console.log(`    Total ROI: $${ex.total.toFixed(2)}\n`);
    });

    console.log('='.repeat(120));
    console.log('\nVERIFYING KEY USERS:\n');

    const anees = await User.findOne({ name: { $regex: 'anees', $options: 'i' } });
    if (anees) {
      const aneesTrans = await Transaction.find({
        userId: anees._id,
        type: 'profit',
        description: { $regex: 'Daily ROI', $options: 'i' }
      });
      console.log(`Anees: $${(anees.wallet?.roi || 0).toFixed(2)} (${aneesTrans.length} transactions)`);
    }

    const naveed = await User.findOne({ name: { $regex: 'naveed', $options: 'i' } });
    if (naveed) {
      const naveedTrans = await Transaction.find({
        userId: naveed._id,
        type: 'profit',
        description: { $regex: 'Daily ROI', $options: 'i' }
      });
      console.log(`Naveed: $${(naveed.wallet?.roi || 0).toFixed(2)} (${naveedTrans.length} transactions)`);
    }

    const shaharyar = await User.findOne({ name: { $regex: 'shaharyar', $options: 'i' } });
    if (shaharyar) {
      const shaharyarTrans = await Transaction.find({
        userId: shaharyar._id,
        type: 'profit',
        description: { $regex: 'Daily ROI', $options: 'i' }
      });
      console.log(`Shaharyar: $${(shaharyar.wallet?.roi || 0).toFixed(2)} (${shaharyarTrans.length} transactions)`);
    }

    console.log('\n' + '='.repeat(120) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

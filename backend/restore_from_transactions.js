/**
 * restore_from_transactions.js
 * 
 * Restore correct ROI for all users based on transaction history
 * Sum all "Daily ROI" transactions from Oct 1 to Oct 9
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
    console.log('✅ RESTORE: ROI from Transaction History (Oct 1-9)');
    console.log('='.repeat(120) + '\n');

    const startDate = new Date('2026-10-01T00:00:00');
    const endDate = new Date('2026-10-09T23:59:59');

    // Get all users
    const allUsers = await User.find({});
    console.log(`Processing ${allUsers.length} users...\n`);

    let restored = 0;
    const examples = [];

    for (const user of allUsers) {
      // Get all ROI transactions for this user from Oct 1-9
      const roiTransactions = await Transaction.find({
        userId: user._id,
        type: 'profit',
        description: { $regex: 'Daily ROI' },
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      });

      if (roiTransactions.length === 0) {
        continue; // No ROI transactions
      }

      // Sum all ROI
      const totalRoi = roiTransactions.reduce((sum, trans) => sum + trans.amount, 0);

      // Update wallet
      await User.findByIdAndUpdate(user._id, {
        $set: { 'wallet.roi': totalRoi }
      });

      restored++;

      if (examples.length < 5) {
        examples.push({
          name: user.name || user.email,
          transactions: roiTransactions.length,
          total: totalRoi
        });
      }
    }

    console.log(`Restored ROI for ${restored} users\n`);
    console.log('Examples:\n');
    examples.forEach(ex => {
      console.log(`  ${ex.name}: ${ex.transactions} transactions = $${ex.total.toFixed(2)}`);
    });

    console.log('\n' + '='.repeat(120));

    // Verify specific users
    console.log('\nVERIFYING:\n');

    const naveed = await User.findOne({ name: { $regex: 'naveed', $options: 'i' } });
    console.log(`Naveed: ROI = $${(naveed.wallet?.roi || 0).toFixed(2)}`);

    const shaharyar = await User.findOne({ name: { $regex: 'shaharyar', $options: 'i' } });
    console.log(`Shaharyar: ROI = $${(shaharyar.wallet?.roi || 0).toFixed(2)}`);

    console.log('\n' + '='.repeat(120) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

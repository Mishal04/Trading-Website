/**
 * reverse_todays_roi.js
 * 
 * Remove the daily ROI that was automatically sent today (Saturday Oct 10)
 * This reverses what the cron job distributed
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const InvestorInvestment = require('../src/models/InvestorInvestment');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function reverseRoi() {
  try {
    console.log('=' .repeat(100));
    console.log('🔄 REVERSE: Remove today\'s automatic ROI (Saturday Oct 10)');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    console.log(`Today's date: ${startOfToday.toISOString()}`);
    console.log(`Searching for ROI transactions between ${startOfToday.toISOString()} and ${endOfToday.toISOString()}\n`);

    // Find all profit/ROI transactions from today
    const todaysTransactions = await Transaction.find({
      type: 'profit',
      status: 'completed',
      date: {
        $gte: startOfToday,
        $lt: endOfToday
      }
    }).populate('userId', 'name email');

    console.log(`Found ${todaysTransactions.length} ROI transactions from today\n`);

    if (todaysTransactions.length === 0) {
      console.log('⚠️  No ROI transactions found for today. Nothing to reverse.\n');
      await mongoose.disconnect();
      return;
    }

    // Group by user and sum amounts
    const userRoiMap = {};
    todaysTransactions.forEach(txn => {
      const userId = txn.userId._id.toString();
      if (!userRoiMap[userId]) {
        userRoiMap[userId] = {
          userId: txn.userId._id,
          name: txn.userId.name,
          email: txn.userId.email,
          totalAmount: 0,
          transactions: []
        };
      }
      userRoiMap[userId].totalAmount += txn.amount;
      userRoiMap[userId].transactions.push(txn._id);
    });

    console.log('ROI breakdown by user:');
    let totalToReverse = 0;
    Object.values(userRoiMap).forEach(item => {
      console.log(`  • ${item.name} (${item.email}): $${item.totalAmount.toFixed(2)}`);
      totalToReverse += item.totalAmount;
    });
    console.log(`\nTotal ROI to reverse: $${totalToReverse.toFixed(2)}\n`);

    // Reverse the ROI
    console.log('⏳ Reversing ROI...\n');

    for (const userId of Object.keys(userRoiMap)) {
      const userItem = userRoiMap[userId];
      const reverseAmount = userItem.totalAmount;

      // Subtract from wallet.roi
      await User.findByIdAndUpdate(userItem.userId, {
        $inc: {
          'wallet.roi': -reverseAmount,
          totalRoiEarned: -reverseAmount
        }
      });

      // Delete the ROI transactions from today
      await Transaction.deleteMany({
        _id: { $in: userItem.transactions }
      });

      console.log(`✅ Reversed $${reverseAmount.toFixed(2)} for ${userItem.name}`);
    }

    // Also set lastRoiDate back to yesterday so they can get ROI tomorrow
    console.log('\n⏳ Resetting investment dates for tomorrow\'s ROI run...\n');

    const userIds = Object.keys(userRoiMap).map(id => new mongoose.Types.ObjectId(id));
    const investmentCount = await InvestorInvestment.updateMany(
      {
        userId: { $in: userIds },
        status: 'active'
      },
      {
        $set: {
          lastRoiDate: (() => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday;
          })()
        }
      }
    );

    console.log(`✅ Reset ${investmentCount.modifiedCount} investments' lastRoiDate to yesterday\n`);

    console.log('=' .repeat(100));
    console.log('✅ COMPLETE\n');
    console.log(`Total reversed: $${totalToReverse.toFixed(2)}`);
    console.log(`Users affected: ${Object.keys(userRoiMap).length}`);
    console.log('\n📝 NOTE: Tomorrow at 4 PM Pakistan time (Monday Oct 13), ROI will run again automatically.\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

reverseRoi().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

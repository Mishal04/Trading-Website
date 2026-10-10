/**
 * reverse_all_manual_credits.js
 * 
 * REVERSAL SCRIPT: Removes all manual credits that were just added
 * - Reverses ROI backfill credits
 * - Reverses missed ROI credits  
 * - Reverses commission credits
 * - Deletes related transactions and notifications
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const Notification = require('../src/models/Notification');
const CommissionLog = require('../src/models/CommissionLog');
const InvestorInvestment = require('../src/models/InvestorInvestment');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

let stats = {
  roiReversed: 0,
  roiAmount: 0,
  commissionsReversed: 0,
  commissionsAmount: 0,
  transactionsDeleted: 0,
  notificationsDeleted: 0,
  investmentsReset: 0
};

async function reverseAllCredits() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('=' .repeat(100));
    console.log('⏮️  REVERSING ALL MANUAL CREDITS');
    console.log('=' .repeat(100) + '\n');

    // ── STEP 1: Find and reverse all MANUAL CREDIT transactions ────
    console.log('📋 STEP 1: Finding all manual credit transactions...\n');

    const manualTransactions = await Transaction.find({
      description: { $regex: 'MANUAL CREDIT|BACKFILL' }
    });

    console.log(`Found ${manualTransactions.length} manual credit transactions\n`);

    // Group by user and type
    const creditsByUser = {};

    for (const txn of manualTransactions) {
      const userId = txn.userId.toString();
      if (!creditsByUser[userId]) {
        creditsByUser[userId] = { roi: 0, commission: 0, transactionIds: [] };
      }

      if (txn.type === 'profit') {
        creditsByUser[userId].roi += txn.amount;
      } else if (txn.type === 'commission') {
        creditsByUser[userId].commission += txn.amount;
      }

      creditsByUser[userId].transactionIds.push(txn._id);
    }

    console.log(`Grouped into ${Object.keys(creditsByUser).length} users\n`);
    console.log('Reversing credits...\n');

    // ── STEP 2: Reverse all credits on User documents ────
    for (const userId in creditsByUser) {
      const credits = creditsByUser[userId];

      try {
        const user = await User.findById(userId);
        if (!user) continue;

        const reverseFields = {};

        if (credits.roi > 0) {
          reverseFields['$inc'] = reverseFields['$inc'] || {};
          reverseFields['$inc']['wallet.roi'] = -credits.roi;
          reverseFields['$inc']['totalRoiEarned'] = -credits.roi;
          stats.roiReversed++;
          stats.roiAmount += credits.roi;
          console.log(`  ✅ ${user.name} - Reversed ROI: -$${credits.roi.toFixed(2)}`);
        }

        if (credits.commission > 0) {
          reverseFields['$inc'] = reverseFields['$inc'] || {};
          reverseFields['$inc']['wallet.commission'] = -credits.commission;
          reverseFields['$inc']['totalEarned'] = -credits.commission;
          stats.commissionsReversed++;
          stats.commissionsAmount += credits.commission;
          console.log(`  ✅ ${user.name} - Reversed Commission: -$${credits.commission.toFixed(2)}`);
        }

        if (Object.keys(reverseFields).length > 0) {
          await User.findByIdAndUpdate(userId, reverseFields);
        }

      } catch (err) {
        console.error(`  ❌ Error reversing for user ${userId}:`, err.message);
      }
    }

    // ── STEP 3: Delete all manual credit transactions ────
    console.log('\n📋 STEP 2: Deleting manual credit transactions...\n');

    const deleteResult = await Transaction.deleteMany({
      description: { $regex: 'MANUAL CREDIT|BACKFILL' }
    });

    stats.transactionsDeleted = deleteResult.deletedCount;
    console.log(`  ✅ Deleted ${deleteResult.deletedCount} manual credit transactions\n`);

    // ── STEP 4: Delete related notifications ────
    console.log('📋 STEP 3: Deleting related notifications...\n');

    const notifyResult = await Notification.deleteMany({
      message: { $regex: 'MANUAL CREDIT|BACKFILL' }
    });

    stats.notificationsDeleted = notifyResult.deletedCount;
    console.log(`  ✅ Deleted ${notifyResult.deletedCount} notifications\n`);

    // ── STEP 5: Delete commission logs ────
    console.log('📋 STEP 4: Deleting commission logs...\n');

    const commLogResult = await CommissionLog.deleteMany({
      description: { $regex: 'MANUAL CREDIT' }
    });

    console.log(`  ✅ Deleted ${commLogResult.deletedCount} commission logs\n`);

    // ── STEP 6: Reset investment lastRoiDate to original state ────
    console.log('📋 STEP 5: Resetting investment ROI tracking...\n');

    const investments = await InvestorInvestment.find({
      status: 'active'
    });

    for (const inv of investments) {
      try {
        // Reset lastRoiDate to startDate so future cron can process normally
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        await InvestorInvestment.findByIdAndUpdate(inv._id, {
          $set: { lastRoiDate: yesterday }
        });

        stats.investmentsReset++;
      } catch (err) {
        console.error(`  ❌ Error resetting investment ${inv._id}:`, err.message);
      }
    }

    console.log(`  ✅ Reset ${stats.investmentsReset} investments for future processing\n`);

    // ── FINAL SUMMARY ────
    console.log('=' .repeat(100));
    console.log('📊 REVERSAL COMPLETE');
    console.log('=' .repeat(100));
    console.log(`\n❌ ROI Reversed: $${stats.roiAmount.toFixed(2)} (${stats.roiReversed} users)`);
    console.log(`❌ Commissions Reversed: $${stats.commissionsAmount.toFixed(2)} (${stats.commissionsReversed} users)`);
    console.log(`\n🗑️  Transactions Deleted: ${stats.transactionsDeleted}`);
    console.log(`🗑️  Notifications Deleted: ${stats.notificationsDeleted}`);
    console.log(`🔄 Investments Reset: ${stats.investmentsReset}`);
    console.log(`\n💰 TOTAL REVERSED: $${(stats.roiAmount + stats.commissionsAmount).toFixed(2)}\n`);
    console.log('⚠️  All manual credits have been REVERSED\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

reverseAllCredits().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

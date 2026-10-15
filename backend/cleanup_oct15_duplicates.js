/**
 * Cleanup script to remove duplicate Oct 15 commissions and reset investments for fresh run
 * Run: node cleanup_oct15_duplicates.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const User = require('./src/models/User');
const CronLock = require('./src/models/CronLock');

const cleanup = async () => {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧹 CLEANUP: Oct 15 Duplicates & Reset for Fresh Run');
    console.log('═══════════════════════════════════════════════════════════\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Step 1: Find all commission transactions today and identify duplicates
    console.log('📋 Step 1: Identify commission duplicates');
    const allComm = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: startOfToday }
    }).sort({ createdAt: -1 });

    const byUser = {};
    allComm.forEach(t => {
      if (!byUser[t.userId]) byUser[t.userId] = [];
      byUser[t.userId].push(t);
    });

    let totalDupes = [];
    for (const userId in byUser) {
      if (byUser[userId].length > 1) {
        const user = await User.findById(userId);
        console.log(`   ${user.name}: ${byUser[userId].length} transactions`);
        // Keep first, delete rest
        for (let i = 1; i < byUser[userId].length; i++) {
          totalDupes.push(byUser[userId][i]._id);
        }
      }
    }

    console.log(`   Total duplicates to delete: ${totalDupes.length}\n`);

    // Step 2: Delete duplicate commission transactions
    console.log('📋 Step 2: Delete duplicate commission transactions');
    if (totalDupes.length > 0) {
      const deleteResult = await Transaction.deleteMany({ _id: { $in: totalDupes } });
      console.log(`   Deleted: ${deleteResult.deletedCount} duplicate transactions\n`);
    } else {
      console.log(`   No duplicates to delete\n`);
    }

    // Step 3: Delete ALL profit transactions today (ROI) to allow reprocessing
    console.log('📋 Step 3: Delete all ROI (profit type) transactions today');
    const roiDeleteResult = await Transaction.deleteMany({
      type: 'profit',
      createdAt: { $gte: startOfToday }
    });
    console.log(`   Deleted: ${roiDeleteResult.deletedCount} ROI transactions\n`);

    // Step 4: Reset lastRoiDate on all investments so they can be processed again
    console.log('📋 Step 4: Reset investments for reprocessing');
    const yesterday = new Date(startOfToday.getTime() - 1); // Set to yesterday

    const updateResult = await InvestorInvestment.updateMany(
      { status: 'active', lastRoiDate: { $gte: startOfToday } },
      { $set: { lastRoiDate: yesterday } }
    );
    console.log(`   Updated: ${updateResult.modifiedCount} investments\n`);

    // Step 5: Clear the cron lock
    console.log('📋 Step 5: Clear cron lock');
    const lockDeleted = await CronLock.deleteOne({ jobName: 'dailyProfits', dateKey });
    console.log(`   Deleted: ${lockDeleted.deletedCount} lock(s)\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✓ Cleanup complete! Ready for fresh run.\n');

    process.exit(0);

  } catch (err) {
    console.error('\n❌ Cleanup failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

cleanup();

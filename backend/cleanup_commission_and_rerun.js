const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    const Transaction = require('./src/models/Transaction');
    const CronLock = require('./src/models/CronLock');
    const profitService = require('./src/services/profitService');
    
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║     CLEANUP: Delete Today\'s Commission + Profit & Re-run Cron      ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    const today = new Date('2026-10-16');
    const tomorrow = new Date('2026-10-17');
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('STEP 1: Finding today\'s transactions to delete...\n');
    
    const profitTxns = await Transaction.find({
      type: 'profit',
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    const commissionTxns = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    console.log(`Found ${profitTxns.length} profit transactions`);
    console.log(`Found ${commissionTxns.length} commission transactions\n`);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('STEP 2: Reversing transaction amounts...\n');
    
    const affectedUsers = new Set();
    
    // Reverse profit transactions
    console.log('Reversing profit transactions:');
    for (const txn of profitTxns) {
      affectedUsers.add(txn.userId.toString());
      await User.findByIdAndUpdate(txn.userId, {
        $inc: {
          'wallet.profit': -txn.amount,
          totalRoiEarned: -txn.amount
        }
      });
    }
    console.log(`  ✓ Reversed ${profitTxns.length} profit transactions\n`);
    
    // Reverse commission transactions
    console.log('Reversing commission transactions:');
    for (const txn of commissionTxns) {
      affectedUsers.add(txn.userId.toString());
      await User.findByIdAndUpdate(txn.userId, {
        $inc: {
          'wallet.commission': -txn.amount,
          totalEarned: -txn.amount
        }
      });
    }
    console.log(`  ✓ Reversed ${commissionTxns.length} commission transactions\n`);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('STEP 3: Deleting transactions from database...\n');
    
    await Transaction.deleteMany({
      type: 'profit',
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    await Transaction.deleteMany({
      type: 'commission',
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    console.log(`✅ Deleted ${profitTxns.length} profit transactions`);
    console.log(`✅ Deleted ${commissionTxns.length} commission transactions`);
    console.log(`✅ Affected ${affectedUsers.size} users\n`);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('STEP 4: Clearing cron lock...\n');
    
    await CronLock.deleteMany({
      jobName: 'dailyProfits',
      dateKey: '2026-10-16'
    });
    
    console.log('✅ Cron lock cleared\n');
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('STEP 5: Running cron to regenerate fresh earnings...\n');
    
    const cronResult = await profitService.calculateDailyProfits();
    
    console.log('\n✅ Cron Execution Complete!');
    console.log(`\nResults:`);
    console.log(`  Processed Investments: ${cronResult.processedCount}`);
    console.log(`  Total ROI Distributed: $${cronResult.totalProfitDistributed.toFixed(2)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('\nSTEP 6: Verifying results...\n');
    
    const shahansha = await User.findOne({ name: { $regex: 'Muhammad.*Shahansha', $options: 'i' } });
    const profitTxnsAfter = await Transaction.countDocuments({
      type: 'profit',
      createdAt: { $gte: today, $lt: tomorrow }
    });
    const commissionTxnsAfter = await Transaction.countDocuments({
      type: 'commission',
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    console.log('After cleanup & cron:');
    console.log(`  Profit transactions today: ${profitTxnsAfter}`);
    console.log(`  Commission transactions today: ${commissionTxnsAfter}`);
    console.log(`\nMuhammad Shahansha:`);
    console.log(`  Profit Balance: $${shahansha.wallet?.profit || 0}`);
    console.log(`  Commission Balance: $${shahansha.wallet?.commission || 0}`);
    console.log(`  Total Earnings: $${((shahansha.wallet?.profit || 0) + (shahansha.wallet?.commission || 0)).toFixed(2)}`);
    
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ CLEANUP & RERUN COMPLETE                       ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();

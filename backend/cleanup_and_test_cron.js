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
    console.log('║     CLEANUP & TEST: Reset Negative Profits + Delete Transactions   ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('STEP 1: Finding users with negative profit balance...\n');
    
    const usersWithNegativeProfit = await User.find({
      'wallet.profit': { $lt: 0 }
    }).select('_id name email wallet');
    
    console.log(`Found ${usersWithNegativeProfit.length} users with negative profit:\n`);
    
    for (const user of usersWithNegativeProfit) {
      console.log(`   ${user.name} (${user.email}): wallet.profit = $${user.wallet?.profit}`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('\n\nSTEP 2: Resetting negative profits to $0...\n');
    
    let resetCount = 0;
    for (const user of usersWithNegativeProfit) {
      await User.findByIdAndUpdate(user._id, {
        $set: { 'wallet.profit': 0 }
      });
      console.log(`   ✓ ${user.name}: profit set to $0`);
      resetCount++;
    }
    
    console.log(`\n✅ Reset ${resetCount} users\n`);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('STEP 3: Deleting today\'s transactions (profit + commission)...\n');
    
    const today = new Date('2026-10-16');
    const tomorrow = new Date('2026-10-17');
    
    const profitTxns = await Transaction.find({
      type: 'profit',
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    const commissionTxns = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    console.log(`Found ${profitTxns.length} profit transactions to delete`);
    console.log(`Found ${commissionTxns.length} commission transactions to delete\n`);
    
    // Delete and track affected users
    const affectedUsers = new Set();
    
    for (const txn of profitTxns) {
      affectedUsers.add(txn.userId.toString());
      // Reverse the credit
      await User.findByIdAndUpdate(txn.userId, {
        $inc: {
          'wallet.profit': -txn.amount,
          totalRoiEarned: -txn.amount
        }
      });
    }
    
    for (const txn of commissionTxns) {
      affectedUsers.add(txn.userId.toString());
      // Reverse the credit
      await User.findByIdAndUpdate(txn.userId, {
        $inc: {
          'wallet.commission': -txn.amount,
          totalEarned: -txn.amount
        }
      });
    }
    
    // Delete transactions
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
    console.log(`✅ Reversed earnings for ${affectedUsers.size} users\n`);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('STEP 4: Clearing cron lock to allow re-run...\n');
    
    await CronLock.deleteMany({
      jobName: 'dailyProfits',
      dateKey: '2026-10-16'
    });
    
    console.log('✅ Cron lock cleared\n');
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('STEP 5: Running cron now to test...\n');
    
    const cronResult = await profitService.calculateDailyProfits();
    
    console.log('\nCron Results:');
    console.log(`  Processed: ${cronResult.processedCount} investments`);
    console.log(`  Total ROI Distributed: $${cronResult.totalProfitDistributed.toFixed(2)}`);
    console.log(`  Skipped: ${cronResult.skipped}`);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('\n\nSTEP 6: Verifying results...\n');
    
    const sampleUsers = await User.find({}).limit(5).select('name wallet');
    
    console.log('Sample user wallets after cron:');
    for (const user of sampleUsers) {
      const totalProfit = (user.wallet?.profit || 0) + (user.wallet?.commission || 0);
      console.log(`   ${user.name}:`);
      console.log(`     - Profit: $${user.wallet?.profit || 0}`);
      console.log(`     - Commission: $${user.wallet?.commission || 0}`);
      console.log(`     - Total: $${totalProfit.toFixed(2)}`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                     ✅ CLEANUP & TEST COMPLETE                     ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    console.log('Summary:');
    console.log(`  • Reset ${resetCount} users with negative profit to $0`);
    console.log(`  • Deleted ${profitTxns.length} profit transactions`);
    console.log(`  • Deleted ${commissionTxns.length} commission transactions`);
    console.log(`  • Reversed earnings for ${affectedUsers.size} users`);
    console.log(`  • Ran cron: Distributed $${cronResult.totalProfitDistributed.toFixed(2)} in fresh ROI & commissions\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();

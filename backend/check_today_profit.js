const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000
}).then(async () => {
  try {
    const CommissionLog = require('./src/models/CommissionLog');
    const Investment = require('./src/models/Investment');
    const Transaction = require('./src/models/Transaction');
    const User = require('./src/models/User');
    
    console.log('🔍 Checking Today\'s Data (October 7, 2026)...\n');
    
    const today = new Date(2026, 9, 7, 0, 0, 0);
    const tomorrow = new Date(2026, 9, 8, 0, 0, 0);
    
    const commCount = await CommissionLog.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    const txnCount = await Transaction.countDocuments({
      date: { $gte: today, $lt: tomorrow }
    });
    
    const profitTxns = await Transaction.countDocuments({
      type: 'profit',
      date: { $gte: today, $lt: tomorrow }
    });
    
    const activeInvCount = await Investment.countDocuments({
      status: 'active',
      isActive: true
    });

    const usersWithProfit = await User.countDocuments({
      'wallet.profit': { $gt: 0 }
    });
    
    console.log('📊 Today\'s Activity Summary:');
    console.log('  Commission Log Entries:', commCount);
    console.log('  Total Transactions:', txnCount);
    console.log('  Profit Transactions:', profitTxns);
    console.log('  Active Investments:', activeInvCount);
    console.log('  Users with Profit Balance:', usersWithProfit);
    
    if (profitTxns > 0) {
      console.log('\n✅ PROFIT WAS DISTRIBUTED TODAY!');
      
      // Show sample transactions
      const samples = await Transaction.find({
        type: 'profit',
        date: { $gte: today, $lt: tomorrow }
      }).limit(5);
      
      console.log('\n Sample Profit Transactions:');
      samples.forEach(t => {
        console.log(`  - User: ${t.userId} | Amount: $${t.amount}`);
      });
    } else {
      console.log('\n❌ NO PROFITS CALCULATED YET TODAY');
      console.log('\n   Reasons could be:');
      console.log('   1. Cron hasn\'t run yet (scheduled for 4 PM)');
      console.log('   2. No active investments exist');
      console.log('   3. Already calculated today (check lastProfitDate)');
    }
    
    // Check CronLock status
    const CronLock = require('./src/models/CronLock');
    const locks = await CronLock.find({ dateKey: '2026-10-07' });
    console.log('\n🔐 CronLock Status for Today:');
    locks.forEach(l => {
      console.log(`  - Job: ${l.jobName} | Status: ${l.status} | Locked at: ${l.lockedAt}`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}).catch(err => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

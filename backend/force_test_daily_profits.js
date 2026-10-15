/**
 * Force test of daily profit calculation (bypasses lock)
 * Run: node force_test_daily_profits.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const CronLock = require('./src/models/CronLock');
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');

const runTest = async () => {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 FORCE TEST - Daily Profit (Bypass Lock)');
    console.log('═══════════════════════════════════════════════════════════\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Clear lock
    console.log(`📋 Step 1: Clear existing lock for ${dateKey}`);
    const lockDeleted = await CronLock.deleteOne({ jobName: 'dailyProfits', dateKey });
    console.log(`   Deleted: ${lockDeleted.deletedCount} lock(s)\n`);

    // Check existing transactions
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const existingComm = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: startOfToday }
    });

    console.log(`📋 Step 2: Check existing commission transactions today`);
    console.log(`   Found: ${existingComm.length} transactions`);

    const byUser = {};
    existingComm.forEach(t => {
      if (!byUser[t.userId]) byUser[t.userId] = [];
      byUser[t.userId].push(t);
    });

    for (const userId in byUser) {
      const user = await User.findById(userId);
      console.log(`   - ${user.name}: ${byUser[userId].length} transaction(s)`);
    }
    console.log();

    // Run the calculation
    console.log('📋 Step 3: Run daily profit calculation');
    console.log('─────────────────────────────────────────────────────────\n');

    const profitService = require('./src/services/profitService');
    const result = await profitService.calculateDailyProfits();

    console.log('\n─────────────────────────────────────────────────────────');
    console.log(`\n📊 RESULTS:`);
    console.log(`  Investments Processed: ${result.processedCount}`);
    console.log(`  ROI Distributed: $${result.totalProfitDistributed.toFixed(2)}`);
    console.log(`  Investors With Commissions: ${result.investorsWithCommissions}`);

    // Check for duplicates
    console.log(`\n📋 Step 4: Check for duplicate commissions`);

    const newComm = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: startOfToday }
    });

    console.log(`   Total commission transactions: ${newComm.length}`);

    const dupsByUser = {};
    newComm.forEach(t => {
      if (!dupsByUser[t.userId]) dupsByUser[t.userId] = 0;
      dupsByUser[t.userId]++;
    });

    let totalDupes = 0;
    for (const userId in dupsByUser) {
      if (dupsByUser[userId] > 1) {
        totalDupes += dupsByUser[userId] - 1;
        const user = await User.findById(userId);
        console.log(`   ⚠️  ${user.name}: ${dupsByUser[userId]} transactions`);
      }
    }

    if (totalDupes === 0) {
      console.log(`   ✓ No duplicates detected!`);
    } else {
      console.log(`   ✗ ${totalDupes} duplicate transactions found`);
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

runTest();

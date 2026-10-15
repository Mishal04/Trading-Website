/**
 * Manual test script for daily profit calculation with two-phase commission processing
 * Run: node test_daily_profits_manual.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const profitService = require('./src/services/profitService');

const runTest = async () => {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 MANUAL DAILY PROFIT TEST - Two-Phase Commission System');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Run the profit calculation
    const result = await profitService.calculateDailyProfits();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 TEST RESULTS:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✓ Investments Processed: ${result.processedCount}`);
    console.log(`✓ ROI Distributed: $${result.totalProfitDistributed.toFixed(2)}`);
    console.log(`✓ Investors With Commissions: ${result.investorsWithCommissions}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Check for duplicates
    const Transaction = require('./src/models/Transaction');
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const commissions = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: startOfToday }
    });

    const byUserId = {};
    commissions.forEach(t => {
      if (!byUserId[t.userId]) byUserId[t.userId] = 0;
      byUserId[t.userId]++;
    });

    console.log(`📋 Commission Transactions Today: ${commissions.length}`);
    let duplicateCount = 0;
    for (const userId in byUserId) {
      if (byUserId[userId] > 1) {
        duplicateCount += byUserId[userId] - 1;
        const user = await require('./src/models/User').findById(userId);
        console.log(`  ⚠️  ${user.name}: ${byUserId[userId]} commission transactions (DUPLICATE DETECTED)`);
      }
    }
    if (duplicateCount === 0) {
      console.log('  ✓ No duplicates detected!');
    }

    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

runTest();

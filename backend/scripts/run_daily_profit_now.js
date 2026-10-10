/**
 * run_daily_profit_now.js
 * 
 * Manually trigger the daily profit calculation cron job
 * to verify ROI and commissions are calculated and distributed
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const profitService = require('../src/services/profitService');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function runDailyProfitNow() {
  try {
    console.log('=' .repeat(100));
    console.log('🕐 MANUAL TRIGGER: Daily Profit Calculation');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('Running profitService.calculateDailyProfits()...\n');
    const result = await profitService.calculateDailyProfits();

    console.log('\n' + '=' .repeat(100));
    console.log('✅ DAILY PROFIT CALCULATION COMPLETE\n');
    console.log('Results:');
    console.log(`  Investments processed: ${result?.processedCount || 0}`);
    console.log(`  Total profit distributed: $${(result?.totalProfitDistributed || 0).toFixed(2)}`);
    console.log(`  Skipped (already processed): ${result?.skipped ? 'Yes' : 'No'}\n`);

    if (result?.processedCount > 0) {
      console.log('✅ ROI and commissions have been distributed successfully!');
      console.log('✅ Tomorrow at 4 PM Pakistan time, this will run automatically.\n');
    } else {
      console.log('⚠️  No investments were processed. This could mean:');
      console.log('  - No active investments with lastProfitDate/lastRoiDate before today');
      console.log('  - Cron already ran today (distributed lock in place)');
      console.log('  - Check if investments exist and have correct dates\n');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runDailyProfitNow().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

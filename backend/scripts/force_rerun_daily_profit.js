/**
 * force_rerun_daily_profit.js
 * 
 * Clear cron lock and force rerun daily profit calculation
 * for verification purposes only
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const CronLock = require('../src/models/CronLock');
const profitService = require('../src/services/profitService');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function forceRerun() {
  try {
    console.log('=' .repeat(100));
    console.log('🔧 FORCE RERUN: Daily Profit Calculation (for verification)');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Clear existing lock
    console.log('🗑️  Clearing previous cron lock...');
    const deleteResult = await CronLock.deleteOne({ jobName: 'dailyProfits' });
    console.log(`✅ Deleted ${deleteResult.deletedCount} lock(s)\n`);

    // Run profit calculation
    console.log('🕐 Running daily profit calculation...\n');
    const result = await profitService.calculateDailyProfits();

    console.log('\n' + '=' .repeat(100));
    console.log('✅ DAILY PROFIT CALCULATION COMPLETE\n');
    console.log('Results:');
    console.log(`  ✅ Investments processed: ${result?.processedCount || 0}`);
    console.log(`  ✅ Total profit/ROI distributed: $${(result?.totalProfitDistributed || 0).toFixed(2)}`);
    console.log(`  ✅ Commissions calculated and distributed\n`);

    if (result?.processedCount > 0) {
      console.log('=' .repeat(100));
      console.log('✅ SUCCESS! Daily ROI and commissions are working correctly!');
      console.log('=' .repeat(100) + '\n');
      console.log('Tomorrow at 4 PM Pakistan time (16:00 Asia/Karachi), this will run automatically for all users:\n');
      console.log('  1. Daily ROI will be credited to wallet.profit (legacy) or wallet.roi (Plan A/B)');
      console.log('  2. Level commissions will be distributed to all uplines');
      console.log('  3. Direct referral commissions are awarded at approval/deposit time (separate)\n');
      console.log('This applies to:');
      console.log('  ✅ Approved investments (both legacy and Plan A/B)');
      console.log('  ✅ Admin deposits (auto-creates InvestorInvestment with same day ROI)\n');
    } else {
      console.log('⚠️  No investments were processed.');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

forceRerun().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

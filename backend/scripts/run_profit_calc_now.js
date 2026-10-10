/**
 * run_profit_calc_now.js
 * 
 * MANUAL: Run the daily profit calculation immediately to test if it works
 * This mimics what the cron job does at 4 PM
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

async function runProfitCalc() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('=' .repeat(100));
    console.log('🚀 RUNNING DAILY PROFIT CALCULATION (MANUAL TEST)');
    console.log('=' .repeat(100) + '\n');

    const result = await profitService.calculateDailyProfits();

    console.log('\n' + '=' .repeat(100));
    console.log('✅ PROFIT CALCULATION COMPLETE');
    console.log('=' .repeat(100));
    console.log(`\nResult:`, result);
    console.log('\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runProfitCalc().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

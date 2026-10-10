/**
 * clear_lock_and_test.js
 * 
 * Clear the cron lock and re-run the test
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const CronLock = require('./src/models/CronLock');
const User = require('./src/models/User');
const profitService = require('./src/services/profitService');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function testWithClear() {
  try {
    console.log('\n' + '=' .repeat(100));
    console.log('🧪 TEST: Clear Lock and Run Cron');
    console.log('=' .repeat(100) + '\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Clear the lock
    console.log('Clearing cron lock...');
    await CronLock.deleteMany({});
    console.log('✅ Lock cleared\n');

    // Find Mustaqeem BEFORE
    const mustaqeemBefore = await User.findOne({ name: 'Mustaqeem' });
    const totalBefore = (mustaqeemBefore.wallet?.profit || 0) + 
                        (mustaqeemBefore.wallet?.commission || 0) + 
                        (mustaqeemBefore.wallet?.roi || 0);

    console.log('BEFORE Cron:');
    console.log(`  Mustaqeem Total: $${totalBefore.toFixed(2)}\n`);

    // Run cron
    console.log('Running calculateDailyProfits()...\n');
    const result = await profitService.calculateDailyProfits();
    
    console.log(`Processed: ${result.processedCount} investments`);
    console.log(`ROI distributed: $${result.totalProfitDistributed.toFixed(2)}\n`);

    // Check AFTER
    const mustaqeemAfter = await User.findOne({ name: 'Mustaqeem' });
    const totalAfter = (mustaqeemAfter.wallet?.profit || 0) + 
                       (mustaqeemAfter.wallet?.commission || 0) + 
                       (mustaqeemAfter.wallet?.roi || 0);

    const earned = totalAfter - totalBefore;

    console.log('AFTER Cron:');
    console.log(`  Mustaqeem Total: $${totalAfter.toFixed(2)}`);
    console.log(`  Earned: $${earned.toFixed(2)}\n`);

    console.log('=' .repeat(100));
    console.log('\n✅ TEST RESULT\n');

    if (earned >= 20.65 && earned <= 20.75) {
      console.log(`✅✅✅ SUCCESS! Mustaqeem earned $${earned.toFixed(2)} (expected $20.70) ✅✅✅\n`);
    } else if (earned > 0) {
      console.log(`⚠️  Mustaqeem earned $${earned.toFixed(2)} (expected $20.70)\n`);
    } else {
      console.log(`❌ FAILED: Mustaqeem earned $${earned.toFixed(2)}\n`);
    }

    console.log('=' .repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testWithClear().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

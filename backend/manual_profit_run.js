/**
 * manual_profit_run.js
 * 
 * Manually trigger daily profit calculation with lock safety.
 * Uses same MongoDB atomic lock as cron to prevent duplicates.
 * 
 * Usage:
 *   node manual_profit_run.js              # Normal run (respects lock)
 *   node manual_profit_run.js --force      # Force re-run (deletes today's lock)
 */

const mongoose = require('mongoose');
const CronLock = require('./src/models/CronLock');
const { calculateDailyProfits } = require('./src/services/profitService');
require('dotenv').config();

async function manualProfitRun() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Check for --force flag
    const forceFlag = process.argv.includes('--force');
    
    if (forceFlag) {
      console.log('⚠ FORCE MODE: Deleting all locks for today to allow re-run\n');
      const deleted = await CronLock.deleteMany({
        jobName: 'dailyProfits',
        dateKey
      });
      console.log(`Deleted ${deleted.deletedCount} lock(s) for ${dateKey}\n`);
    } else {
      // Normal mode: check for existing locks
      const existingLock = await CronLock.findOne({
        jobName: 'dailyProfits',
        dateKey
      });

      if (existingLock) {
        const lockAgeMs = now.getTime() - existingLock.lockedAt.getTime();
        const lockAgeMin = lockAgeMs / (60 * 1000);
        
        console.log(`⚠ Found existing lock from ${lockAgeMin.toFixed(1)} minutes ago`);
        console.log(`Status: ${existingLock.status}`);
        
        if (lockAgeMin < 10) {
          console.log(`\n✗ Lock is recent (< 10 min). Use --force flag to override:`);
          console.log(`  node manual_profit_run.js --force\n`);
          mongoose.connection.close();
          process.exit(0);
        } else {
          console.log(`\n✓ Lock is old (> 10 min). Allowing re-run...\n`);
          await CronLock.deleteOne({ _id: existingLock._id });
        }
      }
    }

    // Run the profit calculation (which will use its own lock mechanism)
    console.log('Running calculateDailyProfits...\n');
    const result = await calculateDailyProfits();

    console.log('\n' + '═'.repeat(80));
    console.log('MANUAL RUN COMPLETE');
    console.log('═'.repeat(80));
    console.log(`ROI Processed: ${result.processedCount} investments`);
    console.log(`ROI Distributed: $${result.totalProfitDistributed?.toFixed(2)}`);
    console.log(`Investors with Commissions: ${result.investorsWithCommissions}`);
    
    // Show final lock status
    const finalLock = await CronLock.findOne({
      jobName: 'dailyProfits',
      dateKey
    });
    
    if (finalLock) {
      console.log(`\nLock Status: ${finalLock.status}`);
      console.log(`Lock Age: ${((now.getTime() - finalLock.lockedAt.getTime()) / 1000).toFixed(1)} seconds`);
    }
    console.log('');

    mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    mongoose.connection.close();
    process.exit(1);
  }
}

manualProfitRun();

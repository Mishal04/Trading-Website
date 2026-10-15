/**
 * manual_profit_run.js
 * 
 * Manually trigger daily profit calculation with lock safety.
 * Uses same MongoDB atomic lock as cron to prevent duplicates.
 * Automatically clears stuck locks after 30 minutes.
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

    // Check for stuck locks (older than 30 minutes)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const stuckLock = await CronLock.findOne({
      jobName: 'dailyProfits',
      dateKey,
      status: 'running',
      lockedAt: { $lt: thirtyMinutesAgo }
    });

    if (stuckLock) {
      console.log(`⚠ Found stuck lock from ${stuckLock.lockedAt.toISOString()}`);
      console.log(`  Clearing stuck lock to allow today's run...\n`);
      await CronLock.deleteOne({ _id: stuckLock._id });
    }

    // Run the profit calculation (which will use its own lock mechanism)
    console.log('Running calculateDailyProfits...\n');
    const result = await calculateDailyProfits();

    console.log('\n=== MANUAL RUN COMPLETE ===');
    console.log(`ROI Processed: ${result.processedCount} users`);
    console.log(`ROI Distributed: $${result.totalProfitDistributed?.toFixed(2)}`);
    console.log(`Investors with Commissions: ${result.investorsWithCommissions}\n`);

    mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    mongoose.connection.close();
    process.exit(1);
  }
}

manualProfitRun();

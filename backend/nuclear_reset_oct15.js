/**
 * NUCLEAR RESET: Delete ALL Oct 15 data and prepare for clean run
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const CronLock = require('./src/models/CronLock');
const CommissionLog = require('./src/models/CommissionLog');

const nuke = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    console.log(`\n💣 NUCLEAR RESET: Oct 15, 2026\n`);

    // 1. Delete ALL transactions for today
    const transDeleted = await Transaction.deleteMany({
      createdAt: { $gte: startOfToday, $lt: endOfToday }
    });
    console.log(`✓ Deleted ${transDeleted.deletedCount} transactions`);

    // 2. Delete ALL commission logs for today
    const commDeleted = await CommissionLog.deleteMany({
      createdAt: { $gte: startOfToday, $lt: endOfToday }
    });
    console.log(`✓ Deleted ${commDeleted.deletedCount} commission logs`);

    // 3. Reset all investments processed today
    const invUpdated = await InvestorInvestment.updateMany(
      { lastRoiDate: { $gte: startOfToday } },
      { $set: { lastRoiDate: new Date(startOfToday.getTime() - 1) } }
    );
    console.log(`✓ Reset ${invUpdated.modifiedCount} investment lastRoiDate`);

    // 4. Delete cron lock
    const lockDeleted = await CronLock.deleteOne({
      jobName: 'dailyProfits',
      dateKey: `2026-10-15`
    });
    console.log(`✓ Deleted ${lockDeleted.deletedCount} cron lock(s)`);

    console.log(`\n✅ CLEAN SLATE READY FOR FRESH RUN\n`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

nuke();

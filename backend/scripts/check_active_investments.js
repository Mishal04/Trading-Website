/**
 * check_active_investments.js
 * 
 * Check active investments and their profit dates
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Investment = require('../src/models/Investment');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const CronLock = require('../src/models/CronLock');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function check() {
  try {
    console.log('=' .repeat(100));
    console.log('📊 ACTIVE INVESTMENTS CHECK');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Start of today: ${startOfToday.toISOString()}\n`);

    // Check legacy investments
    console.log('--- LEGACY INVESTMENTS (User Portfolio) ---');
    const legacyInvestments = await Investment.find({
      isActive: true,
      status: 'active'
    }).populate('userId', 'name email').limit(10);

    if (legacyInvestments.length === 0) {
      console.log('  No active legacy investments found\n');
    } else {
      console.log(`Found ${legacyInvestments.length} active legacy investments:\n`);
      legacyInvestments.forEach(inv => {
        const lastProfitDate = new Date(inv.lastProfitDate);
        const willProcess = lastProfitDate < startOfToday;
        console.log(`  • ${inv.userId?.name || 'Unknown'} | $${inv.amount} | ${inv.packageName}`);
        console.log(`    lastProfitDate: ${inv.lastProfitDate.toISOString()} ${willProcess ? '✅ WILL PROCESS' : '❌ WON\'T PROCESS'}\n`);
      });
    }

    // Check investor plan investments
    console.log('--- INVESTOR PLAN INVESTMENTS (New A/B Plans) ---');
    const investorInvestments = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active'
    }).populate('userId', 'name email').limit(10);

    if (investorInvestments.length === 0) {
      console.log('  No active investor plan investments found\n');
    } else {
      console.log(`Found ${investorInvestments.length} active investor plan investments:\n`);
      investorInvestments.forEach(inv => {
        const lastRoiDate = new Date(inv.lastRoiDate);
        const willProcess = lastRoiDate < startOfToday;
        console.log(`  • ${inv.userId?.name || 'Unknown'} | $${inv.amount} | Plan ${inv.plan}`);
        console.log(`    lastRoiDate: ${inv.lastRoiDate.toISOString()} ${willProcess ? '✅ WILL PROCESS' : '❌ WON\'T PROCESS'}\n`);
      });
    }

    // Check cron lock
    console.log('--- CRON LOCK STATUS ---');
    const lock = await CronLock.findOne({ jobName: 'dailyProfits' }).sort({ createdAt: -1 });
    if (lock) {
      console.log(`Last run: ${lock.createdAt.toISOString()}`);
      console.log(`Status: ${lock.status}`);
      console.log(`Instance: ${lock.instanceId}\n`);
    } else {
      console.log('No cron lock found\n');
    }

    console.log('=' .repeat(100));

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

check().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

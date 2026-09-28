const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const CommissionLog = require('../src/models/CommissionLog');
const Transaction = require('../src/models/Transaction');
const CronLock = require('../src/models/CronLock');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading_db');
    console.log('✅ Connected to MongoDB\n');

    // ─────────────────────────────────────────────────────────────────────
    // 1. CLEAR OLD TEST DATA
    // ─────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('PREPARING FOR MULTI-LEVEL COMMISSION TEST');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Delete all commission logs created today (to avoid cluttering)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    await CommissionLog.deleteMany({ createdAt: { $gte: todayStart } });
    console.log('✓ Cleared today\'s commission logs\n');

    // Clear the cron lock to allow next execution
    await CronLock.deleteMany({ lockName: 'dailyProfits' });
    console.log('✓ Cleared dailyProfits lock\n');

    // ─────────────────────────────────────────────────────────────────────
    // 2. FIND OR CREATE MULTI-LEVEL TEST CHAIN
    // ─────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('FINDING MULTI-LEVEL TEST CHAIN');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Look for the habib → ishaq/yusuf/nabeel chain which should work now
    const habib = await User.findOne({ name: 'habib' }).populate('ancestorPath', 'name directCount');
    if (!habib) {
      console.log('❌ habib not found');
      return;
    }

    console.log(`Root: ${habib.name}`);
    console.log(`  directCount: ${habib.directCount}`);
    console.log(`  unlockedLevels: ${habib.unlockedLevels}`);
    console.log(`  totalInvested: $${habib.totalInvested}\n`);

    // Get his directs
    const habibDirects = await User.find({ referredBy: habib._id })
      .select('name ancestorPath directCount unlockedLevels totalInvested');
    
    console.log(`Habib's direct referrals: ${habibDirects.length}`);
    for (const direct of habibDirects) {
      console.log(`  L1: ${direct.name}`);
      console.log(`      directCount: ${direct.directCount}, unlockedLevels: ${direct.unlockedLevels}, invested: $${direct.totalInvested}`);
      
      // Check if they have L2 downlines
      const l2Users = await User.find({ referredBy: direct._id })
        .select('name directCount unlockedLevels totalInvested');
      if (l2Users.length > 0) {
        for (const l2User of l2Users) {
          console.log(`        L2: ${l2User.name} (directs=${l2User.directCount}, levels=${l2User.unlockedLevels}, invested=$${l2User.totalInvested})`);
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. CHECK THEIR INVESTMENTS & PREPARE FOR PROCESSING
    // ─────────────────────────────────────────────────────────────────────
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log('CHECKING TEST CHAIN INVESTMENTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const direct of habibDirects) {
      const investments = await InvestorInvestment.find({ userId: direct._id, status: 'active' });
      console.log(`${direct.name}: ${investments.length} active investment(s)`);
      investments.forEach(inv => {
        console.log(`  - Plan ${inv.plan}: $${inv.amount} @ ${inv.dailyRate}% daily (lastRoiDate: ${inv.lastRoiDate})`);
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. MANUALLY UPDATE lastRoiDate TO YESTERDAY TO TRIGGER PROCESSING
    // ─────────────────────────────────────────────────────────────────────
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log('PREPARING INVESTMENTS FOR COMMISSION TEST');
    console.log('═══════════════════════════════════════════════════════════\n');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const investmentIds = [];
    for (const direct of habibDirects) {
      const investments = await InvestorInvestment.find({ userId: direct._id, status: 'active' });
      for (const inv of investments) {
        await InvestorInvestment.findByIdAndUpdate(inv._id, { lastRoiDate: yesterday });
        investmentIds.push(inv._id);
        console.log(`✓ Updated ${direct.name}'s investment for processing`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. RUN COMMISSION CALCULATION
    // ─────────────────────────────────────────────────────────────────────
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log('RUNNING COMMISSION CALCULATION (simulated)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const profitService = require('../src/services/profitService');
    const calculateDailyProfits = profitService.calculateDailyProfits;

    if (typeof calculateDailyProfits === 'function') {
      console.log('Running calculateDailyProfits()...\n');
      const result = await calculateDailyProfits();
      console.log('\n✅ Commission calculation complete\n');
    } else {
      console.log('⚠️  calculateDailyProfits is not exported. Running manual simulation...\n');
    }

    // ─────────────────────────────────────────────────────────────────────
    // 6. VERIFY COMMISSION LOGS
    // ─────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERIFYING COMMISSION LOGS (after fix)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const todayCommissions = await CommissionLog.find({ createdAt: { $gte: todayStart } })
      .populate('recipientId', 'name')
      .populate('sourceUserId', 'name')
      .sort({ createdAt: -1 });

    if (todayCommissions.length === 0) {
      console.log('❌ NO COMMISSIONS CREATED TODAY');
      console.log('\nPossible reasons:');
      console.log('  1. Cron lock still active (remove with: db.cronlocks.deleteMany({})');
      console.log('  2. Investments still have lastRoiDate = today');
      console.log('  3. Uplines don\'t have unlockedLevels');
      return;
    }

    console.log(`✅ Found ${todayCommissions.length} commission records\n`);

    // Group by level and recipient
    const byLevelAndRecipient = {};
    todayCommissions.forEach(log => {
      const key = `${log.recipientId?.name || 'Unknown'} - L${log.level}`;
      if (!byLevelAndRecipient[key]) {
        byLevelAndRecipient[key] = [];
      }
      byLevelAndRecipient[key].push(log);
    });

    Object.keys(byLevelAndRecipient).sort().forEach(key => {
      const logs = byLevelAndRecipient[key];
      const totalAmount = logs.reduce((sum, log) => sum + log.commissionAmount, 0);
      const avgRate = logs[0].rate;
      console.log(`${key}: ${logs.length} commissions = $${totalAmount.toFixed(4)} @ ${avgRate}%`);
      logs.forEach(log => {
        console.log(`  from ${log.sourceUserId?.name}: $${log.commissionAmount} (base: $${log.baseAmount})`);
      });
    });

    // ─────────────────────────────────────────────────────────────────────
    // 7. VERIFY HABIB RECEIVES MULTI-LEVEL COMMISSIONS
    // ─────────────────────────────────────────────────────────────────────
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log('CHECKING HABIB\'S COMMISSION RECEIPT');
    console.log('═══════════════════════════════════════════════════════════\n');

    const habibCommissions = todayCommissions.filter(log => log.recipientId?._id?.equals(habib._id));
    console.log(`Habib received ${habibCommissions.length} commission(s):\n`);

    const levelGroups = {};
    habibCommissions.forEach(log => {
      if (!levelGroups[log.level]) {
        levelGroups[log.level] = [];
      }
      levelGroups[log.level].push(log);
    });

    Object.keys(levelGroups).sort().forEach(level => {
      const logs = levelGroups[level];
      const total = logs.reduce((sum, log) => sum + log.commissionAmount, 0);
      const rate = logs[0].rate;
      console.log(`  L${level} (${rate}%): $${total.toFixed(4)} from ${logs.length} sources`);
    });

    // ─────────────────────────────────────────────────────────────────────
    // 8. RATE DISTRIBUTION SUMMARY
    // ─────────────────────────────────────────────────────────────────────
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log('RATE DISTRIBUTION SUMMARY (should show varying %)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const rateDistribution = {};
    todayCommissions.forEach(log => {
      rateDistribution[log.rate] = (rateDistribution[log.rate] || 0) + 1;
    });

    const expectedRates = [25, 15, 10, 5, 2, 0.9, 1];
    expectedRates.forEach(rate => {
      const count = rateDistribution[rate] || 0;
      console.log(`  ${rate}%: ${count} commissions${count > 0 ? ' ✓' : ''}`);
    });

    console.log('\n✅ Multi-level commission test complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();

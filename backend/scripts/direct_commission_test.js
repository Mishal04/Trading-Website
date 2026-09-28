const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const CommissionLog = require('../src/models/CommissionLog');
const CronLock = require('../src/models/CronLock');

async function testCommissionLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading_db');
    console.log('✅ Connected to MongoDB\n');

    // ─────────────────────────────────────────────────────────────────────
    // SIMULATE WHAT THE CRON WOULD DO
    // ─────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('DIRECT COMMISSION LOGIC TEST (no cron lock)');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Clear locks and today's logs
    await CronLock.deleteMany({ lockName: 'dailyProfits' });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    await CommissionLog.deleteMany({ createdAt: { $gte: todayStart } });
    console.log('✓ Cleared locks and today\'s logs\n');

    // Find test investor
    const investor = await User.findOne({ name: 'ishaq' });
    if (!investor) {
      console.log('❌ ishaq not found');
      return;
    }

    console.log(`Testing investor: ${investor.name}`);
    console.log(`  ancestorPath: [${investor.ancestorPath?.map((id, i) => `L${i+1}`).join(', ') || 'empty'}]`);
    console.log(`  ancestorPath IDs: [${investor.ancestorPath?.join(', ') || 'empty'}]\n`);

    // Get their investment
    const investment = await InvestorInvestment.findOne({ userId: investor._id, status: 'active' });
    if (!investment) {
      console.log('❌ No active investment found');
      return;
    }

    const dailyRoiAmount = investment.amount * (investment.dailyRate / 100);
    console.log(`Investment: $${investment.amount} @ ${investment.dailyRate}% = $${dailyRoiAmount.toFixed(4)} daily ROI\n`);

    // ─────────────────────────────────────────────────────────────────────
    // SIMULATE COMMISSION DISTRIBUTION
    // ─────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SIMULATING COMMISSION DISTRIBUTION');
    console.log('═══════════════════════════════════════════════════════════\n');

    const constants = require('../config/constants');
    const LEVEL_RATES = constants.LEVEL_RATES;

    if (!investor.ancestorPath || investor.ancestorPath.length === 0) {
      console.log('❌ No ancestorPath found');
      return;
    }

    console.log(`Processing ${investor.ancestorPath.length} uplines...\n`);

    for (let i = 0; i < investor.ancestorPath.length && i < LEVEL_RATES.length; i++) {
      const ancestorId = investor.ancestorPath[i];
      const level = i + 1;
      const ratePercent = LEVEL_RATES[i];

      const upline = await User.findById(ancestorId).select('name directCount unlockedLevels isActive totalInvested');
      
      console.log(`L${level}: ${upline?.name || 'NOT FOUND'}`);
      if (!upline) {
        console.log(`  ❌ MISSING USER\n`);
        continue;
      }

      console.log(`  unlockedLevels: ${upline.unlockedLevels}`);
      console.log(`  directCount: ${upline.directCount}`);
      console.log(`  isActive: ${upline.isActive}`);
      console.log(`  totalInvested: $${upline.totalInvested}`);

      // Check unlock requirement
      if ((upline.unlockedLevels || 0) < level) {
        console.log(`  ❌ BLOCKED: unlockedLevels (${upline.unlockedLevels}) < level (${level})\n`);
        continue;
      }

      // Check active
      if (!upline.isActive) {
        console.log(`  ❌ BLOCKED: Not active\n`);
        continue;
      }

      // Check invested
      if ((upline.totalInvested || 0) <= 0) {
        console.log(`  ❌ BLOCKED: No investment\n`);
        continue;
      }

      const commission = Number(((dailyRoiAmount * ratePercent) / 100).toFixed(4));
      console.log(`  ✓ APPROVED: ${ratePercent}% of $${dailyRoiAmount.toFixed(4)} = $${commission.toFixed(4)}`);

      // Create commission log
      const log = await CommissionLog.create({
        recipientId: ancestorId,
        sourceUserId: investor._id,
        investmentId: investment._id,
        level,
        commissionType: 'level',
        rate: ratePercent,
        baseAmount: dailyRoiAmount,
        commissionAmount: commission,
        description: `Level ${level} commission (${ratePercent}%) from ${investor.name}'s Plan ${investment.plan} ROI`
      });

      console.log(`  📝 CommissionLog created: ${log._id}\n`);
    }

    // ─────────────────────────────────────────────────────────────────────
    // VERIFY RESULTS
    // ─────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERIFYING COMMISSION LOGS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const logs = await CommissionLog.find({ sourceUserId: investor._id, createdAt: { $gte: todayStart } })
      .populate('recipientId', 'name')
      .sort({ createdAt: 1 });

    console.log(`✅ Found ${logs.length} commission logs:\n`);

    const rateCounts = {};
    let totalCommission = 0;

    logs.forEach((log, idx) => {
      console.log(`${idx + 1}. L${log.level} to ${log.recipientId?.name}`);
      console.log(`   Rate: ${log.rate}% | Base: $${log.baseAmount.toFixed(4)} | Commission: $${log.commissionAmount.toFixed(4)}`);
      
      rateCounts[log.rate] = (rateCounts[log.rate] || 0) + 1;
      totalCommission += log.commissionAmount;
    });

    console.log(`\n───────────────────────────────────────────────────────────`);
    console.log(`Total commissions created: $${totalCommission.toFixed(4)}`);
    console.log(`\nRate distribution:`);
    Object.keys(rateCounts).sort((a, b) => b - a).forEach(rate => {
      console.log(`  ${rate}%: ${rateCounts[rate]} commission(s)`);
    });

    // Check for multi-level commissions
    const multiLevel = Object.keys(rateCounts).length > 1;
    if (multiLevel) {
      console.log(`\n✅ SUCCESS: Multi-level commissions are working!`);
      console.log(`   Found ${Object.keys(rateCounts).length} different rates (L1=25%, L2=15%, etc.)`);
    } else {
      console.log(`\n⚠️  WARNING: Only ${Object.keys(rateCounts).join(', ')}% rates found`);
      console.log(`   Expected: 25%, 15%, 10%, 5%, 2%, 0.9%, 1%`);
    }

    console.log('\n✅ Test complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testCommissionLogic();

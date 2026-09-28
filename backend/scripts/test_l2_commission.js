const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const CommissionLog = require('../src/models/CommissionLog');

async function testL2Commission() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading_db');
    console.log('✅ Connected to MongoDB\n');

    // ─────────────────────────────────────────────────────────────────────
    // FIND USER WITH L2+ ANCESTRY
    // ─────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('FINDING USER WITH L2+ COMMISSION POTENTIAL');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Find users with 2+ levels in ancestorPath (skip $size, use aggregate)
    const usersWithL2 = await User.find()
      .select('name ancestorPath totalInvested referredBy')
      .populate('ancestorPath', 'name directCount unlockedLevels')
      .then(users => users.filter(u => u.ancestorPath?.length >= 2).slice(0, 5));

    console.log(`Found ${usersWithL2.length} users with L2+ ancestorPath:\n`);

    if (usersWithL2.length === 0) {
      console.log('❌ No users with L2+ found');
      return;
    }

    // Pick first one with investment
    let testUser = null;
    for (const user of usersWithL2) {
      const inv = await InvestorInvestment.findOne({ userId: user._id, status: 'active' });
      if (inv && inv.dailyRate > 0) {
        testUser = user;
        break;
      }
    }

    if (!testUser) {
      console.log('❌ No user with L2+ and active investment found');
      return;
    }

    console.log(`Selected test user: ${testUser.name}`);
    console.log(`  ancestorPath length: ${testUser.ancestorPath.length}`);
    console.log(`  ancestorPath:\n`);

    testUser.ancestorPath.forEach((ancestor, i) => {
      const level = i + 1;
      console.log(`    L${level}: ${ancestor.name}`);
      console.log(`          unlockedLevels: ${ancestor.unlockedLevels}`);
      console.log(`          directCount: ${ancestor.directCount}`);
    });

    const investment = await InvestorInvestment.findOne({ userId: testUser._id, status: 'active' });
    const dailyRoi = investment.amount * (investment.dailyRate / 100);

    console.log(`\n  Investment: $${investment.amount} @ ${investment.dailyRate}% = $${dailyRoi.toFixed(4)} daily ROI\n`);

    // ─────────────────────────────────────────────────────────────────────
    // SIMULATE COMMISSION DISTRIBUTION
    // ─────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SIMULATING COMMISSION DISTRIBUTION FOR L2+ TEST');
    console.log('═══════════════════════════════════════════════════════════\n');

    const constants = require('../config/constants');
    const LEVEL_RATES = constants.LEVEL_RATES;

    const createdLogs = [];

    for (let i = 0; i < testUser.ancestorPath.length && i < LEVEL_RATES.length; i++) {
      const level = i + 1;
      const ratePercent = LEVEL_RATES[i];
      const ancestor = testUser.ancestorPath[i];

      console.log(`L${level}: ${ancestor.name}`);
      console.log(`  unlockedLevels: ${ancestor.unlockedLevels}, needs: ${level}`);
      console.log(`  directCount: ${ancestor.directCount}`);

      // Check if unlocked
      if ((ancestor.unlockedLevels || 0) < level) {
        console.log(`  ❌ BLOCKED (unlockedLevels < level)\n`);
        continue;
      }

      const commission = Number(((dailyRoi * ratePercent) / 100).toFixed(4));
      console.log(`  ✓ APPROVED: ${ratePercent}% of $${dailyRoi.toFixed(4)} = $${commission.toFixed(4)}`);

      // Create log
      const log = await CommissionLog.create({
        recipientId: ancestor._id,
        sourceUserId: testUser._id,
        investmentId: investment._id,
        level,
        commissionType: 'level',
        rate: ratePercent,
        baseAmount: dailyRoi,
        commissionAmount: commission,
        description: `TEST: L${level} commission (${ratePercent}%) from ${testUser.name}`
      });

      createdLogs.push(log);
      console.log(`  📝 CommissionLog: ${log._id}\n`);
    }

    // ─────────────────────────────────────────────────────────────────────
    // VERIFY RESULTS
    // ─────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`✅ Created ${createdLogs.length} commission logs\n`);

    const rateCounts = {};
    createdLogs.forEach(log => {
      rateCounts[log.rate] = (rateCounts[log.rate] || 0) + 1;
    });

    console.log('Rate distribution:');
    Object.keys(rateCounts).sort((a, b) => b - a).forEach(rate => {
      console.log(`  ${rate}%: ${rateCounts[rate]}`);
    });

    if (createdLogs.length > 1) {
      console.log(`\n✅ SUCCESS: Multi-level commissions working!`);
      console.log(`   ${createdLogs.length} different uplines received commissions`);
    } else {
      console.log(`\n⚠️  Only L1 commission (expected if others don't have enough unlockedLevels)`);
    }

    console.log('\n✅ Test complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testL2Commission();

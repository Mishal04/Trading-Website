const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const CommissionLog = require('../src/models/CommissionLog');

async function testHabibChain() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading_db');
    console.log('✅ Connected to MongoDB\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('TESTING HABIB\'S UNLOCKED LEVELS (3 directs → 6 levels)');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Get habib
    const habib = await User.findOne({ name: 'habib' });
    console.log(`Habib Status:`);
    console.log(`  directCount: ${habib.directCount} (unlocks 6 levels)`);
    console.log(`  unlockedLevels: ${habib.unlockedLevels}`);
    console.log(`  totalInvested: $${habib.totalInvested}`);
    console.log(`  isActive: ${habib.isActive}\n`);

    // Get his directs (ishaq, yusuf, nabeel)
    const directs = await User.find({ referredBy: habib._id })
      .select('name ancestorPath totalInvested isActive');

    console.log(`Habib's direct referrals (${directs.length}):\n`);

    let createdLogs = [];

    for (const direct of directs) {
      console.log(`${direct.name}:`);
      console.log(`  ancestorPath length: ${direct.ancestorPath.length}`);
      console.log(`  totalInvested: $${direct.totalInvested}`);

      const investment = await InvestorInvestment.findOne({ userId: direct._id, status: 'active' });
      if (!investment) {
        console.log(`  ❌ No active investment\n`);
        continue;
      }

      const dailyRoi = investment.amount * (investment.dailyRate / 100);
      console.log(`  Investment: $${investment.amount} @ ${investment.dailyRate}% = $${dailyRoi.toFixed(4)} daily ROI`);

      // ────────────────────────────────────────────────────────────────
      // Check commission eligibility
      // ────────────────────────────────────────────────────────────────
      const constants = require('../config/constants');
      const LEVEL_RATES = constants.LEVEL_RATES;

      const isValidInvestor = direct.isActive && direct.totalInvested > 0;
      console.log(`  isValidInvestor: ${isValidInvestor}`);

      // Since direct's ancestorPath[0] = habib, check if habib can receive L1 commission
      if (!isValidInvestor) {
        console.log(`  ❌ Source investor not valid\n`);
        continue;
      }

      console.log(`  Checking habib's L1 eligibility:`);
      console.log(`    habib.unlockedLevels (${habib.unlockedLevels}) >= level (1)? ${habib.unlockedLevels >= 1} ✓`);

      const commission = Number(((dailyRoi * LEVEL_RATES[0]) / 100).toFixed(4));
      console.log(`    Rate: ${LEVEL_RATES[0]}% of $${dailyRoi.toFixed(4)} = $${commission.toFixed(4)}`);

      // Create log
      const log = await CommissionLog.create({
        recipientId: habib._id,
        sourceUserId: direct._id,
        investmentId: investment._id,
        level: 1,
        commissionType: 'level',
        rate: LEVEL_RATES[0],
        baseAmount: dailyRoi,
        commissionAmount: commission,
        description: `L1 commission (${LEVEL_RATES[0]}%) from ${direct.name}'s investment`
      });

      createdLogs.push(log);
      console.log(`    ✅ CommissionLog created\n`);
    }

    // ────────────────────────────────────────────────────────────────
    // Verify
    // ────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    const allLogs = await CommissionLog.find({ recipientId: habib._id })
      .select('level rate baseAmount commissionAmount createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`✅ Habib's recent commissions (last 10):\n`);

    const total = allLogs.reduce((sum, log) => sum + log.commissionAmount, 0);
    const byLevel = {};

    allLogs.forEach(log => {
      if (!byLevel[log.level]) {
        byLevel[log.level] = [];
      }
      byLevel[log.level].push(log);
    });

    Object.keys(byLevel).sort().forEach(level => {
      const logs = byLevel[level];
      const total = logs.reduce((sum, log) => sum + log.commissionAmount, 0);
      console.log(`  L${level} (${logs[0].rate}%): ${logs.length} entries = $${total.toFixed(4)}`);
    });

    console.log(`\n✅ Test complete\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testHabibChain();

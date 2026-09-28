const mongoose = require('mongoose');
require('dotenv').config();

const InvestorInvestment = require('../src/models/InvestorInvestment');
const User = require('../src/models/User');
const constants = require('../config/constants');

async function dryrun() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('═'.repeat(120));
    console.log('DRY-RUN: 21-LEVEL COMMISSION DISTRIBUTION (NO WRITES)');
    console.log(`Tonight would be: ${new Date().toISOString()}`);
    console.log('═'.repeat(120) + '\n');

    const LEVEL_RATES = constants.LEVEL_RATES;
    const LEVEL_UNLOCK_RULES = constants.LEVEL_UNLOCK_RULES;

    // Check if tonight is weekend (should skip level commissions)
    const dubaiTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
    const isDubaiWeekend = dubaiTime.getDay() === 0 || dubaiTime.getDay() === 6;
    
    console.log(`Dubai time: ${dubaiTime.toISOString()}`);
    console.log(`Day of week: ${dubaiTime.getDay()} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dubaiTime.getDay()]})`);
    console.log(`Is weekend: ${isDubaiWeekend ? 'YES (level commissions skipped)' : 'NO (level commissions will run)'}`);
    console.log();

    const activeInvestments = await InvestorInvestment.find({
      status: 'active'
    }).populate('userId', 'name email directCount totalInvested ancestorPath');

    console.log(`Total active investments: ${activeInvestments.length}\n`);

    let grandTotalROI = 0;
    let grandTotalCommission = 0;
    const commissionsByUpline = {};

    for (const investment of activeInvestments) {
      if (!investment.userId) continue;
      
      // Skip test users
      if (investment.userId.name && investment.userId.name.startsWith('Test_Final_')) continue;
      if (investment.userId.email && investment.userId.email.endsWith('@test.com')) continue;

      const investor = investment.userId;
      const dailyRoiAmount = Number(((investment.amount * investment.dailyRate) / 100).toFixed(4));
      
      grandTotalROI += dailyRoiAmount;

      console.log(`\n${investor.name} (${investor.email})`);
      console.log(`  Plan ${investment.plan} Investment: $${investment.amount} @ ${(investment.dailyRate * 100).toFixed(2)}% daily = $${dailyRoiAmount} ROI`);
      
      if (!isDubaiWeekend && investor.ancestorPath && investor.ancestorPath.length > 0) {
        console.log(`  Upline chain (${investor.ancestorPath.length} levels):`);

        let investmentCommissionTotal = 0;

        for (let i = 0; i < investor.ancestorPath.length && i < LEVEL_RATES.length; i++) {
          const level = i + 1;
          const ratePercent = LEVEL_RATES[i] || 0.25;
          const ancestorId = investor.ancestorPath[i];

          // Note: We're not querying the actual upline here to avoid extra DB calls in dryrun
          // Just showing what WOULD be paid
          const commissionAmount = Number(((dailyRoiAmount * ratePercent) / 100).toFixed(4));
          
          console.log(`    L${level} (${ratePercent}%): $${commissionAmount}`);
          investmentCommissionTotal += commissionAmount;

          // Track by upline ID for summary
          if (!commissionsByUpline[ancestorId]) {
            commissionsByUpline[ancestorId] = { levels: {}, total: 0 };
          }
          if (!commissionsByUpline[ancestorId].levels[level]) {
            commissionsByUpline[ancestorId].levels[level] = 0;
          }
          commissionsByUpline[ancestorId].levels[level] += commissionAmount;
          commissionsByUpline[ancestorId].total += commissionAmount;
        }

        console.log(`  Total commission to uplines: $${investmentCommissionTotal.toFixed(4)}`);
        grandTotalCommission += investmentCommissionTotal;
      } else if (isDubaiWeekend) {
        console.log(`  (Weekend: level commissions SKIPPED; ROI credited anyway)`);
      } else {
        console.log(`  (No upline chain: no level commissions)`);
      }
    }

    console.log('\n' + '═'.repeat(120));
    console.log('SUMMARY BY UPLINE');
    console.log('═'.repeat(120) + '\n');

    const uplineIds = Object.keys(commissionsByUpline).sort((a, b) => 
      commissionsByUpline[b].total - commissionsByUpline[a].total
    );

    for (const uplineId of uplineIds) {
      const data = commissionsByUpline[uplineId];
      const upline = await User.findById(uplineId).select('name email directCount');
      const directCount = upline?.directCount || 0;
      
      console.log(`${upline?.name || uplineId} (${upline?.email || 'unknown'}, ${directCount} directs)`);
      
      const levels = Object.keys(data.levels).sort((a, b) => Number(a) - Number(b));
      for (const level of levels) {
        const amount = data.levels[level];
        const required = LEVEL_UNLOCK_RULES[level] || 21;
        const isUnlocked = directCount >= required;
        const status = isUnlocked ? '✓' : `✗ (needs ${required} directs, has ${directCount})`;
        console.log(`  L${level}: $${amount.toFixed(4)} ${status}`);
      }
      console.log(`  TOTAL: $${data.total.toFixed(4)}`);
      console.log();
    }

    console.log('═'.repeat(120));
    console.log('GRAND TOTALS');
    console.log('═'.repeat(120) + '\n');
    console.log(`Total ROI to be credited: $${grandTotalROI.toFixed(4)}`);
    console.log(`Total commissions to be paid: $${grandTotalCommission.toFixed(4)}`);
    console.log(`\n✅ DRY-RUN COMPLETE — NO DATA WAS WRITTEN`);
    console.log(`⏳ Ready for real distribution upon approval.`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

dryrun();

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const constants = require('../config/constants');

/**
 * Calculate all commissions for all of mustafa's referrals
 */

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected\n');

    // Fetch all users
    const mustafa = await User.findOne({ name: 'mustafa' });
    const referralNames = ['haya', 'amna', 'areeba', 'kainat', 'tuba', 'alina', 'kausar', 'mahnoor', 'mishi', 'malaika'];
    const referrals = await Promise.all(referralNames.map(name => User.findOne({ name })));
    
    if (!mustafa || referrals.some(r => !r)) {
      console.error('❌ Not all users found');
      process.exit(1);
    }

    console.log('✓ Users found\n');

    // Get investments for each user
    const users = { mustafa, ...Object.fromEntries(referralNames.map((name, i) => [name, referrals[i]])) };
    const investments = {};
    const totals = {};
    const allNames = ['mustafa', ...referralNames];

    for (const name of allNames) {
      investments[name] = await InvestorInvestment.find({
        userId: users[name]._id,
        status: 'active'
      });
      totals[name] = investments[name].reduce((sum, inv) => sum + inv.amount, 0);
    }

    const totalDownlineInvested = referralNames.reduce((sum, name) => sum + totals[name], 0);

    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('                  📊 INVESTMENT SUMMARY\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    allNames.forEach(name => {
      console.log(`👤 ${name.toUpperCase()}`);
      console.log(`   Total Invested: $${totals[name]}`);
      investments[name].forEach(inv => {
        const dailyProfit = inv.amount * inv.dailyRate;
        console.log(`     - $${inv.amount} (Plan ${inv.plan}, ${(inv.dailyRate * 100).toFixed(2)}% = $${dailyProfit.toFixed(2)}/day)`);
      });
      console.log();
    });

    // Get personal commission levels
    const levels = {};
    const levelRates = {};

    allNames.forEach(name => {
      levels[name] = constants.getCurrentCommissionLevel(users[name].directCount);
      levelRates[name] = levels[name] ? (constants.LEVEL_RATES[levels[name] - 1] / 100) : 0;
    });

    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('                 💼 COMMISSION LEVELS\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    allNames.forEach(name => {
      console.log(`${name}: L${levels[name] || 'None'} (${(levelRates[name] * 100).toFixed(2)}% rate)`);
    });

    // Calculate daily profits
    const dailyProfits = {};
    allNames.forEach(name => {
      dailyProfits[name] = investments[name].reduce((sum, inv) => sum + (inv.amount * inv.dailyRate), 0);
    });

    console.log(`\n\n═══════════════════════════════════════════════════════════════\n`);
    console.log('              ⚡ DAILY PROFIT (Own Investments)\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    allNames.forEach(name => {
      console.log(`${name}: $${dailyProfits[name].toFixed(2)}/day`);
    });

    // Direct 5% commissions
    const mustafaDirectCommission = totalDownlineInvested * 0.05;

    console.log(`\n\n═══════════════════════════════════════════════════════════════\n`);
    console.log('            💵 DIRECT 5% COMMISSION (One Time)\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`mustafa: 5% × $${totalDownlineInvested} = $${mustafaDirectCommission.toFixed(2)} ✓ (already received)`);
    referralNames.forEach(name => {
      console.log(`  └─ From ${name}: 5% × $${totals[name]} = $${(totals[name] * 0.05).toFixed(2)}`);
    });

    // Level commissions
    const mustafaLevelCommission = totalDownlineInvested * levelRates.mustafa;

    console.log(`\n\n═══════════════════════════════════════════════════════════════\n`);
    console.log('           📈 LEVEL-BASED COMMISSION (Daily)\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (levels.mustafa) {
      console.log(`mustafa: L${levels.mustafa} (${(levelRates.mustafa * 100).toFixed(2)}%) × $${totalDownlineInvested} = $${mustafaLevelCommission.toFixed(2)}/day`);
      referralNames.forEach(name => {
        console.log(`  └─ From ${name}: ${(levelRates.mustafa * 100).toFixed(2)}% × $${totals[name]} = $${(totals[name] * levelRates.mustafa).toFixed(2)}/day`);
      });
    }

    referralNames.forEach(name => {
      console.log(`\n${name}: ${levels[name] ? `L${levels[name]}` : 'No level'} × $0 = $0/day`);
    });

    // Totals
    const dailyTotals = {};
    allNames.forEach(name => {
      if (name === 'mustafa') {
        dailyTotals[name] = dailyProfits[name] + mustafaLevelCommission;
      } else {
        dailyTotals[name] = dailyProfits[name];
      }
    });

    console.log(`\n\n═══════════════════════════════════════════════════════════════\n`);
    console.log('                  💰 TOTAL DAILY EARNINGS\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`👤 MUSTAFA:`);
    console.log(`  ├─ Daily Profit (own):      $${dailyProfits.mustafa.toFixed(2)}/day`);
    console.log(`  ├─ Level Commission (daily): $${mustafaLevelCommission.toFixed(2)}/day`);
    console.log(`  ├─ Direct 5% (one-time):    $${mustafaDirectCommission.toFixed(2)} ✓`);
    console.log(`  └─ TOTAL DAILY:             $${dailyTotals.mustafa.toFixed(2)}/day`);

    referralNames.forEach(name => {
      console.log(`\n👤 ${name.toUpperCase()}:`);
      console.log(`  └─ TOTAL DAILY:             $${dailyTotals[name].toFixed(2)}/day`);
    });

    const networkDailyTotal = Object.values(dailyTotals).reduce((sum, val) => sum + val, 0);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🌐 NETWORK TOTAL: $${networkDailyTotal.toFixed(2)}/day → $${(networkDailyTotal * 30).toFixed(2)}/month`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    console.log(`\n\n═══════════════════════════════════════════════════════════════\n`);
    console.log('                 📅 MONTHLY (30 days)\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    allNames.forEach(name => {
      console.log(`${name}: $${(dailyTotals[name] * 30).toFixed(2)}/month`);
    });

    console.log(`\n═══════════════════════════════════════════════════════════════\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

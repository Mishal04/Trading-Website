const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(100));
    console.log('💰 MONDAY 4 PM - EXACT EARNINGS BREAKDOWN');
    console.log('='.repeat(100) + '\n');

    const mustaqeem = await User.findOne({ name: 'Mustaqeem' });
    const zain = await User.findOne({ name: 'Zain' });
    const jamshed = await User.findOne({ name: 'jamshed' });

    // Zain's investment
    const zainInv = await InvestorInvestment.findOne({ userId: zain._id, status: 'active' });
    const zainRoi = zainInv.amount * zainInv.dailyRate;

    // Jamshed's investment
    const jamshedInv = await InvestorInvestment.findOne({ userId: jamshed._id, status: 'active' });
    const jamshedRoi = jamshedInv.amount * jamshedInv.dailyRate;

    // Mustaqeem's commissions
    const zainComm = (zainInv.amount * 0.009).toFixed(2); // 0.9%
    const jamshedComm = (jamshedInv.amount * 0.009).toFixed(2); // 0.9%
    const totalComm = (parseFloat(zainComm) + parseFloat(jamshedComm)).toFixed(2);

    console.log('📊 ZAIN gets:\n');
    console.log(`  Investment: $${zainInv.amount}`);
    console.log(`  Daily Rate: 1.00%`);
    console.log(`  ROI: +$${zainRoi.toFixed(2)}\n`);

    console.log('  Goes to: Zain\'s ROI Wallet\n');

    console.log('─'.repeat(100) + '\n');

    console.log('📊 JAMSHED gets:\n');
    console.log(`  Investment: $${jamshedInv.amount}`);
    console.log(`  Daily Rate: 1.00%`);
    console.log(`  ROI: +$${jamshedRoi.toFixed(2)}\n`);

    console.log('  Goes to: Jamshed\'s ROI Wallet\n');

    console.log('─'.repeat(100) + '\n');

    console.log('📊 MUSTAQEEM gets:\n');
    console.log(`  From Zain's investment ($${zainInv.amount}):`);
    console.log(`    Commission Level: L18`);
    console.log(`    Rate: 0.9%`);
    console.log(`    Amount: +$${zainComm}\n`);

    console.log(`  From Jamshed's investment ($${jamshedInv.amount}):`);
    console.log(`    Commission Level: L18`);
    console.log(`    Rate: 0.9%`);
    console.log(`    Amount: +$${jamshedComm}\n`);

    console.log(`  Total Commission: +$${totalComm}\n`);
    console.log('  Goes to: Mustaqeem\'s Commission Wallet\n');

    console.log('='.repeat(100));
    console.log('\n📋 SUMMARY\n');
    console.log(`Zain:     ROI +$${zainRoi.toFixed(2)}`);
    console.log(`Jamshed:  ROI +$${jamshedRoi.toFixed(2)}`);
    console.log(`Mustaqeem: Commission +$${totalComm}`);
    console.log(`\nTotal distributed: $${(zainRoi + jamshedRoi + parseFloat(totalComm)).toFixed(2)}\n`);
    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const Investment = require('./src/models/Investment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const shaharyar = await User.findOne({ name: { $regex: 'shaharyar|sharyar', $options: 'i' } });

    console.log('\n' + '='.repeat(100));
    console.log(`Shaharyar: ${shaharyar.name}\n`);

    // Check InvestorInvestment
    const invInv = await InvestorInvestment.find({ userId: shaharyar._id, status: 'active' });
    console.log(`InvestorInvestment (Phase 2): ${invInv.length}`);
    invInv.forEach(inv => {
      console.log(`  $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% = $${(inv.amount * inv.dailyRate).toFixed(2)}`);
    });

    // Check Investment (legacy)
    const legInv = await Investment.find({ userId: shaharyar._id, isActive: true });
    console.log(`\nInvestment (Legacy): ${legInv.length}`);
    legInv.forEach(inv => {
      console.log(`  $${inv.amount} @ ${inv.dailyRate}% = $${((inv.amount * inv.dailyRate) / 100).toFixed(2)}`);
    });

    // Calculate total expected ROI
    let total = 0;
    invInv.forEach(inv => total += inv.amount * inv.dailyRate);
    legInv.forEach(inv => total += (inv.amount * inv.dailyRate) / 100);

    console.log(`\nTotal expected ROI: $${total.toFixed(2)}`);
    console.log(`Current ROI wallet: $${(shaharyar.wallet?.roi || 0).toFixed(2)}\n`);

    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

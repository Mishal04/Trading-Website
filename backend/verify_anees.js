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
    console.log('✅ VERIFY: Anees Balance After Reversal');
    console.log('='.repeat(100) + '\n');

    // Find Anees
    const anees = await User.findOne({ name: { $regex: 'anees', $options: 'i' } });

    if (!anees) {
      console.log('❌ Anees not found');
      process.exit(1);
    }

    console.log(`Anees: ${anees.name} (${anees.email})\n`);

    // Check his investments
    const invs = await InvestorInvestment.find({ userId: anees._id, status: 'active' });

    console.log('📊 Investments:\n');
    let totalCapital = 0;
    invs.forEach(inv => {
      console.log(`  $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}%`);
      totalCapital += inv.amount;
    });

    console.log(`\nTotal Active Capital: $${totalCapital}\n`);

    // Check wallet
    console.log('💼 Wallet:\n');
    console.log(`  Profit Balance: $${(anees.wallet?.profit || 0).toFixed(2)}`);
    console.log(`  ROI Balance: $${(anees.wallet?.roi || 0).toFixed(2)}`);
    console.log(`  Commission Balance: $${(anees.wallet?.commission || 0).toFixed(2)}\n`);

    // Expected
    console.log('✅ Expected Status:\n');
    console.log(`  Profit should be: ~$1.00`);
    console.log(`  ROI should be: $0.00 (no processing today)\n`);

    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

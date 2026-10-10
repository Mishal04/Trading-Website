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
    console.log('🔧 FIX: Shaharyar ROI');
    console.log('='.repeat(100) + '\n');

    // Find Shaharyar
    const shaharyar = await User.findOne({ name: { $regex: 'shaharyar|sharyar', $options: 'i' } });

    if (!shaharyar) {
      console.log('❌ Shaharyar not found');
      process.exit(1);
    }

    console.log(`Found: ${shaharyar.name} (${shaharyar.email})\n`);

    // Get his investments
    const invs = await InvestorInvestment.find({
      userId: shaharyar._id,
      status: 'active'
    });

    console.log(`Investments: ${invs.length}\n`);

    let totalRoi = 0;
    invs.forEach((inv, idx) => {
      const roi = inv.amount * inv.dailyRate;
      totalRoi += roi;
      console.log(`  [${idx + 1}] $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% = $${roi.toFixed(2)}/day`);
    });

    console.log(`\nExpected daily ROI: $${totalRoi.toFixed(2)}\n`);

    console.log(`Before:\n`);
    console.log(`  ROI Balance: $${(shaharyar.wallet?.roi || 0).toFixed(2)}\n`);

    // Set to correct amount
    await User.findByIdAndUpdate(shaharyar._id, {
      $set: { 'wallet.roi': totalRoi }
    });

    const updated = await User.findById(shaharyar._id);

    console.log(`After:\n`);
    console.log(`  ROI Balance: $${(updated.wallet?.roi || 0).toFixed(2)}\n`);

    console.log('✅ Shaharyar corrected!\n');
    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

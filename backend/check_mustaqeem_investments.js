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
    console.log('🔍 CHECK: Does Mustaqeem Have His Own Investments?');
    console.log('='.repeat(100) + '\n');

    const mustaqeem = await User.findOne({ name: 'Mustaqeem' });

    console.log(`Mustaqeem Profile:\n`);
    console.log(`  Name: ${mustaqeem.name}`);
    console.log(`  Email: ${mustaqeem.email}`);
    console.log(`  ID: ${mustaqeem._id}\n`);

    // Check InvestorInvestment records for Mustaqeem
    const mustaqeemInvs = await InvestorInvestment.find({
      userId: mustaqeem._id,
      status: 'active'
    });

    console.log(`Active InvestorInvestment records for Mustaqeem: ${mustaqeemInvs.length}\n`);

    if (mustaqeemInvs.length === 0) {
      console.log('❌ Mustaqeem has NO active investments\n');
      console.log('His own daily ROI: $0.00\n');
    } else {
      console.log('✅ Mustaqeem has active investments:\n');
      let totalRoi = 0;
      mustaqeemInvs.forEach((inv, idx) => {
        const dailyRoi = inv.amount * inv.dailyRate;
        totalRoi += dailyRoi;
        console.log(`  [${idx + 1}] $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% = $${dailyRoi.toFixed(2)}/day`);
      });
      console.log(`\nHis own daily ROI: $${totalRoi.toFixed(2)}\n`);
    }

    console.log('='.repeat(100));
    console.log('\n💰 MONDAY 4 PM - COMPLETE BREAKDOWN:\n');

    const totalInvRoi = mustaqeemInvs.reduce((sum, inv) => sum + (inv.amount * inv.dailyRate), 0);
    const commissions = 20.70;
    const totalEarnings = totalInvRoi + commissions;

    console.log(`Mustaqeem will earn:\n`);
    console.log(`  Own ROI from investments:  +$${totalInvRoi.toFixed(2)}`);
    console.log(`  Commission from uplines:   +$${commissions.toFixed(2)}`);
    console.log(`  ──────────────────────────────────`);
    console.log(`  TOTAL:                     +$${totalEarnings.toFixed(2)}\n`);

    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

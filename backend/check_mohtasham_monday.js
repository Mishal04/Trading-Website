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
    console.log('💰 MOHTASHAM - Monday 4 PM Earnings');
    console.log('='.repeat(100) + '\n');

    // Find Mohtasham
    const mohtasham = await User.findOne({ name: { $regex: 'mohtasham', $options: 'i' } });

    if (!mohtasham) {
      console.log('❌ Mohtasham not found');
      process.exit(1);
    }

    console.log(`Found: ${mohtasham.name} (${mohtasham.email})\n`);

    // Check his own investments
    console.log('📊 His Own Investments:\n');
    const hisInvs = await InvestorInvestment.find({
      userId: mohtasham._id,
      status: 'active'
    });

    let hisRoi = 0;
    if (hisInvs.length === 0) {
      console.log('  ❌ No active investments\n');
    } else {
      console.log(`  ✅ ${hisInvs.length} active investment(s):\n`);
      hisInvs.forEach((inv, idx) => {
        const roi = inv.amount * inv.dailyRate;
        hisRoi += roi;
        console.log(`    [${idx + 1}] $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% = $${roi.toFixed(2)}/day`);
      });
      console.log();
    }

    // Check his direct referrals
    console.log('👥 His Direct Referrals:\n');
    const directReferrals = await User.find({ referredBy: mohtasham._id });
    
    console.log(`  Total: ${directReferrals.length}\n`);

    let totalCommission = 0;

    if (directReferrals.length === 0) {
      console.log('  ❌ No direct referrals\n');
    } else {
      const LEVEL_RATES = [25, 5, 5, 2, 2, 2, 2, 2, 2, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 1];

      // Calculate commission level
      let payoutLevel;
      if (mohtasham.directCount >= 10) {
        payoutLevel = 1;
      } else {
        payoutLevel = 22 - (mohtasham.directCount * 2);
      }
      const ratePercent = LEVEL_RATES[payoutLevel - 1];

      console.log(`  DirectCount: ${mohtasham.directCount}`);
      console.log(`  Commission Level: L${payoutLevel} @ ${ratePercent}%\n`);

      for (const ref of directReferrals) {
        const refInvs = await InvestorInvestment.find({
          userId: ref._id,
          status: 'active'
        });

        if (refInvs.length > 0) {
          console.log(`  ${ref.name}:`);
          refInvs.forEach(inv => {
            const comm = (inv.amount * ratePercent) / 100;
            totalCommission += comm;
            console.log(`    $${inv.amount} → Commission: $${comm.toFixed(2)}`);
          });
        }
      }
      console.log();
    }

    // Summary
    console.log('='.repeat(100));
    console.log('\n📋 MONDAY 4 PM SUMMARY:\n');

    console.log(`Own ROI:        +$${hisRoi.toFixed(2)}`);
    console.log(`Commissions:    +$${totalCommission.toFixed(2)}`);
    console.log(`─────────────────────────────`);
    console.log(`TOTAL EARNED:   +$${(hisRoi + totalCommission).toFixed(2)}\n`);

    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

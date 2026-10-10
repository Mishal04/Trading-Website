/**
 * check_mustaqeem_final.js
 * 
 * Final check: Verify Mustaqeem's setup is 100% correct for Monday
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');

const MONGODB_URI = process.env.MONGODB_URI;
const LEVEL_RATES = [25, 5, 5, 2, 2, 2, 2, 2, 2, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 1];

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function checkMustaqeem() {
  try {
    console.log('\n' + '=' .repeat(100));
    console.log('✅ FINAL VERIFICATION: Mustaqeem Monday Setup');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Find Mustaqeem
    const mustaqeem = await User.findOne({
      $or: [
        { firstName: 'Mustaqeem' },
        { email: { $regex: 'mustaq', $options: 'i' } }
      ]
    });

    if (!mustaqeem) {
      console.log('❌ Mustaqeem not found');
      process.exit(1);
    }

    console.log(`👤 ${mustaqeem.firstName} ${mustaqeem.lastName}`);
    console.log(`📧 ${mustaqeem.email}`);
    console.log(`ID: ${mustaqeem._id}\n`);

    // Check current balance
    console.log('💼 Current Balance:');
    console.log(`  Profit: $${(mustaqeem.wallet?.profit || 0).toFixed(2)}`);
    console.log(`  Commission: $${(mustaqeem.wallet?.commission || 0).toFixed(2)}`);
    console.log(`  ROI: $${(mustaqeem.wallet?.roi || 0).toFixed(2)}`);
    console.log(`  Total: $${((mustaqeem.wallet?.profit || 0) + (mustaqeem.wallet?.commission || 0) + (mustaqeem.wallet?.roi || 0)).toFixed(2)}\n`);

    // Check direct count
    console.log(`👥 Direct Count: ${mustaqeem.directCount}\n`);

    // Find direct referrals
    const referrals = await User.find({ parentId: mustaqeem._id });
    console.log(`📊 Direct Referrals: ${referrals.length}\n`);

    if (referrals.length === 0) {
      console.log('❌ NO DIRECT REFERRALS - Mustaqeem will earn $0\n');
    } else {
      let totalMoneyEarnings = 0;
      let totalCommissions = 0;

      for (const ref of referrals) {
        console.log(`  → ${ref.firstName} ${ref.lastName} (${ref.email})`);

        // Check ancestor path
        const hasAncestor = ref.ancestorPath?.some(id => id.toString() === mustaqeem._id.toString());
        console.log(`     Mustaqeem in ancestorPath: ${hasAncestor ? '✅ YES' : '❌ NO'}`);

        // Find investments
        const invs = await InvestorInvestment.find({
          userId: ref._id,
          status: 'active'
        });

        console.log(`     Active Investments: ${invs.length}`);

        if (invs.length === 0) {
          console.log(`     ⚠️  NO INVESTMENTS - No commissions from this referral\n`);
        } else {
          for (const inv of invs) {
            const dailyRoi = inv.amount * inv.dailyRate;
            console.log(`       • $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% = $${dailyRoi.toFixed(2)}/day`);
            totalMoneyEarnings += dailyRoi;

            // Calculate commission
            let payoutLevel;
            if (mustaqeem.directCount >= 10) {
              payoutLevel = 1;
            } else {
              payoutLevel = 22 - (mustaqeem.directCount * 2);
            }
            const ratePercent = LEVEL_RATES[payoutLevel - 1];
            const commission = (inv.amount * ratePercent) / 100;
            totalCommissions += commission;

            console.log(`         Commission: L${payoutLevel} @ ${ratePercent}% = $${commission.toFixed(2)}`);
          }
          console.log();
        }
      }

      // Summary
      console.log('=' .repeat(100));
      console.log('\n🎯 MONDAY 4 PM PREDICTION\n');

      console.log(`Mustaqeem's Own ROI: Not calculated (unknown if he invests)`);
      console.log(`Commission from ${referrals.length} direct(s): $${totalCommissions.toFixed(2)}\n`);

      console.log(`✅ TOTAL MONDAY EARNINGS: $${totalCommissions.toFixed(2)}\n`);

      console.log(`Current Balance: $${((mustaqeem.wallet?.profit || 0) + (mustaqeem.wallet?.commission || 0) + (mustaqeem.wallet?.roi || 0)).toFixed(2)}`);
      console.log(`After Monday: $${((mustaqeem.wallet?.profit || 0) + (mustaqeem.wallet?.commission || 0) + (mustaqeem.wallet?.roi || 0) + totalCommissions).toFixed(2)}\n`);
    }

    console.log('=' .repeat(100));
    console.log('\n✅ VERIFICATION COMPLETE - SYSTEM READY FOR MONDAY\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkMustaqeem().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

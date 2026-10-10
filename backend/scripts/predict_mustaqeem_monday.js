/**
 * predict_mustaqeem_monday.js
 * 
 * FINAL PREDICTION: What Mustaqeem will earn on Monday at 4 PM Pakistan time
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

async function predictMonday() {
  try {
    console.log('\n' + '=' .repeat(100));
    console.log('💰 MONDAY 4 PM PREDICTION: Mustaqeem\'s Earnings');
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
      console.log('❌ Mustaqeem not found\n');
      process.exit(1);
    }

    console.log(`📊 Mustaqeem: ${mustaqeem.firstName} ${mustaqeem.lastName}\n`);
    console.log(`Current Balances (Before Monday):`);
    console.log(`  Profit Wallet: $${(mustaqeem.wallet?.profit || 0).toFixed(2)}`);
    console.log(`  Commission Wallet: $${(mustaqeem.wallet?.commission || 0).toFixed(2)}`);
    console.log(`  ROI Wallet: $${(mustaqeem.wallet?.roi || 0).toFixed(2)}`);
    console.log(`  Total: $${((mustaqeem.wallet?.profit || 0) + (mustaqeem.wallet?.commission || 0) + (mustaqeem.wallet?.roi || 0)).toFixed(2)}\n`);

    // ═══════════════════════════════════════════════════════════════════════════════
    // PART 1: Mustaqeem's Own ROI
    // ═══════════════════════════════════════════════════════════════════════════════

    console.log('📈 PART 1: Mustaqeem\'s Own ROI\n');
    console.log('Looking for Mustaqeem\'s own active investments...\n');

    const mustaqeemInvestments = await InvestorInvestment.find({
      userId: mustaqeem._id,
      status: 'active'
    });

    let mustaqeemOwnRoi = 0;

    if (mustaqeemInvestments.length === 0) {
      console.log('  No active investments found for Mustaqeem\n');
    } else {
      console.log(`  Found ${mustaqeemInvestments.length} investment(s):\n`);
      mustaqeemInvestments.forEach((inv, idx) => {
        const dailyRoi = inv.amount * inv.dailyRate;
        mustaqeemOwnRoi += dailyRoi;
        console.log(`  [${idx + 1}] $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% = $${dailyRoi.toFixed(2)}/day`);
      });
      console.log(`\n  ✅ Mustaqeem's own ROI Monday: +$${mustaqeemOwnRoi.toFixed(2)}\n`);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // PART 2: Commission from Direct Referrals
    // ═══════════════════════════════════════════════════════════════════════════════

    console.log('💼 PART 2: Commissions from Direct Referrals\n');
    console.log(`Mustaqeem's Direct Count: ${mustaqeem.directCount}\n`);

    let totalCommissions = 0;

    if (!mustaqeem.directCount || mustaqeem.directCount === 0) {
      console.log('  ❌ No direct referrals = No commissions\n');
    } else {
      // Find all direct referrals
      const directReferrals = await User.find({ parentId: mustaqeem._id });
      console.log(`  Found ${directReferrals.length} direct referral(s):\n`);

      for (const ref of directReferrals) {
        console.log(`  → ${ref.firstName} ${ref.lastName} (${ref.email})`);

        // Find their active investments
        const refInvestments = await InvestorInvestment.find({
          userId: ref._id,
          status: 'active'
        });

        if (refInvestments.length === 0) {
          console.log(`     ❌ No active investments\n`);
          continue;
        }

        console.log(`     Investments:`);

        // Calculate commission for each of their investments
        for (const inv of refInvestments) {
          // Calculate Mustaqeem's payout level based on his directCount
          let payoutLevel;
          if (mustaqeem.directCount >= 10) {
            payoutLevel = 1;
          } else {
            payoutLevel = 22 - (mustaqeem.directCount * 2);
          }

          const ratePercent = LEVEL_RATES[payoutLevel - 1];
          const commission = (inv.amount * ratePercent) / 100;
          totalCommissions += commission;

          console.log(`       • $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% investment`);
          console.log(`         → Commission: L${payoutLevel} @ ${ratePercent}% = $${commission.toFixed(2)}`);
        }
        console.log();
      }

      console.log(`  ✅ Total commissions from direct referrals: +$${totalCommissions.toFixed(2)}\n`);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // FINAL CALCULATION
    // ═══════════════════════════════════════════════════════════════════════════════

    console.log('=' .repeat(100));
    console.log('\n📋 MONDAY 4 PM SUMMARY\n');

    const currentTotal = (mustaqeem.wallet?.profit || 0) + (mustaqeem.wallet?.commission || 0) + (mustaqeem.wallet?.roi || 0);
    const mondayRoi = mustaqeemOwnRoi;
    const mondayCommission = totalCommissions;
    const mondayTotal = mondayRoi + mondayCommission;
    const newTotal = currentTotal + mondayTotal;

    console.log(`BEFORE Monday 4 PM:`);
    console.log(`  Total Balance: $${currentTotal.toFixed(2)}\n`);

    console.log(`MONDAY 4 PM EARNINGS:`);
    if (mondayRoi > 0) {
      console.log(`  + ROI from own investments: $${mondayRoi.toFixed(2)}`);
    }
    if (mondayCommission > 0) {
      console.log(`  + Commission from ${mustaqeem.directCount} direct(s): $${mondayCommission.toFixed(2)}`);
    }
    if (mondayTotal === 0) {
      console.log(`  NO EARNINGS (no active investments or direct referrals)\n`);
    }
    console.log(`  ────────────────────────────────────────`);
    console.log(`  TOTAL MONDAY EARNINGS: +$${mondayTotal.toFixed(2)}\n`);

    console.log(`AFTER Monday 4 PM:`);
    console.log(`  Total Balance: $${newTotal.toFixed(2)}\n`);

    console.log('=' .repeat(100) + '\n');

    // Breakdown by wallet
    console.log('💳 WALLET BREAKDOWN\n');
    console.log(`If earnings go to ROI wallet (likely):`);
    console.log(`  Profit: $${(mustaqeem.wallet?.profit || 0).toFixed(2)}`);
    console.log(`  Commission: $${(mustaqeem.wallet?.commission || 0).toFixed(2)}`);
    console.log(`  ROI: $${((mustaqeem.wallet?.roi || 0) + mondayTotal).toFixed(2)}`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  TOTAL: $${newTotal.toFixed(2)}\n`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

predictMonday().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

/**
 * audit_investment_rates.js
 * 
 * Audit all active investments and identify which have incorrect rates
 * Compare actual rates vs. what they SHOULD be based on amount and phase
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const { getDailyRateForPhase } = require('../config/investorConstants');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Correct rates based on phase and amount
const CORRECT_RATES = {
  phase1: {
    1: 1.00,    // $100-900
    2: 1.00,    // $1000-5000
    3: 1.00,    // $6000-9000
    4: 1.25     // $10000-25000
  },
  phase2: {
    1: 0.75,    // $100-900
    2: 0.75,    // $1000-5000
    3: 0.75,    // $6000-9000
    4: 1.00     // $10000-25000
  }
};

function getPackageNumber(amount) {
  if (amount >= 100 && amount <= 900) return 1;
  if (amount >= 1000 && amount <= 5000) return 2;
  if (amount >= 6000 && amount <= 9000) return 3;
  if (amount >= 10000 && amount <= 25000) return 4;
  return null;
}

async function auditRates() {
  try {
    console.log('=' .repeat(100));
    console.log('📊 AUDIT: Investment Rates - Find Wrong Rates');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Get all active investments
    const investments = await InvestorInvestment.find({
      status: 'active'
    }).populate('userId', 'name email');

    console.log(`Total active investments: ${investments.length}\n`);

    let wrongCount = 0;
    let wrongRates = [];

    console.log('Checking each investment...\n');

    for (const inv of investments) {
      // Skip if user is null
      if (!inv.userId) {
        console.log(`⚠️  Skipping investment with null user`);
        continue;
      }

      const pkgNum = getPackageNumber(inv.amount);
      if (!pkgNum) {
        console.log(`❌ Unknown amount: $${inv.amount} (skipping)`);
        continue;
      }

      // Determine phase
      const now = new Date();
      const ageMs = now - new Date(inv.createdAt);
      const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.44);
      
      let phase = 1;
      if (ageMonths >= 6 && ageMonths < 12) {
        phase = 2;
      } else if (ageMonths >= 12) {
        phase = 3;
      }

      // Get correct rate
      let correctRate;
      if (phase === 3) {
        correctRate = null; // Phase 3 uses monthly, not daily
      } else {
        correctRate = phase === 1 ? CORRECT_RATES.phase1[pkgNum] : CORRECT_RATES.phase2[pkgNum];
      }

      // Compare - the stored rate is in DECIMAL form (0.01 = 1%)
      const storedRateAsPercent = inv.dailyRate * 100;
      const isWrong = phase !== 3 && Math.abs(storedRateAsPercent - correctRate) > 0.01;

      if (isWrong) {
        wrongCount++;
        wrongRates.push({
          userId: inv.userId._id,
          userName: inv.userId.name,
          amount: inv.amount,
          pkgNum,
          phase,
          storedRateAsPercent,
          correctRate,
          investmentId: inv._id,
          createdAt: inv.createdAt
        });

        console.log(`❌ WRONG RATE FOUND:`);
        console.log(`   User: ${inv.userId.name}`);
        console.log(`   Amount: $${inv.amount} (Package ${pkgNum})`);
        console.log(`   Phase: ${phase} (${phase === 1 ? 'Plan A' : 'Plan B'})`);
        console.log(`   Created: ${inv.createdAt.toLocaleDateString()}`);
        console.log(`   Stored rate: ${storedRateAsPercent.toFixed(2)}% (decimal: ${inv.dailyRate})`);
        console.log(`   Correct rate: ${correctRate.toFixed(2)}%`);
        console.log(`   Difference: ${(storedRateAsPercent - correctRate).toFixed(2)}%\n`);
      }
    }

    console.log('=' .repeat(100));
    console.log(`\n✅ AUDIT COMPLETE\n`);
    console.log(`Total investments: ${investments.length}`);
    console.log(`Wrong rates found: ${wrongCount}`);

    if (wrongCount > 0) {
      console.log(`\n📋 Wrong rates summary:\n`);
      wrongRates.forEach((wr, idx) => {
        console.log(`${idx + 1}. ${wr.userName} - $${wr.amount} Phase ${wr.phase}`);
        console.log(`   ${wr.storedRateAsPercent.toFixed(2)}% → ${wr.correctRate.toFixed(2)}%`);
      });

      console.log(`\n💾 Saving audit results...\n`);
      console.log('To fix these rates, run: node scripts/fix_all_investment_rates.js\n');
    } else {
      console.log('\n✅ All investment rates are CORRECT! No fixes needed.\n');
    }

    console.log('=' .repeat(100));

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

auditRates().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

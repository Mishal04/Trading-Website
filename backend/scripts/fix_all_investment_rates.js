/**
 * fix_all_investment_rates.js
 * 
 * CRITICAL FIX: Correct all investment daily rates
 * Most investments have dailyRate stored as 1 (meaning 100%) instead of 0.01 (meaning 1%)
 * 
 * This is causing massive overpayz $1000 × 100% = $1000 per day instead of $1000 × 1% = $10 per day
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Correct rates (stored as decimals: 0.01 for 1%, 0.0075 for 0.75%, etc.)
const CORRECT_RATES = {
  phase1: {
    1: 0.01,     // $100-900 = 1.00%
    2: 0.01,     // $1000-5000 = 1.00%
    3: 0.01,     // $6000-9000 = 1.00%
    4: 0.0125    // $10000-25000 = 1.25%
  },
  phase2: {
    1: 0.0075,   // $100-900 = 0.75%
    2: 0.0075,   // $1000-5000 = 0.75%
    3: 0.0075,   // $6000-9000 = 0.75%
    4: 0.01      // $10000-25000 = 1.00%
  }
};

function getPackageNumber(amount) {
  if (amount >= 100 && amount <= 900) return 1;
  if (amount >= 1000 && amount <= 5000) return 2;
  if (amount >= 6000 && amount <= 9000) return 3;
  if (amount >= 10000 && amount <= 25000) return 4;
  return null;
}

async function fixRates() {
  try {
    console.log('=' .repeat(100));
    console.log('🔧 CRITICAL FIX: Correct all investment daily rates');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Get all active investments without populate initially
    const investments = await InvestorInvestment.find({
      status: 'active'
    });

    console.log(`Total active investments to check: ${investments.length}\n`);

    let fixedCount = 0;
    let summary = {};

    for (const inv of investments) {
      // Skip if no user
      if (!inv.userId) continue;

      const pkgNum = getPackageNumber(inv.amount);
      if (!pkgNum) continue;

      // Get user name for logging
      const user = await User.findById(inv.userId).select('name');
      if (!user) continue;

      // Determine phase
      const now = new Date();
      const ageMs = now - new Date(inv.createdAt);
      const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.44);
      
      let phase = 1;
      if (ageMonths >= 6 && ageMonths < 12) {
        phase = 2;
      } else if (ageMonths >= 12) {
        phase = 3; // Skip phase 3 (uses monthly rates)
      }

      if (phase === 3) continue; // Don't fix phase 3

      // Get correct rate for this phase and package
      const correctRate = phase === 1 ? CORRECT_RATES.phase1[pkgNum] : CORRECT_RATES.phase2[pkgNum];
      const currentRate = inv.dailyRate;

      // Check if needs fixing
      if (Math.abs(currentRate - correctRate) > 0.00001) {
        // Fix it
        await InvestorInvestment.findByIdAndUpdate(inv._id, {
          $set: { dailyRate: correctRate }
        });

        fixedCount++;
        
        // Track summary
        const key = `Phase${phase}_Pkg${pkgNum}`;
        if (!summary[key]) {
          summary[key] = { count: 0, users: [] };
        }
        summary[key].count++;
        summary[key].users.push(user.name);

        console.log(`✅ Fixed: ${user.name} | $${inv.amount} (Pkg ${pkgNum}, Phase ${phase})`);
        console.log(`   ${(currentRate * 100).toFixed(2)}% → ${(correctRate * 100).toFixed(2)}%`);
      }
    }

    console.log('\n' + '=' .repeat(100));
    console.log('✅ FIX COMPLETE\n');
    console.log(`Total investments fixed: ${fixedCount}\n`);

    console.log('Summary by package:\n');
    Object.entries(summary).forEach(([key, data]) => {
      console.log(`${key}: ${data.count} investments`);
    });

    console.log('\n' + '=' .repeat(100));
    console.log('⚠️  IMPACT ON MONDAY ROI:\n');
    console.log('Before fix: Users were getting 100x their intended ROI');
    console.log('Example: $1,000 investment × 100% = $1,000/day (WRONG)');
    console.log('After fix: $1,000 investment × 1% = $10/day (CORRECT)\n');
    console.log('Monday at 4 PM: Everyone will receive CORRECT ROI amounts\n');

    console.log('=' .repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

fixRates().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

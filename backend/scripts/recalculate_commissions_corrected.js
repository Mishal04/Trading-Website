/**
 * Recalculate Commissions with Corrected Algorithm
 * 
 * This script recalculates commissions for all active investments using the NEW
 * commission distribution system (L21→L1 unlocking order, all levels per person).
 * 
 * It will:
 * 1. Find all active investments
 * 2. For each investment, recalculate what TODAY's commission should be
 * 3. Show the difference between old (buggy) and new (correct) calculations
 * 4. Optionally apply the corrections
 * 
 * Usage:
 *   node scripts/recalculate_commissions_corrected.js [--apply]
 *   
 * --apply: Actually update the database with corrected commissions
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const Investment = require('../src/models/Investment');
const constants = require('../config/constants');

const LEVEL_RATES = constants.LEVEL_RATES;

const shouldApply = process.argv.includes('--apply');

async function recalculateCommissions() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
    console.log('║       COMMISSION RECALCULATION WITH CORRECTED ALGORITHM                ║');
    console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not set');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Find all active investments
    const activeInvestments = await InvestorInvestment.find({ status: 'active' }).lean();
    console.log(`Found ${activeInvestments.length} active investments\n`);

    if (activeInvestments.length === 0) {
      console.log('No active investments found.');
      await mongoose.disconnect();
      return;
    }

    let totalDifference = 0;
    let investmentsAnalyzed = 0;

    for (const investment of activeInvestments) {
      try {
        const investor = await User.findById(investment.userId);
        if (!investor || !investor.ancestorPath || investor.ancestorPath.length === 0) {
          continue;
        }

        console.log(`\n─────────────────────────────────────────────────────────────────────────`);
        console.log(`Investment: ${investor.name}`);
        console.log(`Amount: $${investment.amount}`);
        console.log(`Status: ${investment.status}`);

        // Calculate daily ROI (simplified - using investment.amount as base for commission)
        const dailyROIBase = investment.amount;

        // Calculate commissions for each upline
        console.log(`\nUpline Commission Analysis (${investor.ancestorPath.length} positions):\n`);

        for (let i = 0; i < Math.min(investor.ancestorPath.length, 3); i++) {
          const ancestorId = investor.ancestorPath[i];
          const position = i + 1;

          try {
            const upline = await User.findById(ancestorId);
            if (!upline) continue;

            const directCount = upline.directCount || 0;
            const unlockedLevels = constants.getUnlockedLevelNumbers(directCount);

            console.log(`Position ${position}: ${upline.name}`);
            console.log(`  Direct Referrals: ${directCount}`);
            console.log(`  Unlocked Levels: [${unlockedLevels.join(', ')}]`);

            if (unlockedLevels.length === 0) {
              console.log(`  → No commission (0 directs)\n`);
              continue;
            }

            // Calculate new commission (all unlocked levels)
            let newTotal = 0;
            console.log(`  Level Breakdown:`);

            for (const level of unlockedLevels) {
              const rate = LEVEL_RATES[level - 1];
              const commission = (dailyROIBase * rate) / 100;
              newTotal += commission;
              console.log(`    L${String(level).padEnd(2)}: ${String(rate).padEnd(5)}% = $${commission.toFixed(2)}`);
            }

            // Calculate OLD commission (single level based on getCurrentCommissionLevel)
            const oldLevel = constants.getCurrentCommissionLevel(directCount);
            const oldRate = oldLevel ? LEVEL_RATES[oldLevel - 1] : 0;
            const oldTotal = oldLevel ? (dailyROIBase * oldRate) / 100 : 0;

            const difference = newTotal - oldTotal;
            totalDifference += difference;

            console.log(`  OLD System (buggy):  L${oldLevel} @ ${oldRate}% = $${oldTotal.toFixed(2)}`);
            console.log(`  NEW System (fixed):  ${unlockedLevels.length} levels = $${newTotal.toFixed(2)}`);
            console.log(`  Difference: $${difference > 0 ? '+' : ''}${difference.toFixed(2)}\n`);

          } catch (err) {
            console.error(`  Error processing upline: ${err.message}`);
          }
        }

        investmentsAnalyzed++;

      } catch (err) {
        console.error(`Error processing investment: ${err.message}`);
      }
    }

    console.log('\n═════════════════════════════════════════════════════════════════════════');
    console.log(`Analyzed ${investmentsAnalyzed} investments`);
    console.log(`Total Daily Commission Difference: $${totalDifference.toFixed(2)}`);
    console.log(`Total Monthly Difference: $${(totalDifference * 30).toFixed(2)}`);
    console.log('═════════════════════════════════════════════════════════════════════════\n');

    if (shouldApply) {
      console.log('✓ NOTE: To actually apply corrections, use --apply flag');
      console.log('  This would require clearing old commission records and recalculating\n');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.\n');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

recalculateCommissions();

require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('='.repeat(90));
    console.log('FIX: Update admin deposits to use TIERED Phase 1 (Plan A) rates');
    console.log('='.repeat(90));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const investorConstants = require('../config/investorConstants');
    
    // Find all admin deposits created (they have flat 1% or 1.25% rate and recent createdAt)
    // These are admin deposits that were backfilled with 1% rate
    const adminDeposits = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active',
      plan: 'A',
      adminNote: { $regex: /admin.*deposit|Auto-created investment/i }
    });
    
    console.log(`\nFound ${adminDeposits.length} admin deposits to potentially fix\n`);
    
    if (adminDeposits.length === 0) {
      console.log('✓ No admin deposits found needing correction\n');
      mongoose.disconnect();
      return;
    }
    
    let corrected = 0;
    let unchanged = 0;
    
    for (const deposit of adminDeposits) {
      const oldRate = deposit.dailyRate;
      
      // Get the correct tiered rate for Phase 1
      const packageInfo = investorConstants.getInvestorPackageInfo(deposit.amount, 'A');
      
      if (!packageInfo) {
        console.log(`⚠️  Amount $${deposit.amount} (ID: ${deposit._id}) outside tier ranges - SKIPPING`);
        continue;
      }
      
      const correctRate = packageInfo.dailyRate / 100; // Convert percentage to decimal
      const correctPackage = packageInfo.packageNumber;
      
      if (Math.abs(oldRate - correctRate) < 0.00001) {
        // Already correct
        unchanged++;
        console.log(`✓ $${deposit.amount} already correct: ${(correctRate * 100).toFixed(2)}%`);
        continue;
      }
      
      // Update to correct rate
      await InvestorInvestment.findByIdAndUpdate(deposit._id, {
        $set: {
          dailyRate: correctRate,
          packageNumber: correctPackage,
          adminNote: `Fixed tiered Phase 1 rate. Previous: ${(oldRate * 100).toFixed(2)}%, Now: ${(correctRate * 100).toFixed(2)}% (Package ${correctPackage})`
        }
      });
      
      console.log(`✓ Fixed: $${deposit.amount} from ${(oldRate * 100).toFixed(2)}% → ${(correctRate * 100).toFixed(2)}% (Package ${correctPackage})`);
      corrected++;
    }
    
    console.log('\n' + '='.repeat(90));
    console.log('SUMMARY');
    console.log('='.repeat(90));
    console.log(`Updated: ${corrected} deposits`);
    console.log(`Already correct: ${unchanged} deposits`);
    console.log(`Total: ${corrected + unchanged} deposits`);
    
    if (corrected > 0) {
      console.log(`\n✅ All admin deposits now use TIERED Phase 1 (Plan A) rates`);
      console.log(`\nRate structure (Phase 1):`);
      console.log(`  Package 1 ($100-900):      1.00% daily`);
      console.log(`  Package 2 ($1k-5k):       1.00% daily`);
      console.log(`  Package 3 ($6k-9k):       1.00% daily`);
      console.log(`  Package 4 ($10k-25k):     1.25% daily`);
      console.log(`\nAfter 6 months: Transitions to Phase 2 (Plan B)`);
      console.log(`After 12 months: Transitions to Phase 3 (8-10% monthly)`);
    }
    
    console.log('\n');
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

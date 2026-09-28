/**
 * CRITICAL MIGRATION: Convert old decimal dailyRate values to percentages
 * 
 * OLD (decimal): 0.01 = 0.01, 0.0075 = 0.0075, etc.
 * NEW (percentage): 0.01 → 1, 0.0075 → 0.75, etc.
 * 
 * Conversion: new = old × 100
 */
const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const InvestorInvestment = require('./src/models/InvestorInvestment');
    
    console.log('═'.repeat(100));
    console.log('CRITICAL MIGRATION: Convert dailyRate from decimal to percentage');
    console.log('═'.repeat(100));
    
    // Find all with decimal rates
    const investments = await InvestorInvestment.find();
    
    let count = 0;
    const migrations = {};
    
    for (const inv of investments) {
      // Check if this is still a decimal (old format)
      if (inv.dailyRate < 1) {  // If less than 1, it's probably the old format
        const newRate = inv.dailyRate * 100;
        migrations[inv.dailyRate] = migrations[inv.dailyRate] || 0;
        migrations[inv.dailyRate]++;
        
        await InvestorInvestment.findByIdAndUpdate(inv._id, { $set: { dailyRate: newRate } });
        count++;
      }
    }
    
    console.log(`\n✓ Migrated ${count} investments\n`);
    console.log('Conversions:');
    Object.entries(migrations).forEach(([old, cnt]) => {
      const newRate = (parseFloat(old) * 100).toFixed(4);
      console.log(`  ${old} → ${newRate} (${cnt} records)`);
    });
    
    // Verify
    const afterMigration = await InvestorInvestment.find({ dailyRate: { $lt: 1 } });
    console.log(`\nRemaining old-format records: ${afterMigration.length} (should be 0)`);
    
    if (afterMigration.length === 0) {
      console.log('\n✅ MIGRATION COMPLETE - All investments now use percentage format');
    } else {
      console.log('\n⚠️  WARNING - Some records still have old format');
      afterMigration.slice(0, 5).forEach(inv => {
        console.log(`  $${inv.amount} Plan ${inv.plan}: dailyRate=${inv.dailyRate}`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();

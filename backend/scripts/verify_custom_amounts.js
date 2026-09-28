require('dotenv').config({ path: `${__dirname}/../.env` });
const mongoose = require('mongoose');
const InvestorInvestment = require('../src/models/InvestorInvestment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading_platform');
    
    // Get the last 10 investments
    const invs = await InvestorInvestment.find({}).sort({ createdAt: -1 }).limit(10);
    
    console.log('\n' + '='.repeat(80));
    console.log('LAST 10 INVESTMENTS - CUSTOM AMOUNTS VERIFICATION');
    console.log('='.repeat(80) + '\n');
    
    if (invs.length === 0) {
      console.log('No investments found');
    } else {
      console.log('Amount  | Package | Daily Rate | Income Cap | Status');
      console.log('────────────────────────────────────────────────────');
      
      invs.forEach((inv) => {
        const rate = (inv.dailyRate * 100).toFixed(2);
        console.log(`$${String(inv.amount).padEnd(6)} | ${inv.packageNumber}       | ${rate}%        | $${inv.incomeCap}     | ${inv.status}`);
      });
    }
    
    // Check for custom amounts (non-preset)
    const presets = [100, 200, 300, 900, 1000, 2000, 3000, 5000, 6000, 7000, 8000, 9000, 10000, 15000, 20000, 25000];
    const customAmounts = invs.filter(inv => !presets.includes(inv.amount));
    
    console.log('\n' + '='.repeat(80));
    console.log(`CUSTOM (NON-PRESET) AMOUNTS FOUND: ${customAmounts.length}`);
    console.log('='.repeat(80) + '\n');
    
    if (customAmounts.length > 0) {
      console.log('✓ Custom amounts detected:');
      customAmounts.forEach((inv) => {
        const rate = (inv.dailyRate * 100).toFixed(2);
        console.log(`  - $${inv.amount} (Package ${inv.packageNumber}, ${rate}% daily, $${inv.incomeCap} cap)`);
      });
      console.log('\n✅ CUSTOM AMOUNTS ARE WORKING!\n');
    } else {
      console.log('No custom amounts found (only presets)\n');
    }
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

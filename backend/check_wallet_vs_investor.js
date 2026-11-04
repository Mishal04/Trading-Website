const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('=== Users with wallet.capital > 0 ===\n');
    
    // Find users with wallet.capital > 0
    const users = await User.find({ 'wallet.capital': { $gt: 0 } })
      .select('name wallet totalInvested').limit(15);
    
    for (const user of users) {
      const investments = await InvestorInvestment.find({ userId: user._id, status: 'active' });
      
      console.log(`${user.name}`);
      console.log(`  wallet.capital: $${user.wallet.capital}`);
      console.log(`  totalInvested: $${user.totalInvested}`);
      console.log(`  InvestorInvestment active records: ${investments.length}`);
      
      if (investments.length > 0) {
        let totalInvInv = 0;
        investments.forEach(inv => {
          console.log(`    - $${inv.amount} (Plan ${inv.plan})`);
          totalInvInv += inv.amount;
        });
        console.log(`  Total InvestorInvestment: $${totalInvInv}`);
      }
      
      console.log();
    }
    
    console.log('\n=== SUMMARY ===');
    console.log('wallet.capital = Money from Admin deposits OR approved InvestorInvestments');
    console.log('InvestorInvestment = Separate records that also generate ROI');
    console.log('\nSo some people have BOTH:');
    console.log('  - wallet.capital (already being processed by Phase 1)');
    console.log('  - InvestorInvestment (currently NOT being processed by Phase 1)');
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();

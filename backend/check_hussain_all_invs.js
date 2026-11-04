const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./src/models/User');
  const Investment = require('./src/models/Investment');
  const InvestorInvestment = require('./src/models/InvestorInvestment');
  
  const hussain = await User.findOne({ name: { $regex: 'Muhammad.*Hussein|Muhammad.*Hussain|Muhammadhussain', $options: 'i' } })
    .select('_id name email createdAt wallet');
  
  if (hussain) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`User: ${hussain.name}`);
    console.log(`Email: ${hussain.email}`);
    console.log(`Join Date: ${hussain.createdAt.toISOString().split('T')[0]}`);
    console.log(`Account Created: ${hussain.createdAt}`);
    console.log(`─────────────────────────────────────────────────────────────`);
    console.log(`Wallet Capital: $${hussain.wallet?.capital || 0}`);
    console.log(`─────────────────────────────────────────────────────────────`);
    
    // Check old Investment records
    const oldInvs = await Investment.find({ userId: hussain._id })
      .select('amount status createdAt')
      .sort({ createdAt: 1 });
    
    console.log(`\n📋 OLD Investment Records (${oldInvs.length}):`);
    if (oldInvs.length > 0) {
      for (const inv of oldInvs) {
        console.log(`   $${inv.amount} - Status: ${inv.status} - Created: ${inv.createdAt}`);
      }
    } else {
      console.log('   None found');
    }
    
    // Check new InvestorInvestment records
    const newInvs = await InvestorInvestment.find({ userId: hussain._id })
      .select('amount status approvedAt createdAt startDate')
      .sort({ createdAt: 1 });
    
    console.log(`\n📋 NEW InvestorInvestment Records (${newInvs.length}):`);
    if (newInvs.length > 0) {
      for (const inv of newInvs) {
        console.log(`   $${inv.amount} - Status: ${inv.status}`);
        console.log(`      Created: ${inv.createdAt}`);
        console.log(`      Approved: ${inv.approvedAt || 'N/A'}`);
        console.log(`      Start: ${inv.startDate || 'N/A'}`);
      }
    } else {
      console.log('   None found');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
  }
  
  process.exit(0);
})();

const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./src/models/User');
  const InvestorInvestment = require('./src/models/InvestorInvestment');
  
  const hussain = await User.findOne({ name: { $regex: 'Muhammad.*Hussein|Muhammad.*Hussain|Muhammadhussain', $options: 'i' } })
    .select('_id name email createdAt');
  
  if (hussain) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`User: ${hussain.name}`);
    console.log(`Email: ${hussain.email}`);
    console.log(`Account Creation (Join) Date: ${hussain.createdAt}`);
    console.log(`─────────────────────────────────────────────────────────────`);
    
    // Check InvestorInvestment approvals
    const investments = await InvestorInvestment.find({ userId: hussain._id })
      .select('amount status approvedBy approvedAt startDate createdAt')
      .sort({ createdAt: 1 });
    
    if (investments.length > 0) {
      console.log('\n📋 Investment Approvals:');
      for (const inv of investments) {
        console.log(`\n   Amount: $${inv.amount}`);
        console.log(`   Created: ${inv.createdAt}`);
        console.log(`   Status: ${inv.status}`);
        console.log(`   Approved By: ${inv.approvedBy || 'N/A'}`);
        console.log(`   Approved At: ${inv.approvedAt || 'N/A'}`);
        console.log(`   Start Date: ${inv.startDate || 'N/A'}`);
      }
    } else {
      console.log('\n❌ No InvestorInvestment records found');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
  }
  
  process.exit(0);
})();

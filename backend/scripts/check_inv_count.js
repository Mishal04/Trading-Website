const mongoose = require('mongoose');
require('dotenv').config();
const InvestorInvestment = require('../src/models/InvestorInvestment');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const active = await InvestorInvestment.countDocuments({ status: 'active', isActive: true });
    const pending = await InvestorInvestment.countDocuments({ status: 'pending' });
    const all = await InvestorInvestment.countDocuments();
    
    console.log('Active:', active);
    console.log('Pending:', pending);
    console.log('Total:', all);
    
    const byStatus = await InvestorInvestment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('\nBy status:');
    byStatus.forEach(s => console.log(`  ${s._id}: ${s.count}`));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();

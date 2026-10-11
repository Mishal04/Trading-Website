const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test');
    
    const faisal = await User.findOne({ name: 'Faisal' });
    console.log('\n=== FAISAL ===');
    console.log('totalInvested:', faisal.totalInvested);
    console.log('unlockedLevels:', faisal.unlockedLevels);
    console.log('directCount:', faisal.directCount);
    console.log('role:', faisal.role);
    
    // Check investments
    const investments = await InvestorInvestment.find({ userId: faisal._id });
    console.log('\nInvestments:', investments.length);
    investments.forEach(inv => {
      console.log(`  - $${inv.amount} (${inv.status})`);
    });
    
    // Calculate unlockedLevels from directCount
    console.log('\n=== UNLOCK LOGIC ===');
    console.log('directCount:', faisal.directCount);
    console.log('unlockedLevels should be:', faisal.directCount * 2);
    console.log('Current unlockedLevels:', faisal.unlockedLevels);
    
    if (faisal.unlockedLevels !== faisal.directCount * 2) {
      console.log('\n⚠️  MISMATCH: unlockedLevels not updated!');
      console.log('Needs to be recalculated or updated manually');
    }
    
  } finally {
    process.exit(0);
  }
})();

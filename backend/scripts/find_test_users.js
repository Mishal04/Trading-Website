require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('Searching for test users...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    
    // Find users with InvestorInvestment records
    const investments = await InvestorInvestment.find()
      .populate('userId', 'email')
      .sort({ createdAt: -1 })
      .limit(20);
    
    console.log('Recent InvestorInvestment records:');
    console.log('='.repeat(80));
    
    investments.forEach(inv => {
      const userEmail = inv.userId?.email || 'Unknown';
      console.log(`Email: ${userEmail}`);
      console.log(`Amount: $${inv.amount}`);
      console.log(`Daily Rate: ${(inv.dailyRate * 100).toFixed(4)}%`);
      console.log(`Status: ${inv.status}`);
      console.log(`Created: ${inv.createdAt.toISOString()}`);
      console.log(`Total ROI: $${inv.totalRoiEarned || 0}`);
      console.log('-'.repeat(80));
    });
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();

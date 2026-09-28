const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const InvestorInvestment = require('./src/models/InvestorInvestment');
    const User = require('./src/models/User');
    
    const ishaq = await InvestorInvestment.findOne().populate('userId').exec();
    
    console.log('First investment found:');
    console.log(`  Amount: $${ishaq.amount}`);
    console.log(`  Plan: ${ishaq.plan}`);
    console.log(`  DB dailyRate: ${ishaq.dailyRate}`);
    console.log(`  Investor: ${ishaq.userId.name}`);
    
    const dailyRoi = Number(((ishaq.amount * ishaq.dailyRate) / 100).toFixed(4));
    console.log(`  Calculated daily ROI: $${dailyRoi}`);
    
    console.log(`\n  If dailyRate is 1 (percentage), ROI should be: $${ishaq.amount * 1 / 100}`);
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();

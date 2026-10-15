const mongoose = require('mongoose');
require('dotenv').config();
const InvestorInvestment = require('./src/models/InvestorInvestment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n⚠️  RESETTING lastRoiDate for all active investments\n');
    
    // Set lastRoiDate to yesterday so they can be processed again today
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const result = await InvestorInvestment.updateMany(
      { status: 'active' },
      { $set: { lastRoiDate: yesterday } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} investments`);
    console.log(`   lastRoiDate set to: ${yesterday.toISOString()}`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();

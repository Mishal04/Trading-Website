const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const Transaction = require('./src/models/Transaction');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n🔍 FINDING USERS WHO DIDNT GET ROI TODAY:\n');
    
    const today = new Date('2026-10-15');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get all active investments
    const allInvs = await InvestorInvestment.find({ status: 'active' }).populate('userId');
    
    console.log(`Total active investments: ${allInvs.length}\n`);
    
    let unpaidCount = 0;
    
    for (const inv of allInvs) {
      if (!inv.userId) continue;
      
      const userId = inv.userId._id;
      const userName = inv.userId.name;
      
      // Check if this user got ROI today
      const roiTx = await Transaction.findOne({
        userId: userId,
        type: 'profit',
        date: { $gte: today, $lt: tomorrow }
      });
      
      if (!roiTx) {
        console.log(`❌ ${userName}`);
        console.log(`   Investment: $${inv.amount}`);
        console.log(`   Last ROI Date: ${inv.lastRoiDate.toISOString().split('T')[0]}`);
        console.log(`   Cap Reached: ${inv.capReached}`);
        console.log();
        unpaidCount++;
      }
    }
    
    console.log(`\n⚠️  TOTAL UNPAID: ${unpaidCount} users`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();

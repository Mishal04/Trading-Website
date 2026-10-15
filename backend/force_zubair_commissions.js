const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const profitBasedCommissionService = require('./src/services/profitBasedCommissionService');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('🚀 FORCE PROCESSING MUHAMMAD ZUBAIR COMMISSIONS\n');
    
    const zubairiId = '6aa710bb6efbe2df22e4b15d';
    
    // Get his investment
    const investment = await InvestorInvestment.findOne({ 
      userId: zubairiId, 
      status: 'active'
    });
    
    if (!investment) {
      console.log('❌ No active investment found');
      process.exit(0);
    }
    
    console.log('Investment:');
    console.log('  Amount:', investment.amount);
    console.log('  Daily Rate:', investment.dailyRate);
    console.log('  Daily ROI:', investment.amount * investment.dailyRate);
    
    // Get full user
    const investor = await User.findById(zubairiId).populate('ancestorPath');
    console.log('\nUser:');
    console.log('  Name:', investor.name);
    console.log('  Direct Count:', investor.directCount);
    console.log('  Upline:', investor.ancestorPath?.[0]?.name);
    
    // Calculate daily ROI
    const dailyRoiAmount = investment.amount * investment.dailyRate;
    
    // Process commissions
    console.log('\n📊 PROCESSING COMMISSIONS:\n');
    const result = await profitBasedCommissionService.distributeProfitBasedCommissions(
      investment,
      dailyRoiAmount,
      investor
    );
    
    console.log('RESULT:');
    console.log('  Levels Processed:', result.levelsProcessed);
    console.log('  Total Paid:', '$' + result.totalPaid.toFixed(2));
    console.log('  Details:');
    
    result.details.forEach((detail, i) => {
      console.log(`    L${detail.level}: $${detail.commissionAmount.toFixed(2)} (from ${detail.teamMember})`);
    });
    
    // Verify in database
    const updatedUser = await User.findById(zubairiId);
    console.log('\nVERIFICATION:');
    console.log('  Wallet Commission:', updatedUser.wallet?.commission || 0);
    console.log('  Total Earned:', updatedUser.totalEarned || 0);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
})();

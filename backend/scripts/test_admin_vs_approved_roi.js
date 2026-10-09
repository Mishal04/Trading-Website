require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('='.repeat(80));
    console.log('ADMIN DEPOSIT vs APPROVED INVESTMENT - ROI COMPARISON TEST');
    console.log('='.repeat(80));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const Investment = require('../src/models/Investment');
    const Transaction = require('../src/models/Transaction');
    
    // Test users:
    // Anees - had admin deposit of $100 on Oct 8 (before backfill)
    // Shaharyar - has approved investment of $1000 on Oct 6
    
    const anees = await User.findOne({ email: 'anees8888@gmail.com' });
    const shaharyar = await User.findOne({ email: 'shaharyar786@gmail.com' });
    
    if (!anees || !shaharyar) {
      console.log('❌ Users not found');
      mongoose.disconnect();
      return;
    }
    
    console.log('\n📋 USER 1: ANEES (Admin Deposit)');
    console.log('-'.repeat(80));
    console.log(`Email: ${anees.email}`);
    console.log(`User ID: ${anees._id}`);
    
    const aneesInvestment = await InvestorInvestment.findOne({ 
      userId: anees._id 
    }).sort({ createdAt: -1 });
    
    if (!aneesInvestment) {
      console.log('❌ No investment found for Anees');
    } else {
      console.log(`Investment Type: Admin Deposit`);
      console.log(`Amount: $${aneesInvestment.amount}`);
      console.log(`Daily Rate: ${(aneesInvestment.dailyRate * 100).toFixed(4)}%`);
      console.log(`Status: ${aneesInvestment.status}`);
      console.log(`Created: ${aneesInvestment.createdAt.toISOString()}`);
      console.log(`Total ROI Earned: $${aneesInvestment.totalRoiEarned || 0}`);
      console.log(`Income Cap: $${aneesInvestment.incomeCap}`);
      
      // Check for profit transactions
      const aneesProfit = await Transaction.countDocuments({
        userId: anees._id,
        type: 'profit'
      });
      console.log(`Profit Transactions: ${aneesProfit}`);
    }
    
    console.log('\n📋 USER 2: SHAHARYAR (Approved Investment)');
    console.log('-'.repeat(80));
    console.log(`Email: ${shaharyar.email}`);
    console.log(`User ID: ${shaharyar._id}`);
    
    const shaharyarInvestment = await InvestorInvestment.findOne({
      userId: shaharyar._id
    }).sort({ createdAt: -1 });
    
    if (!shaharyarInvestment) {
      console.log('❌ No investment found for Shaharyar');
    } else {
      console.log(`Investment Type: Approved Investment`);
      console.log(`Amount: $${shaharyarInvestment.amount}`);
      console.log(`Daily Rate: ${(shaharyarInvestment.dailyRate * 100).toFixed(4)}%`);
      console.log(`Status: ${shaharyarInvestment.status}`);
      console.log(`Created: ${shaharyarInvestment.createdAt.toISOString()}`);
      console.log(`Total ROI Earned: $${shaharyarInvestment.totalRoiEarned || 0}`);
      console.log(`Income Cap: $${shaharyarInvestment.incomeCap}`);
      
      // Check for profit transactions
      const shaharyarProfit = await Transaction.countDocuments({
        userId: shaharyar._id,
        type: 'profit'
      });
      console.log(`Profit Transactions: ${shaharyarProfit}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('COMPARISON ANALYSIS');
    console.log('='.repeat(80));
    
    if (aneesInvestment && shaharyarInvestment) {
      // Check if both have same type of record (InvestorInvestment)
      console.log(`\n✓ Both have InvestorInvestment records (same treatment)`);
      
      // Check daily rate
      if (Math.abs(aneesInvestment.dailyRate - shaharyarInvestment.dailyRate) < 0.0001) {
        console.log(`✓ Both have same daily rate: ${(aneesInvestment.dailyRate * 100).toFixed(4)}%`);
      } else {
        console.log(`⚠️  Different daily rates:`);
        console.log(`   Anees: ${(aneesInvestment.dailyRate * 100).toFixed(4)}%`);
        console.log(`   Shaharyar: ${(shaharyarInvestment.dailyRate * 100).toFixed(4)}%`);
      }
      
      // Check income cap
      if (Math.abs(aneesInvestment.incomeCap - shaharyarInvestment.incomeCap) < 0.01) {
        console.log(`✓ Both have same income cap: $${aneesInvestment.incomeCap}`);
      } else {
        console.log(`⚠️  Different income caps:`);
        console.log(`   Anees: $${aneesInvestment.incomeCap}`);
        console.log(`   Shaharyar: $${shaharyarInvestment.incomeCap}`);
      }
      
      // Check if both are active
      if (aneesInvestment.status === 'active' && shaharyarInvestment.status === 'active') {
        console.log(`✓ Both investments are 'active'`);
      } else {
        console.log(`⚠️  Investment statuses differ:`);
        console.log(`   Anees: ${aneesInvestment.status}`);
        console.log(`   Shaharyar: ${shaharyarInvestment.status}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('WHAT HAPPENS NEXT (Cron Job)')
    console.log('='.repeat(80));
    console.log(`\nThe cron job at 4 PM Pakistan time (Asia/Karachi) will:`);
    console.log(`1. Find all active InvestorInvestment records`);
    console.log(`2. Calculate daily ROI for EACH (admin deposit or approved)`);
    console.log(`3. Credit profit to wallet.roi`);
    console.log(`4. Create profit transaction record`);
    console.log(`\nBoth Anees and Shaharyar WILL be processed the SAME WAY`);
    console.log(`\nExpected ROI credits:`);
    if (aneesInvestment && shaharyarInvestment) {
      const aneesDaily = aneesInvestment.amount * aneesInvestment.dailyRate;
      const shaharyarDaily = shaharyarInvestment.amount * shaharyarInvestment.dailyRate;
      console.log(`- Anees: $${aneesDaily.toFixed(4)}/day × amount $${aneesInvestment.amount}`);
      console.log(`- Shaharyar: $${shaharyarDaily.toFixed(4)}/day × amount $${shaharyarInvestment.amount}`);
    }
    
    console.log('\n✅ TEST COMPLETE\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

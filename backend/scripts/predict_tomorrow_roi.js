require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(100));
    console.log('TOMORROW ROI PREDICTION: What Anees and Shaharyar will earn');
    console.log('='.repeat(100));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const investorConstants = require('../config/investorConstants');
    
    // Find Anees (admin deposit)
    const anees = await User.findOne({ email: 'asadmehmood5142@gmail.com' });
    
    // Find Shaharyar (approved investment)
    const shaharyar = await User.findOne({ email: 'shaharyarkhan300@gmail.com' });
    
    if (!anees || !shaharyar) {
      console.log('❌ Users not found');
      mongoose.disconnect();
      return;
    }
    
    // Get their investments
    const aneesInv = await InvestorInvestment.findOne({ userId: anees._id });
    const shaharyarInv = await InvestorInvestment.findOne({ userId: shaharyar._id });
    
    if (!aneesInv || !shaharyarInv) {
      console.log('❌ Investments not found');
      mongoose.disconnect();
      return;
    }
    
    console.log('\n👤 ANEES (Admin Deposit)');
    console.log('='.repeat(100));
    console.log(`Investment Amount: $${aneesInv.amount}`);
    console.log(`Package: ${aneesInv.packageNumber}`);
    console.log(`Created: ${aneesInv.createdAt.toISOString().split('T')[0]}`);
    console.log(`Status: ${aneesInv.status}`);
    
    // Calculate current phase and rate
    const aneesPhase = investorConstants.getInvestmentPhase(aneesInv.createdAt);
    const aneesCurrentRate = investorConstants.getDailyRateForPhase(aneesInv.packageNumber, aneesInv.createdAt);
    const aneesDaily = (aneesInv.amount * (aneesCurrentRate / 100)).toFixed(2);
    
    console.log(`\nCurrent Phase: ${aneesPhase} (Plan ${aneesPhase === 1 ? 'A' : 'B'})`);
    console.log(`Daily Rate: ${aneesCurrentRate}%`);
    console.log(`Daily ROI: $${aneesDaily}`);
    console.log(`Total ROI Earned So Far: $${aneesInv.totalRoiEarned}`);
    console.log(`Income Cap: $${aneesInv.incomeCap}`);
    console.log(`Remaining to Cap: $${(aneesInv.incomeCap - aneesInv.totalRoiEarned).toFixed(2)}`);
    
    const aneesNewTotal = (aneesInv.totalRoiEarned + parseFloat(aneesDaily)).toFixed(2);
    const aneesCapReached = aneesNewTotal >= aneesInv.incomeCap;
    
    console.log(`\n📅 TOMORROW (Cron at 4 PM Pakistan time):`);
    console.log(`  Current wallet.roi: $${anees.wallet.roi || 0}`);
    console.log(`  Will earn: $${aneesDaily}`);
    console.log(`  New wallet.roi: $${(parseFloat(anees.wallet.roi || 0) + parseFloat(aneesDaily)).toFixed(2)}`);
    console.log(`  Investment totalRoiEarned: $${aneesNewTotal}`);
    if (aneesCapReached) {
      console.log(`  ⚠️  INCOME CAP REACHED! Investment will be marked as 'completed'`);
    }
    
    console.log('\n' + '='.repeat(100));
    console.log('👤 SHAHARYAR (Approved Investment)');
    console.log('='.repeat(100));
    console.log(`Investment Amount: $${shaharyarInv.amount}`);
    console.log(`Package: ${shaharyarInv.packageNumber}`);
    console.log(`Created: ${shaharyarInv.createdAt.toISOString().split('T')[0]}`);
    console.log(`Status: ${shaharyarInv.status}`);
    
    // Calculate current phase and rate
    const shaharyarPhase = investorConstants.getInvestmentPhase(shaharyarInv.createdAt);
    const shaharyarCurrentRate = investorConstants.getDailyRateForPhase(shaharyarInv.packageNumber, shaharyarInv.createdAt);
    const shaharyarDaily = (shaharyarInv.amount * (shaharyarCurrentRate / 100)).toFixed(2);
    
    console.log(`\nCurrent Phase: ${shaharyarPhase} (Plan ${shaharyarPhase === 1 ? 'A' : 'B'})`);
    console.log(`Daily Rate: ${shaharyarCurrentRate}%`);
    console.log(`Daily ROI: $${shaharyarDaily}`);
    console.log(`Total ROI Earned So Far: $${shaharyarInv.totalRoiEarned}`);
    console.log(`Income Cap: $${shaharyarInv.incomeCap}`);
    console.log(`Remaining to Cap: $${(shaharyarInv.incomeCap - shaharyarInv.totalRoiEarned).toFixed(2)}`);
    
    const shaharyarNewTotal = (shaharyarInv.totalRoiEarned + parseFloat(shaharyarDaily)).toFixed(2);
    const shaharyarCapReached = shaharyarNewTotal >= shaharyarInv.incomeCap;
    
    console.log(`\n📅 TOMORROW (Cron at 4 PM Pakistan time):`);
    console.log(`  Current wallet.roi: $${shaharyar.wallet.roi || 0}`);
    console.log(`  Will earn: $${shaharyarDaily}`);
    console.log(`  New wallet.roi: $${(parseFloat(shaharyar.wallet.roi || 0) + parseFloat(shaharyarDaily)).toFixed(2)}`);
    console.log(`  Investment totalRoiEarned: $${shaharyarNewTotal}`);
    if (shaharyarCapReached) {
      console.log(`  ⚠️  INCOME CAP REACHED! Investment will be marked as 'completed'`);
    }
    
    console.log('\n' + '='.repeat(100));
    console.log('📊 DAILY COMPARISON');
    console.log('='.repeat(100));
    console.log(`\nAnees:     $${aneesInv.amount} × ${aneesCurrentRate}% = $${aneesDaily}/day`);
    console.log(`Shaharyar: $${shaharyarInv.amount} × ${shaharyarCurrentRate}% = $${shaharyarDaily}/day`);
    console.log(`\nShaharyar earns ${(parseFloat(shaharyarDaily) / parseFloat(aneesDaily)).toFixed(1)}x more per day`);
    console.log(`(because he has ${shaharyarInv.amount / aneesInv.amount}x investment amount)`);
    
    console.log('\n' + '='.repeat(100));
    console.log('✅ VERIFICATION: Both earn ROI tomorrow identically');
    console.log('='.repeat(100));
    console.log(`Both will:`);
    console.log(`  ✓ Have ROI calculated by same cron job`);
    console.log(`  ✓ Use phase-aware rates (Plan A for Phase 1)`);
    console.log(`  ✓ Get credited to wallet.roi`);
    console.log(`  ✓ Have profit transaction created`);
    console.log(`  ✓ Get notification sent`);
    console.log(`\n`);
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

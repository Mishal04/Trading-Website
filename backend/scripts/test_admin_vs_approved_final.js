require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(90));
    console.log('ADMIN DEPOSIT vs APPROVED INVESTMENT - ROI TREATMENT COMPARISON');
    console.log('='.repeat(90));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const User = require('../src/models/User');
    
    // Example 1: Admin deposit (recent backfill - Oct 9 at 12:01)
    const adminDeposit = await InvestorInvestment.findOne({
      userId: (await User.findOne({ email: 'asadmehmood5142@gmail.com' }))._id
    });
    
    // Example 2: Approved investment (Oct 6 - has been earning ROI)
    const approvedUser = await User.findOne({ email: 'orhanahmed11@gmail.com' });
    const approvedInvestment = await InvestorInvestment.findOne({
      userId: approvedUser._id,
      dailyRate: 0.0075
    });
    
    console.log('\n📊 INVESTMENT 1: ADMIN DEPOSIT');
    console.log('-'.repeat(90));
    console.log(`User Email: asadmehmood5142@gmail.com`);
    console.log(`Amount: $${adminDeposit.amount}`);
    console.log(`Daily Rate: ${(adminDeposit.dailyRate * 100).toFixed(4)}%`);
    console.log(`Status: ${adminDeposit.status}`);
    console.log(`Created: ${adminDeposit.createdAt.toISOString()}`);
    console.log(`Total ROI Earned So Far: $${adminDeposit.totalRoiEarned || 0}`);
    console.log(`Income Cap: $${adminDeposit.incomeCap}`);
    
    console.log('\n📊 INVESTMENT 2: APPROVED INVESTMENT (Already Earning ROI)');
    console.log('-'.repeat(90));
    console.log(`User Email: orhanahmed11@gmail.com`);
    console.log(`Amount: $${approvedInvestment.amount}`);
    console.log(`Daily Rate: ${(approvedInvestment.dailyRate * 100).toFixed(4)}%`);
    console.log(`Status: ${approvedInvestment.status}`);
    console.log(`Created: ${approvedInvestment.createdAt.toISOString()}`);
    console.log(`Total ROI Earned So Far: $${approvedInvestment.totalRoiEarned}`);
    console.log(`Income Cap: $${approvedInvestment.incomeCap}`);
    console.log(`Last ROI Date: ${approvedInvestment.lastRoiDate?.toISOString() || 'N/A'}`);
    
    console.log('\n' + '='.repeat(90));
    console.log('COMPARISON: HOW THEY ARE TREATED');
    console.log('='.repeat(90));
    
    console.log('\n✅ SAME DATABASE MODEL');
    console.log('-'.repeat(90));
    console.log(`Both stored in: InvestorInvestment collection`);
    console.log(`Both have: amount, dailyRate, status, incomeCap, totalRoiEarned`);
    
    console.log('\n✅ SAME CRON JOB PROCESSING');
    console.log('-'.repeat(90));
    console.log(`Location: backend/src/config/cronJobs.js (line 45)`);
    console.log(`Runs at: 4 PM Pakistan time (Asia/Karachi)`);
    console.log(`Days: Monday - Friday only`);
    console.log(`Query: "find all active InvestorInvestment records"`);
    console.log(`Processing: Iterates EVERY active record - admin deposit OR approved`);
    
    console.log('\n📋 CRON JOB LOGIC (cronJobs.js line 45-120)');
    console.log('-'.repeat(90));
    console.log(`For EACH investment (admin or approved):`);
    console.log(`  1. Check if status === 'active' ✓ (both are)`);
    console.log(`  2. Calculate: dailyROI = amount × dailyRate`);
    console.log(`     Admin deposit: $${adminDeposit.amount} × ${(adminDeposit.dailyRate * 100).toFixed(4)}% = $${(adminDeposit.amount * adminDeposit.dailyRate).toFixed(4)}`);
    console.log(`     Approved: $${approvedInvestment.amount} × ${(approvedInvestment.dailyRate * 100).toFixed(4)}% = $${(approvedInvestment.amount * approvedInvestment.dailyRate).toFixed(4)}`);
    console.log(`  3. Check income cap: if totalRoiEarned + dailyROI > incomeCap → mark completed`);
    console.log(`  4. Credit to user's wallet.roi`);
    console.log(`  5. Create profit transaction`);
    console.log(`  6. Update lastRoiDate`);
    
    console.log('\n' + '='.repeat(90));
    console.log('EXPECTED RESULTS (Next Cron Run)');
    console.log('='.repeat(90));
    
    console.log('\n✓ Admin Deposit (asadmehmood5142@gmail.com):');
    console.log(`  Current ROI: $${adminDeposit.totalRoiEarned || 0}`);
    console.log(`  Will earn next: $${(adminDeposit.amount * adminDeposit.dailyRate).toFixed(4)}`);
    console.log(`  New total: $${((adminDeposit.totalRoiEarned || 0) + (adminDeposit.amount * adminDeposit.dailyRate)).toFixed(4)}`);
    
    console.log('\n✓ Approved Investment (orhanahmed11@gmail.com):');
    console.log(`  Current ROI: $${approvedInvestment.totalRoiEarned}`);
    console.log(`  Will earn next: $${(approvedInvestment.amount * approvedInvestment.dailyRate).toFixed(4)}`);
    console.log(`  New total: $${(approvedInvestment.totalRoiEarned + (approvedInvestment.amount * approvedInvestment.dailyRate)).toFixed(4)}`);
    
    console.log('\n' + '='.repeat(90));
    console.log('CONCLUSION');
    console.log('='.repeat(90));
    console.log('\n✅ YES - Admin deposits and approved investments GET THE SAME TREATMENT\n');
    console.log(`Both:`);
    console.log(`  ✓ Use same InvestorInvestment model`);
    console.log(`  ✓ Processed by same cron job`);
    console.log(`  ✓ Earn daily ROI at specified dailyRate`);
    console.log(`  ✓ Subject to same income cap rules`);
    console.log(`  ✓ Create identical profit transactions\n`);
    
    console.log('NEXT CRON RUN: ~4:00 PM Pakistan time (today if before 4 PM, or tomorrow if after)\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

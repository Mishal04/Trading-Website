require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('=== Backfilling ROI for orhanahmed11@gmail.com ===\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const Transaction = require('../src/models/Transaction');
    const Notification = require('../src/models/Notification');
    
    const user = await User.findOne({ email: 'orhanahmed11@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      mongoose.disconnect();
      return;
    }
    
    const investment = await InvestorInvestment.findOne({ userId: user._id, status: 'active' });
    
    if (!investment) {
      console.log('❌ Active investment not found');
      mongoose.disconnect();
      return;
    }
    
    console.log('📋 USER & INVESTMENT');
    console.log('='.repeat(70));
    console.log(`Email: ${user.email}`);
    console.log(`Investment Amount: $${investment.amount}`);
    console.log(`Daily Rate: ${(investment.dailyRate * 100).toFixed(4)}%`);
    console.log(`Created: ${investment.createdAt}`);
    
    // Use the deposit date from transaction history (Oct 1, 2026) instead of investment creation date
    // User deposited on Oct 1, so ROI should have started Oct 2 through yesterday
    const depositDate = new Date('2026-10-01T00:00:00+05:00'); // Oct 1, 2026 (deposit date)
    const roiStartDate = new Date(depositDate);
    roiStartDate.setDate(roiStartDate.getDate() + 1); // Oct 2 - first day of ROI
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Backfill from first ROI date to yesterday (today will be handled by cron)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    console.log(`\nDeposit date: ${depositDate.toDateString()}`);
    console.log(`ROI start date: ${roiStartDate.toDateString()}`);
    console.log(`Backfill period: ${roiStartDate.toDateString()} to ${yesterday.toDateString()}`);
    
    // Calculate number of days
    let daysCount = 0;
    let currentDate = new Date(roiStartDate);
    currentDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= yesterday) {
      daysCount++;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`Total days to backfill: ${daysCount}`);
    
    if (daysCount === 0) {
      console.log('\n⚠️  No days to backfill (investment is too recent)');
      mongoose.disconnect();
      return;
    }
    
    // Calculate daily ROI (dailyRate is already in decimal form: 0.0075 = 0.75%)
    const dailyRoiAmount = Number((investment.amount * investment.dailyRate).toFixed(4));
    const totalBackfillRoi = Number((dailyRoiAmount * daysCount).toFixed(4));
    
    console.log(`\n💰 ROI CALCULATION`);
    console.log('='.repeat(70));
    console.log(`Daily ROI: $${dailyRoiAmount}`);
    console.log(`Days to backfill: ${daysCount}`);
    console.log(`Total ROI to credit: $${totalBackfillRoi}`);
    
    // Check if this would exceed income cap
    const projectedTotal = (investment.totalRoiEarned || 0) + totalBackfillRoi;
    const capReached = projectedTotal >= investment.incomeCap;
    
    console.log(`\n📊 INCOME CAP CHECK`);
    console.log('='.repeat(70));
    console.log(`Current totalRoiEarned: $${investment.totalRoiEarned || 0}`);
    console.log(`Income cap: $${investment.incomeCap}`);
    console.log(`Projected after backfill: $${projectedTotal}`);
    console.log(`Cap reached: ${capReached ? 'YES' : 'NO'}`);
    
    // Credit to wallet
    const walletUpdate = {
      $inc: { 'wallet.roi': totalBackfillRoi },
      $inc: { totalRoiEarned: totalBackfillRoi }
    };
    
    if (capReached) {
      walletUpdate.$set = { 'wallet.roi': totalBackfillRoi }; // Override if cap reached
    }
    
    await User.findByIdAndUpdate(user._id, {
      $inc: {
        'wallet.roi': totalBackfillRoi,
        totalRoiEarned: totalBackfillRoi
      }
    });
    
    // Update investment record
    await InvestorInvestment.findByIdAndUpdate(investment._id, {
      $inc: { totalRoiEarned: totalBackfillRoi },
      $set: { 
        lastRoiDate: yesterday,
        capReached: capReached,
        status: capReached ? 'completed' : 'active'
      }
    });
    
    // Create transaction for backfill
    await Transaction.create({
      userId: user._id,
      type: 'profit',
      amount: totalBackfillRoi,
      status: 'completed',
      description: `Backfilled ROI: ${daysCount} days × $${dailyRoiAmount}/day (${(investment.dailyRate * 100).toFixed(4)}%) from ${roiStartDate.toDateString()} to ${yesterday.toDateString()}${capReached ? ' (income cap reached)' : ''}`,
      referenceId: investment._id,
      referenceModel: 'InvestorInvestment'
    });
    
    // Notify user
    await Notification.create({
      userId: user._id,
      title: 'Backfilled ROI Credited',
      message: `Your account has been credited $${totalBackfillRoi} in backfilled ROI for ${daysCount} days${capReached ? ' (income cap reached)' : ''}. Total ROI earned: $${projectedTotal}.`,
      type: 'profit'
    });
    
    console.log('\n✅ BACKFILL COMPLETE');
    console.log('='.repeat(70));
    console.log(`✓ Credited $${totalBackfillRoi} to wallet.roi`);
    console.log(`✓ Updated investment totalRoiEarned`);
    console.log(`✓ Created transaction record`);
    console.log(`✓ Sent notification to user`);
    
    if (capReached) {
      console.log(`✓ Investment marked as 'completed' (cap reached)`);
    }
    
    console.log('\n📌 RESULT');
    console.log('='.repeat(70));
    console.log(`User wallet.roi: $${totalBackfillRoi}`);
    console.log(`User totalRoiEarned: $${totalBackfillRoi}`);
    console.log('User will see this amount in dashboard immediately\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('=== Reset and Backfill ROI for orhanahmed11@gmail.com ===\n');
    
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
    console.log(`Current wallet.roi: $${user.wallet?.roi || 0}`);
    console.log(`Current totalRoiEarned: ${investment.totalRoiEarned}`);
    
    // Reset the incorrect backfill
    console.log('\n✅ STEP 1: Resetting incorrect backfill');
    await User.findByIdAndUpdate(user._id, {
      $set: { 'wallet.roi': 0 }
    });
    
    await InvestorInvestment.findByIdAndUpdate(investment._id, {
      $set: { totalRoiEarned: 0 }
    });
    
    // Delete the incorrect transaction
    await Transaction.deleteMany({ 
      userId: user._id, 
      type: 'profit',
      amount: 0.6
    });
    
    console.log('   ✓ Reset wallet.roi to $0');
    console.log('   ✓ Reset totalRoiEarned to 0');
    console.log('   ✓ Removed incorrect transaction');
    
    // Calculate correct backfill
    console.log('\n✅ STEP 2: Calculating correct backfill');
    
    const depositDate = new Date('2026-10-01T00:00:00+05:00');
    const roiStartDate = new Date(depositDate);
    roiStartDate.setDate(roiStartDate.getDate() + 1);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let daysCount = 0;
    let currentDate = new Date(roiStartDate);
    currentDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= yesterday) {
      daysCount++;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // CORRECT: dailyRate is already in decimal (0.0075 = 0.75%)
    const dailyRoiAmount = Number((investment.amount * investment.dailyRate).toFixed(4));
    const totalBackfillRoi = Number((dailyRoiAmount * daysCount).toFixed(4));
    
    console.log(`   Backfill period: ${roiStartDate.toDateString()} to ${yesterday.toDateString()}`);
    console.log(`   Days to backfill: ${daysCount}`);
    console.log(`   Daily ROI: $${dailyRoiAmount}`);
    console.log(`   Total ROI to credit: $${totalBackfillRoi}`);
    
    // Credit correct amount
    console.log('\n✅ STEP 3: Crediting correct ROI');
    
    await User.findByIdAndUpdate(user._id, {
      $inc: {
        'wallet.roi': totalBackfillRoi,
        totalRoiEarned: totalBackfillRoi
      }
    });
    
    await InvestorInvestment.findByIdAndUpdate(investment._id, {
      $inc: { totalRoiEarned: totalBackfillRoi },
      $set: { lastRoiDate: yesterday }
    });
    
    // Create correct transaction
    await Transaction.create({
      userId: user._id,
      type: 'profit',
      amount: totalBackfillRoi,
      status: 'completed',
      description: `Backfilled ROI: ${daysCount} days × $${dailyRoiAmount}/day (${(investment.dailyRate * 100).toFixed(4)}%) from ${roiStartDate.toDateString()} to ${yesterday.toDateString()}`,
      referenceId: investment._id,
      referenceModel: 'InvestorInvestment'
    });
    
    // Create notification
    await Notification.create({
      userId: user._id,
      title: 'Backfilled ROI Credited',
      message: `Your account has been credited $${totalBackfillRoi.toFixed(2)} in backfilled ROI for ${daysCount} days of your investment!`,
      type: 'profit'
    });
    
    console.log(`   ✓ Credited $${totalBackfillRoi} to wallet.roi`);
    console.log(`   ✓ Updated investment totalRoiEarned`);
    console.log(`   ✓ Created transaction record`);
    console.log(`   ✓ Sent notification to user`);
    
    console.log('\n✅ COMPLETE');
    console.log('='.repeat(70));
    console.log(`User wallet.roi: $${totalBackfillRoi}`);
    console.log(`User will see this on dashboard immediately\n`);
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

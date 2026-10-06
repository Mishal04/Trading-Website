require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('=== Fixing Daily ROI for orhanahmed11@gmail.com ===\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    
    const user = await User.findOne({ email: 'orhanahmed11@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      mongoose.disconnect();
      return;
    }
    
    console.log('📋 CURRENT USER STATUS');
    console.log('='.repeat(60));
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`isActive: ${user.isActive}`);
    console.log(`isVerified: ${user.isVerified}`);
    console.log(`wallet.capital: $${user.wallet?.capital || 0}`);
    console.log(`wallet.roi: $${user.wallet?.roi || 0}`);
    
    // Fix 1: Activate user
    console.log('\n✅ FIX 1: Activating user account');
    await User.findByIdAndUpdate(user._id, {
      isActive: true,
      isVerified: true
    });
    console.log('   ✓ isActive = true');
    console.log('   ✓ isVerified = true');
    
    // Fix 2: Create InvestorInvestment record
    console.log('\n✅ FIX 2: Creating InvestorInvestment record');
    
    const amount = user.wallet?.capital || 2000;
    const INVESTOR_INCOME_CAP = 3; // 3x multiplier
    const incomeCap = Number((amount * INVESTOR_INCOME_CAP).toFixed(4));
    
    // Package info for $2000 (or whatever amount in wallet)
    let packageNumber = 2;  // Default for $1000-5000
    let dailyRate = 0.0075; // 0.75% for Plan B package 2
    let plan = 'B';
    
    // Determine package based on amount
    if (amount >= 100 && amount <= 900) {
      packageNumber = 1;
      dailyRate = 0.01;
      plan = 'A';
    } else if (amount >= 1000 && amount <= 5000) {
      packageNumber = 2;
      dailyRate = 0.0075;
      plan = 'B';
    } else if (amount >= 6000 && amount <= 9000) {
      packageNumber = 3;
      dailyRate = 0.0075;
      plan = 'B';
    } else if (amount >= 10000 && amount <= 25000) {
      packageNumber = 4;
      dailyRate = 0.01;
      plan = 'B';
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const investment = new InvestorInvestment({
      userId: user._id,
      investorId: null,
      amount,
      plan,
      packageNumber,
      dailyRate,
      incomeCap,
      status: 'active',
      startDate: new Date(),
      lastRoiDate: yesterday,  // Set to yesterday so it qualifies for today's ROI
      createdAt: new Date(),
      approvedBy: new mongoose.Types.ObjectId('000000000000000000000001'), // System
      approvedAt: new Date(),
      totalRoiEarned: 0,
      capReached: false
    });
    
    await investment.save();
    
    console.log(`   ✓ Created InvestorInvestment record`);
    console.log(`     Amount: $${amount}`);
    console.log(`     Plan: ${plan}`);
    console.log(`     Package: ${packageNumber}`);
    console.log(`     Daily Rate: ${(dailyRate * 100).toFixed(4)}%`);
    console.log(`     Income Cap: $${incomeCap}`);
    console.log(`     Status: active`);
    console.log(`     lastRoiDate: ${yesterday.toISOString()}`);
    
    console.log('\n✅ ALL FIXES APPLIED');
    console.log('='.repeat(60));
    
    console.log('\n📌 NEXT STEPS:');
    console.log('   1. User account is now ACTIVE and VERIFIED');
    console.log('   2. InvestorInvestment record with $' + amount + ' is now ACTIVE');
    console.log('   3. ROI cron job runs at 16:00 Pakistan time (Mon-Fri)');
    console.log(`   4. Expected daily ROI: $${(amount * dailyRate).toFixed(2)}`);
    console.log('   5. User will see ROI in wallet.roi after next cron run');
    
    console.log('\n✓ Fix complete!\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();

/**
 * Test Script: Verify investor dashboard returns ROI data correctly
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Investor = require('../src/models/Investor');
const InvestorInvestment = require('../src/models/InvestorInvestment');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
};

const testDashboardData = async () => {
  try {
    console.log('\n📊 Testing Investor Dashboard Data...\n');
    
    // Find an investor with active investments
    const investorWithInvestments = await Investor.findOne({})
      .sort({ createdAt: -1 });
    
    if (!investorWithInvestments) {
      console.log('⚠️  No investors found in database');
      return;
    }

    console.log(`📌 Testing with investor: ${investorWithInvestments.email}`);
    console.log(`   ID: ${investorWithInvestments._id}`);
    
    // Check Phase 1 investments (investorId)
    const phase1Investments = await InvestorInvestment.find({
      investorId: investorWithInvestments._id,
      status: { $in: ['active', 'pending', 'completed'] }
    });
    
    console.log(`\n🔍 Phase 1 Investments (investorId-based): ${phase1Investments.length}`);
    if (phase1Investments.length > 0) {
      phase1Investments.slice(0, 3).forEach(inv => {
        console.log(`   - $${inv.amount} | Plan ${inv.plan} | Rate: ${inv.dailyRate*100}% | ROI Earned: $${inv.totalRoiEarned.toFixed(2)}`);
      });
    }

    // Check Phase 2 investments (userId)
    let phase2Investments = [];
    if (investorWithInvestments.userId) {
      phase2Investments = await InvestorInvestment.find({
        userId: investorWithInvestments.userId,
        status: { $in: ['active', 'pending', 'completed'] }
      });
    }

    console.log(`\n🔍 Phase 2 Investments (userId-based): ${phase2Investments.length}`);
    if (phase2Investments.length > 0) {
      phase2Investments.slice(0, 3).forEach(inv => {
        console.log(`   - $${inv.amount} | Plan ${inv.plan} | Rate: ${inv.dailyRate*100}% | ROI Earned: $${inv.totalRoiEarned.toFixed(2)}`);
      });
    } else if (investorWithInvestments.userId) {
      console.log('   (Investor has userId but no Phase 2 investments yet)');
    } else {
      console.log('   (Investor has no userId link to User model)');
    }

    // Check Investor wallet
    console.log(`\n💰 Investor Wallet (legacy):`, investorWithInvestments.wallet);
    console.log(`   Total ROI Earned: $${investorWithInvestments.totalRoiEarned.toFixed(2)}`);

    // Check User wallet if exists
    if (investorWithInvestments.userId) {
      const user = await User.findById(investorWithInvestments.userId).select('wallet totalRoiEarned');
      if (user) {
        console.log(`\n💰 User Wallet (Phase 2):`, user.wallet);
        console.log(`   Total ROI Earned: $${user.totalRoiEarned.toFixed(2)}`);
        
        if (user.wallet.roi > 0) {
          console.log(`\n✅ SUCCESS: User has wallet.roi = $${user.wallet.roi.toFixed(2)}`);
          console.log(`   This WILL show on the investor dashboard!`);
        } else {
          console.log(`\n⚠️  User wallet.roi = 0 (ROI hasn't been credited yet or cap reached)`);
        }
      } else {
        console.log('\n❌ Investor has userId but User record not found!');
      }
    }

    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`   - Investor has ${phase1Investments.length + phase2Investments.length} total active investments`);
    console.log(`   - Dashboard will display wallet from: ${investorWithInvestments.userId ? 'User model (Phase 2)' : 'Investor model (Phase 1)'}`);
    
    if (phase2Investments.length > 0 || (investorWithInvestments.userId && investorWithInvestments.wallet.roi > 0)) {
      console.log(`   ✅ ROI data SHOULD display on dashboard`);
    } else {
      console.log(`   ⚠️  No ROI data available (no Phase 2 investments or cron hasn't run yet)`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  }
};

connectDB().then(() => testDashboardData());

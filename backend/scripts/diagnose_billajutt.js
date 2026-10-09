const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000
}).then(async () => {
  try {
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const CommissionLog = require('../src/models/CommissionLog');
    const constants = require('../config/constants');

    console.log('\n🔍 DIAGNOSTIC REPORT: billajutt161@gmail.com\n');

    // Find user
    const user = await User.findOne({ email: 'billajutt161@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('👤 USER INFO:');
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Active: ${user.isActive}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Account Type: ${user.accountType}`);

    console.log('\n💰 WALLET BALANCES:');
    console.log(`  Capital: $${(user.wallet.capital || 0).toFixed(2)}`);
    console.log(`  Profit: $${(user.wallet.profit || 0).toFixed(2)}`);
    console.log(`  Commission: $${(user.wallet.commission || 0).toFixed(2)}`);
    console.log(`  ROI: $${(user.wallet.roi || 0).toFixed(2)}`);
    console.log(`  Total Earned: $${(user.totalEarned || 0).toFixed(2)}`);

    console.log('\n🌳 REFERRAL INFO:');
    console.log(`  Direct Referrals (directCount): ${user.directCount || 0}`);
    console.log(`  Unlocked Levels: ${user.unlockedLevels || 0}`);
    console.log(`  Total Invested: $${(user.totalInvested || 0).toFixed(2)}`);

    if (user.directCount > 0) {
      const unlockedLevels = constants.getUnlockedLevelNumbers(user.directCount);
      console.log(`  ✅ Unlocked Level Numbers: ${unlockedLevels.join(', ')}`);
      const lowestLevel = constants.getCurrentCommissionLevel(user.directCount);
      console.log(`  Lowest Level (Commission Entry): L${lowestLevel}`);
    } else {
      console.log('  ❌ NO DIRECT REFERRALS - Cannot earn level commissions');
    }

    console.log('\n💼 INVESTMENTS:');
    const investments = await InvestorInvestment.find({ userId: user._id });
    if (investments.length === 0) {
      console.log('  ❌ No investments found');
    } else {
      investments.forEach((inv, idx) => {
        console.log(`\n  Investment ${idx + 1}:`);
        console.log(`    Amount: $${inv.amount}`);
        console.log(`    Plan: ${inv.plan}`);
        console.log(`    Package: ${inv.packageNumber}`);
        console.log(`    Daily Rate: ${(inv.dailyRate * 100).toFixed(2)}%`);
        console.log(`    Status: ${inv.status}`);
        console.log(`    Income Cap: $${inv.incomeCap.toFixed(2)}`);
        console.log(`    Total ROI Earned: $${(inv.totalRoiEarned || 0).toFixed(2)}`);
        console.log(`    Cap Reached: ${inv.capReached ? '✅ YES' : '❌ No'}`);
        console.log(`    Created: ${new Date(inv.createdAt).toLocaleDateString()}`);
      });
    }

    console.log('\n💸 COMMISSION LOGS (Last 10):');
    const commissions = await CommissionLog.find({ recipientId: user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    
    if (commissions.length === 0) {
      console.log('  ❌ NO COMMISSIONS LOGGED');
    } else {
      let totalComm = 0;
      commissions.forEach((comm, idx) => {
        console.log(`\n  ${idx + 1}. Level: L${comm.level} | Amount: $${comm.amount.toFixed(2)} | From: ${comm.fromUserName}`);
        totalComm += comm.amount;
      });
      console.log(`\n  Total Commission Earned: $${totalComm.toFixed(2)}`);
    }

    console.log('\n📋 DIAGNOSIS:');
    
    // Check income cap
    const capMultiple = constants.INCOME_CAPS?.[user.role] || 5;
    const incomeCap = (user.totalInvested || 0) * capMultiple;
    const totalEarned = user.totalEarned || 0;
    
    if (totalEarned >= incomeCap && incomeCap > 0) {
      console.log(`  ⚠️  INCOME CAP HIT: $${totalEarned.toFixed(2)} >= $${incomeCap.toFixed(2)} (${capMultiple}x)`);
      console.log('  → User cannot earn more commissions until new investment');
    }

    if (!user.directCount || user.directCount === 0) {
      console.log('  ⚠️  NO DIRECT REFERRALS');
      console.log('  → User needs at least 1 direct referral to unlock commission levels');
    } else {
      console.log(`  ✅ Has ${user.directCount} direct referral(s)`);
      const unlockedCount = constants.getUnlockedLevelCount(user.directCount);
      console.log(`  ✅ ${unlockedCount} levels unlocked`);
    }

    if (!user.isActive) {
      console.log('  ❌ USER DEACTIVATED - Cannot earn anything');
    } else {
      console.log('  ✅ User is active');
    }

    if (investments.length === 0) {
      console.log('  ❌ NO ACTIVE INVESTMENTS - No ROI will be calculated');
    } else {
      const activeInvCount = investments.filter(i => i.status === 'active').length;
      console.log(`  ✅ ${activeInvCount} active investment(s)`);
    }

    console.log('\n');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}).catch(err => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

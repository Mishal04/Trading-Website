require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('=== Checking Daily ROI Issue for orhanahmed11@gmail.com ===\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const Investment = require('../src/models/Investment');
    const Transaction = require('../src/models/Transaction');
    
    // Find the user
    const user = await User.findOne({ email: 'orhanahmed11@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      mongoose.disconnect();
      return;
    }
    
    console.log('📋 USER ACCOUNT STATUS');
    console.log('='.repeat(60));
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`User ID: ${user._id}`);
    console.log(`Account Type: ${user.accountType}`);
    console.log(`Is Active: ${user.isActive}`);
    console.log(`Is Verified: ${user.isVerified}`);
    console.log(`Wallet Balance: $${user.wallet || 0}`);
    console.log(`Total Invested: $${user.totalInvested || 0}`);
    console.log(`Total ROI: $${user.totalROI || 0}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Last Login: ${user.lastLogin || 'Never'}`);
    
    // Check investments
    console.log('\n📊 INVESTMENTS');
    console.log('='.repeat(60));
    
    const investments = await Investment.find({ userId: user._id }).sort({ createdAt: -1 });
    console.log(`Total Investments: ${investments.length}`);
    
    if (investments.length === 0) {
      console.log('⚠️  User has NO investments');
    } else {
      investments.forEach((inv, i) => {
        console.log(`\n[${i + 1}] ${inv.packageName || 'Unknown Package'}`);
        console.log(`    Amount: $${inv.amount}`);
        console.log(`    Status: ${inv.status}`);
        console.log(`    ROI Status: ${inv.roiStatus || 'Not set'}`);
        console.log(`    Duration: ${inv.duration} days`);
        console.log(`    ROI Percentage: ${inv.dailyROI || 0}% daily`);
        console.log(`    Created: ${inv.createdAt}`);
        console.log(`    Expires: ${inv.expiryDate || 'Not set'}`);
        console.log(`    Total ROI Earned: $${inv.totalROIEarned || 0}`);
        console.log(`    ROI Paid Until: ${inv.roiPaidUntil || 'Not started'}`);
      });
    }
    
    // Check ROI transactions
    console.log('\n💰 ROI TRANSACTIONS');
    console.log('='.repeat(60));
    
    const roiTransactions = await Transaction.find({ 
      userId: user._id, 
      type: 'ROI'
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`Recent ROI Transactions: ${roiTransactions.length}`);
    
    if (roiTransactions.length === 0) {
      console.log('⚠️  User has received NO ROI transactions');
    } else {
      roiTransactions.forEach((txn, i) => {
        console.log(`\n[${i + 1}] $${txn.amount} on ${txn.createdAt}`);
        console.log(`    Status: ${txn.status}`);
        console.log(`    Description: ${txn.description || 'N/A'}`);
      });
    }
    
    // Check eligibility
    console.log('\n✅ ROI ELIGIBILITY CHECK');
    console.log('='.repeat(60));
    
    const checks = {
      'Account Active': user.isActive === true,
      'Account Verified': user.isVerified === true,
      'Has Investments': investments.length > 0,
      'Active Investments': investments.some(inv => inv.status === 'active'),
      'Valid Account Type': user.accountType === 'user' || user.accountType === 'investor',
    };
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
    });
    
    // Summary
    console.log('\n📌 SUMMARY');
    console.log('='.repeat(60));
    
    if (!user.isActive) {
      console.log('❌ BLOCKER: User account is INACTIVE');
    } else if (!user.isVerified) {
      console.log('❌ BLOCKER: User account is NOT VERIFIED');
    } else if (investments.length === 0) {
      console.log('❌ BLOCKER: User has NO INVESTMENTS');
    } else if (!investments.some(inv => inv.status === 'active')) {
      console.log('❌ BLOCKER: User has NO ACTIVE INVESTMENTS');
      console.log('   Investment statuses:', investments.map(i => i.status).join(', '));
    } else if (roiTransactions.length === 0) {
      console.log('⚠️  POSSIBLE ISSUE: User has investments but NO ROI transactions received');
      console.log('   May be waiting for daily ROI cron job to run');
    } else {
      console.log('✅ User should be receiving ROI');
    }
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();

require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('=== Deep Check: orhanahmed11@gmail.com ROI Issue ===\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const Investment = require('../src/models/Investment');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const Transaction = require('../src/models/Transaction');
    
    // Find the user
    const user = await User.findOne({ email: 'orhanahmed11@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      mongoose.disconnect();
      return;
    }
    
    console.log('📋 UPDATED USER STATUS');
    console.log('='.repeat(70));
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Is Active: ${user.isActive}`);
    console.log(`Is Verified: ${user.isVerified}`);
    console.log(`Account Type: ${user.accountType}`);
    console.log(`Created: ${user.createdAt}`);
    
    console.log('\n💰 WALLET BREAKDOWN');
    console.log('='.repeat(70));
    console.log(`wallet.capital: $${user.wallet?.capital || 0}`);
    console.log(`wallet.profit: $${user.wallet?.profit || 0}`);
    console.log(`wallet.commission: $${user.wallet?.commission || 0}`);
    console.log(`wallet.roi: $${user.wallet?.roi || 0}`);
    console.log(`TOTAL WALLET: $${(user.wallet?.capital || 0) + (user.wallet?.profit || 0) + (user.wallet?.commission || 0) + (user.wallet?.roi || 0)}`);
    
    console.log('\n📊 INVESTMENT RECORDS');
    console.log('='.repeat(70));
    
    // Check legacy Investment model
    const investments = await Investment.find({ userId: user._id });
    console.log(`Legacy Investment records (userId): ${investments.length}`);
    investments.forEach((inv, i) => {
      console.log(`  [${i + 1}] ${inv.packageName} - $${inv.amount} - Status: ${inv.status}`);
    });
    
    // Check InvestorInvestment model
    const investorInvestments = await InvestorInvestment.find({ userId: user._id });
    console.log(`\nInvestorInvestment records (userId): ${investorInvestments.length}`);
    investorInvestments.forEach((inv, i) => {
      console.log(`  [${i + 1}] Package ${inv.packageNumber} - $${inv.amount} - Status: ${inv.status}`);
      console.log(`      Phase: ${inv.phase || 'Not set'} | lastRoiDate: ${inv.lastRoiDate}`);
      console.log(`      totalRoiEarned: $${inv.totalRoiEarned || 0} | capReached: ${inv.capReached}`);
    });
    
    console.log('\n💸 ROI TRANSACTIONS (Last 10)');
    console.log('='.repeat(70));
    const roiTransactions = await Transaction.find({ userId: user._id, type: 'profit' }).sort({ createdAt: -1 }).limit(10);
    console.log(`Total ROI transactions: ${roiTransactions.length}`);
    if (roiTransactions.length === 0) {
      console.log('⚠️  NO ROI transactions found');
    } else {
      roiTransactions.forEach((txn, i) => {
        console.log(`  [${i + 1}] $${txn.amount} - ${txn.description}`);
        console.log(`      Date: ${txn.createdAt}`);
      });
    }
    
    console.log('\n🔍 WALLET MODEL SCHEMA CHECK');
    console.log('='.repeat(70));
    console.log('Raw wallet object:');
    console.log(JSON.stringify(user.wallet, null, 2));
    
    console.log('\n⚙️ POSSIBLE SCENARIOS');
    console.log('='.repeat(70));
    
    if (user.wallet?.capital > 0 && investments.length === 0 && investorInvestments.length === 0) {
      console.log('🔴 MISMATCH DETECTED:');
      console.log('   - User has $2,000 in wallet.capital');
      console.log('   - BUT no Investment or InvestorInvestment records exist');
      console.log('   - This suggests:');
      console.log('     1. Capital was deposited but investment was never created');
      console.log('     2. Investment record was deleted but wallet balance remains');
      console.log('     3. User is in "wallet-only" mode (not yet invested)');
      console.log('   - ROI CAN ONLY BE CALCULATED FOR ACTIVE INVESTMENTS');
      console.log('   - An investment needs to be CREATED to generate ROI');
    }
    
    console.log('\n✅ DIAGNOSTIC COMPLETE');
    console.log('='.repeat(70));
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();

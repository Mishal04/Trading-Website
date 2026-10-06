require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('=== Checking for Pending Investments ===\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const Investment = require('../src/models/Investment');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    
    const user = await User.findOne({ email: 'orhanahmed11@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      mongoose.disconnect();
      return;
    }
    
    console.log('📋 USER:', user.email);
    console.log('isActive:', user.isActive);
    console.log('wallet.capital:', user.wallet?.capital);
    console.log('');
    
    // Check legacy Investment
    const legacyInvestments = await Investment.find({ userId: user._id });
    console.log('📊 LEGACY INVESTMENT RECORDS (Investment model)');
    console.log('='.repeat(60));
    console.log(`Total: ${legacyInvestments.length}`);
    legacyInvestments.forEach((inv, i) => {
      console.log(`\n[${i + 1}] ${inv.packageName}`);
      console.log(`    Amount: $${inv.amount}`);
      console.log(`    Status: ${inv.status}`);
      console.log(`    isActive: ${inv.isActive}`);
      console.log(`    Created: ${inv.createdAt}`);
    });
    
    // Check Phase 2 InvestorInvestment
    const phase2Investments = await InvestorInvestment.find({ userId: user._id });
    console.log('\n\n📊 PHASE 2 INVESTOR INVESTMENT RECORDS (InvestorInvestment model)');
    console.log('='.repeat(60));
    console.log(`Total: ${phase2Investments.length}`);
    phase2Investments.forEach((inv, i) => {
      console.log(`\n[${i + 1}] Package ${inv.packageNumber}`);
      console.log(`    Amount: $${inv.amount}`);
      console.log(`    Plan: ${inv.plan}`);
      console.log(`    Status: ${inv.status}`);
      console.log(`    Created: ${inv.createdAt}`);
      console.log(`    Total ROI Earned: $${inv.totalRoiEarned || 0}`);
    });
    
    console.log('\n\n📌 SUMMARY');
    console.log('='.repeat(60));
    
    if (user.wallet?.capital > 0 && legacyInvestments.length === 0 && phase2Investments.length === 0) {
      console.log('🔴 CRITICAL MISMATCH:');
      console.log(`   - User has $${user.wallet.capital} in wallet.capital`);
      console.log('   - BUT NO investment records (neither legacy nor Phase 2)');
      console.log('');
      console.log('   ROOT CAUSE: Investment was probably NEVER CREATED');
      console.log('   OR investment record was DELETED but capital balance wasn\'t cleared');
      console.log('');
      console.log('   TO FIX:');
      console.log('   1. Create an InvestorInvestment record with userId set');
      console.log('   2. Set status to "active"');
      console.log('   3. Set startDate and lastRoiDate to recent date');
      console.log('   4. This user will then receive ROI on next cron job run');
    }
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();

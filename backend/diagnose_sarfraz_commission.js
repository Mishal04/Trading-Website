#!/usr/bin/env node
/**
 * DIAGNOSE: Why Sarfraz Ahmad ($500 invested) not getting commission
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const Investment = require('./src/models/Investment');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('DIAGNOSING SARFRAZ AHMAD COMMISSION ISSUE');
    console.log('═'.repeat(80) + '\n');

    // Find Sarfraz Ahmad with email arianbadsha939@gmail.com
    const sarfraz = await User.findOne({ email: 'arianbadsha939@gmail.com' })
      .select('_id name email totalInvested wallet');

    if (!sarfraz) {
      console.log('❌ Sarfraz Ahmad not found');
      process.exit(1);
    }

    console.log('Sarfraz Ahmad Status:');
    console.log(`  _id: ${sarfraz._id}`);
    console.log(`  name: ${sarfraz.name}`);
    console.log(`  email: ${sarfraz.email}`);
    console.log(`  totalInvested (in User doc): ${sarfraz.totalInvested}`);
    console.log(`  wallet.capital: ${sarfraz.wallet?.capital}`);
    console.log(`  wallet.roi: ${sarfraz.wallet?.roi}`);
    console.log(`  Eligible for commission: ${sarfraz.totalInvested > 0 || sarfraz.wallet?.capital > 0 ? '✅ YES' : '❌ NO'}\n`);

    // Check Investment records (old system)
    console.log('Checking Investment records (old system):');
    const investments = await Investment.find({ userId: sarfraz._id })
      .select('amount status isActive');
    
    console.log(`  Found: ${investments.length} Investment records`);
    investments.forEach(inv => {
      console.log(`    - $${inv.amount}, status: ${inv.status}, isActive: ${inv.isActive}`);
    });

    // Check InvestorInvestment records (new system)
    console.log('\nChecking InvestorInvestment records (new system):');
    const investorInvs = await InvestorInvestment.find({ userId: sarfraz._id })
      .select('amount status plan approvedBy');
    
    console.log(`  Found: ${investorInvs.length} InvestorInvestment records`);
    investorInvs.forEach(inv => {
      console.log(`    - $${inv.amount}, plan: ${inv.plan}, status: ${inv.status}, approvedBy: ${inv.approvedBy}`);
    });

    // Check if ROI was generated for him today
    console.log('\nChecking today\'s ROI:');
    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    
    const roiToday = await Transaction.findOne({
      userId: sarfraz._id,
      type: 'profit',
      createdAt: { $gte: startOfToday }
    });

    if (roiToday) {
      console.log(`  ✅ ROI Generated: $${roiToday.amount}`);
      console.log(`     Description: ${roiToday.description}`);
    } else {
      console.log(`  ❌ NO ROI generated today`);
      console.log(`     Reason: If totalInvested=${sarfraz.totalInvested}, he won't generate ROI`);
    }

    // Check if he received commission today
    console.log('\nChecking today\'s commissions:');
    const commToday = await Transaction.find({
      userId: sarfraz._id,
      type: 'commission',
      createdAt: { $gte: startOfToday }
    });

    if (commToday.length > 0) {
      console.log(`  ✅ Commissions Received: ${commToday.length}`);
      commToday.forEach(tx => {
        console.log(`     L-: $${tx.amount} from ${tx.description.substring(0, 50)}...`);
      });
    } else {
      console.log(`  ❌ NO commissions received today`);
    }

    // ROOT CAUSE ANALYSIS
    console.log('\n' + '═'.repeat(80));
    console.log('ROOT CAUSE ANALYSIS:');
    console.log('═'.repeat(80) + '\n');

    if (sarfraz.totalInvested <= 0 && sarfraz.wallet?.capital <= 0) {
      console.log('❌ ISSUE FOUND: totalInvested and wallet.capital are BOTH 0');
      console.log('\n   But UI shows $500 invested. This means:');
      console.log('   1. Investment record exists in database');
      console.log(`   2. User.totalInvested field is NOT being updated when investment is approved`);
      console.log('   3. OR investment approval never happened\n');

      if (investments.length > 0) {
        console.log('   LIKELY CAUSE: Investment record exists but totalInvested not synced');
        console.log('   FIX: Need to aggregate investments and update totalInvested field\n');
      }

      if (investorInvs.length > 0) {
        console.log('   LIKELY CAUSE: InvestorInvestment exists but totalInvested not synced');
        console.log('   FIX: totalInvested calculation must include InvestorInvestment records\n');
      }
    } else {
      console.log('✅ totalInvested is properly set');
      console.log('   He SHOULD be eligible for commissions');
    }

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();

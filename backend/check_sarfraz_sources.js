#!/usr/bin/env node
/**
 * CHECK: Where is Sarfraz's $500 coming from?
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const sarfraz = await User.findOne({ email: 'arianbadsha939@gmail.com' })
      .select('_id name wallet totalInvested');

    console.log('Sarfraz Ahmad Data Sources:\n');

    console.log('1. wallet.capital:');
    console.log(`   Value: $${sarfraz.wallet?.capital || 0}`);
    console.log(`   Showing in UI: ${sarfraz.wallet?.capital > 0 ? '✅ YES' : '❌ NO'}\n`);

    console.log('2. totalInvested field:');
    console.log(`   Value: ${sarfraz.totalInvested}`);
    console.log(`   Showing in UI: ${sarfraz.totalInvested > 0 ? '✅ YES' : '❌ NO'}\n`);

    console.log('3. InvestorInvestment records:');
    const invs = await InvestorInvestment.find({ userId: sarfraz._id })
      .select('amount status approvedBy');
    
    invs.forEach(inv => {
      console.log(`   - $${inv.amount}, status: ${inv.status}, approved: ${inv.approvedBy ? '✅ YES' : '❌ NO'}`);
    });

    console.log('\n═'.repeat(60));
    console.log('Where is the $500 coming from?\n');

    if (sarfraz.wallet?.capital >= 500) {
      console.log('❌ Source: wallet.capital ($' + sarfraz.wallet.capital + ')');
      console.log('   Fix: Check if this should be approved/disapproved');
    }

    if (sarfraz.totalInvested >= 500) {
      console.log('❌ Source: totalInvested field ($' + sarfraz.totalInvested + ')');
      console.log('   This gets shown even if InvestorInvestment not approved');
    }

    const approvedInvAmount = invs
      .filter(inv => inv.approvedBy)
      .reduce((sum, inv) => sum + inv.amount, 0);

    if (approvedInvAmount > 0) {
      console.log('✅ Approved investments: $' + approvedInvAmount);
    }

    mongoose.connection.close();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();

#!/usr/bin/env node

const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const Investment = require('./src/models/Investment');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const mominali = await User.findOne({ name: 'Mominali' }).select('_id');

    console.log('Mominali Investment Status:\n');

    const invs = await Investment.find({ userId: mominali._id })
      .select('amount status isActive');
    console.log(`Investment records: ${invs.length}`);
    invs.forEach(inv => {
      console.log(`  - $${inv.amount}, status: ${inv.status}, isActive: ${inv.isActive}`);
    });

    const investorInvs = await InvestorInvestment.find({ userId: mominali._id })
      .select('amount status approvedBy');
    console.log(`\nInvestorInvestment records: ${investorInvs.length}`);
    investorInvs.forEach(inv => {
      console.log(`  - $${inv.amount}, status: ${inv.status}, approved: ${inv.approvedBy ? '✅ YES' : '❌ NO'}`);
    });

    mongoose.connection.close();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();

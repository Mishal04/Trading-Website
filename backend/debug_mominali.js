#!/usr/bin/env node

const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const mominali = await User.findOne({ name: 'Mominali' })
      .select('_id name totalInvested wallet directCount');

    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    console.log('Mominali Profile:');
    console.log(`  totalInvested: ${mominali.totalInvested}`);
    console.log(`  wallet.capital: ${mominali.wallet?.capital}`);
    console.log(`  directCount: ${mominali.directCount}\n`);

    const roi = await Transaction.findOne({
      userId: mominali._id,
      type: 'profit',
      createdAt: { $gte: startOfToday }
    });

    const comm = await Transaction.find({
      userId: mominali._id,
      type: 'commission',
      createdAt: { $gte: startOfToday }
    });

    console.log('Transactions Today:');
    console.log(`  ROI: ${roi ? `$${roi.amount}` : 'NONE'}`);
    console.log(`  Commissions: ${comm.length} (total: $${comm.reduce((s, c) => s + c.amount, 0).toFixed(2)})\n`);

    if (!roi) {
      console.log('❌ PROBLEM: Mominali has NO ROI generated today!');
      console.log(`   Eligible for ROI: ${(mominali.totalInvested > 0 || mominali.wallet?.capital > 0) ? '✅ YES' : '❌ NO'}`);
    }

    mongoose.connection.close();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();

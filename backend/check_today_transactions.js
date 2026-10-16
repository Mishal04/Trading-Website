#!/usr/bin/env node

const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    
    const profitTx = await Transaction.countDocuments({
      type: 'profit',
      createdAt: { $gte: startOfToday }
    });

    const commissionTx = await Transaction.countDocuments({
      type: 'commission',
      createdAt: { $gte: startOfToday }
    });

    console.log(`ROI Transactions: ${profitTx}`);
    console.log(`Commission Transactions: ${commissionTx}`);
    console.log(`Total: ${profitTx + commissionTx}`);

    // Sample some to see levels
    if (commissionTx > 0) {
      const sample = await Transaction.find({
        type: 'commission',
        createdAt: { $gte: startOfToday }
      }).limit(20);

      console.log('\nSample Commissions:');
      sample.forEach(tx => {
        const match = tx.description.match(/L(\d+)/);
        const level = match ? match[1] : '?';
        console.log(`  L${level}: $${tx.amount.toFixed(2)} - ${tx.description.substring(0, 60)}`);
      });

      // Check max level
      const allComm = await Transaction.find({
        type: 'commission',
        createdAt: { $gte: startOfToday }
      });

      const levels = new Set();
      allComm.forEach(tx => {
        const match = tx.description.match(/L(\d+)/);
        if (match) levels.add(parseInt(match[1]));
      });

      const maxLevel = Math.max(...levels);
      console.log(`\nMax level reached: L${maxLevel}`);
      console.log(`${maxLevel >= 5 ? '✅ L5+' : '❌ Only up to L4'}`);
    }

    mongoose.connection.close();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();

#!/usr/bin/env node
/**
 * SHOW: Which investors contributed to today's commissions?
 * Shows the source investor for each commission.
 */

const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    console.log('═'.repeat(80));
    console.log('WHO PAID COMMISSIONS TODAY?');
    console.log('═'.repeat(80) + '\n');

    // Get all commissions and extract source investor names
    const commissions = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: startOfToday }
    });

    console.log(`Total commissions: ${commissions.length}\n`);

    // Parse investor names from descriptions
    const investorMap = {};

    commissions.forEach(tx => {
      // Description format: "L1 commission ... from {investor_name}'s ..."
      const match = tx.description.match(/from\s+([^']+)'s/);
      if (match) {
        const investorName = match[1];
        if (!investorMap[investorName]) {
          investorMap[investorName] = { count: 0, total: 0, levels: new Set() };
        }
        investorMap[investorName].count++;
        investorMap[investorName].total += tx.amount;
        
        const levelMatch = tx.description.match(/L(\d+)/);
        if (levelMatch) {
          investorMap[investorName].levels.add(levelMatch[1]);
        }
      }
    });

    console.log('Investors who paid commissions:');
    Object.keys(investorMap).forEach(name => {
      const data = investorMap[name];
      const levels = Array.from(data.levels).sort((a, b) => a - b).join(', ');
      console.log(`  ${name}: ${data.count} commissions, $${data.total.toFixed(2)}, Levels: ${levels}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('PROBLEM: Only 2-3 investors paid commissions today?');
    console.log('Expected: ~100+ investors should have paid (they all got ROI)');
    console.log('═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();

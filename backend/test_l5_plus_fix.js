#!/usr/bin/env node
/**
 * TEST L5+ COMMISSION FIX
 * 
 * Verify that users with deep downlines now receive L5+ commissions
 * based purely on network depth, not unlock restrictions.
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('TEST: L5+ COMMISSION FIX VERIFICATION');
    console.log('═'.repeat(80) + '\n');

    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    // Test case 1: Farhankhan should receive L5 from Muhammad Rizwan (L5 upline is Muhammadhussain with 5 directs)
    const rizwan = await User.findOne({ name: 'Muhammad Rizwan' }).populate('ancestorPath', '_id name directCount');
    if (!rizwan) {
      console.log('❌ Muhammad Rizwan not found');
      process.exit(1);
    }

    const l5UpslineName = rizwan.ancestorPath[4]?.name || 'Unknown';
    
    console.log('Test Case 1: Muhammad Rizwan');
    console.log(`  Ancestors: ${rizwan.ancestorPath.length} levels`);
    console.log(`  L5 Upline: ${l5UpslineName}`);

    // Check for L5 commission from Muhammad Rizwan today
    const l5Commissions = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: startOfToday },
      description: { $regex: `L5.*from.*Muhammad Rizwan` }
    });

    if (l5Commissions.length > 0) {
      console.log(`  ✅ L5 commission FOUND`);
      l5Commissions.forEach((tx, idx) => {
        console.log(`     [${idx + 1}] $${tx.amount.toFixed(2)} to ${tx.userId}`);
      });
    } else {
      console.log(`  ⚠️  L5 commission NOT FOUND - run daily profit job to process\n`);
    }

    // Check commission distribution depth
    const allCommissionsFromRizwan = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: startOfToday },
      description: { $regex: `from.*Muhammad Rizwan` }
    });

    if (allCommissionsFromRizwan.length > 0) {
      console.log(`\n  All commissions from Muhammad Rizwan today:`);
      const levelMap = {};
      allCommissionsFromRizwan.forEach(tx => {
        const match = tx.description.match(/L(\d+)/);
        if (match) {
          const level = `L${match[1]}`;
          if (!levelMap[level]) levelMap[level] = [];
          levelMap[level].push(tx.amount);
        }
      });
      
      Object.keys(levelMap).sort().forEach(level => {
        const total = levelMap[level].reduce((a, b) => a + b, 0);
        console.log(`    ${level}: ${levelMap[level].length} commission(s), Total: $${total.toFixed(2)}`);
      });

      const maxLevel = Math.max(...Object.keys(levelMap).map(l => parseInt(l.substring(1))));
      console.log(`\n  Max level paid: L${maxLevel}`);
      console.log(`  ${maxLevel >= 5 ? '✅ PASS - L5+ commissions flowing' : '❌ FAIL - L5+ not reached'}\n`);
    }

    // Test case 2: Check users who should have received L5+
    console.log('═'.repeat(80));
    console.log('Checking all users for L5+ commissions today:\n');

    const allL5Plus = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: startOfToday },
      description: { $regex: 'L(5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21)' }
    });

    console.log(`Total L5+ commissions today: ${allL5Plus.length}`);
    
    const l5PlusByLevel = {};
    let totalL5PlusPaid = 0;

    allL5Plus.forEach(tx => {
      const match = tx.description.match(/L(\d+)/);
      if (match) {
        const level = parseInt(match[1]);
        if (!l5PlusByLevel[level]) {
          l5PlusByLevel[level] = { count: 0, total: 0 };
        }
        l5PlusByLevel[level].count++;
        l5PlusByLevel[level].total += tx.amount;
        totalL5PlusPaid += tx.amount;
      }
    });

    if (Object.keys(l5PlusByLevel).length > 0) {
      console.log('\nL5+ Commission Distribution:');
      Object.keys(l5PlusByLevel)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(level => {
          const data = l5PlusByLevel[level];
          console.log(`  L${level}: ${data.count} transactions, $${data.total.toFixed(2)} total`);
        });
      console.log(`\nTotal L5+ Paid: $${totalL5PlusPaid.toFixed(2)}`);
      console.log('\n✅ L5+ COMMISSIONS ARE FLOWING!');
    } else {
      console.log('\n⚠️  No L5+ commissions found today');
      console.log('   Run: node reset_today_and_rerun.js');
      console.log('   Then: node manual_profit_run.js --force');
    }

    console.log('\n' + '═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();

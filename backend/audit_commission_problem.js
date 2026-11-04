#!/usr/bin/env node
/**
 * AUDIT: Why aren't commissions being calculated beyond L4?
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('AUDITING COMMISSION CALCULATION PROBLEM');
    console.log('═'.repeat(80) + '\n');

    // Get all users with ROI today
    const usersWithCapital = await User.find({
      isActive: true
    }).select('_id name email wallet ancestorPath directCount')
      .populate('ancestorPath', '_id name');

    console.log(`Found ${usersWithCapital.length} active users\n`);

    // Analyze
    let usersWithL5Plus = 0;
    let usersWithShortPath = 0;

    const examples = [];

    for (const user of usersWithCapital) {
      if (!user.wallet?.capital && !user.wallet?.roi) {
        // Needs ROI to generate commissions
        continue;
      }

      if (!user.ancestorPath || user.ancestorPath.length < 5) {
        usersWithShortPath++;
        continue;
      }

      usersWithL5Plus++;

      if (examples.length < 10) {
        examples.push({
          name: user.name,
          pathLength: user.ancestorPath.length,
          ancestorNames: user.ancestorPath.map(a => a.name).join(' ← ')
        });
      }
    }

    console.log(`Users with L5+ potential: ${usersWithL5Plus}`);
    console.log(`Users with short path: ${usersWithShortPath}\n`);

    console.log('Examples of L5+ Users:');
    examples.forEach(ex => {
      console.log(`  ${ex.name} (${ex.pathLength} levels)`);
      console.log(`    Path: ${ex.ancestorNames}`);
    });

    // Now check: for users with L5+ path, why no L5+ commission?
    console.log('\n' + '═'.repeat(80));
    console.log('Checking: Did Commission Phase execute?\n');

    const LEVEL_RATES = require('./config/constants').LEVEL_RATES;
    console.log('LEVEL_RATES mapping:');
    [1, 2, 3, 4, 5, 6, 10, 21].forEach(i => {
      console.log(`  L${i}: ${LEVEL_RATES[i]}%`);
    });

    console.log('\nIf LEVEL_RATES are defined, Phase 2 should have processed L5+');
    console.log('If only L1-L4 commissions exist, something is filtering L5+\n');

    // Check if there's a loop limit
    console.log('Checking profitService.js loop limit...');
    const fs = require('fs');
    const profitContent = fs.readFileSync('./src/services/profitService.js', 'utf8');

    if (profitContent.includes('positionIndex < 4')) {
      console.log('⚠️  FOUND: Loop limited to positionIndex < 4 (only L1-L4)!');
    } else if (profitContent.includes('positionIndex < investor.ancestorPath.length')) {
      console.log('✓ Loop iterates full ancestorPath');
    }

    if (profitContent.includes('if (networkPosition > 21)')) {
      console.log('✓ Loop breaks at L21');
    }

    console.log('\n' + '═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();

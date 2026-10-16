#!/usr/bin/env node
/**
 * DIAGNOSE MISSING L5+ COMMISSIONS
 * 
 * Finds users who:
 * 1. Have deep downline (L5+ members with capital)
 * 2. But are NOT receiving L5+ commissions
 * 3. Because of faulty unlock-level checking
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
const CommissionLog = require('./src/models/CommissionLog');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('DIAGNOSING MISSING L5+ COMMISSION BUG');
    console.log('═'.repeat(80) + '\n');

    // Get start of today
    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    
    // Find users with at least 5+ levels deep
    const potentialVictims = await User.find({
      'ancestorPath': { $exists: true },
      isActive: true,
      totalInvested: { $gt: 0 }
    }).populate('ancestorPath', '_id name directCount');

    console.log(`Found ${potentialVictims.length} users with ancestors\n`);

    const problemCases = [];

    // For each user, check if they have L5+ members but uplines aren't eligible for L5+
    for (const user of potentialVictims) {
      if (!user.ancestorPath || user.ancestorPath.length < 5) {
        continue;  // Need at least L5
      }

      // Get L5 upline (index 4)
      const l5Upline = user.ancestorPath[4];
      
      if (!l5Upline) continue;

      // Check: Does L5 upline have unlock-level restriction?
      const l5DirectCount = l5Upline.directCount || 0;
      const l5MaxLevel = (l5DirectCount >= 10) ? 21 : (l5DirectCount * 2);

      if (l5MaxLevel < 5) {
        // L5 upline doesn't have L5 unlocked!
        // This means they SHOULD be receiving commissions from L1-L4 but NOT L5+

        // Check if they actually received L5+ commissions (they shouldn't have)
        const l5Commissions = await Transaction.find({
          userId: l5Upline._id,
          type: 'commission',
          createdAt: { $gte: startOfToday },
          description: { $regex: 'L5|L6|L7|L8|L9|L10|L11|L12|L13|L14|L15|L16|L17|L18|L19|L20|L21' }
        });

        if (l5Commissions.length > 0) {
          problemCases.push({
            user: user.name,
            ancestors: user.ancestorPath.length,
            l5Upline: l5Upline.name,
            l5DirectCount: l5DirectCount,
            l5MaxLevel,
            incorrectL5PlusCommissions: l5Commissions.length,
            totalReceived: l5Commissions.reduce((s, tx) => s + tx.amount, 0)
          });
        }
      }
    }

    if (problemCases.length > 0) {
      console.log(`Found ${problemCases.length} users with INCORRECT L5+ commission restrictions:\n`);
      
      problemCases.forEach((pc, idx) => {
        console.log(`${idx + 1}. ${pc.user}`);
        console.log(`   L5 Upline: ${pc.l5Upline}`);
        console.log(`   L5 Direct Count: ${pc.l5DirectCount}`);
        console.log(`   L5 Max Level Unlocked: L${pc.l5MaxLevel}`);
        console.log(`   L5+ Commissions Received: ${pc.incorrectL5PlusCommissions}`);
        console.log(`   Total from L5+: $${pc.totalReceived.toFixed(2)}`);
        console.log();
      });
    } else {
      console.log('No obvious L5+ commission lock issues found (or all within unlock rules).\n');
    }

    // Now find users who SHOULD have L5+ but DON'T
    console.log('═'.repeat(80));
    console.log('FINDING USERS WHO SHOULD RECEIVE L5+ BUT DON\'T:\n');

    const missingL5Cases = [];

    for (const user of potentialVictims) {
      if (!user.ancestorPath || user.ancestorPath.length < 5) continue;

      // Check: Do we have L5 upline with sufficient directs?
      const l5Upline = user.ancestorPath[4];
      if (!l5Upline) continue;

      // L5 upline needs to be ELIGIBLE (has capital/investment)
      const l5User = await User.findById(l5Upline._id).select('totalInvested wallet directCount');
      if (!l5User || (l5User.totalInvested || 0) <= 0) continue;

      // Check: Did we receive L5 commission from this user today?
      const hasL5Comm = await Transaction.findOne({
        userId: l5Upline._id,
        type: 'commission',
        createdAt: { $gte: startOfToday },
        description: { $regex: `L5.*from ${user.name}` }
      });

      if (!hasL5Comm) {
        // Missing L5 commission!
        const l5DirectCount = l5User.directCount || 0;
        const maxLevel = (l5DirectCount >= 10) ? 21 : (l5DirectCount * 2);
        
        missingL5Cases.push({
          investorName: user.name,
          l5UpslineName: l5Upline.name,
          l5DirectCount,
          l5MaxUnlockedLevel: maxLevel,
          shouldPayL5: maxLevel >= 5,
          reason: maxLevel < 5 ? 'L5 not unlocked for upline' : 'Unknown - should have paid'
        });
      }
    }

    if (missingL5Cases.length > 0) {
      console.log(`Found ${missingL5Cases.length} investors with missing L5+ commissions:\n`);
      
      missingL5Cases.slice(0, 20).forEach((mc, idx) => {
        console.log(`${idx + 1}. Investor: ${mc.investorName}`);
        console.log(`   L5 Upline: ${mc.l5UpslineName}`);
        console.log(`   L5 Direct Count: ${mc.l5DirectCount}`);
        console.log(`   L5 Max Level: L${mc.l5MaxUnlockedLevel}`);
        console.log(`   Should Pay L5: ${mc.shouldPayL5 ? 'YES' : 'NO'}`);
        console.log(`   Missing?: ${mc.shouldPayL5 ? '⚠️  YES - BUG' : 'Expected (unlock)' }`);
        console.log();
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('ROOT CAUSE ANALYSIS:');
    console.log('═'.repeat(80) + '\n');

    console.log(`The profitBasedCommissionService.js checks if each upline has unlocked that level:`);
    console.log(`\n  const unlockedLevelNumbers = constants.getUnlockedLevelNumbers(upline.directCount || 0);`);
    console.log(`  if (!unlockedLevelNumbers.includes(levelNumber)) {`);
    console.log(`    continue;  // ← SKIPS L5+ if upline doesn't have enough directs`);
    console.log(`  }`);
    console.log(`\nThis is WRONG for DEPTH-BASED commissions. A user at NETWORK DEPTH L5`);
    console.log(`should pay their upline at L5 position regardless of how many directs they have.`);
    console.log(`\nFIX: Remove the unlock-level check from profitBasedCommissionService.js\n`);

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();

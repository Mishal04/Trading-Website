const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const User = require('../src/models/User');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading_db');
    console.log('✅ Connected to MongoDB\n');

    // ─────────────────────────────────────────────────────────────────────
    // 1. FIND ALL USERS WITH ANCESTORS (have referredBy)
    // ─────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('USERS WITH REFERRAL RELATIONSHIPS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const usersWithAncestors = await User.find({ referredBy: { $ne: null } })
      .populate('referredBy', 'name email directCount')
      .sort({ createdAt: -1 });
    
    console.log(`Total users with referrer: ${usersWithAncestors.length}\n`);
    
    for (const user of usersWithAncestors) {
      console.log(`User: ${user.name} (${user.email})`);
      console.log(`  Referred By: ${user.referredBy?.name} (${user.referredBy?.email})`);
      console.log(`  ancestorPath length: ${user.ancestorPath?.length || 0}`);
      console.log(`  ancestorPath: [${user.ancestorPath?.map(id => id.toString().substring(0, 8)).join(', ') || 'empty'}]`);
      console.log(`  directCount: ${user.directCount}`);
      console.log(`  unlockedLevels: ${user.unlockedLevels}`);
      console.log(`  totalInvested: $${user.totalInvested}`);
      console.log(`  isActive: ${user.isActive}`);
      console.log('');
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. EXPAND ANCESTOR PATHS (resolve IDs to names)
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('FULL ANCESTOR CHAIN RESOLUTION');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    for (const user of usersWithAncestors.slice(0, 10)) {
      console.log(`\n${user.name}:`);
      
      if (!user.ancestorPath || user.ancestorPath.length === 0) {
        console.log('  ❌ ancestorPath is EMPTY (broken!)');
        continue;
      }

      const chain = [];
      for (let i = 0; i < user.ancestorPath.length; i++) {
        const ancestorId = user.ancestorPath[i];
        const ancestor = await User.findById(ancestorId).select('name directCount isActive totalInvested');
        if (ancestor) {
          chain.push(`L${i+1}: ${ancestor.name} (directs=${ancestor.directCount}, invested=$${ancestor.totalInvested})`);
        } else {
          chain.push(`L${i+1}: MISSING (${ancestorId})`);
        }
      }
      
      chain.forEach(c => console.log(`  ${c}`));
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. FIND LONGEST ANCESTOR PATHS
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('LONGEST ANCESTOR PATHS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const pathStats = {};
    for (const user of usersWithAncestors) {
      const len = user.ancestorPath?.length || 0;
      pathStats[len] = (pathStats[len] || 0) + 1;
    }
    
    Object.keys(pathStats).sort((a, b) => b - a).forEach(len => {
      console.log(`  ${len} ancestors: ${pathStats[len]} users`);
    });

    const maxPathLen = Math.max(...Object.keys(pathStats).map(Number));
    if (maxPathLen > 0) {
      const longestPathUsers = usersWithAncestors.filter(u => u.ancestorPath?.length === maxPathLen);
      console.log(`\nUsers with longest path (${maxPathLen}):`);
      longestPathUsers.forEach(u => {
        console.log(`  ${u.name} (${u.email})`);
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. CHECK LEVEL UNLOCK REQUIREMENTS
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('LEVEL UNLOCK RULE VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    const constants = require('../config/constants');
    const unlockRules = constants.LEVEL_UNLOCK_RULES;
    const levelRates = constants.LEVEL_RATES;

    console.log('To receive commission at each level, upline must have unlocked that level:');
    console.log('(Based on LEVEL_UNLOCK_RULES in constants.js)\n');
    
    Object.keys(unlockRules).sort((a, b) => a - b).forEach(directs => {
      const levelsUnlocked = unlockRules[directs];
      console.log(`  ${directs} direct referral(s) → unlocks ${levelsUnlocked} levels`);
    });

    console.log('\nLevel Rate Structure:');
    levelRates.forEach((rate, i) => {
      console.log(`  L${i+1}: ${rate}%`);
    });

    // ─────────────────────────────────────────────────────────────────────
    // 5. ANALYZE WHO CAN RECEIVE LEVEL 2 COMMISSION
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('WHO CAN RECEIVE LEVEL 2 COMMISSION');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('To receive L2 commission, upline must:');
    console.log('1. Have at least 1 direct referral (L1 requires 1 direct)');
    console.log('2. Have at least 2 directs (L2 requires 2 directs per LEVEL_UNLOCK_RULES)\n');

    const usersWithAtLeast2Directs = await User.find({ directCount: { $gte: 2 }, isActive: true, totalInvested: { $gt: 0 } });
    console.log(`Users with 2+ directs who can receive L2: ${usersWithAtLeast2Directs.length}`);
    usersWithAtLeast2Directs.slice(0, 5).forEach(u => {
      console.log(`  ${u.name}: ${u.directCount} directs, unlockedLevels=${u.unlockedLevels}`);
    });

    console.log('\n✅ Analysis complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();

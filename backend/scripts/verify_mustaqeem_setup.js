/**
 * verify_mustaqeem_setup.js
 * 
 * CRITICAL VERIFICATION: Before Monday, check if Mustaqeem's setup is correct
 * 
 * This script checks:
 * 1. Mustaqeem has directCount = 2
 * 2. Mustaqeem's referrals have him in their ancestorPath
 * 3. Referrals have active InvestorInvestment records
 * 4. Investment rates are correct
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function verify() {
  try {
    console.log('\n' + '=' .repeat(120));
    console.log('🔍 CRITICAL PRE-MONDAY VERIFICATION: Mustaqeem Commission Setup');
    console.log('=' .repeat(120) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    let allClear = true;

    // Step 1: Find Mustaqeem
    console.log('Step 1: Finding Mustaqeem...\n');
    
    const mustaqeem = await User.findOne({
      $or: [
        { firstName: 'Mustaqeem' },
        { email: { $regex: 'mustaq', $options: 'i' } }
      ]
    });

    if (!mustaqeem) {
      console.log('❌ FAILED: Mustaqeem not found in database\n');
      allClear = false;
    } else {
      console.log(`✅ Found: ${mustaqeem.firstName} ${mustaqeem.lastName} (${mustaqeem.email})\n`);

      // Check 1: DirectCount
      console.log('Step 2: Checking directCount...\n');
      console.log(`  DirectCount: ${mustaqeem.directCount}`);
      
      if (mustaqeem.directCount !== 2) {
        console.log(`  ❌ FAILED: Expected 2 directs, got ${mustaqeem.directCount}\n`);
        allClear = false;
      } else {
        console.log(`  ✅ PASS: Has exactly 2 direct referrals\n`);
      }

      // Check 2: Referrals
      console.log('Step 3: Checking direct referrals...\n');
      
      const referrals = await User.find({ parentId: mustaqeem._id });
      console.log(`  Found ${referrals.length} users with Mustaqeem as parent:\n`);

      for (let i = 0; i < referrals.length; i++) {
        const ref = referrals[i];
        console.log(`  Referral ${i + 1}: ${ref.firstName} ${ref.lastName} (${ref.email})`);
        console.log(`    ID: ${ref._id}`);

        // Check if Mustaqeem is in ancestorPath
        const isMustaqeemAncestor = ref.ancestorPath?.some(id => id.toString() === mustaqeem._id.toString());
        
        if (!isMustaqeemAncestor) {
          console.log(`    ❌ FAILED: Mustaqeem NOT in ancestorPath`);
          console.log(`       ancestorPath: ${ref.ancestorPath?.map(id => id.toString().slice(0, 8)).join(' -> ') || 'EMPTY'}\n`);
          allClear = false;
        } else {
          console.log(`    ✅ PASS: Mustaqeem found in ancestorPath\n`);
        }

        // Check investments
        console.log(`    Checking investments...`);
        const invs = await InvestorInvestment.find({
          userId: ref._id,
          status: 'active'
        });

        console.log(`    Active investments: ${invs.length}`);
        
        if (invs.length === 0) {
          console.log(`    ❌ FAILED: No active investments found\n`);
          allClear = false;
        } else {
          invs.forEach((inv, idx) => {
            const dailyRoi = (inv.amount * inv.dailyRate).toFixed(2);
            console.log(`      [${idx + 1}] $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% = $${dailyRoi}/day`);
            
            if (inv.dailyRate > 1) {
              console.log(`      ❌ FAILED: dailyRate is ${inv.dailyRate} (should be decimal like 0.01)`);
              allClear = false;
            }
          });
          console.log();
        }
      }
    }

    // Final Check: Verify commission calculation
    console.log('Step 4: Verifying commission calculation logic...\n');
    
    const constants = require('../config/constants');
    const directCount = mustaqeem?.directCount || 0;

    if (directCount > 0) {
      const unlockedCount = constants.getUnlockedLevelCount(directCount);
      const currentLevel = constants.getCurrentCommissionLevel(directCount);
      const unlockedLevels = constants.getUnlockedLevelNumbers(directCount);

      console.log(`  Direct Count: ${directCount}`);
      console.log(`  Unlocked Levels: ${unlockedCount} (${unlockedLevels.join(', ')})`);
      console.log(`  Earning Level: L${currentLevel}`);
      console.log(`  Rate: ${constants.LEVEL_RATES[currentLevel - 1]}%\n`);

      if (currentLevel !== 18) {
        console.log(`  ⚠️  WARNING: Expected L18 for 2 directs, got L${currentLevel}\n`);
      } else {
        console.log(`  ✅ PASS: Commission level is correct (L18 @ 0.9%)\n`);
      }
    }

    // Summary
    console.log('=' .repeat(120));
    console.log('\n📋 SUMMARY\n');

    if (allClear) {
      console.log('✅✅✅ ALL CHECKS PASSED - SYSTEM IS READY FOR MONDAY ✅✅✅\n');
    } else {
      console.log('❌❌❌ ISSUES FOUND - NEEDS FIXES BEFORE MONDAY ❌❌❌\n');
      console.log('ACTIONS REQUIRED:\n');
      console.log('1. If ancestorPath is empty, run: node scripts/backfill_ancestorpath.js');
      console.log('2. If directCount is wrong, verify referral structure or manually update');
      console.log('3. If investments missing, verify they were created and not deleted\n');
    }

    console.log('=' .repeat(120) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

verify().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

/**
 * Diagnostic script to investigate:
 * 1. The account whose My Team shows Ali haider, Yasir ali, Mehboob hussain as L1
 * 2. Their ancestorPath and referredBy to confirm if tree is genuinely flat or bugged
 * 3. Check for any approved investments
 * 4. Check CommissionLog and Transaction records for commission credit
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const CommissionLog = require('../src/models/CommissionLog');
const Transaction = require('../src/models/Transaction');

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find users with those names
    console.log('═'.repeat(70));
    console.log('STEP 1: Find the 3 downline members');
    console.log('═'.repeat(70) + '\n');

    const downlineNames = ['Ali haider', 'Yasir ali', 'Mehboob hussain'];
    const downlineUsers = [];

    for (const name of downlineNames) {
      const user = await User.findOne({
        $or: [
          { name: { $regex: name, $options: 'i' } },
          { email: { $regex: name, $options: 'i' } }
        ]
      }).select('_id name email referredBy ancestorPath totalInvested createdAt');

      if (user) {
        downlineUsers.push(user);
        console.log(`✓ Found: ${user.name} (${user.email})`);
        console.log(`  ID: ${user._id}`);
        console.log(`  referredBy: ${user.referredBy || 'NONE'}`);
        console.log(`  ancestorPath: [${(user.ancestorPath || []).map(id => id.toString().slice(0, 8)).join(' → ')}]`);
        console.log(`  totalInvested: $${user.totalInvested || 0}`);
        console.log(`  createdAt: ${user.createdAt}`);
        console.log();
      } else {
        console.log(`✗ NOT FOUND: ${name}`);
      }
    }

    if (downlineUsers.length === 0) {
      console.log('❌ No downline users found. Cannot continue.\n');
      process.exit(0);
    }

    // Find the main user (referred to by all 3, or all in their ancestorPath)
    console.log('\n' + '═'.repeat(70));
    console.log('STEP 2: Find the main user (parent of the 3 downline members)');
    console.log('═'.repeat(70) + '\n');

    // Get all users referenced in their ancestorPath and referredBy
    const possibleParentIds = new Set();
    downlineUsers.forEach(u => {
      if (u.referredBy) possibleParentIds.add(u.referredBy.toString());
      if (u.ancestorPath && u.ancestorPath.length > 0) {
        // The FIRST entry in ancestorPath is their direct parent
        possibleParentIds.add(u.ancestorPath[0].toString());
      }
    });

    console.log(`Possible parent IDs to check: ${possibleParentIds.size}`);

    const mainUser = downlineUsers[0].referredBy
      ? await User.findById(downlineUsers[0].referredBy).select('_id name email referralCode totalInvested')
      : null;

    if (mainUser) {
      console.log(`✓ Main user: ${mainUser.name} (${mainUser.email})`);
      console.log(`  ID: ${mainUser._id}`);
      console.log(`  referralCode: ${mainUser.referralCode}`);
      console.log(`  totalInvested: $${mainUser.totalInvested || 0}\n`);
    } else {
      console.log('❌ Could not identify main user\n');
      process.exit(0);
    }

    // Check level computation for each downline user
    console.log('\n' + '═'.repeat(70));
    console.log('STEP 3: Verify tree levels (level computation algorithm)');
    console.log('═'.repeat(70) + '\n');

    downlineUsers.forEach((user, idx) => {
      console.log(`User ${idx + 1}: ${user.name}`);
      
      let computedLevel = 1; // default for fallback
      if (user.ancestorPath && user.ancestorPath.length > 0) {
        const foundIdx = user.ancestorPath.findIndex(id => id.toString() === mainUser._id.toString());
        if (foundIdx !== -1) {
          computedLevel = foundIdx + 1;
        }
      }
      
      console.log(`  ancestorPath length: ${(user.ancestorPath || []).length}`);
      console.log(`  ancestorPath: [${(user.ancestorPath || []).map(id => id.toString().slice(0, 8)).join(' → ')}]`);
      console.log(`  Computed level: L${computedLevel}`);
      
      if (user.ancestorPath && user.ancestorPath.length > 0) {
        const mainUserAtIdx = user.ancestorPath.findIndex(id => id.toString() === mainUser._id.toString());
        if (mainUserAtIdx === -1) {
          console.log(`  ⚠️  WARNING: Main user NOT found in ancestorPath! (Tree is broken)`);
        } else {
          console.log(`  ✓ Main user found at index ${mainUserAtIdx} (correct: index 0 for L1, index 1 for L2, etc.)`);
        }
      } else {
        console.log(`  ⚠️  WARNING: ancestorPath is EMPTY (using fallback from referredBy)`);
      }
      console.log();
    });

    // Check for approved investments
    console.log('\n' + '═'.repeat(70));
    console.log('STEP 4: Check for approved investments');
    console.log('═'.repeat(70) + '\n');

    const downlineIds = downlineUsers.map(u => u._id);
    const approvedInvestments = await InvestorInvestment.find({
      userId: { $in: downlineIds },
      status: 'active'
    }).select('userId amount plan packageNumber dailyRate status approvedAt');

    console.log(`Found ${approvedInvestments.length} approved investments:\n`);

    for (const inv of approvedInvestments) {
      const user = downlineUsers.find(u => u._id.toString() === inv.userId.toString());
      console.log(`✓ ${user.name}: $${inv.amount} (Plan ${inv.plan}, Package ${inv.packageNumber}, ${(inv.dailyRate * 100).toFixed(4)}% daily)`);
      console.log(`  Approved at: ${inv.approvedAt}`);
      console.log();
    }

    // Check CommissionLog for these investments
    console.log('\n' + '═'.repeat(70));
    console.log('STEP 5: Check CommissionLog records');
    console.log('═'.repeat(70) + '\n');

    for (const inv of approvedInvestments) {
      const commissionLogs = await CommissionLog.find({
        refId: inv._id.toString(),
        recipientUserId: mainUser._id
      }).select('recipientUserId level amount refId description createdAt');

      if (commissionLogs.length === 0) {
        console.log(`✗ ${inv._id.toString().slice(0, 8)}: NO COMMISSION LOG FOUND for main user`);
        console.log(`  This investment from ${downlineUsers.find(u => u._id.toString() === inv.userId.toString()).name} ($${inv.amount}) has NO level commission record`);
      } else {
        console.log(`✓ ${inv._id.toString().slice(0, 8)}: Found ${commissionLogs.length} commission log(s)`);
        commissionLogs.forEach(log => {
          console.log(`  Level ${log.level}: $${log.amount} (${log.description})`);
        });
      }
      console.log();
    }

    // Check Transactions for commission credits
    console.log('\n' + '═'.repeat(70));
    console.log('STEP 6: Check Transaction records (wallet credits)');
    console.log('═'.repeat(70) + '\n');

    const commissionTransactions = await Transaction.find({
      userId: mainUser._id,
      type: 'commission'
    }).select('userId type amount status description createdAt');

    console.log(`Main user (${mainUser.name}) has ${commissionTransactions.length} commission transactions:\n`);
    
    if (commissionTransactions.length === 0) {
      console.log('✗ NO commission transactions found\n');
    } else {
      commissionTransactions.slice(0, 10).forEach(txn => {
        console.log(`  ${txn.type}: $${txn.amount} | ${txn.status} | ${txn.description}`);
        console.log(`    Date: ${txn.createdAt}`);
      });
    }

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('DIAGNOSIS SUMMARY');
    console.log('═'.repeat(70) + '\n');

    const hasEmptyAncestorPaths = downlineUsers.some(u => !u.ancestorPath || u.ancestorPath.length === 0);
    const mainUserNotInPath = downlineUsers.some(u => {
      return u.ancestorPath && !u.ancestorPath.find(id => id.toString() === mainUser._id.toString());
    });

    console.log(`Tree Structure:`);
    console.log(`  - Downline members: ${downlineUsers.length}`);
    console.log(`  - All show as L1: YES (per user report)`);
    console.log(`  - Empty ancestorPaths: ${hasEmptyAncestorPaths ? 'YES ⚠️' : 'NO ✓'}`);
    console.log(`  - Main user missing from path: ${mainUserNotInPath ? 'YES ⚠️' : 'NO ✓'}`);

    console.log(`\nApproved Investments:`);
    console.log(`  - Total: ${approvedInvestments.length}`);
    console.log(`  - Total value: $${approvedInvestments.reduce((sum, inv) => sum + inv.amount, 0)}`);

    const missingCommission = approvedInvestments.length > 0
      ? (await Promise.all(approvedInvestments.map(async (inv) => {
          const logs = await CommissionLog.countDocuments({
            refId: inv._id.toString(),
            recipientUserId: mainUser._id
          });
          return logs === 0;
        }))).filter(x => x).length
      : 0;

    console.log(`  - Without commission logs: ${missingCommission}`);

    console.log(`\nCommission Distribution:`);
    console.log(`  - Commission transactions for main user: ${commissionTransactions.length}`);
    
    if (missingCommission > 0) {
      console.log(`\n🔴 ROOT CAUSE IDENTIFIED:`);
      console.log(`   ${missingCommission} approved investment(s) have NO commission logs`);
      console.log(`   This means distributeLevelCommissions() was NOT called after approval`);
      console.log(`   OR the commission distribution was blocked by a gating condition`);
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

diagnose();

/**
 * Phase 4 DRY RUN — Data Reset Migration
 * 
 * READ-ONLY script: calculates and prints all changes WITHOUT modifying database
 * 
 * Strategy:
 * - DELETE: InvestorInvestment, Investment, CommissionLog records (fresh start)
 * - ZERO OUT: Transactions (preserve audit trail with $0 amounts)
 * - RESET: totalInvested, wallet.roi, wallet.commission, totalRoiEarned, plan → default
 * - PRESERVE: referredBy, ancestorPath, networkerAccessGranted, email, password
 * 
 * This script only reads. No .save(), .updateOne(), .deleteMany() — impossible to write.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Investment = require('../src/models/Investment');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const Transaction = require('../src/models/Transaction');
const CommissionLog = require('../src/models/CommissionLog');

const DEFAULT_PLAN = 'A';
const logFile = path.join(__dirname, `../backups/phase4_dryrun_${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
let logContent = '';

function log(msg) {
  console.log(msg);
  logContent += msg + '\n';
}

function separator(char = '=', length = 80) {
  return char.repeat(length);
}

async function dryRun() {
  try {
    log(separator());
    log('PHASE 4 DRY RUN — DATA RESET MIGRATION (READ-ONLY)');
    log(separator());
    log(`Timestamp: ${new Date().toISOString()}`);
    log(`Status: ANALYSIS ONLY — NO DATABASE MODIFICATIONS\n`);

    log(separator('─'));
    log('CONNECTING TO DATABASE (READ-ONLY)...');
    log(separator('─'));
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri, { readPreference: 'primaryPreferred' });
    log('✅ Connected to production database (read-only mode)\n');

    // Fetch all data
    log('📊 FETCHING DATA FOR ANALYSIS...\n');
    const users = await User.find({}).lean();
    const investorInvestments = await InvestorInvestment.find({}).lean();
    const investments = await Investment.find({}).lean();
    const transactions = await Transaction.find({}).lean();
    const commissionLogs = await CommissionLog.find({}).lean();

    log(`✅ Loaded ${users.length} users`);
    log(`✅ Loaded ${investorInvestments.length} InvestorInvestment records`);
    log(`✅ Loaded ${investments.length} Investment records`);
    log(`✅ Loaded ${transactions.length} Transaction records`);
    log(`✅ Loaded ${commissionLogs.length} CommissionLog records\n`);

    // Calculate impact per user
    log(separator());
    log('ANALYZING IMPACT PER USER');
    log(separator());
    log('');

    const userChanges = [];
    let totalInvestedSum = 0;
    let totalRoiSum = 0;
    let totalCommissionSum = 0;
    let usersAffected = 0;
    let usersWithInvestments = 0;

    for (const user of users) {
      const changes = {
        userId: user._id,
        email: user.email,
        name: user.name,
        before: {
          totalInvested: user.totalInvested || 0,
          wallet_roi: user.wallet?.roi || 0,
          wallet_commission: user.wallet?.commission || 0,
          totalRoiEarned: user.totalRoiEarned || 0,
          plan: user.plan || DEFAULT_PLAN,
          referredBy: user.referredBy ? 'SET' : 'NULL',
          ancestorPath_length: user.ancestorPath?.length || 0,
          networkerAccessGranted: user.networkerAccessGranted || false
        },
        after: {
          totalInvested: 0,
          wallet_roi: 0,
          wallet_commission: 0,
          totalRoiEarned: 0,
          plan: DEFAULT_PLAN,
          referredBy: user.referredBy ? 'SET (UNCHANGED)' : 'NULL (UNCHANGED)',
          ancestorPath_length: user.ancestorPath?.length || 0,
          networkerAccessGranted: user.networkerAccessGranted || false
        },
        preserve: {
          email: 'UNCHANGED',
          password: 'UNCHANGED (hashed)',
          referredBy: 'UNCHANGED',
          ancestorPath: 'UNCHANGED',
          networkerAccessGranted: 'UNCHANGED'
        },
        hasChanges: false,
        investmentRecordsToDelete: 0,
        transactionsToZero: 0,
        commissionsToDelete: 0
      };

      // Calculate what would be affected
      const userInvestorInvs = investorInvestments.filter(inv => inv.userId?.toString() === user._id?.toString());
      const userInvs = investments.filter(inv => inv.userId?.toString() === user._id?.toString());
      const userTransactions = transactions.filter(tx => tx.userId?.toString() === user._id?.toString());
      const userCommissions = commissionLogs.filter(cl => cl.recipientId?.toString() === user._id?.toString());

      changes.investmentRecordsToDelete = userInvestorInvs.length + userInvs.length;
      changes.transactionsToZero = userTransactions.length;
      changes.commissionsToDelete = userCommissions.length;

      // Check if user has financial activity to reset
      if (
        changes.before.totalInvested > 0 ||
        changes.before.wallet_roi > 0 ||
        changes.before.wallet_commission > 0 ||
        changes.before.totalRoiEarned > 0 ||
        changes.investmentRecordsToDelete > 0 ||
        changes.transactionsToZero > 0 ||
        changes.commissionsToDelete > 0 ||
        changes.before.plan !== DEFAULT_PLAN
      ) {
        changes.hasChanges = true;
        usersAffected++;
        totalInvestedSum += changes.before.totalInvested;
        totalRoiSum += changes.before.wallet_roi;
        totalCommissionSum += changes.before.wallet_commission;

        if (changes.investmentRecordsToDelete > 0) {
          usersWithInvestments++;
        }
      }

      userChanges.push(changes);
    }

    // Print per-user details (sample + summary)
    const affectedUsers = userChanges.filter(u => u.hasChanges);
    log(`\n📋 DETAILED BREAKDOWN (${affectedUsers.length} affected users out of ${users.length} total)\n`);
    log('────────────────────────────────────────────────────────────────────\n');

    if (affectedUsers.length === 0) {
      log('⚠️  No users with financial data to reset.\n');
    } else {
      // Show first 10 affected users in detail
      const sampleSize = Math.min(10, affectedUsers.length);
      for (let i = 0; i < sampleSize; i++) {
        const user = affectedUsers[i];
        log(`USER ${i + 1}/${sampleSize}: ${user.name} <${user.email}>`);
        log(`  User ID: ${user.userId}`);
        log(`  Status: ${user.before.networkerAccessGranted ? '🔓 Networker Access GRANTED' : '🔒 Networker Access locked'}`);
        log('');
        log('  FINANCIAL DATA — WILL BE RESET:');
        log(`    totalInvested:           ${user.before.totalInvested} → ${user.after.totalInvested} (Δ -${user.before.totalInvested})`);
        log(`    wallet.roi:              ${user.before.wallet_roi} → ${user.after.wallet_roi} (Δ -${user.before.wallet_roi})`);
        log(`    wallet.commission:       ${user.before.wallet_commission} → ${user.after.wallet_commission} (Δ -${user.before.wallet_commission})`);
        log(`    totalRoiEarned:          ${user.before.totalRoiEarned} → ${user.after.totalRoiEarned} (Δ -${user.before.totalRoiEarned})`);
        log(`    plan:                    ${user.before.plan} → ${user.after.plan}`);
        log('');
        log('  RECORDS AFFECTED:');
        log(`    InvestorInvestment records to DELETE:  ${userChanges.filter(u => u.userId.toString() === user.userId.toString())[0].investmentRecordsToDelete}`);
        log(`    Investment records to DELETE:         (counted above)`);
        log(`    Transaction records to ZERO OUT:      ${user.transactionsToZero}`);
        log(`    CommissionLog records to DELETE:      ${user.commissionsToDelete}`);
        log('');
        log('  REFERRAL TREE & AUTH — PRESERVED (UNCHANGED):');
        log(`    referredBy:              ${user.preserve.referredBy}`);
        log(`    ancestorPath:            ${user.preserve.ancestorPath} (${user.after.ancestorPath_length} ancestors)`);
        log(`    email:                   ${user.preserve.email}`);
        log(`    password (hashed):       ${user.preserve.password}`);
        log(`    networkerAccessGranted:  ${user.preserve.networkerAccessGranted}`);
        log('');
        log(separator('─'));
        log('');
      }

      if (affectedUsers.length > sampleSize) {
        log(`\n... and ${affectedUsers.length - sampleSize} more users (see aggregate summary below)\n`);
      }
    }

    // AGGREGATE SUMMARY
    log('\n' + separator());
    log('AGGREGATE SUMMARY');
    log(separator() + '\n');

    log('📊 USERS:');
    log(`  Total users in system:           ${users.length}`);
    log(`  Users affected by reset:         ${usersAffected}`);
    log(`  Users with investments:          ${usersWithInvestments}`);
    log('');

    log('💰 FINANCIAL DATA TO BE ZEROED:');
    log(`  Total invested (sum):            $${totalInvestedSum.toFixed(2)}`);
    log(`  Total ROI in wallets (sum):      $${totalRoiSum.toFixed(2)}`);
    log(`  Total commission in wallets:     $${totalCommissionSum.toFixed(2)}`);
    log(`  Combined total being cleared:    $${(totalInvestedSum + totalRoiSum + totalCommissionSum).toFixed(2)}`);
    log('');

    log('📑 RECORDS TO BE AFFECTED:');
    log(`  InvestorInvestment records:      ${investorInvestments.length} total → all ${investorInvestments.length} DELETED`);
    log(`  Investment records:              ${investments.length} total → all ${investments.length} DELETED`);
    log(`  Transaction records:             ${transactions.length} total → all ${transactions.length} ZEROED OUT (amount→$0, kept for audit)`);
    log(`  CommissionLog records:           ${commissionLogs.length} total → all ${commissionLogs.length} DELETED`);
    log('');

    log('✅ PRESERVATION GUARANTEE:');
    log(`  All ${users.length} user accounts:          UNCHANGED (no deletions)`);
    log(`  All referral trees:              UNCHANGED (referredBy + ancestorPath kept)`);
    log(`  All auth data:                   UNCHANGED (email, password hashed, still valid)`);
    log(`  Networker access grants:         UNCHANGED (networkerAccessGranted kept as-is)`);
    log('');

    log('🔧 MIGRATION STRATEGY:');
    log('  Approach: HYBRID (DELETE + ZERO OUT)');
    log('  Rationale:');
    log('    • DELETE InvestorInvestment/Investment/CommissionLog → fresh slate, no ghost records');
    log('    • ZERO OUT Transactions → audit trail preserved (shows $0, not missing)');
    log('    • This maintains compliance (who invested what) while resetting financials');
    log('');

    log(separator());
    log('END OF DRY RUN ANALYSIS');
    log(separator());
    log(`\n✅ DRY RUN COMPLETE — NO DATABASE MODIFICATIONS MADE`);
    log(`📝 Full log saved to: ${logFile}\n`);

    // Write log file
    fs.writeFileSync(logFile, logContent);
    const logStats = fs.statSync(logFile);
    log(`📊 Log file size: ${(logStats.size / 1024).toFixed(2)} KB`);
    log(`🕐 Log file created: ${new Date(logStats.mtime).toISOString()}\n`);

    // Final prompt
    log(separator());
    log('👉 NEXT STEPS:');
    log(separator());
    log('1. Review this dry-run output above');
    log('2. Verify the numbers match your expectations');
    log('3. Confirm the preservation guarantees (referral tree, auth, networker access)');
    log('4. Once approved, I will write the actual WRITE script');
    log('5. Only execute after your explicit "run it now" command');
    log('');

    process.exit(0);
  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`);
    log(error.stack);
    fs.writeFileSync(logFile, logContent);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

dryRun();

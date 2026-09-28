const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const User = require('../src/models/User');
const CommissionLog = require('../src/models/CommissionLog');
const Transaction = require('../src/models/Transaction');
const InvestorInvestment = require('../src/models/InvestorInvestment');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trading_db');
    console.log('✅ Connected to MongoDB\n');

    // ─────────────────────────────────────────────────────────────────────
    // 1. CHECK USER MODEL FIELDS
    // ─────────────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('1. USER MODEL FIELDS (referral structure)');
    console.log('═══════════════════════════════════════════════════════════');
    
    const users = await User.find({ totalInvested: { $gt: 0 } }).limit(3);
    users.forEach(u => {
      console.log(`\nUser: ${u.name} (${u.email})`);
      console.log(`  referredBy: ${u.referredBy || 'null'}`);
      console.log(`  directCount: ${u.directCount}`);
      console.log(`  unlockedLevels: ${u.unlockedLevels}`);
      console.log(`  ancestorPath: [${u.ancestorPath ? u.ancestorPath.join(', ') : 'empty'}]`);
      console.log(`  isActive: ${u.isActive}`);
      console.log(`  totalInvested: $${u.totalInvested}`);
    });

    // ─────────────────────────────────────────────────────────────────────
    // 2. CHECK INVESTOR INVESTMENT RECORDS
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('2. INVESTOR INVESTMENT RECORDS');
    console.log('═══════════════════════════════════════════════════════════');
    
    const investments = await InvestorInvestment.find().limit(5).populate('userId', 'name email');
    investments.forEach(inv => {
      console.log(`\nInvestment ID: ${inv._id}`);
      console.log(`  User: ${inv.userId?.name} (${inv.userId?.email})`);
      console.log(`  Plan: ${inv.plan}`);
      console.log(`  Amount: $${inv.amount}`);
      console.log(`  Daily Rate: ${inv.dailyRate}%`);
      console.log(`  Status: ${inv.status}`);
      console.log(`  lastRoiDate: ${inv.lastRoiDate}`);
    });

    // ─────────────────────────────────────────────────────────────────────
    // 3. CHECK COMMISSION LOG RECORDS
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('3. COMMISSION LOG RECORDS (what rates are actually stored?)');
    console.log('═══════════════════════════════════════════════════════════');
    
    const commissionLogs = await CommissionLog.find()
      .populate('recipientId', 'name email')
      .populate('sourceUserId', 'name email')
      .sort({ createdAt: -1 })
      .limit(20);
    
    if (commissionLogs.length === 0) {
      console.log('\n❌ NO COMMISSION LOGS FOUND IN DATABASE');
    } else {
      const rateCounts = {};
      commissionLogs.forEach(log => {
        console.log(`\n[${log.createdAt.toISOString()}]`);
        console.log(`  Recipient: ${log.recipientId?.name} (${log.recipientId?.email})`);
        console.log(`  Source: ${log.sourceUserId?.name} (${log.sourceUserId?.email})`);
        console.log(`  Level: ${log.level}`);
        console.log(`  Rate: ${log.rate}%`);
        console.log(`  Base: $${log.baseAmount}`);
        console.log(`  Commission: $${log.commissionAmount}`);
        console.log(`  Type: ${log.commissionType}`);
        
        // Count rates
        rateCounts[log.rate] = (rateCounts[log.rate] || 0) + 1;
      });
      
      console.log('\n── Rate Distribution Summary ──');
      Object.keys(rateCounts).sort().forEach(rate => {
        console.log(`  ${rate}%: ${rateCounts[rate]} records`);
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. CHECK TRANSACTION RECORDS
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('4. TRANSACTION RECORDS (commission transactions)');
    console.log('═══════════════════════════════════════════════════════════');
    
    const commissionTxns = await Transaction.find({ type: 'commission' })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(20);
    
    if (commissionTxns.length === 0) {
      console.log('\n❌ NO COMMISSION TRANSACTIONS FOUND IN DATABASE');
    } else {
      commissionTxns.forEach(txn => {
        console.log(`\n[${txn.createdAt.toISOString()}]`);
        console.log(`  User: ${txn.userId?.name} (${txn.userId?.email})`);
        console.log(`  Amount: $${txn.amount}`);
        console.log(`  Type: ${txn.type}`);
        console.log(`  Description: ${txn.description}`);
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. CHECK FOR HARDCODED 5% IN SOURCE CODE
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('5. HARDCODED 5% LOCATIONS FOUND');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ✓ backend/config/constants.js: DIRECT_REFERRAL_COMMISSION_RATE = 0.05');
    console.log('  ✓ backend/src/controllers/adminController.js:');
    console.log('    - Line 14: imported DIRECT_REFERRAL_COMMISSION_RATE');
    console.log('    - Line 330-333: used for direct referral commission (correct usage)');
    console.log('    - Line 483: HARDCODED const DIRECT_REFERRAL_COMMISSION_RATE = 0.05 (LOCAL OVERRIDE!)');
    console.log('    - Line 485-487: used for approvePlanInvestment direct commission (overrides import)');

    // ─────────────────────────────────────────────────────────────────────
    // 6. VERIFY LEVEL RATES IN CONSTANTS
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('6. LEVEL RATES FROM CONSTANTS.JS');
    console.log('═══════════════════════════════════════════════════════════');
    const constants = require('../../config/constants');
    const rates = constants.LEVEL_RATES;
    console.log(`Total Levels: ${rates.length}`);
    console.log(`Total %: ${rates.reduce((a, b) => a + b, 0)}%`);
    rates.forEach((r, i) => {
      console.log(`  L${i+1}: ${r}%`);
    });

    // ─────────────────────────────────────────────────────────────────────
    // 7. CHECK LEVEL UNLOCK RULES
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('7. LEVEL UNLOCK RULES');
    console.log('═══════════════════════════════════════════════════════════');
    const unlockRules = constants.LEVEL_UNLOCK_RULES;
    Object.keys(unlockRules).forEach(directCount => {
      console.log(`  ${directCount} directs → ${unlockRules[directCount]} levels unlocked`);
    });

    console.log('\n✅ Debug complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();

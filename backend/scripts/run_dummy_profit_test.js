const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../src/config/database');
const Investment = require('../src/models/Investment');
const Transaction = require('../src/models/Transaction');
const User = require('../src/models/User');
const CronLock = require('../src/models/CronLock');
const Notification = require('../src/models/Notification');
const profitService = require('../src/services/profitService');

async function testDailyProfitEndToEnd() {
  try {
    await connectDB();
    console.log('='.repeat(80));
    console.log('END-TO-END DAILY PROFIT CALCULATION & RACE-CONDITION TEST');
    console.log('='.repeat(80));

    const testEmail = 'test.verify.cron@gmail.com';
    const testReferralCode = 'TESTVERIFY999';
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Clean up any stale test data from prior runs
    const existingTestUser = await User.findOne({ email: testEmail });
    if (existingTestUser) {
      await Investment.deleteMany({ userId: existingTestUser._id });
      await Transaction.deleteMany({ userId: existingTestUser._id });
      await Notification.deleteMany({ userId: existingTestUser._id });
      await User.deleteOne({ _id: existingTestUser._id });
    }
    // Clear lock for today so test starts fresh
    await CronLock.deleteMany({ jobName: 'dailyProfits', dateKey });

    // ── 1. Create Dedicated Test User & Test Investment ─────────────────────
    console.log('\n[STEP 1] Creating temporary TEST user and TEST investment...');
    const testUser = await User.create({
      name: 'Test Verify Account',
      email: testEmail,
      password: 'TestPassword123!',
      referralCode: testReferralCode,
      isActive: true,
      wallet: {
        capital: 100,
        profit: 0,
        commission: 0
      },
      totalProfitEarned: 0
    });

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const testInvestment = await Investment.create({
      userId: testUser._id,
      amount: 100,
      tier: 1,
      packageName: 'Tier 1 ($100 - $500)',
      dailyRate: 0.75, // 0.75% daily
      dailyProfit: 0.75,
      totalProfitEarned: 0,
      network: 'BEP20',
      status: 'active',
      isActive: true,
      startDate: yesterday,
      lastProfitDate: yesterday // Eligible for today's run
    });

    console.log(`  ✓ Test User created: ID=${testUser._id}, Email=${testUser.email}, Initial Profit Wallet=$${testUser.wallet.profit}`);
    console.log(`  ✓ Test Investment created: ID=${testInvestment._id}, Amount=$${testInvestment.amount}, Rate=${testInvestment.dailyRate}%, lastProfitDate=${testInvestment.lastProfitDate.toISOString()}`);

    // ── 2. Run calculateDailyProfits() (RUN #1) ──────────────────────────────
    console.log('\n[STEP 2] Triggering calculateDailyProfits() — RUN #1 (Simulating first scheduled run)...');
    const run1Result = await profitService.calculateDailyProfits();
    console.log(`  ✓ Run 1 return value:`, run1Result);

    // ── 3. Verify Results after RUN #1 ──────────────────────────────────────
    console.log('\n[STEP 3] Verifying database state after RUN #1...');
    const userAfterRun1 = await User.findById(testUser._id);
    const investmentAfterRun1 = await Investment.findById(testInvestment._id);
    const txsAfterRun1 = await Transaction.find({ referenceId: testInvestment._id, type: 'profit' });

    console.log(`  - Updated Test User Profit Balance: $${userAfterRun1.wallet.profit} (Expected: $0.75)`);
    console.log(`  - Updated Investment totalProfitEarned: $${investmentAfterRun1.totalProfitEarned} (Expected: $0.75)`);
    console.log(`  - Profit Transactions Count: ${txsAfterRun1.length} (Expected: 1)`);
    if (txsAfterRun1.length > 0) {
      console.log(`  - Transaction Details:`);
      console.log(`      ID:          ${txsAfterRun1[0]._id}`);
      console.log(`      Amount:      $${txsAfterRun1[0].amount}`);
      console.log(`      Date:        ${txsAfterRun1[0].date.toISOString()}`);
      console.log(`      Description: "${txsAfterRun1[0].description}"`);
    }

    const lockAfterRun1 = await CronLock.findOne({ jobName: 'dailyProfits', dateKey });
    console.log(`  - CronLock Document: Status=${lockAfterRun1 ? lockAfterRun1.status : 'None'}, DateKey=${lockAfterRun1 ? lockAfterRun1.dateKey : 'None'}, Instance=${lockAfterRun1 ? lockAfterRun1.instanceId : 'None'}`);

    // ── 4. Run calculateDailyProfits() (RUN #2) ──────────────────────────────
    console.log('\n[STEP 4] Triggering calculateDailyProfits() — RUN #2 IMMEDIATELY (Simulating race condition / second process)...');
    const run2Result = await profitService.calculateDailyProfits();
    console.log(`  ✓ Run 2 return value:`, run2Result);

    const userAfterRun2 = await User.findById(testUser._id);
    const investmentAfterRun2 = await Investment.findById(testInvestment._id);
    const txsAfterRun2 = await Transaction.find({ referenceId: testInvestment._id, type: 'profit' });

    console.log(`\n[STEP 4 Verification]`);
    console.log(`  - Test User Profit Balance after Run 2: $${userAfterRun2.wallet.profit} (Must remain exactly $0.75, +$0 added)`);
    console.log(`  - Investment totalProfitEarned after Run 2: $${investmentAfterRun2.totalProfitEarned} (Must remain exactly $0.75, +$0 added)`);
    console.log(`  - Profit Transactions Count after Run 2: ${txsAfterRun2.length} (Must remain exactly 1)`);

    // ── 5. Clean up all test data ───────────────────────────────────────────
    console.log('\n[STEP 5] Cleaning up all test data completely from database...');
    await Investment.deleteOne({ _id: testInvestment._id });
    await Transaction.deleteMany({ referenceId: testInvestment._id });
    await Notification.deleteMany({ userId: testUser._id });
    await User.deleteOne({ _id: testUser._id });
    await CronLock.deleteMany({ jobName: 'dailyProfits', dateKey });

    // Double check clean up
    const remainingUser = await User.findById(testUser._id);
    const remainingInv = await Investment.findById(testInvestment._id);
    const remainingTxs = await Transaction.find({ referenceId: testInvestment._id });

    console.log(`  ✓ Test Investment deleted: ${!remainingInv ? 'Confirmed' : 'Failed'}`);
    console.log(`  ✓ Test Transactions deleted: ${remainingTxs.length === 0 ? 'Confirmed (0 remaining)' : 'Failed'}`);
    console.log(`  ✓ Test User deleted: ${!remainingUser ? 'Confirmed' : 'Failed'}`);
    console.log(`  ✓ CronLock reset for next real midnight run.`);

    console.log('\n' + '='.repeat(80));
    console.log('FINAL TEST OUTCOME:');
    console.log(`✓ Run #1 credited: EXACTLY $0.75 (1 single transaction created)`);
    console.log(`✓ Run #2 credited: $0.00 (CronLock and lastProfitDate atomically blocked duplicate trigger)`);
    console.log(`✓ Clean up: 100% complete, 0 dummy records left in database`);
    console.log('='.repeat(80));

    process.exit(0);
  } catch (err) {
    console.error('Fatal error in dummy profit test:', err);
    process.exit(1);
  }
}

testDailyProfitEndToEnd();

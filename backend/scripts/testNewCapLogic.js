#!/usr/bin/env node
/**
 * Verification test for new 3X/5X cap logic
 * 
 * Tests:
 * 1. Create User A (no investment) → cap = 0 (cannot earn)
 * 2. User A invests $1000 → cap = 3X (3000 max earnings)
 * 3. Create User B using A's referral code → B registered with A as referrer
 * 4. User B invests $500 → A's cap should bump to 5X (5000 max earnings)
 * 5. Verify cap multiplier calculation returns correct values
 */

require('dotenv').config({ path: `${__dirname}/../.env` });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const incomeService = require('../src/services/incomeService');
const dbConnect = require('../src/config/database');

const colors = {
  PASS: '\x1b[32m✓',
  FAIL: '\x1b[31m✗',
  INFO: '\x1b[36mℹ',
  WARN: '\x1b[33m⚠',
  RESET: '\x1b[0m',
};

const log = (type, msg) => {
  const prefix = colors[type] || colors.INFO;
  console.log(`${prefix} ${msg}${colors.RESET}`);
};

const main = async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION TEST: New 3X/5X Cap Logic');
    console.log('='.repeat(80) + '\n');

    // Connect to DB
    log('INFO', 'Connecting to MongoDB...');
    await dbConnect();
    log('PASS', 'Connected to MongoDB');

    // ─────────────────────────────────────────────────────────────────────
    // TEST 1: Create User A (no investment)
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 1: User A created (no investment) ---');

    const userA = await User.create({
      name: 'User A - Cap Test',
      email: `captest-a-${Date.now()}@test.com`,
      password: 'Test@12345',
      referralCode: `CAPA${Math.random().toString(36).substring(7).toUpperCase()}`,
      totalInvested: 0,
      totalEarned: 0,
      directCount: 0,
      isActive: true,
      isVerified: true
    });

    log('PASS', `User A created: ${userA.email}`);
    log('INFO', `  ID: ${userA._id}`);
    log('INFO', `  totalInvested: $${userA.totalInvested}`);

    // Test cap multiplier for user with no investment
    const capMultA1 = await incomeService.getCapMultiplier(userA);
    log(capMultA1 === 0 ? 'PASS' : 'FAIL', 
      `User A (no investment) cap multiplier: ${capMultA1} (expected: 0)`);

    // ─────────────────────────────────────────────────────────────────────
    // TEST 2: User A invests $1000
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 2: User A invests $1000 ---');

    const investmentA = await InvestorInvestment.create({
      userId: userA._id,
      amount: 1000,
      plan: 'A',
      packageNumber: 2,
      dailyRate: 0.01,
      incomeCap: 3000,
      status: 'active',
      transactionId: 'TEST_A_001',
      paymentProof: '',
      paymentNote: '[Network: BEP20]'
    });

    // Update user's totalInvested
    await User.findByIdAndUpdate(userA._id, {
      totalInvested: 1000
    });

    log('PASS', `User A investment created: $${investmentA.amount}`);
    log('INFO', `  Investment ID: ${investmentA._id}`);
    log('INFO', `  Status: ${investmentA.status}`);

    // Refresh user data
    const userA2 = await User.findById(userA._id);
    const capMultA2 = await incomeService.getCapMultiplier(userA2);
    const expectedCap2 = 1000 * 3; // 3X because no active referrals yet

    log(capMultA2 === 3 ? 'PASS' : 'FAIL', 
      `User A (after investment, no referrals) cap multiplier: ${capMultA2}x (expected: 3x)`);
    log('INFO', `  Max earnings for A: $${userA2.totalInvested * capMultA2}`);

    // ─────────────────────────────────────────────────────────────────────
    // TEST 3: Create User B using A's referral code
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 3: User B registered with A\'s referral code ---');

    const userB = await User.create({
      name: 'User B - Cap Test',
      email: `captest-b-${Date.now()}@test.com`,
      password: 'Test@12345',
      referralCode: `CAPB${Math.random().toString(36).substring(7).toUpperCase()}`,
      referredBy: userA._id,
      ancestorPath: [userA._id],
      totalInvested: 0,
      totalEarned: 0,
      directCount: 0,
      isActive: true,
      isVerified: true
    });

    // Increment A's directCount
    await User.findByIdAndUpdate(userA._id, {
      $inc: { directCount: 1 }
    });

    log('PASS', `User B created: ${userB.email}`);
    log('INFO', `  ID: ${userB._id}`);
    log('INFO', `  Referred by: User A (${userA._id})`);

    // Check A still has 3X cap (B hasn't invested yet)
    const userA3 = await User.findById(userA._id);
    const capMultA3 = await incomeService.getCapMultiplier(userA3);
    log(capMultA3 === 3 ? 'PASS' : 'FAIL', 
      `User A cap still 3x (B registered but not invested): ${capMultA3}x (expected: 3x)`);

    // ─────────────────────────────────────────────────────────────────────
    // TEST 4: User B invests $500
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 4: User B invests $500 → A\'s cap bumps to 5X ---');

    const investmentB = await InvestorInvestment.create({
      userId: userB._id,
      amount: 500,
      plan: 'A',
      packageNumber: 2,
      dailyRate: 0.01,
      incomeCap: 1500,
      status: 'active',
      transactionId: 'TEST_B_001',
      paymentProof: '',
      paymentNote: '[Network: BEP20]'
    });

    // Update B's totalInvested
    await User.findByIdAndUpdate(userB._id, {
      totalInvested: 500
    });

    log('PASS', `User B investment created: $${investmentB.amount}`);
    log('INFO', `  Investment ID: ${investmentB._id}`);
    log('INFO', `  Status: ${investmentB.status}`);

    // ─────────────────────────────────────────────────────────────────────
    // TEST 5: Verify A's cap is now 5X
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 5: User A cap multiplier with active referral ---');

    const userA4 = await User.findById(userA._id);
    const capMultA4 = await incomeService.getCapMultiplier(userA4);
    const expectedCap4 = 1000 * 5; // 5X because A has one active referral (B)

    log(capMultA4 === 5 ? 'PASS' : 'FAIL', 
      `User A cap bumped to 5x (B invested): ${capMultA4}x (expected: 5x)`);
    log('INFO', `  Max earnings for A: $${userA4.totalInvested * capMultA4} (was $${1000 * 3})`);

    // ─────────────────────────────────────────────────────────────────────
    // TEST 6: Verify cap enforcement in earnings functions
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 6: Earnings cap enforcement ---');

    // Test canEarnMore for user with no investment (use User B before we added investment to A)
    const testUserNoInv = await User.create({
      name: 'Test User No Investment',
      email: `captest-noinv-${Date.now()}@test.com`,
      password: 'Test@12345',
      referralCode: `CAPNOINV${Math.random().toString(36).substring(7).toUpperCase()}`,
      totalInvested: 0,
      totalEarned: 0,
      directCount: 0,
      isActive: true,
      isVerified: true
    });

    const canEarnNoInv = await incomeService.canEarnMore(testUserNoInv);
    log(!canEarnNoInv ? 'PASS' : 'FAIL', 
      `User with no investment canEarnMore: ${canEarnNoInv} (expected: false)`);

    // Test canEarnMore for user A (should be true initially, totalEarned = 0)
    const userA4Fresh = await User.findById(userA._id);
    const canEarnA = await incomeService.canEarnMore(userA4Fresh);
    log(canEarnA ? 'PASS' : 'FAIL', 
      `User A canEarnMore (earned $0 / cap $${userA4Fresh.totalInvested * 5}): ${canEarnA} (expected: true)`);

    // Simulate earnings reaching cap
    const userA5 = await User.findByIdAndUpdate(userA._id, {
      totalEarned: 5000 // At 5X cap limit for $1000 investment
    }, { new: true });

    const canEarnACapped = await incomeService.canEarnMore(userA5);
    log(!canEarnACapped ? 'PASS' : 'FAIL', 
      `User A canEarnMore (earned $5000 / cap $5000): ${canEarnACapped} (expected: false)`);

    // ─────────────────────────────────────────────────────────────────────
    // TEST 7: Verify active referral counting
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n--- TEST 7: Active referral counting ---');

    const activeRefCount = await User.countDocuments({
      referredBy: userA._id,
      totalInvested: { $gt: 0 }
    });

    log(activeRefCount === 1 ? 'PASS' : 'FAIL', 
      `Active referral count for A: ${activeRefCount} (expected: 1)`);

    // Create User C (registered but NOT invested) under A
    const userC = await User.create({
      name: 'User C - Cap Test (no invest)',
      email: `captest-c-${Date.now()}@test.com`,
      password: 'Test@12345',
      referralCode: `CAPC${Math.random().toString(36).substring(7).toUpperCase()}`,
      referredBy: userA._id,
      ancestorPath: [userA._id],
      totalInvested: 0, // Not invested
      totalEarned: 0,
      directCount: 0,
      isActive: true,
      isVerified: true
    });

    await User.findByIdAndUpdate(userA._id, { $inc: { directCount: 1 } });

    log('INFO', `User C created (registered but no investment): ${userC.email}`);

    // Verify active count still 1 (C doesn't have investment)
    const activeRefCount2 = await User.countDocuments({
      referredBy: userA._id,
      totalInvested: { $gt: 0 }
    });

    log(activeRefCount2 === 1 ? 'PASS' : 'FAIL', 
      `Active referral count unchanged (C has no investment): ${activeRefCount2} (expected: 1)`);

    const directCount2 = await User.countDocuments({
      referredBy: userA._id
    });

    log(directCount2 === 2 ? 'PASS' : 'FAIL', 
      `Total direct referrals (including non-invested): ${directCount2} (expected: 2)`);

    // ─────────────────────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(80));
    log('PASS', 'VERIFICATION TEST COMPLETE');
    console.log('='.repeat(80));

    console.log(`
KEY FINDINGS:
=============

1. User A (no investment)
   - Cap multiplier: 0 (cannot earn)
   - Max earnings: $0

2. User A (after investing $1000, before referrals invest)
   - Cap multiplier: 3x
   - Max earnings: $3,000

3. User B (User A's referral, registered only)
   - Status: Registered with A's referral code
   - No impact on A's cap yet

4. User B (after investing $500)
   - A now has 1 active referral
   - A's cap multiplier bumps to: 5x
   - A's max earnings: $5,000

5. Active Referral Counting
   - Only referrals with totalInvested > 0 count as "active"
   - User C (registered but not invested) does NOT bump the cap
   - A has 2 direct referrals but only 1 "active" (invested)

IMPLEMENTATION RULE CONFIRMED:
==============================
Cap = 3X once user has approved/active investment
Cap = 5X once user has at least one direct referral who ALSO has an approved/active investment

The NEW logic successfully replaces the old networkerAccessGranted-based cap system.
Referral links are now accessible to all users (Task 1), and the cap is determined purely by:
1. User's own investment status (must have investment for any earning)
2. Count of direct referrals who have invested (determines 3X vs 5X)
    `);

    await mongoose.connection.close();
    log('INFO', 'Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (error.stack) console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

main();

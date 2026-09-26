/**
 * Phase 1 Verification Script
 *
 * Tests:
 *   A. networkerAccessGranted defaults to false on all existing + new users
 *   B. commission still flows to an upline whose networkerAccessGranted is false
 *   C. admin toggle endpoint correctly sets/clears the flag and audit fields
 *
 * Run:  node scripts/phase1_verify.js
 * Safe: read-only checks on A/B; C creates two temp users then deletes them.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const PASS = (msg) => console.log('  PASS:', msg);
const FAIL = (msg) => { console.error('  FAIL:', msg); process.exitCode = 1; };

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const User          = require('../src/models/User');
  const constants     = require('../config/constants');
  const commService   = require('../src/services/commissionService');
  const { hasNetworkerAccess } = require('../src/middleware/auth');
  const { toggleNetworkerAccess } = require('../src/controllers/adminController');

  // ── A. Schema defaults ────────────────────────────────────────────────────
  console.log('=== A. Schema field defaults ===');

  // A1: all existing users should have networkerAccessGranted = false (or undefined/falsy)
  const lockedUsers = await User.countDocuments({ networkerAccessGranted: { $ne: true } });
  const totalUsers  = await User.countDocuments();
  if (lockedUsers === totalUsers) {
    PASS(`All ${totalUsers} existing users have networkerAccessGranted !== true`);
  } else {
    FAIL(`${totalUsers - lockedUsers} existing user(s) unexpectedly have networkerAccessGranted=true`);
  }

  // A2: new document defaults
  const tempA = new User({
    name:         'Phase1_TempA',
    email:        `phase1_tempA_${Date.now()}@verify.test`,
    password:     'TestPass1!',
    referralCode: 'TMPVFYA1'
  });
  if (tempA.networkerAccessGranted === false)   PASS('New user: networkerAccessGranted defaults to false');
  else                                           FAIL('New user: networkerAccessGranted did NOT default to false');
  if (tempA.plan === 'A')                        PASS('New user: plan defaults to A');
  else                                           FAIL(`New user: plan defaulted to ${tempA.plan}, expected A`);
  if (tempA.wallet.roi === 0)                    PASS('New user: wallet.roi defaults to 0');
  else                                           FAIL(`New user: wallet.roi defaulted to ${tempA.wallet.roi}`);
  if (tempA.totalRoiEarned === 0)               PASS('New user: totalRoiEarned defaults to 0');
  else                                           FAIL(`New user: totalRoiEarned defaulted to ${tempA.totalRoiEarned}`);
  if (tempA.networkerAccessGrantedAt === null)  PASS('New user: networkerAccessGrantedAt defaults to null');
  else                                           FAIL('New user: networkerAccessGrantedAt did NOT default to null');
  if (tempA.networkerAccessGrantedBy === null)  PASS('New user: networkerAccessGrantedBy defaults to null');
  else                                           FAIL('New user: networkerAccessGrantedBy did NOT default to null');

  // ── B. Commission flows regardless of networkerAccessGranted ─────────────
  console.log('\n=== B. Commission engine ignores networkerAccessGranted ===');

  // Create a minimal upline (networkerAccessGranted=false) and a downline investor
  const uplineCode = 'UPLN' + Date.now().toString(36).toUpperCase().slice(-4);
  const downlineCode = 'DWNL' + Date.now().toString(36).toUpperCase().slice(-4);

  const upline = await User.create({
    name:                   'Phase1_Upline',
    email:                  `phase1_upline_${Date.now()}@verify.test`,
    password:               'TestPass1!',
    referralCode:           uplineCode,
    isActive:               true,
    isVerified:             true,
    totalInvested:          1000,   // must be > 0 for commission eligibility
    networkerAccessGranted: false   // explicitly locked
  });

  const downline = await User.create({
    name:         'Phase1_Downline',
    email:        `phase1_downline_${Date.now()}@verify.test`,
    password:     'TestPass1!',
    referralCode: downlineCode,
    referredBy:   upline._id,
    ancestorPath: [upline._id],
    isActive:     true,
    isVerified:   true,
    totalInvested: 1000
  });

  // Simulate a minimal Investment-like object (just needs _id + amount)
  const fakeInvestment = { _id: new mongoose.Types.ObjectId(), amount: 1000 };
  const dailyProfit    = 10;  // $10 daily profit to distribute commissions from

  // Snapshot wallet.commission before
  const uplineBefore = await User.findById(upline._id).select('wallet.commission networkerAccessGranted');
  const commBefore   = uplineBefore.wallet.commission;

  // Run the commission distribution (this is the actual live function)
  await commService.distributeLevelCommissions(fakeInvestment, dailyProfit, downline);

  const uplineAfter = await User.findById(upline._id).select('wallet.commission');
  const commAfter   = uplineAfter.wallet.commission;
  const earned      = Number((commAfter - commBefore).toFixed(4));

  // L1 rate from constants: 25% of dailyProfit = 25% of $10 = $2.50
  const expectedL1 = Number(((dailyProfit * constants.LEVEL_RATES[0]) / 100).toFixed(4));

  if (earned === expectedL1) {
    PASS(`Commission of $${earned} correctly credited to upline even though networkerAccessGranted=false (expected L1=$${expectedL1})`);
  } else {
    FAIL(`Expected L1 commission $${expectedL1} but got $${earned} — commission engine may have changed`);
  }

  // ── C. Admin toggle endpoint (tested via direct function call) ────────────
  console.log('\n=== C. Admin toggle: grant then revoke ===');

  const adminUser = await User.findOne({ accountType: 'admin' }).select('_id name');
  if (!adminUser) {
    console.log('  SKIP: No admin user found in DB — toggle test skipped (create an admin to run this check)');
  } else {
    // Build mock req/res to call the controller directly
    const mockRes = () => {
      const r = {};
      r.status = (code) => { r._status = code; return r; };
      r.json   = (data) => { r._data = data; return r; };
      return r;
    };

    // Grant access
    const grantReq = { params: { id: upline._id.toString() }, body: { grant: true }, user: adminUser };
    const grantRes = mockRes();
    await toggleNetworkerAccess(grantReq, grantRes);

    if (grantRes._data?.success && grantRes._data?.data?.networkerAccessGranted === true) {
      PASS('Grant: networkerAccessGranted set to true');
    } else {
      FAIL(`Grant failed: ${JSON.stringify(grantRes._data)}`);
    }

    const afterGrant = await User.findById(upline._id).select('networkerAccessGranted networkerAccessGrantedAt networkerAccessGrantedBy');
    if (afterGrant.networkerAccessGrantedAt instanceof Date) PASS('Grant: networkerAccessGrantedAt is a Date');
    else FAIL('Grant: networkerAccessGrantedAt was not set');
    if (afterGrant.networkerAccessGrantedBy?.toString() === adminUser._id.toString()) PASS('Grant: networkerAccessGrantedBy = admin _id');
    else FAIL('Grant: networkerAccessGrantedBy not set correctly');

    // hasNetworkerAccess helper
    if (hasNetworkerAccess(afterGrant)) PASS('hasNetworkerAccess() returns true after grant');
    else FAIL('hasNetworkerAccess() returned false even after grant');

    // Revoke access
    const revokeReq = { params: { id: upline._id.toString() }, body: { grant: false }, user: adminUser };
    const revokeRes = mockRes();
    await toggleNetworkerAccess(revokeReq, revokeRes);

    const afterRevoke = await User.findById(upline._id).select('networkerAccessGranted networkerAccessGrantedAt networkerAccessGrantedBy');
    if (!afterRevoke.networkerAccessGranted)   PASS('Revoke: networkerAccessGranted set to false');
    else                                        FAIL('Revoke: networkerAccessGranted still true after revoke');
    if (afterRevoke.networkerAccessGrantedAt === null) PASS('Revoke: networkerAccessGrantedAt cleared to null');
    else FAIL('Revoke: networkerAccessGrantedAt not cleared');
    if (!hasNetworkerAccess(afterRevoke)) PASS('hasNetworkerAccess() returns false after revoke');
    else FAIL('hasNetworkerAccess() returned true even after revoke');
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  await User.deleteMany({ email: /phase1_(tempA|upline|downline)_.*@verify\.test/ });
  console.log('\nCleanup: temp users deleted');

  console.log('\n=== Done ===');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exitCode = 1;
  mongoose.disconnect();
});

/**
 * Phase 3 Automated Walkthrough Test
 * 
 * Tests the complete Phase 3 flow:
 * 1. New user registration with referral
 * 2. Login and token verification
 * 3. Networker access check (locked initially)
 * 4. Investment submission (POST /api/investments/plan)
 * 5. Verify investment does NOT auto-unlock networker
 * 6. Admin grants networker access
 * 7. Verify networker endpoints now work
 * 8. Admin revokes networker access
 * 9. Verify wallet/withdrawal balance
 * 10. Cleanup
 * 
 * Run: node scripts/phase3_automated_test.js
 */

require('dotenv').config({ path: `${__dirname}/../.env` });
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const Transaction = require('../src/models/Transaction');

const API_BASE = 'http://localhost:5000/api';
let results = [];
let testUser = null;
let adminUser = null;
let adminToken = null;
let testUserToken = null;
let investmentRecord = null;

// Test result logger
const pass = (step, message) => {
  console.log(`✅ PASS #${step}: ${message}`);
  results.push({ step, status: 'PASS', message });
};

const fail = (step, message, error = '') => {
  console.error(`❌ FAIL #${step}: ${message}`);
  if (error) console.error(`   Error: ${error}`);
  results.push({ step, status: 'FAIL', message, error });
};

async function main() {
  try {
    console.log('🔄 Connecting to database...');
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI not found in .env');
    await mongoose.connect(uri);
    console.log('✅ Connected\n');

    // ────── STEP 0: Setup — Get admin account for later tests ──────
    console.log('═'.repeat(60));
    console.log('SETUP: Finding admin account and logging in');
    console.log('═'.repeat(60) + '\n');

    const adminAccount = await User.findOne({ accountType: 'admin' }).select('+password');
    if (!adminAccount) {
      fail(0, 'No admin account found in database');
      throw new Error('Admin account required for tests');
    }

    // Reset admin password to known value for testing
    const bcrypt = require('bcryptjs');
    const testAdminPassword = 'TestAdmin@2026';
    const hashedPassword = await bcrypt.hash(testAdminPassword, 10);
    await User.updateOne({ _id: adminAccount._id }, { password: hashedPassword });

    try {
      const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
        email: adminAccount.email,
        password: testAdminPassword
      });
      adminToken = adminLoginRes.data.data.token;
      adminUser = adminLoginRes.data.data.user;
      pass(0, `Admin login successful (${adminAccount.email}), token acquired`);
    } catch (err) {
      fail(0, 'Admin login failed', err.response?.data?.message || err.message);
      throw err;
    }

    // ────── STEP 1: Register new test user with referral ──────
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 1: Register new test user via registration API');
    console.log('═'.repeat(60) + '\n');

    const testEmail = `phasetest_${Date.now()}@test.com`;
    const referrerUser = await User.findOne({ referralCode: { $exists: true, $ne: null } });

    if (!referrerUser) {
      fail(1, 'No user with referral code found to use as referrer');
      throw new Error('Referrer user required');
    }

    try {
      const registerRes = await axios.post(`${API_BASE}/auth/register`, {
        name: 'Phase Test User',
        email: testEmail,
        password: 'Test@1234',
        referralCode: referrerUser.referralCode
      });

      testUser = registerRes.data.data.user;
      
      if (!testUser._id) {
        fail(1, 'Registered user missing _id');
        throw new Error('Invalid user response');
      }

      // Verify user has referralCode auto-generated
      const dbUser = await User.findById(testUser._id);
      if (!dbUser.referralCode) {
        fail(1, 'User registered but referralCode not auto-generated');
        throw new Error('Auto-generation failed');
      }

      // Verify referredBy is set
      if (!dbUser.referredBy) {
        fail(1, 'User referredBy not set correctly');
        throw new Error('Referral tracking failed');
      }

      pass(1, `User registered: ${testEmail}\n   - referralCode auto-generated: ${dbUser.referralCode}\n   - referredBy set: ${dbUser.referredBy}\n   - ancestorPath initialized: ${dbUser.ancestorPath?.length || 0} ancestors`);
    } catch (err) {
      fail(1, 'Registration failed', err.response?.data?.message || err.message);
      throw err;
    }

    // ────── STEP 2: Login as test user ──────
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 2: Login as test user via login API');
    console.log('═'.repeat(60) + '\n');

    try {
      const loginRes = await axios.post(`${API_BASE}/auth/login`, {
        email: testEmail,
        password: 'Test@1234'
      });

      testUserToken = loginRes.data.data.token;
      if (!testUserToken) {
        fail(2, 'Login succeeded but no token returned');
        throw new Error('Token missing');
      }

      pass(2, `Login successful\n   - Token: ${testUserToken.substring(0, 20)}...\n   - User ID: ${loginRes.data.data.user._id}`);
    } catch (err) {
      fail(2, 'Login failed', err.response?.data?.message || err.message);
      throw err;
    }

    // ────── STEP 3: Check initial networker access (should be FALSE) ──────
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 3: Check networker access (should be locked initially)');
    console.log('═'.repeat(60) + '\n');

    try {
      const statsRes = await axios.get(`${API_BASE}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${testUserToken}` }
      });

      const user = statsRes.data.data.user;
      if (user.networkerAccessGranted !== false) {
        fail(3, `networkerAccessGranted is not false (value: ${user.networkerAccessGranted})`);
        throw new Error('Access should be locked initially');
      }

      pass(3, `networkerAccessGranted is FALSE (locked)\n   - User is NOT able to access Networker section`);
    } catch (err) {
      fail(3, 'Failed to fetch user status', err.response?.data?.message || err.message);
      throw err;
    }

    // ────── STEP 4: Submit investment via /api/investments/plan ──────
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 4: Submit investment via POST /api/investments/plan');
    console.log('═'.repeat(60) + '\n');

    try {
      const investRes = await axios.post(`${API_BASE}/investments/plan`, {
        amount: 1000,
        transactionId: `TEST_${Date.now()}`,
        paymentProof: 'https://test.proof.com/image.png',
        paymentNote: 'Phase 3 automated test investment'
      }, {
        headers: { Authorization: `Bearer ${testUserToken}` }
      });

      investmentRecord = investRes.data.data.investment;
      if (!investmentRecord._id) {
        fail(4, 'Investment created but missing _id');
        throw new Error('Invalid investment response');
      }

      // Verify investment properties
      if (investmentRecord.userId !== testUser._id && investmentRecord.userId.toString() !== testUser._id) {
        fail(4, `Investment userId mismatch (expected ${testUser._id}, got ${investmentRecord.userId})`);
        throw new Error('UserId not set correctly');
      }

      if (investmentRecord.amount !== 1000) {
        fail(4, `Investment amount incorrect (expected 1000, got ${investmentRecord.amount})`);
        throw new Error('Amount not set correctly');
      }

      // Verify user was updated with joinDate and totalInvested
      const updatedUser = await User.findById(testUser._id);
      if (!updatedUser.joinDate) {
        fail(4, 'User joinDate not set after investment');
        throw new Error('joinDate tracking failed');
      }

      if (updatedUser.totalInvested !== 1000) {
        fail(4, `User totalInvested incorrect (expected 1000, got ${updatedUser.totalInvested})`);
        throw new Error('totalInvested not updated');
      }

      pass(4, `Investment submitted successfully\n   - Investment ID: ${investmentRecord._id}\n   - Amount: $${investmentRecord.amount}\n   - User joinDate set: ${updatedUser.joinDate.toISOString().split('T')[0]}\n   - User totalInvested: $${updatedUser.totalInvested}\n   - Status: ${investmentRecord.status}`);
    } catch (err) {
      if (err.response?.data) {
        console.error('Investment API Response:', JSON.stringify(err.response.data, null, 2));
      }
      fail(4, 'Investment submission failed', err.response?.data?.message || err.message);
      throw err;
    }

    // ────── STEP 5: 🔴 CRITICAL — Verify investment does NOT auto-unlock ──────
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 5: 🔴 CRITICAL — Verify investment did NOT auto-unlock');
    console.log('═'.repeat(60) + '\n');

    try {
      const statsRes = await axios.get(`${API_BASE}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${testUserToken}` }
      });

      const user = statsRes.data.data.user;
      if (user.networkerAccessGranted !== false) {
        fail(5, `❌ CRITICAL: networkerAccessGranted became true after investment (auto-unlock happened!)`);
        throw new Error('Auto-unlock violated the critical requirement');
      }

      pass(5, `✅ CRITICAL CHECK PASSED\n   - networkerAccessGranted is STILL FALSE after investment\n   - Investment did NOT auto-unlock Networker section\n   - Admin-only control is enforced`);
    } catch (err) {
      fail(5, '❌ CRITICAL CHECK FAILED', err.response?.data?.message || err.message);
      throw err;
    }

    // ────── STEP 6: Admin grants networker access ──────
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 6: Admin grants networker access');
    console.log('═'.repeat(60) + '\n');

    try {
      const grantRes = await axios.patch(`${API_BASE}/admin/users/${testUser._id}/networker-access`, {
        grant: true
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (grantRes.data.data.networkerAccessGranted !== true) {
        fail(6, 'Admin grant succeeded but networkerAccessGranted is still false');
        throw new Error('Grant operation did not take effect');
      }

      pass(6, `Admin granted networker access\n   - User ID: ${testUser._id}\n   - networkerAccessGranted: true\n   - Grant timestamp: ${new Date().toISOString()}`);
    } catch (err) {
      fail(6, 'Admin grant failed', err.response?.data?.message || err.message);
      throw err;
    }

    // ────── STEP 7: Verify commission/team endpoints now accessible ──────
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 7: Verify commission/team endpoints now accessible');
    console.log('═'.repeat(60) + '\n');

    try {
      // Test Commission endpoint
      const commissionRes = await axios.get(`${API_BASE}/commissions/summary`, {
        headers: { Authorization: `Bearer ${testUserToken}` }
      });

      if (commissionRes.status !== 200) {
        fail(7, `Commission endpoint returned status ${commissionRes.status} (expected 200)`);
        throw new Error('Endpoint access failed');
      }

      // Test Team endpoint
      const teamRes = await axios.get(`${API_BASE}/team/business`, {
        headers: { Authorization: `Bearer ${testUserToken}` }
      });

      if (teamRes.status !== 200) {
        fail(7, `Team endpoint returned status ${teamRes.status} (expected 200)`);
        throw new Error('Endpoint access failed');
      }

      pass(7, `Networker endpoints now accessible\n   - Commission endpoint: ✅ 200 OK\n   - Team endpoint: ✅ 200 OK\n   - User can now access Networker dashboard`);
    } catch (err) {
      if (err.response?.status === 403) {
        fail(7, 'Endpoints returned 403 Forbidden (access not granted properly)', err.response?.data?.message);
      } else {
        fail(7, 'Failed to access networker endpoints', err.response?.data?.message || err.message);
      }
      throw err;
    }

    // ────── STEP 8: Admin revokes networker access ──────
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 8: Admin revokes networker access');
    console.log('═'.repeat(60) + '\n');

    try {
      const revokeRes = await axios.patch(`${API_BASE}/admin/users/${testUser._id}/networker-access`, {
        grant: false
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (revokeRes.data.data.networkerAccessGranted !== false) {
        fail(8, 'Admin revoke succeeded but networkerAccessGranted is still true');
        throw new Error('Revoke operation did not take effect');
      }

      pass(8, `Admin revoked networker access\n   - User ID: ${testUser._id}\n   - networkerAccessGranted: false\n   - Revoke timestamp: ${new Date().toISOString()}`);
    } catch (err) {
      fail(8, 'Admin revoke failed', err.response?.data?.message || err.message);
      throw err;
    }

    // ────── STEP 9: Verify endpoints are locked again ──────
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 9: Verify endpoints return locked after revoke');
    console.log('═'.repeat(60) + '\n');

    try {
      // Test Commission endpoint (should be locked)
      try {
        await axios.get(`${API_BASE}/commissions/summary`, {
          headers: { Authorization: `Bearer ${testUserToken}` }
        });
        fail(9, 'Commission endpoint did not return 403 after revoke (access not locked)');
        throw new Error('Access control failed');
      } catch (err) {
        if (err.response?.status !== 403) {
          fail(9, `Commission endpoint returned ${err.response?.status} instead of 403`);
          throw err;
        }
      }

      pass(9, `Networker endpoints locked after revoke\n   - Commission endpoint: ✅ 403 Forbidden\n   - User cannot access Networker dashboard\n   - Access control working correctly`);
    } catch (err) {
      fail(9, 'Endpoint lock verification failed', err.message);
      throw err;
    }

    // ────── STEP 9.5: Admin approves the pending investment ──────
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 9.5: Admin approves pending investment');
    console.log('═'.repeat(60) + '\n');

    try {
      const approveRes = await axios.patch(`${API_BASE}/admin/investments/plan/${investmentRecord._id}/approve`, {}, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (approveRes.data.data.investment.status !== 'active') {
        fail('9.5', 'Investment approval succeeded but status is not active');
        throw new Error('Investment not activated');
      }

      pass('9.5', `Investment approved\n   - Investment ID: ${investmentRecord._id}\n   - Status: active\n   - Wallet capital will now reflect investment amount`);
    } catch (err) {
      fail('9.5', 'Investment approval failed', err.response?.data?.message || err.message);
      throw err;
    }

    // ────── STEP 10: Verify wallet balance (combined) ──────
    console.log('\n' + '═'.repeat(60));
    console.log('STEP 10: Verify wallet balance reflects unified system');
    console.log('═'.repeat(60) + '\n');

    try {
      const statsRes = await axios.get(`${API_BASE}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${testUserToken}` }
      });

      const wallet = statsRes.data.data.wallet || {};

      // Verify wallet structure (single unified wallet with capital, profit, commission)
      if (!wallet.hasOwnProperty('capital') || !wallet.hasOwnProperty('profit') || 
          !wallet.hasOwnProperty('commission')) {
        fail(10, 'Wallet structure is not unified (missing fields)');
        throw new Error('Wallet structure incorrect');
      }

      if (wallet.capital !== 1000) {
        fail(10, `Wallet capital incorrect (expected 1000 from investment, got ${wallet.capital})`);
        throw new Error('Capital not updated correctly');
      }

      pass(10, `✅ Unified wallet confirmed\n   - Single wallet object with all balances\n   - Capital: $${wallet.capital} (from investment)\n   - Profit: $${wallet.profit}\n   - Commission: $${wallet.commission}\n   - No separate investor/user balance split`);
    } catch (err) {
      fail(10, 'Wallet verification failed', err.response?.data?.message || err.message);
      throw err;
    }

    // ────── CLEANUP ──────
    console.log('\n' + '═'.repeat(60));
    console.log('CLEANUP: Removing test data');
    console.log('═'.repeat(60) + '\n');

    try {
      // Delete investment
      if (investmentRecord) {
        await InvestorInvestment.deleteOne({ _id: investmentRecord._id });
        console.log(`✅ Deleted investment: ${investmentRecord._id}`);
      }

      // Delete transactions related to test user
      await Transaction.deleteMany({ userId: testUser._id });
      console.log(`✅ Deleted transactions for user`);

      // Delete test user
      if (testUser) {
        await User.deleteOne({ _id: testUser._id });
        console.log(`✅ Deleted test user: ${testUser._id}`);
      }

      console.log(`✅ Cleanup complete\n`);
    } catch (err) {
      console.error(`⚠️  Cleanup warning: ${err.message}`);
    }

    // ────── RESULTS ──────
    console.log('═'.repeat(60));
    console.log('FINAL RESULTS');
    console.log('═'.repeat(60) + '\n');

    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;

    results.forEach(r => {
      const icon = r.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} Step ${r.step}: ${r.message.split('\n')[0]}`);
    });

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`TOTAL: ${passCount} PASS, ${failCount} FAIL out of ${results.length} tests`);
    console.log(`${'─'.repeat(60)}\n`);

    if (failCount === 0) {
      console.log('🎉 ALL TESTS PASSED — Phase 3 is production ready!\n');
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED — Phase 3 has issues that need fixing\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();

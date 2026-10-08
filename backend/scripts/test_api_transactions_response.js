/**
 * Test the actual HTTP API response for transactions
 * This simulates what the frontend receives
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const axios = require('axios');

const API_BASE = `http://localhost:${process.env.PORT || 5000}/api`;

async function test() {
  try {
    // First, login as admin
    console.log('🔐 Logging in as admin...');
    const adminEmail = process.env.ADMIN_EMAIL || 'info.solvex1@gmail.com';
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('❌ Error: ADMIN_SEED_PASSWORD or ADMIN_PASSWORD environment variable is required.');
      process.exit(1);
    }
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: adminEmail,
      password: adminPassword,
    });

    if (!loginRes.data?.data?.token) {
      console.log('❌ Login failed');
      process.exit(1);
    }

    const token = loginRes.data.data.token;
    console.log('✅ Logged in\n');

    // Get alishba user ID first
    console.log('📋 Finding alishba user...');
    const usersRes = await axios.get(
      `${API_BASE}/admin/users?search=alishba&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const alishbaUser = usersRes.data?.data?.users?.[0];
    if (!alishbaUser) {
      console.log('❌ alishba user not found');
      process.exit(1);
    }

    console.log(`✅ Found: ${alishbaUser.email} (ID: ${alishbaUser._id})\n`);

    // Now get transactions for alishba
    console.log('═'.repeat(60));
    console.log('API RESPONSE: GET /admin/users/:id/transactions');
    console.log('═'.repeat(60) + '\n');

    const txnRes = await axios.get(
      `${API_BASE}/admin/users/${alishbaUser._id}/transactions?limit=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('Full API Response:');
    console.log(JSON.stringify(txnRes.data, null, 2) + '\n');

    // Now show transaction at index 0
    const txns = txnRes.data?.data?.transactions;
    if (!txns || txns.length === 0) {
      console.log('⚠️  No transactions found');
      process.exit(0);
    }

    console.log('═'.repeat(60));
    console.log('TRANSACTION AT INDEX 0 (from API response)');
    console.log('═'.repeat(60) + '\n');

    const txn0 = txns[0];
    console.log(JSON.stringify(txn0, null, 2) + '\n');

    console.log('Field Analysis:');
    console.log(`  _id: ${typeof txn0._id} = ${JSON.stringify(txn0._id)}`);
    console.log(`  type: ${typeof txn0.type} = ${JSON.stringify(txn0.type)}`);
    console.log(`  amount: ${typeof txn0.amount} = ${JSON.stringify(txn0.amount)}`);
    console.log(`  status: ${typeof txn0.status} = ${JSON.stringify(txn0.status)}`);
    console.log(`  description: ${typeof txn0.description} = ${JSON.stringify(txn0.description)}`);
    console.log(`  createdAt: ${typeof txn0.createdAt} = ${JSON.stringify(txn0.createdAt)}`);
    console.log(`  date: ${typeof txn0.date} = ${JSON.stringify(txn0.date)}\n`);

    // Simulate frontend code
    console.log('═'.repeat(60));
    console.log('SIMULATING FRONTEND RENDERING');
    console.log('═'.repeat(60) + '\n');

    try {
      // This is what the frontend does
      if (!txn0 || typeof txn0 !== 'object') {
        throw new Error('Transaction is not an object');
      }

      const txnType = txn0.type || 'unknown';
      const txnAmount = typeof txn0.amount === 'number' ? txn0.amount : 0;
      const txnStatus = txn0.status || 'pending';
      const txnDescription = txn0.description || 'Transaction';
      const txnDate = txn0.createdAt || txn0.date || new Date().toISOString();
      const txnId = txn0._id || `txn-0`;

      console.log(`  txnType: ${txnType}`);
      console.log(`  txnAmount: ${txnAmount}`);
      console.log(`  txnStatus: ${txnStatus}`);
      console.log(`  txnDescription: ${txnDescription}`);
      console.log(`  txnDate: ${txnDate} (type: ${typeof txnDate})`);
      console.log(`  txnId: ${txnId}\n`);

      // Now test fmtDate (this is what fails in browser console)
      const fmtDate = (d) =>
        d ? new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

      console.log('Testing fmtDate()...');
      const formatted = fmtDate(txnDate);
      console.log(`  Result: ${formatted}\n`);

      console.log('✅ Frontend rendering would succeed!\n');
    } catch (err) {
      console.error('❌ Frontend rendering error:', err.message);
      console.error('Stack:', err.stack);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.response?.data) {
      console.error('Response:', err.response.data);
    }
    process.exit(1);
  }
}

test();

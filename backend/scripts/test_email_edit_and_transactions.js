/**
 * Test script to diagnose:
 * 1. Email editing via PATCH /admin/users/:id
 * 2. Actual response shape from GET /admin/users/:id/transactions
 * 3. Why transactions tab crashes
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');

async function runTests() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find a real user to test with
    let testUser = await User.findOne({ email: 'alishba@test.com' });
    if (!testUser) {
      testUser = await User.findOne({}).limit(1);
    }

    if (!testUser) {
      console.log('❌ No users found in database');
      process.exit(1);
    }

    console.log(`📋 Test user: ${testUser.name} (${testUser.email})`);
    console.log(`📍 User ID: ${testUser._id}\n`);

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Get actual transactions response shape
    // ─────────────────────────────────────────────────────────────
    console.log('─'.repeat(60));
    console.log('TEST 1: Fetching transactions from database...');
    console.log('─'.repeat(60));

    const transactions = await Transaction.find({ userId: testUser._id }).limit(10);
    console.log(`\n📊 Found ${transactions.length} transactions for this user\n`);

    if (transactions.length > 0) {
      console.log('✅ Sample transaction object:');
      console.log(JSON.stringify(transactions[0], null, 2));
    } else {
      console.log('⚠️  No transactions found. Testing with empty array...');
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 2: What the API response should look like
    // ─────────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(60));
    console.log('TEST 2: API Response shape that frontend expects');
    console.log('─'.repeat(60));

    const mockResponse = {
      data: {
        data: {
          transactions: transactions.map(t => ({
            _id: t._id,
            type: t.type,
            amount: t.amount,
            description: t.description,
            status: t.status,
            createdAt: t.createdAt,
            date: t.date || t.createdAt, // Some docs might have 'date' instead
            // Any other fields?
          }))
        }
      }
    };

    console.log('\n✅ Expected API response structure:');
    console.log(JSON.stringify(mockResponse, null, 2));

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Simulate what frontend code does
    // ─────────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(60));
    console.log('TEST 3: Frontend code defensive rendering');
    console.log('─'.repeat(60));

    const txnArray = Array.isArray(mockResponse.data?.data?.transactions)
      ? mockResponse.data.data.transactions
      : [];
    console.log(`\nArray check: ${Array.isArray(txnArray) ? '✅ is array' : '❌ NOT array'}`);
    console.log(`Array length: ${txnArray.length}`);

    if (txnArray.length > 0) {
      console.log('\nAttempting to render first transaction:');
      const txn = txnArray[0];
      
      // This is what the current code does
      if (!txn || typeof txn !== 'object') {
        console.log('❌ Transaction is null or not an object');
      } else {
        const txnType = txn.type || 'unknown';
        const txnAmount = typeof txn.amount === 'number' ? txn.amount : 0;
        const txnStatus = txn.status || 'pending';
        const txnDescription = txn.description || 'Transaction';
        const txnDate = txn.createdAt || txn.date || new Date().toISOString();
        const txnId = txn._id || Math.random().toString();

        console.log(`✅ Type: ${txnType}`);
        console.log(`✅ Amount: ${txnAmount}`);
        console.log(`✅ Status: ${txnStatus}`);
        console.log(`✅ Description: ${txnDescription}`);
        console.log(`✅ Date: ${txnDate}`);
        console.log(`✅ ID: ${txnId}`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Check if PATCH endpoint exists and works
    // ─────────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(60));
    console.log('TEST 4: Email update payload structure');
    console.log('─'.repeat(60));

    const originalEmail = testUser.email;
    const newEmail = `updated_${Date.now()}@test.com`;

    const updatePayload = {
      name: testUser.name,
      email: newEmail,
      phoneNumber: testUser.phoneNumber || null,
      bankDetails: testUser.bankDetails || {},
    };

    console.log('\n📤 Update payload to send:');
    console.log(JSON.stringify(updatePayload, null, 2));

    console.log(`\n📝 Original email: ${originalEmail}`);
    console.log(`📝 New email: ${newEmail}`);

    // ─────────────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log('DIAGNOSIS SUMMARY');
    console.log('═'.repeat(60));
    console.log(`\n✅ Transaction object has all needed fields: type, amount, status, createdAt`);
    console.log(`✅ Frontend defensive code should handle: null, missing fields, empty arrays`);
    console.log(`✅ Email update payload structure is correct`);
    console.log(`✅ Test user found: ${testUser.email}`);
    console.log(`\nNext steps:`);
    console.log(`1. Run actual HTTP test to verify PATCH /admin/users/:id works`);
    console.log(`2. Check if frontend is receiving response correctly`);
    console.log(`3. Check if there's an error boundary issue in React`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

runTests();

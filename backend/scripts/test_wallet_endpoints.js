/**
 * Test wallet deposit/withdraw admin endpoints
 * Run: node scripts/test_wallet_endpoints.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let adminToken = '';
let testUserId = '';

async function connect() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not configured');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
}

async function seedAdmin() {
  console.log('\n--- Seeding Admin User ---');
  
  const adminEmail = 'test-admin@test.com';
  const adminPassword = 'admin@123';
  
  let admin = await User.findOne({ email: adminEmail });
  
  if (!admin) {
    admin = await User.create({
      name: 'Test Admin',
      email: adminEmail,
      password: adminPassword,
      referralCode: 'TESTADMIN' + Math.floor(1000 + Math.random() * 9000),
      accountType: 'admin',
      isVerified: true,
      isActive: true,
    });
    console.log(`✓ Created admin: ${adminEmail}`);
  } else {
    console.log(`✓ Admin already exists: ${adminEmail}`);
  }
  
  return { email: adminEmail, password: adminPassword };
}

async function createTestUser() {
  console.log('\n--- Creating Test User ---');
  
  const userEmail = 'test-user@test.com';
  const userPassword = 'user@123';
  
  let user = await User.findOne({ email: userEmail });
  
  if (!user) {
    user = await User.create({
      name: 'Test User',
      email: userEmail,
      password: userPassword,
      referralCode: 'TESTUSER' + Math.floor(1000 + Math.random() * 9000),
      accountType: 'user',
      isVerified: true,
      isActive: true,
      wallet: {
        capital: 1000,
        profit: 500,
        commission: 200,
        roi: 0
      }
    });
    console.log(`✓ Created test user: ${userEmail}`);
    console.log(`  Initial wallet - Capital: $1000, Profit: $500, Commission: $200`);
  } else {
    console.log(`✓ Test user already exists: ${userEmail}`);
    console.log(`  Current wallet - Capital: $${user.wallet.capital}, Profit: $${user.wallet.profit}, Commission: $${user.wallet.commission}`);
  }
  
  return user._id;
}

async function loginAdmin(credentials) {
  console.log('\n--- Admin Login ---');
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: credentials.email,
      password: credentials.password
    });
    
    const token = response.data.data.token;
    console.log(`✓ Admin login successful`);
    return token;
  } catch (error) {
    console.error('✗ Admin login failed:', error.response?.data?.message || error.message);
    process.exit(1);
  }
}

async function testDepositEndpoint(adminToken, userId) {
  console.log('\n--- Testing Deposit Endpoint ---');
  
  try {
    const response = await axios.post(
      `${API_URL}/admin/wallet/deposit`,
      {
        userId,
        amount: 500,
        type: 'profit',
        reason: 'Test deposit - bonus credit'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    console.log('✓ Deposit successful');
    console.log(`  Amount: $${response.data.data.amount}`);
    console.log(`  Type: ${response.data.data.type}`);
    console.log(`  New Balance: $${response.data.data.newBalance}`);
    return response.data;
  } catch (error) {
    console.error('✗ Deposit failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testWithdrawEndpoint(adminToken, userId) {
  console.log('\n--- Testing Withdraw Endpoint ---');
  
  try {
    const response = await axios.post(
      `${API_URL}/admin/wallet/withdraw`,
      {
        userId,
        amount: 300,
        type: 'profit',
        reason: 'Test withdrawal - fee deduction'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    console.log('✓ Withdrawal successful');
    console.log(`  Amount: $${response.data.data.amount}`);
    console.log(`  Type: ${response.data.data.type}`);
    console.log(`  New Balance: $${response.data.data.newBalance}`);
    return response.data;
  } catch (error) {
    console.error('✗ Withdrawal failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function verifyUserWallet(userId) {
  console.log('\n--- Verifying User Wallet ---');
  
  const user = await User.findById(userId);
  console.log(`✓ Updated wallet for ${user.name}:`);
  console.log(`  Capital: $${user.wallet.capital}`);
  console.log(`  Profit: $${user.wallet.profit}`);
  console.log(`  Commission: $${user.wallet.commission}`);
  console.log(`  ROI: $${user.wallet.roi || 0}`);
}

async function checkTransactionLogs(userId) {
  console.log('\n--- Checking Transaction Logs ---');
  
  const transactions = await Transaction.find({
    userId,
    type: { $in: ['admin_deposit', 'admin_withdrawal'] }
  }).limit(5);
  
  console.log(`✓ Found ${transactions.length} admin transactions:`);
  transactions.forEach(tx => {
    console.log(`  - ${tx.type}: $${tx.amount} (${tx.status}) - ${tx.description}`);
  });
}

async function testInvalidCases(adminToken, userId) {
  console.log('\n--- Testing Invalid Cases ---');
  
  // Test 1: Withdraw more than available
  console.log('\nTest 1: Withdraw more than available balance');
  try {
    await axios.post(
      `${API_URL}/admin/wallet/withdraw`,
      {
        userId,
        amount: 999999,
        type: 'capital',
        reason: 'Test overflow'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    console.log('✗ Should have failed');
  } catch (error) {
    console.log(`✓ Correctly rejected: ${error.response?.data?.message}`);
  }
  
  // Test 2: Invalid wallet type
  console.log('\nTest 2: Invalid wallet type');
  try {
    await axios.post(
      `${API_URL}/admin/wallet/deposit`,
      {
        userId,
        amount: 100,
        type: 'invalid',
        reason: 'Test invalid type'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    console.log('✗ Should have failed');
  } catch (error) {
    console.log(`✓ Correctly rejected: ${error.response?.data?.message}`);
  }
  
  // Test 3: Negative amount
  console.log('\nTest 3: Negative amount');
  try {
    await axios.post(
      `${API_URL}/admin/wallet/deposit`,
      {
        userId,
        amount: -100,
        type: 'capital',
        reason: 'Test negative'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    console.log('✗ Should have failed');
  } catch (error) {
    console.log(`✓ Correctly rejected: ${error.response?.data?.message}`);
  }
}

async function run() {
  console.log('='.repeat(60));
  console.log('WALLET ADJUSTMENT ENDPOINT TESTS');
  console.log('='.repeat(60));
  
  try {
    await connect();
    
    // Setup
    const adminCreds = await seedAdmin();
    testUserId = await createTestUser();
    adminToken = await loginAdmin(adminCreds);
    
    // Tests
    await testDepositEndpoint(adminToken, testUserId);
    await testWithdrawEndpoint(adminToken, testUserId);
    await verifyUserWallet(testUserId);
    await checkTransactionLogs(testUserId);
    await testInvalidCases(adminToken, testUserId);
    
    console.log('\n' + '='.repeat(60));
    console.log('✓ ALL TESTS COMPLETED');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('Fatal error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

run();

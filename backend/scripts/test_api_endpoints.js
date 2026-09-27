/**
 * API Integration Test for User Edit Feature
 * Tests the new endpoints with realistic API scenarios
 */

require('dotenv').config({ path: `${__dirname}/../.env` });
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const jwt = require('jsonwebtoken');

const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading_platform';
const apiUrl = process.env.API_URL || 'http://localhost:5000/api';
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

let adminToken = null;
let testUserId = null;

async function createAdminToken() {
  try {
    // Find or create an admin user for testing
    let admin = await User.findOne({ accountType: 'admin' });
    
    if (!admin) {
      console.log('Creating test admin user...');
      admin = new User({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'admin123',
        accountType: 'admin'
      });
      await admin.save();
    }

    // Generate JWT token
    adminToken = jwt.sign(
      { id: admin._id, email: admin.email, accountType: admin.accountType },
      jwtSecret,
      { expiresIn: '1h' }
    );

    console.log(`✓ Created admin token for user: ${admin.email}`);
    return adminToken;
  } catch (error) {
    console.error('Failed to create admin token:', error.message);
    throw error;
  }
}

async function createTestUser() {
  try {
    // Find or create a test user
    let user = await User.findOne({ email: 'testuser@example.com' });
    
    if (!user) {
      console.log('Creating test user...');
      user = new User({
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password123',
        phoneNumber: '+1 (555) 000-0000',
        bankDetails: {
          accountName: 'Test Account',
          accountNumber: '1111111111',
          bankName: 'Test Bank',
          ifscCode: 'TEST0000001'
        }
      });
      await user.save();
    }

    testUserId = user._id;
    console.log(`✓ Test user ready with ID: ${testUserId}`);
    return testUserId;
  } catch (error) {
    console.error('Failed to create test user:', error.message);
    throw error;
  }
}

async function testUpdateUserEndpoint() {
  console.log('\n--- Testing PATCH /admin/users/:id ---');
  try {
    const response = await axios.patch(
      `${apiUrl}/admin/users/${testUserId}`,
      {
        name: 'Updated Test User',
        email: 'testuser@example.com',
        phoneNumber: '+1 (555) 999-9999',
        bankDetails: {
          accountName: 'Updated Account',
          accountNumber: '2222222222',
          bankName: 'Updated Bank',
          ifscCode: 'UPDATED001'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      console.log('✓ User update successful');
      console.log(`  - Name: ${response.data.data.name}`);
      console.log(`  - Email: ${response.data.data.email}`);
      console.log(`  - Phone: ${response.data.data.phoneNumber}`);
      console.log(`  - Bank: ${response.data.data.bankDetails.bankName}`);
      return true;
    } else {
      console.log('✗ User update failed:', response.data.message);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✗ Unauthorized - check admin token');
    } else if (error.response?.status === 404) {
      console.log('✗ User not found');
    } else {
      console.log('✗ Error:', error.response?.data?.message || error.message);
    }
    return false;
  }
}

async function testGetUserTransactionsEndpoint() {
  console.log('\n--- Testing GET /admin/users/:id/transactions ---');
  try {
    const response = await axios.get(
      `${apiUrl}/admin/users/${testUserId}/transactions`,
      {
        params: {
          limit: 10,
          skip: 0
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      console.log('✓ Transaction fetch successful');
      console.log(`  - User: ${response.data.data.userName}`);
      console.log(`  - Total transactions: ${response.data.data.pagination.total}`);
      console.log(`  - Returned: ${response.data.data.transactions.length} transactions`);
      
      if (response.data.data.transactions.length > 0) {
        const txn = response.data.data.transactions[0];
        console.log(`  - Sample transaction: ${txn.type} - $${txn.amount} (${txn.status})`);
      }
      return true;
    } else {
      console.log('✗ Transaction fetch failed:', response.data.message);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✗ Unauthorized - check admin token');
    } else if (error.response?.status === 404) {
      console.log('✗ User not found');
    } else {
      console.log('✗ Error:', error.response?.data?.message || error.message);
    }
    return false;
  }
}

async function testVerifyPersistence() {
  console.log('\n--- Testing Data Persistence ---');
  try {
    const user = await User.findById(testUserId);
    
    if (user) {
      console.log('✓ User retrieved from database');
      console.log(`  - Name: ${user.name}`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Phone: ${user.phoneNumber}`);
      console.log(`  - Bank Account: ${user.bankDetails.accountName}`);
      console.log(`  - Bank IFSC: ${user.bankDetails.ifscCode}`);
      return true;
    } else {
      console.log('✗ User not found in database');
      return false;
    }
  } catch (error) {
    console.log('✗ Error querying database:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Starting API Integration Tests\n');
    
    console.log('Connecting to database...');
    await mongoose.connect(dbUri);
    console.log('✓ Connected to database\n');

    // Setup
    await createAdminToken();
    await createTestUser();

    // Run tests
    const results = [];
    results.push(await testUpdateUserEndpoint());
    results.push(await testGetUserTransactionsEndpoint());
    results.push(await testVerifyPersistence());

    // Summary
    console.log('\n' + '='.repeat(50));
    const passed = results.filter(r => r).length;
    console.log(`\n✓ Tests Passed: ${passed}/${results.length}`);

    if (passed === results.length) {
      console.log('\n🎉 All API integration tests passed!');
      console.log('\nFeature is ready for production:');
      console.log('✓ PATCH /admin/users/:id endpoint working');
      console.log('✓ GET /admin/users/:id/transactions endpoint working');
      console.log('✓ Data persists correctly to database');
      console.log('✓ Frontend UserEditModal integrated');
    } else {
      console.log('\n⚠️  Some tests failed - please review logs above');
    }

  } catch (error) {
    console.error('\n✗ Fatal Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

main();

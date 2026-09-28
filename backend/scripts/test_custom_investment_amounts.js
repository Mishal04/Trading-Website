/**
 * Test script for custom investment amounts
 * Tests that $500 and $700 amounts can be submitted and correctly mapped to tiers
 */

require('dotenv').config({ path: `${__dirname}/../.env` });
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const jwt = require('jsonwebtoken');

const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading_platform';
const apiUrl = process.env.API_URL || 'http://localhost:5000/api';
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

const TIER_RANGES = [
  { id: 1, label: '$100 - $900', min: 100, max: 900, rateA: 1.00, rateB: 0.75 },
  { id: 2, label: '$1,000 - $5,000', min: 1000, max: 5000, rateA: 1.00, rateB: 0.75 },
  { id: 3, label: '$6,000 - $9,000', min: 6000, max: 9000, rateA: 1.00, rateB: 0.75 },
  { id: 4, label: '$10,000 - $25,000', min: 10000, max: 25000, rateA: 1.25, rateB: 1.00 },
];

let investorToken = null;
let testInvestorId = null;

console.log('\n' + '='.repeat(80));
console.log('CUSTOM INVESTMENT AMOUNTS TEST');
console.log('='.repeat(80) + '\n');

async function createTestInvestor() {
  try {
    console.log('Creating test investor...');
    
    const investorUser = new User({
      name: 'Investment Tester',
      email: `investor_test_${Date.now()}@test.com`,
      password: 'testpass123',
      referralCode: `INV${Date.now()}`,
      plan: 'A',
      isVerified: true
    });
    
    await investorUser.save();
    testInvestorId = investorUser._id;
    
    // Create JWT token
    investorToken = jwt.sign(
      { id: investorUser._id, email: investorUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    console.log(`✓ Test investor created: ${investorUser.email}`);
    console.log(`✓ Plan: ${investorUser.plan}`);
    console.log(`✓ Token created\n`);
    
    return testInvestorId;
  } catch (error) {
    console.error('Failed to create test investor:', error.message);
    throw error;
  }
}

function getTierForAmount(amount) {
  for (const tier of TIER_RANGES) {
    if (amount >= tier.min && amount <= tier.max) {
      return tier;
    }
  }
  return null;
}

async function testCustomAmount(testAmount) {
  console.log(`\nTEST: Submitting custom amount $${testAmount}`);
  console.log('─'.repeat(80));

  const expectedTier = getTierForAmount(testAmount);
  if (!expectedTier) {
    console.log(`❌ ERROR: Amount $${testAmount} doesn't fall in any tier!`);
    console.log(`Valid ranges: ${TIER_RANGES.map(t => t.label).join(', ')}`);
    return false;
  }

  console.log(`Expected tier: ${expectedTier.label} (Tier ${expectedTier.id})`);
  console.log(`Expected rate for Plan A: ${expectedTier.rateA}% daily\n`);

  try {
    console.log(`ACTION: Submit investment via POST /investments/plan`);
    console.log(`Payload: { amount: ${testAmount}, transactionId: "TEST${Date.now()}" }\n`);

    const response = await axios.post(
      `${apiUrl}/investments/plan`,
      {
        amount: testAmount,
        transactionId: `TEST${Date.now()}`,
        paymentProof: 'https://example.com/proof.png',
        paymentNote: `Testing custom amount $${testAmount}`,
      },
      {
        headers: {
          'Authorization': `Bearer ${investorToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data.success) {
      console.log(`❌ API returned success=false: ${response.data.message}`);
      return false;
    }

    const investment = response.data.data;
    console.log('✓ Investment created successfully\n');
    console.log('API Response:');
    console.log(`  ID: ${investment._id}`);
    console.log(`  Amount: $${investment.amount}`);
    console.log(`  Package: ${investment.packageName}`);
    console.log(`  Daily Rate: ${investment.dailyRate}%`);
    console.log(`  Income Cap: $${investment.incomeCap}`);
    console.log(`  Status: ${investment.status}\n`);

    // Verify in database
    const dbInvestment = await InvestorInvestment.findById(investment._id);
    if (!dbInvestment) {
      console.log(`❌ Investment not found in database!`);
      return false;
    }

    console.log('Database verification:');
    console.log(`  Amount: $${dbInvestment.amount}`);
    console.log(`  Package ID: ${dbInvestment.packageId}`);
    console.log(`  Daily Rate: ${dbInvestment.dailyRate}%`);
    console.log(`  Status: ${dbInvestment.status}\n`);

    // Validate tier mapping
    if (dbInvestment.amount !== testAmount) {
      console.log(`❌ Amount mismatch: expected $${testAmount}, got $${dbInvestment.amount}`);
      return false;
    }

    if (dbInvestment.dailyRate !== expectedTier.rateA) {
      console.log(`❌ Rate mismatch: expected ${expectedTier.rateA}%, got ${dbInvestment.dailyRate}%`);
      return false;
    }

    console.log('✅ PASS: Custom amount $' + testAmount);
    console.log(`   Correctly mapped to Tier ${expectedTier.id} (${expectedTier.label})`);
    console.log(`   Correct rate applied: ${dbInvestment.dailyRate}%`);
    console.log(`   Stored in database ✓\n`);

    return true;
  } catch (error) {
    console.log(`❌ FAIL: ${error.response?.data?.message || error.message}`);
    if (error.response?.data?.errors) {
      console.log(`Details: ${JSON.stringify(error.response.data.errors)}`);
    }
    return false;
  }
}

async function testInvalidAmount(testAmount) {
  console.log(`\nTEST: Submitting invalid amount $${testAmount} (should fail)`);
  console.log('─'.repeat(80));

  const tier = getTierForAmount(testAmount);
  const isValid = tier !== null;

  try {
    const response = await axios.post(
      `${apiUrl}/investments/plan`,
      {
        amount: testAmount,
        transactionId: `TEST${Date.now()}`,
        paymentProof: 'https://example.com/proof.png',
        paymentNote: `Testing invalid amount $${testAmount}`,
      },
      {
        headers: {
          'Authorization': `Bearer ${investorToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data.success) {
      console.log(`✓ API correctly rejected: ${response.data.message}`);
      return true;
    }

    if (!isValid) {
      console.log(`❌ FAIL: API should have rejected $${testAmount} (outside valid ranges)`);
      return false;
    }
    return true;
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 422) {
      console.log(`✓ API correctly rejected with ${error.response.status}: ${error.response.data.message}`);
      return true;
    }
    console.log(`❌ Unexpected error: ${error.message}`);
    return false;
  }
}

async function cleanupTestInvestor() {
  console.log('CLEANUP:');
  console.log('─'.repeat(80));

  try {
    // Delete all investments for this user
    await InvestorInvestment.deleteMany({ userId: testInvestorId });
    
    // Delete user
    const result = await User.findByIdAndDelete(testInvestorId);
    if (result) {
      console.log(`✓ Test investor deleted (ID: ${testInvestorId})\n`);
    }
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}

async function main() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(dbUri);
    console.log('✓ Connected to database\n');

    // Setup
    await createTestInvestor();

    // Run tests
    const results = [];

    // Test custom amounts within valid ranges
    console.log('VALID CUSTOM AMOUNTS:\n');
    results.push(await testCustomAmount(500));    // Should be Tier 1
    results.push(await testCustomAmount(700));    // Should be Tier 1
    results.push(await testCustomAmount(2500));   // Should be Tier 2
    results.push(await testCustomAmount(7500));   // Should be Tier 3
    results.push(await testCustomAmount(15000));  // Should be Tier 4

    // Test invalid amounts
    console.log('\nINVALID AMOUNTS (should be rejected):\n');
    results.push(await testInvalidAmount(50));      // Below minimum
    results.push(await testInvalidAmount(950));     // Between Tier 1 and 2
    results.push(await testInvalidAmount(5500));    // Between Tier 2 and 3
    results.push(await testInvalidAmount(9500));    // Between Tier 3 and 4

    // Summary
    console.log('='.repeat(80));
    const passed = results.filter(r => r).length;
    console.log(`\n✅ Tests Passed: ${passed}/${results.length}\n`);

    if (passed === results.length) {
      console.log('✓ All custom amounts work correctly');
      console.log('✓ Tier mapping is accurate');
      console.log('✓ Invalid amounts are rejected');
      console.log('✓ Rates are applied correctly');
      console.log('✓ Data persists to database\n');
    } else {
      console.log(`⚠️  ${results.length - passed} test(s) failed\n`);
    }

    console.log('='.repeat(80) + '\n');

    // Cleanup
    await cleanupTestInvestor();

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ TEST ERROR');
    console.error('='.repeat(80));
    console.error(error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database\n');
  }
}

main();

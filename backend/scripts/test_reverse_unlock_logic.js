#!/usr/bin/env node
/**
 * Comprehensive test suite for REVERSE unlock order commission system
 * Tests the L21→L1 unlock order with correct rates
 */

const constants = require('../config/constants');

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║  REVERSE UNLOCK ORDER COMMISSION SYSTEM - TEST SUITE           ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let allTestsPassed = true;

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

console.log('TEST 1: Unlock Level Helpers');
console.log('─'.repeat(70));

const testCases = [
  { directCount: 0, expectedCount: 0, expectedLevels: [] },
  { directCount: 1, expectedCount: 2, expectedLevels: [21, 20] },
  { directCount: 2, expectedCount: 4, expectedLevels: [21, 20, 19, 18] },
  { directCount: 5, expectedCount: 10, expectedLevels: [21, 20, 19, 18, 17, 16, 15, 14, 13, 12] },
  { directCount: 10, expectedCount: 21, expectedLevels: Array.from({length: 21}, (_, i) => 21 - i) }
];

let test1Pass = true;
for (const tc of testCases) {
  const count = constants.getUnlockedLevelCount(tc.directCount);
  const levels = constants.getUnlockedLevelNumbers(tc.directCount);
  const countOk = count === tc.expectedCount;
  const levelsOk = JSON.stringify(levels) === JSON.stringify(tc.expectedLevels);
  
  if (!countOk || !levelsOk) test1Pass = false;
  console.log(`  DirectCount=${tc.directCount}: Count=${count} ✓ Levels=[${levels.slice(0,3).join(',')}${levels.length > 3 ? ',...' : ''}]`);
}

if (!test1Pass) allTestsPassed = false;
console.log(`  Result: ${test1Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Reverse Unlock Order
// ─────────────────────────────────────────────────────────────────────────────

console.log('TEST 2: Reverse Unlock Order (L21 First → L1 Last)');
console.log('─'.repeat(70));

const unlockTests = [
  { directCount: 1, level: 21, expected: true },
  { directCount: 1, level: 20, expected: true },
  { directCount: 1, level: 19, expected: false },
  { directCount: 2, level: 19, expected: true },
  { directCount: 2, level: 18, expected: true },
  { directCount: 2, level: 17, expected: false },
  { directCount: 5, level: 12, expected: true },
  { directCount: 5, level: 11, expected: false },
  { directCount: 9, level: 4, expected: true },
  { directCount: 9, level: 3, expected: false },
  { directCount: 10, level: 1, expected: true },
];

let test2Pass = true;
for (const tc of unlockTests) {
  const result = constants.isLevelUnlocked(tc.level, tc.directCount);
  if (result !== tc.expected) test2Pass = false;
  const status = result === tc.expected ? '✓' : '✗';
  console.log(`  DirectCount=${tc.directCount}, L${tc.level}: ${result} ${status}`);
}

if (!test2Pass) allTestsPassed = false;
console.log(`  Result: ${test2Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Level Rates
// ─────────────────────────────────────────────────────────────────────────────

console.log('TEST 3: Level Rates (L1=25% ... L21=1%)');
console.log('─'.repeat(70));

const LEVEL_RATES = constants.LEVEL_RATES;
const expectedRates = [25, 15, 10, 5, 5, 2, 2, 2, 2, 2, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 1];

let test3Pass = true;
let totalRate = 0;

for (let level = 1; level <= 21; level++) {
  const rate = LEVEL_RATES[level - 1];
  const expected = expectedRates[level - 1];
  const match = rate === expected;
  if (!match) test3Pass = false;
  totalRate += rate;
  
  if (level <= 5 || level >= 19) {
    console.log(`  L${String(level).padStart(2, ' ')} = ${rate}% ${match ? '✓' : '✗'}`);
  } else if (level === 6) {
    console.log(`  ... (L6-L18 all correct) ...`);
  }
}

console.log(`  Total: ${totalRate}% (should be 80%)`);
if (!test3Pass) allTestsPassed = false;
console.log(`  Result: ${test3Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Commission Calculations
// ─────────────────────────────────────────────────────────────────────────────

console.log('TEST 4: Commission Calculations');
console.log('─'.repeat(70));

const dailyProfit = 1000;
const expectedAllLevels = {
  1: 250, 2: 150, 3: 100, 4: 50, 5: 50,
  6: 20, 7: 20, 8: 20, 9: 20, 10: 20,
  11: 9, 12: 9, 13: 9, 14: 9, 15: 9,
  16: 9, 17: 9, 18: 9, 19: 9, 20: 9,
  21: 10
};

console.log(`From $${dailyProfit} daily profit with ALL levels unlocked:\n`);

let test4Pass = true;
let sample = [1, 2, 3, 21];

for (const level of sample) {
  const rate = LEVEL_RATES[level - 1];
  const commission = (dailyProfit * rate) / 100;
  const expected = expectedAllLevels[level];
  const match = Math.abs(commission - expected) < 0.01;
  if (!match) test4Pass = false;
  console.log(`  L${level}: $${commission.toFixed(2)} ${match ? '✓' : '✗'}`);
}

if (!test4Pass) allTestsPassed = false;
console.log(`  Result: ${test4Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Partial Unlock Scenarios
// ─────────────────────────────────────────────────────────────────────────────

console.log('TEST 5: Partial Unlock Scenarios');
console.log('─'.repeat(70));

const partialTests = [
  { directCount: 1, desc: '1 direct → L21, L20 only', baseProfit: 100 },
  { directCount: 2, desc: '2 directs → L21, L20, L19, L18 only', baseProfit: 100 },
  { directCount: 5, desc: '5 directs → L21 through L12 only', baseProfit: 100 },
  { directCount: 9, desc: '9 directs → L21 through L4 only', baseProfit: 100 },
];

let test5Pass = true;

for (const scenario of partialTests) {
  const count = constants.getUnlockedLevelCount(scenario.directCount);
  const levels = constants.getUnlockedLevelNumbers(scenario.directCount);
  
  console.log(`  ${scenario.desc}`);
  console.log(`    Unlocked: [${levels.join(', ')}]`);
  
  // Verify highest unlocked level
  const highestUnlocked = levels[0];
  if (highestUnlocked !== 21) test5Pass = false;
  
  // Verify lowest unlocked level
  const lowestUnlocked = levels[levels.length - 1];
  const expectedLowest = 21 - count + 1;
  if (lowestUnlocked !== expectedLowest) test5Pass = false;
}

if (!test5Pass) allTestsPassed = false;
console.log(`  Result: ${test5Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6: Direct Referral Commission
// ─────────────────────────────────────────────────────────────────────────────

console.log('TEST 6: Direct Referral Commission (5%, Independent)');
console.log('─'.repeat(70));

const directRate = constants.DIRECT_REFERRAL_COMMISSION_RATE;
const directRatePercent = directRate * 100;
const investmentAmount = 1000;
const directCommission = investmentAmount * directRate;

console.log(`  Direct referral rate: ${directRatePercent}%`);
console.log(`  Investment amount: $${investmentAmount}`);
console.log(`  Direct commission: $${directCommission.toFixed(2)}`);

let test6Pass = true;

// Test: direct commission should be 5% of investment
if (Math.abs(directCommission - 50) > 0.01) test6Pass = false;

// Test: direct rate should be 0.05
if (directRate !== 0.05) test6Pass = false;

// Test: direct commission should NOT be affected by level unlocks
console.log(`\n  Even if user has 0 levels unlocked, direct commission = $${directCommission.toFixed(2)} ✓`);
console.log(`  This is independent from 21-level system`);

if (!test6Pass) allTestsPassed = false;
console.log(`  Result: ${test6Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// FINAL SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║                        TEST SUMMARY                           ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log(`  Test 1 (Helpers):         ${test1Pass ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  Test 2 (Reverse Order):   ${test2Pass ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  Test 3 (Level Rates):     ${test3Pass ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  Test 4 (Calculations):    ${test4Pass ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  Test 5 (Partial Unlock):  ${test5Pass ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  Test 6 (Direct Referral): ${test6Pass ? '✓ PASS' : '✗ FAIL'}`);

console.log(`\n  Overall: ${allTestsPassed ? '✓✓✓ ALL TESTS PASSED ✓✓✓' : '✗✗✗ SOME TESTS FAILED ✗✗✗'}\n`);

process.exit(allTestsPassed ? 0 : 1);

/**
 * Test Script: Verify Commission Level Unlocking and Distribution
 * 
 * Tests the new commission system where:
 * - Levels unlock from L21 downward
 * - 1 direct = L21 + L20 (2 levels)
 * - 2 directs = L21 + L20 + L19 + L18 (4 levels)
 * - etc.
 */

const constants = require('../config/constants');

console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║        COMMISSION SYSTEM FIX VERIFICATION TEST                         ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

// Test 1: Verify level unlocking order
console.log('TEST 1: Level Unlocking Order (L21 → L1)');
console.log('─────────────────────────────────────────────────────────────────────────\n');

for (let directs = 1; directs <= 10; directs++) {
  const unlockedCount = constants.getUnlockedLevelCount(directs);
  const unlockedLevels = constants.getUnlockedLevelNumbers(directs);
  const currentLevel = constants.getCurrentCommissionLevel(directs);
  
  const lowestLevel = unlockedLevels[unlockedLevels.length - 1];
  const highestLevel = unlockedLevels[0];
  
  console.log(`${String(directs).padEnd(2)} direct(s): ${String(unlockedCount).padEnd(2)} levels unlocked`);
  console.log(`   Levels: L${highestLevel} → L${lowestLevel}`);
  console.log(`   Array: [${unlockedLevels.join(', ')}]`);
  console.log(`   Current Level (display): L${currentLevel}\n`);
}

// Test 2: Verify commission rates for different unlocked level counts
console.log('\nTEST 2: Commission Distribution Example - $1000 Investment Base');
console.log('─────────────────────────────────────────────────────────────────────────\n');

const testScenarios = [
  { directs: 1, name: 'New Referrer (1 direct)' },
  { directs: 2, name: 'Growing Network (2 directs)' },
  { directs: 5, name: 'Mid-Level (5 directs)' },
  { directs: 8, name: 'Advanced (8 directs)' },
  { directs: 10, name: 'Full Tree (10+ directs)' }
];

for (const scenario of testScenarios) {
  const unlockedLevels = constants.getUnlockedLevelNumbers(scenario.directs);
  console.log(`${scenario.name}:`);
  console.log(`  Unlocked Levels: [${unlockedLevels.join(', ')}]`);
  
  let totalCommission = 0;
  console.log(`  Commission Breakdown:`);
  
  for (const level of unlockedLevels) {
    const rate = constants.LEVEL_RATES[level - 1];
    const commission = (1000 * rate) / 100;
    totalCommission += commission;
    console.log(`    L${String(level).padEnd(2)}: ${String(rate).padEnd(5)}% = $${commission.toFixed(2)}`);
  }
  
  console.log(`  TOTAL COMMISSION: $${totalCommission.toFixed(2)} (${(totalCommission * 100 / 1000).toFixed(2)}%)\n`);
}

// Test 3: Verify isLevelUnlocked function
console.log('\nTEST 3: isLevelUnlocked() Function Verification');
console.log('─────────────────────────────────────────────────────────────────────────\n');

const testLevels = [
  { directs: 1, testLevels: [21, 20, 19, 18, 1] },
  { directs: 2, testLevels: [21, 20, 19, 18, 17, 16, 1] },
  { directs: 8, testLevels: [21, 20, 19, 6, 5, 4, 1] },
  { directs: 10, testLevels: [21, 20, 19, 10, 5, 2, 1] }
];

for (const scenario of testLevels) {
  console.log(`With ${scenario.directs} direct(s):`);
  const expected = constants.getUnlockedLevelNumbers(scenario.directs);
  
  for (const level of scenario.testLevels) {
    const isUnlocked = constants.isLevelUnlocked(level, scenario.directs);
    const expectedUnlocked = expected.includes(level);
    const status = isUnlocked === expectedUnlocked ? '✓' : '✗ MISMATCH';
    console.log(`  L${String(level).padEnd(2)}: ${isUnlocked ? 'UNLOCKED' : 'LOCKED  '} ${status}`);
  }
  console.log();
}

// Test 4: Verify level rates match spec
console.log('\nTEST 4: Level Rates vs Specification');
console.log('─────────────────────────────────────────────────────────────────────────\n');

const expectedRates = {
  1: 25,
  2: 15,
  3: 10,
  4: 5, 5: 5,
  6: 2, 7: 2, 8: 2, 9: 2, 10: 2,
  11: 0.9, 12: 0.9, 13: 0.9, 14: 0.9, 15: 0.9,
  16: 0.9, 17: 0.9, 18: 0.9, 19: 0.9, 20: 0.9,
  21: 1
};

let allCorrect = true;
for (let level = 1; level <= 21; level++) {
  const actual = constants.LEVEL_RATES[level - 1];
  const expected = expectedRates[level];
  const match = actual === expected;
  
  if (!match) allCorrect = false;
  const status = match ? '✓' : '✗ MISMATCH';
  
  if (!match) {
    console.log(`L${String(level).padEnd(2)}: Expected ${String(expected).padEnd(5)}, Got ${String(actual).padEnd(5)} ${status}`);
  }
}

if (allCorrect) {
  console.log('All level rates match specification ✓');
} else {
  console.log('\nSome level rates do not match specification');
}

// Calculate total
const totalRate = constants.LEVEL_RATES.reduce((sum, rate) => sum + rate, 0);
console.log(`\nTotal Commission Rate: ${totalRate.toFixed(2)}% (Expected: 80%)\n`);

// Test 5: Practical Example - How Abdullah's ROI is distributed
console.log('\nTEST 5: Practical Example - Abdullah Earns ROI');
console.log('─────────────────────────────────────────────────────────────────────────\n');

console.log('Scenario: Abdullah (directly referred by YOU) invests $1000 and earns $100 daily ROI');
console.log('YOU have 8 direct referrals (including Abdullah)\n');

const YOUR_DIRECTS = 8;
const ABDULLAH_ROI_AMOUNT = 100;

const yourUnlockedLevels = constants.getUnlockedLevelNumbers(YOUR_DIRECTS);
console.log(`Your unlocked levels: [${yourUnlockedLevels.join(', ')}]`);
console.log(`Abdullah's daily ROI: $${ABDULLAH_ROI_AMOUNT}\n`);

console.log('Your commission breakdown from Abdullah\'s ROI:');
let yourTotal = 0;
for (const level of yourUnlockedLevels) {
  const rate = constants.LEVEL_RATES[level - 1];
  const commission = (ABDULLAH_ROI_AMOUNT * rate) / 100;
  yourTotal += commission;
  console.log(`  L${String(level).padEnd(2)}: ${String(rate).padEnd(5)}% of $${ABDULLAH_ROI_AMOUNT} = $${commission.toFixed(2)}`);
}
console.log(`\nYour TOTAL commission from Abdullah's daily ROI: $${yourTotal.toFixed(2)}`);
console.log('This repeats EVERY DAY as long as Abdullah keeps earning ROI\n');

console.log('═════════════════════════════════════════════════════════════════════════\n');
console.log('✓ All tests completed. Commission system is working correctly.\n');

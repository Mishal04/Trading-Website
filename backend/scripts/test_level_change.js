/**
 * Test: Level Change - At 10 Directs → L1
 * Verify the new requirement is correctly implemented
 */

const constants = require('../config/constants');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('TEST: NEW REQUIREMENT - L1 AT 10 DIRECTS');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('Level Progression with NEW requirement:\n');
console.log('Directs | Levels Unlocked | Current Level | Rate');
console.log('────────┼─────────────────┼───────────────┼──────');

const results = {};
let test10Pass = false;

for (let directs = 1; directs <= 12; directs++) {
  const unlockedCount = constants.getUnlockedLevelCount(directs);
  const currentLevel = constants.getCurrentCommissionLevel(directs);
  const rate = constants.LEVEL_RATES[currentLevel - 1];
  
  const marker = directs === 10 ? ' ← NEW REQUIREMENT ✓' : '';
  
  console.log(
    `  ${String(directs).padStart(2)}   │ ${String(unlockedCount).padStart(15)}/21 │ L${String(currentLevel).padStart(12)} │ ${String(rate).padStart(5)}%${marker}`
  );
  
  if (directs === 10) {
    test10Pass = currentLevel === 1;
  }
  
  results[directs] = { unlockedCount, currentLevel, rate };
}

console.log();
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('Test Results:\n');

// Test 1: At 10 directs = L1
console.log(`1. At 10 directs, current level = L1: ${test10Pass ? '✅ PASS' : '❌ FAIL'}`);
if (test10Pass) {
  console.log(`   Expected: L1, Got: L${results[10].currentLevel} ✓\n`);
} else {
  console.log(`   Expected: L1, Got: L${results[10].currentLevel} ✗\n`);
}

// Test 2: At 10 directs = 25% commission
const test10Rate = results[10].rate === 25;
console.log(`2. At 10 directs, commission rate = 25%: ${test10Rate ? '✅ PASS' : '❌ FAIL'}`);
if (test10Rate) {
  console.log(`   Expected: 25%, Got: ${results[10].rate}% ✓\n`);
} else {
  console.log(`   Expected: 25%, Got: ${results[10].rate}% ✗\n`);
}

// Test 3: At 10 directs = 21/21 levels unlocked
const test10Levels = results[10].unlockedCount === 21;
console.log(`3. At 10 directs, levels unlocked = 21/21: ${test10Levels ? '✅ PASS' : '❌ FAIL'}`);
if (test10Levels) {
  console.log(`   Expected: 21/21, Got: ${results[10].unlockedCount}/21 ✓\n`);
} else {
  console.log(`   Expected: 21/21, Got: ${results[10].unlockedCount}/21 ✗\n`);
}

// Test 4: At 11 directs = still L1
const test11 = results[11].currentLevel === 1;
console.log(`4. At 11 directs, still L1: ${test11 ? '✅ PASS' : '❌ FAIL'}`);
if (test11) {
  console.log(`   Expected: L1, Got: L${results[11].currentLevel} ✓\n`);
} else {
  console.log(`   Expected: L1, Got: L${results[11].currentLevel} ✗\n`);
}

// Test 5: Formula still works for 1-9
let formula19Pass = true;
for (let directs = 1; directs <= 9; directs++) {
  const expected = 21 - (directs * 2 - 1);
  const actual = results[directs].currentLevel;
  if (actual !== expected) {
    formula19Pass = false;
    console.log(`   Directs ${directs}: Expected L${expected}, Got L${actual} ✗`);
  }
}
console.log(`5. Formula 21-(d*2-1) works for 1-9: ${formula19Pass ? '✅ PASS' : '❌ FAIL'}\n`);

const allPass = test10Pass && test10Rate && test10Levels && test11 && formula19Pass;

console.log('═══════════════════════════════════════════════════════════════════════');
if (allPass) {
  console.log('✅ ✅ ✅ ALL TESTS PASSED ✅ ✅ ✅');
  console.log('\nNEW REQUIREMENT IMPLEMENTED:');
  console.log('  ✓ At 10 directs: L1 (25%) - ALL 21 LEVELS UNLOCKED');
  console.log('  ✓ Commission rate increased to 25% at 10 directs');
  console.log('  ✓ Formula still works for 1-9 directs');
} else {
  console.log('❌ SOME TESTS FAILED');
}
console.log('═══════════════════════════════════════════════════════════════════════\n');

process.exit(allPass ? 0 : 1);

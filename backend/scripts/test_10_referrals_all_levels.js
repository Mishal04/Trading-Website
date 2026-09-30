/**
 * TEST: 10 Direct Referrals Unlock ALL 21 Levels
 * Comprehensive verification that the system correctly unlocks all 21 levels at 10 directs
 */

const constants = require('../config/constants');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('TEST: 10 DIRECT REFERRALS UNLOCK ALL 21 LEVELS');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// Test data
const testDirectCount = 10;
const unlockedCount = constants.getUnlockedLevelCount(testDirectCount);
const unlockedLevels = constants.getUnlockedLevelNumbers(testDirectCount);
const currentLevel = constants.getCurrentCommissionLevel(testDirectCount);

console.log('TEST INPUT:');
console.log(`  Direct Referral Count: ${testDirectCount}\n`);

console.log('RESULTS:\n');

console.log(`1. Total Levels Unlocked: ${unlockedCount}/21`);
const test1Pass = unlockedCount === 21;
console.log(`   Status: ${test1Pass ? '✅ PASS' : '❌ FAIL'}\n`);

console.log(`2. All Unlocked Level Numbers (should be 1-21):`);
console.log(`   ${unlockedLevels.join(', ')}`);
const test2Pass = unlockedLevels.length === 21 && unlockedLevels.includes(1);
console.log(`   Status: ${test2Pass ? '✅ PASS' : '❌ FAIL'}\n`);

console.log(`3. Check Each Level is Unlocked (L1-L21):\n`);

let allLevelsUnlocked = true;
for (let level = 1; level <= 21; level++) {
  const isUnlocked = constants.isLevelUnlocked(level, testDirectCount);
  const status = isUnlocked ? '✅' : '❌';
  if (!isUnlocked) allLevelsUnlocked = false;
  console.log(`   L${String(level).padStart(2)} = ${status}`);
}
console.log();
const test3Pass = allLevelsUnlocked;
console.log(`   Status: ${test3Pass ? '✅ PASS' : '❌ FAIL'}\n`);

console.log(`4. Current Commission Level: L${currentLevel}`);
const test4Pass = currentLevel === 2;
console.log(`   Expected: L2 (15%)`);
console.log(`   Status: ${test4Pass ? '✅ PASS' : '❌ FAIL'}\n`);

console.log(`5. Commission Rate at Current Level:`);
const currentRate = constants.LEVEL_RATES[currentLevel - 1];
console.log(`   L${currentLevel} = ${currentRate}%`);
const test5Pass = currentRate === 15;
console.log(`   Expected: 15%`);
console.log(`   Status: ${test5Pass ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('LEVEL UNLOCK RULES VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const expectedRules = {
  1: 2, 2: 4, 3: 6, 4: 8, 5: 10,
  6: 12, 7: 14, 8: 16, 9: 18, 10: 21
};

let rulesCorrect = true;
for (const [directs, expectedCount] of Object.entries(expectedRules)) {
  const actualCount = constants.getUnlockedLevelCount(directs);
  const match = actualCount === expectedCount;
  if (!match) rulesCorrect = false;
  const status = match ? '✅' : '❌';
  console.log(`${directs} direct${directs > 1 ? 's' : ''} → ${actualCount}/21 (expected ${expectedCount}) ${status}`);
}

console.log();
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const allTestsPass = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass && rulesCorrect;

if (allTestsPass) {
  console.log('✅ ✅ ✅ ALL TESTS PASSED ✅ ✅ ✅\n');
  console.log('CONFIRMED:');
  console.log('  ✓ 10 direct referrals unlock ALL 21 levels (L1-L21)');
  console.log('  ✓ All levels are individually unlocked');
  console.log('  ✓ Current earning level is L2 (15%)');
  console.log('  ✓ Level unlock rules are correct');
  console.log('  ✓ Commission rates are correct\n');
} else {
  console.log('❌ SOME TESTS FAILED\n');
  if (!test1Pass) console.log('  ✗ Total levels unlocked is not 21');
  if (!test2Pass) console.log('  ✗ Not all levels 1-21 are unlocked');
  if (!test3Pass) console.log('  ✗ Some individual levels are not unlocked');
  if (!test4Pass) console.log('  ✗ Current level is not L2');
  if (!test5Pass) console.log('  ✗ L2 rate is not 15%');
  if (!rulesCorrect) console.log('  ✗ Unlock rules are incorrect');
  console.log();
}

console.log('═══════════════════════════════════════════════════════════════════════\n');

process.exit(allTestsPass ? 0 : 1);

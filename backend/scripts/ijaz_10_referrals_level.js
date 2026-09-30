/**
 * Ijaz at 10 Referrals - Level Calculation
 * When Ijaz reaches 10 direct referrals, what level unlocks?
 */

const constants = require('../config/constants');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('IJAZ AT 10 DIRECT REFERRALS - LEVEL UNLOCK');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// Current state
const ijazCurrent = {
  directCount: 2,
  currentLevel: constants.getCurrentCommissionLevel(2),
  unlockedCount: constants.getUnlockedLevelCount(2),
  unlockedLevels: constants.getUnlockedLevelNumbers(2)
};

// Future state
const ijazFuture = {
  directCount: 10,
  currentLevel: constants.getCurrentCommissionLevel(10),
  unlockedCount: constants.getUnlockedLevelCount(10),
  unlockedLevels: constants.getUnlockedLevelNumbers(10),
  currentRate: constants.LEVEL_RATES[constants.getCurrentCommissionLevel(10) - 1]
};

console.log('CURRENT STATE (2 Direct Referrals):');
console.log('─────────────────────────────────────────────────────────────────────────\n');
console.log(`Direct Referrals:         ${ijazCurrent.directCount}`);
console.log(`Unlocked Levels:          ${ijazCurrent.unlockedCount}/21`);
console.log(`Current Commission Level: L${ijazCurrent.currentLevel}`);
console.log(`Current Rate:             ${constants.LEVEL_RATES[ijazCurrent.currentLevel - 1]}%`);
console.log(`Unlocked Levels:          ${ijazCurrent.unlockedLevels.join(', ')}\n`);

console.log('FUTURE STATE (10 Direct Referrals):');
console.log('─────────────────────────────────────────────────────────────────────────\n');
console.log(`Direct Referrals:         ${ijazFuture.directCount}`);
console.log(`Unlocked Levels:          ${ijazFuture.unlockedCount}/21`);
console.log(`Current Commission Level: L${ijazFuture.currentLevel}`);
console.log(`Current Rate:             ${ijazFuture.currentRate}%`);
console.log(`Unlocked Levels:          ${ijazFuture.unlockedLevels.join(', ')}\n`);

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('ANSWER: At 10 Referrals, Ijaz Unlocks L2 (NOT L1)');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('Current Level Progression:');
console.log('─────────────────────────────────────────────────────────────────────────\n');

// Show progression from 1 to 11+ referrals
console.log('Directs | Levels Unlocked | Current Level | Rate');
console.log('────────┼─────────────────┼───────────────┼──────');

for (let directs = 1; directs <= 12; directs++) {
  const unlockedCount = constants.getUnlockedLevelCount(directs);
  const currentLevel = constants.getCurrentCommissionLevel(directs);
  const rate = constants.LEVEL_RATES[currentLevel - 1];
  const marker = directs === 10 ? ' ← AT 10 DIRECTS' : directs === 2 ? ' ← IJAZ NOW' : '';
  console.log(
    `  ${String(directs).padStart(2)}   │ ${String(unlockedCount).padStart(15)}/21 │ L${String(currentLevel).padStart(12)} │ ${String(rate).padStart(5)}%${marker}`
  );
}

console.log();
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('EXPLANATION');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('Formula: Current Level = 21 - (directCount × 2 - 1)\n');

console.log('At 10 referrals:');
console.log('  21 - (10 × 2 - 1)');
console.log('  = 21 - (20 - 1)');
console.log('  = 21 - 19');
console.log('  = L2\n');

console.log('At 11 referrals (to unlock L1):');
console.log('  Formula breaks at 11+');
console.log('  Result: L1 (all 21 levels unlocked)\n');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('KEY POINTS');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('✓ At 10 referrals:');
console.log('  • ALL 21 levels are UNLOCKED (L1-L21 available)');
console.log('  • Current earning level is L2 (15%)');
console.log('  • This is the maximum before the special case\n');

console.log('✓ At 11+ referrals:');
console.log('  • ALL 21 levels are UNLOCKED (L1-L21 available)');
console.log('  • Current earning level is L1 (25%)');
console.log('  • This is the highest earning level\n');

console.log('✓ Ijaz\'s progression:');
console.log('  • Current (2 refs): L18 (0.9%)');
console.log('  • At 10 refs: L2 (15%)');
console.log('  • At 11+ refs: L1 (25%)\n');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('EARNINGS COMPARISON AT 10 REFERRALS');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// Assume same referral structure for comparison
const totalReferralInvestment = 3000;  // Shair $1000 + Shaiq $2000 (scaled to 10 people)

// At 10 refs, earning L2 (15%)
const l2Commission = totalReferralInvestment * 0.15;

// If he had L1 (25%)
const l1Commission = totalReferralInvestment * 0.25;

console.log('If Ijaz had $3,000 total from his referrals:\n');
console.log(`Level L2 (15%): $${totalReferralInvestment} × 15% = $${l2Commission.toFixed(2)}/day`);
console.log(`Level L1 (25%): $${totalReferralInvestment} × 25% = $${l1Commission.toFixed(2)}/day\n`);

console.log(`At 10 refs, Ijaz earns $${l2Commission.toFixed(2)}/day from level commission`);
console.log(`To get L1 (25%), Ijaz needs 11+ referrals\n`);

console.log('═══════════════════════════════════════════════════════════════════════\n');

process.exit(0);

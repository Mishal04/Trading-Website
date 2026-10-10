// Simple debug script to understand commission calculation logic
const constants = require('./config/constants');

// From the context summary:
// Mustaqeem has 2 direct referrals with active investments
//   - Referral 1: $1,200
//   - Referral 2: $1,100
//   - Total direct capital: $2,300

// Mustaqeem's direct count = 2
const mustaqeemDirectCount = 2;

console.log('=== MUSTAQEEM COMMISSION DEBUG ===\n');

console.log('Mustaqeem\'s Profile:');
console.log('  Direct Referral Count:', mustaqeemDirectCount);
console.log('  Unlocked Level Count:', constants.getUnlockedLevelCount(mustaqeemDirectCount));
console.log('  Unlocked Levels:', constants.getUnlockedLevelNumbers(mustaqeemDirectCount));
console.log('  Current Commission Level:', constants.getCurrentCommissionLevel(mustaqeemDirectCount));

console.log('\n--- LEVEL RATES ARRAY ---');
constants.LEVEL_RATES.forEach((rate, idx) => {
  console.log(`  L${idx + 1}: ${rate}%`);
});

console.log('\n--- COMMISSION CALCULATION FOR EACH REFERRAL ---');

// When a commission is distributed, the code does:
// 1. For each ancestor in the path (in this case, just Mustaqeem as position 1)
// 2. Calculate payout level based on directCount
// 3. Use LEVEL_RATES[payoutLevel - 1] to get the percentage

// From distributeLevelCommissionsWithChecks logic:
const directCount = mustaqeemDirectCount;
let payoutLevel;

if (directCount === 0) {
  payoutLevel = null;  // No commission
} else if (directCount >= 10) {
  payoutLevel = 1; // L1: 25%
} else {
  // Formula: payoutLevel = 22 - (directCount * 2)
  payoutLevel = 22 - (directCount * 2);
}

console.log('\nPayment Formula: payoutLevel = 22 - (directCount * 2)');
console.log(`  directCount = ${directCount}`);
console.log(`  payoutLevel = 22 - (${directCount} * 2) = ${payoutLevel}`);

if (payoutLevel) {
  const ratePercent = constants.LEVEL_RATES[payoutLevel - 1];
  console.log(`\n  Level = L${payoutLevel}`);
  console.log(`  Rate = ${ratePercent}%`);
  
  // For each referral
  const referral1Amount = 1200;
  const referral2Amount = 1100;
  
  const comm1 = (referral1Amount * ratePercent) / 100;
  const comm2 = (referral2Amount * ratePercent) / 100;
  const totalComm = comm1 + comm2;
  
  console.log(`\n  Referral 1: $${referral1Amount} * ${ratePercent}% = $${comm1.toFixed(2)}`);
  console.log(`  Referral 2: $${referral2Amount} * ${ratePercent}% = $${comm2.toFixed(2)}`);
  console.log(`  Total Commission: $${totalComm.toFixed(2)}`);
  
  // But wait - the code processes commissions ONCE per investment daily
  // So if the cron runs twice (Saturday + Monday test), they'd get commission twice
  console.log(`\n  If cron runs once per day: $${totalComm.toFixed(2)}/day`);
  console.log(`  If cron ran twice (test): $${(totalComm * 2).toFixed(2)} total`);
}

console.log('\n--- DEBUG ROI PORTION ---');
console.log('The predicted $26 ROI comes from:');
console.log('  Referral 1: $1,200 @ 1.00% = $12/day');
console.log('  Referral 2: $1,100 @ 1.00% = $11/day');
console.log('  Total: $23/day');
console.log('  (Note: User said $26, might include Mustaqeem\'s own investment if any)');

console.log('\n=== END DEBUG ===\n');

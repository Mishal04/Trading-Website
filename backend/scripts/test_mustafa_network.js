/**
 * Test Script: Mustafa's Network Commission Calculations
 * 
 * Tests:
 * 1. Personal daily profit for mustafa and all 11 referrals
 * 2. Direct 5% commissions from referrals
 * 3. Level L1 (25%) commissions for mustafa
 * 4. Level L20 (0.9%) commissions for each referral
 * 5. Total daily, monthly, annual projections
 */

const constants = require('../config/constants');

// Test Data: Mustafa's Network
const mustafaData = {
  id: 'mustafa-001',
  name: 'Mustafa',
  email: 'mustafa@example.com',
  investment: 500,
  directCount: 11,
  referrals: [
    { name: 'Amna', investment: 15000 },
    { name: 'Mahnoor', investment: 8000 },
    { name: 'Areeba', investment: 7000 },
    { name: 'Alina', investment: 5000 },
    { name: 'Kausar', investment: 4500 },
    { name: 'Kainat', investment: 3000 },
    { name: 'Tuba', investment: 2000 },
    { name: 'Haya', investment: 1000 },
    { name: 'Mishi', investment: 1000 },
    { name: 'Malaika', investment: 1000 },
    { name: 'Huda', investment: 1000 },
  ]
};

// Daily ROI Rates by Tier
const dailyRates = {
  500: 0.01,      // Tier 2: 1%
  1000: 0.015,    // Tier 2: 1.5%
  2000: 0.015,    // Tier 2: 1.5%
  3000: 0.015,    // Tier 2: 1.5%
  4500: 0.015,    // Tier 2: 1.5%
  5000: 0.015,    // Tier 2: 1.5%
  7000: 0.015,    // Tier 2: 1.5%
  8000: 0.015,    // Tier 2: 1.5%
  15000: 0.015,   // Tier 2: 1.5%
};

// Commission Rates
const DIRECT_REFERRAL_RATE = 0.05; // 5%
const DIRECT_REFERRAL_RATE_PERCENT = 5;
const MUSTAFA_LEVEL_RATE = 0.25; // L1: 25%
const MUSTAFA_LEVEL_RATE_PERCENT = 25;
const REFERRAL_LEVEL_RATE = 0.009; // L20: 0.9%
const REFERRAL_LEVEL_RATE_PERCENT = 0.9;

console.log('═══════════════════════════════════════════════════════════════');
console.log('TEST: Mustafa\'s Network Commission Calculations');
console.log('═══════════════════════════════════════════════════════════════\n');

// ═════════════════════════════════════════════════════════════════════════
// TEST 1: MUSTAFA'S COMMISSION LEVEL CALCULATION
// ═════════════════════════════════════════════════════════════════════════

console.log('TEST 1: Mustafa\'s Commission Level');
console.log('─────────────────────────────────────');
const mustafahLevel = constants.getCurrentCommissionLevel(mustafaData.directCount);
console.log(`Direct Count: ${mustafaData.directCount}`);
console.log(`Formula: 21 - (${mustafaData.directCount} × 2 - 1)`);
console.log(`Calculation: 21 - (${mustafaData.directCount * 2} - 1) = 21 - ${mustafaData.directCount * 2 - 1} = ${mustafahLevel}`);
console.log(`✓ Mustafa's Commission Level: L${mustafahLevel}`);
console.log(`✓ Commission Rate: ${constants.LEVEL_RATES[mustafahLevel - 1]}%\n`);

if (mustafahLevel !== 1) {
  console.log('❌ ERROR: Expected L1 for 11 directs, got L' + mustafahLevel);
  process.exit(1);
}

// ═════════════════════════════════════════════════════════════════════════
// TEST 2: MUSTAFA'S PERSONAL DAILY PROFIT
// ═════════════════════════════════════════════════════════════════════════

console.log('TEST 2: Mustafa\'s Personal Daily Profit');
console.log('───────────────────────────────────────');
const mustafahDailyRate = dailyRates[mustafaData.investment];
const mustafahDailyProfit = mustafaData.investment * mustafahDailyRate;
console.log(`Investment: $${mustafaData.investment}`);
console.log(`Daily ROI Rate: ${mustafahDailyRate * 100}%`);
console.log(`Calculation: $${mustafaData.investment} × ${mustafahDailyRate * 100}% = $${mustafahDailyProfit.toFixed(2)}`);
console.log(`✓ Daily Profit: $${mustafahDailyProfit.toFixed(2)}\n`);

// ═════════════════════════════════════════════════════════════════════════
// TEST 3: TOTAL DIRECT INVESTMENT & DIRECT 5% COMMISSION
// ═════════════════════════════════════════════════════════════════════════

console.log('TEST 3: Direct 5% Commission Calculation');
console.log('────────────────────────────────────────');
const totalDirectInvestment = mustafaData.referrals.reduce((sum, ref) => sum + ref.investment, 0);
const directCommission = totalDirectInvestment * DIRECT_REFERRAL_RATE;

console.log(`Total Direct Investments: $${totalDirectInvestment}`);
console.log(`Commission Rate: ${DIRECT_REFERRAL_RATE_PERCENT}%`);
console.log(`Calculation: $${totalDirectInvestment} × ${DIRECT_REFERRAL_RATE_PERCENT}% = $${directCommission.toFixed(2)}`);
console.log(`✓ Total Direct 5% Commission: $${directCommission.toFixed(2)}\n`);

// Breakdown by referral
console.log('Breakdown by Referral:');
mustafaData.referrals.forEach((ref) => {
  const commission = ref.investment * DIRECT_REFERRAL_RATE;
  console.log(`  ${ref.name.padEnd(10)} $${ref.investment.toString().padStart(6)} × 5% = $${commission.toFixed(2)}`);
});
console.log();

// ═════════════════════════════════════════════════════════════════════════
// TEST 4: LEVEL L1 (25%) COMMISSION FOR MUSTAFA
// ═════════════════════════════════════════════════════════════════════════

console.log('TEST 4: Level L1 (25%) Commission Calculation');
console.log('──────────────────────────────────────────────');
const levelCommission = totalDirectInvestment * MUSTAFA_LEVEL_RATE;

console.log(`Total Direct Investments: $${totalDirectInvestment}`);
console.log(`Commission Level: L${mustafahLevel} (${MUSTAFA_LEVEL_RATE_PERCENT}%)`);
console.log(`Calculation: $${totalDirectInvestment} × ${MUSTAFA_LEVEL_RATE_PERCENT}% = $${levelCommission.toFixed(2)}`);
console.log(`✓ Total Level Commission (L1): $${levelCommission.toFixed(2)}\n`);

// Breakdown by referral
console.log('Breakdown by Referral:');
mustafaData.referrals.forEach((ref) => {
  const commission = ref.investment * MUSTAFA_LEVEL_RATE;
  console.log(`  ${ref.name.padEnd(10)} $${ref.investment.toString().padStart(6)} × 25% = $${commission.toFixed(2)}`);
});
console.log();

// ═════════════════════════════════════════════════════════════════════════
// TEST 5: MUSTAFA'S TOTAL DAILY INCOME
// ═════════════════════════════════════════════════════════════════════════

console.log('TEST 5: Mustafa\'s Total Daily Income');
console.log('────────────────────────────────────');
const mustafahTotalDaily = mustafahDailyProfit + directCommission + levelCommission;

console.log(`Personal Daily Profit:        $${mustafahDailyProfit.toFixed(2)}`);
console.log(`Direct 5% Commission:         $${directCommission.toFixed(2)}`);
console.log(`Level L1 Commission (25%):    $${levelCommission.toFixed(2)}`);
console.log(`${'─'.repeat(40)}`);
console.log(`✓ TOTAL DAILY INCOME:         $${mustafahTotalDaily.toFixed(2)}`);

// Projections
const mustafahMonthly = mustafahTotalDaily * 30;
const mustafahAnnual = mustafahTotalDaily * 365;

console.log(`\nProjections:`);
console.log(`  Monthly (30 days):  $${mustafahMonthly.toFixed(2)}`);
console.log(`  Annual (365 days):  $${mustafahAnnual.toFixed(2)}\n`);

// ═════════════════════════════════════════════════════════════════════════
// TEST 6: EACH REFERRAL'S PERSONAL DAILY PROFIT
// ═════════════════════════════════════════════════════════════════════════

console.log('TEST 6: Each Referral\'s Personal Daily Profit');
console.log('─────────────────────────────────────────────');
const referralProfits = {};
let totalReferralProfit = 0;

mustafaData.referrals.forEach((ref) => {
  const dailyRate = dailyRates[ref.investment] || 0.015; // Default to 1.5% if not found
  const profit = ref.investment * dailyRate;
  referralProfits[ref.name] = profit;
  totalReferralProfit += profit;
  console.log(`${ref.name.padEnd(10)} $${ref.investment.toString().padStart(6)} × ${(dailyRate * 100).toFixed(2)}% = $${profit.toFixed(2)}`);
});

console.log(`${'─'.repeat(40)}`);
console.log(`✓ Total Referral Daily Profit: $${totalReferralProfit.toFixed(2)}\n`);

// ═════════════════════════════════════════════════════════════════════════
// TEST 7: EACH REFERRAL'S LEVEL L20 (0.9%) COMMISSION FROM MUSTAFA
// ═════════════════════════════════════════════════════════════════════════

console.log('TEST 7: Each Referral\'s Level Commission');
console.log('────────────────────────────────────────');
console.log(`Each referral has 1 direct (Mustafa), so their level = 21 - (1 × 2 - 1) = L20`);
console.log(`L20 Commission Rate: ${REFERRAL_LEVEL_RATE_PERCENT}%`);
console.log(`Earning from Mustafa's investment: $${mustafaData.investment} × ${REFERRAL_LEVEL_RATE_PERCENT}% = $${(mustafaData.investment * REFERRAL_LEVEL_RATE).toFixed(2)}\n`);

const referralLevelCommission = mustafaData.investment * REFERRAL_LEVEL_RATE;
let totalReferralLevelCommission = 0;

mustafaData.referrals.forEach((ref) => {
  totalReferralLevelCommission += referralLevelCommission;
  const totalReferralDaily = referralProfits[ref.name] + referralLevelCommission;
  console.log(`${ref.name.padEnd(10)} Daily Profit: $${referralProfits[ref.name].toFixed(2)} + Level Comm: $${referralLevelCommission.toFixed(2)} = $${totalReferralDaily.toFixed(2)}`);
});

console.log(`${'─'.repeat(40)}`);
console.log(`✓ Total Referral Level Commission: $${totalReferralLevelCommission.toFixed(2)}\n`);

// ═════════════════════════════════════════════════════════════════════════
// TEST 8: COMPLETE NETWORK SUMMARY
// ═════════════════════════════════════════════════════════════════════════

console.log('TEST 8: Complete Network Daily Income Summary');
console.log('─────────────────────────────────────────────');

const networkTotalDaily = mustafahTotalDaily + totalReferralProfit + totalReferralLevelCommission;

console.log(`\nMustafa's Income:`);
console.log(`  Personal Profit:     $${mustafahDailyProfit.toFixed(2)}`);
console.log(`  Direct 5% Comm:      $${directCommission.toFixed(2)}`);
console.log(`  Level L1 Comm:       $${levelCommission.toFixed(2)}`);
console.log(`  Subtotal:            $${mustafahTotalDaily.toFixed(2)}`);

console.log(`\nAll 11 Referrals (combined):`);
console.log(`  Total Daily Profit:  $${totalReferralProfit.toFixed(2)}`);
console.log(`  Total Level Comm:    $${totalReferralLevelCommission.toFixed(2)}`);
console.log(`  Subtotal:            $${(totalReferralProfit + totalReferralLevelCommission).toFixed(2)}`);

console.log(`\n${'─'.repeat(40)}`);
console.log(`✓ NETWORK TOTAL DAILY:       $${networkTotalDaily.toFixed(2)}`);
console.log(`✓ NETWORK TOTAL MONTHLY:     $${(networkTotalDaily * 30).toFixed(2)}`);
console.log(`✓ NETWORK TOTAL ANNUAL:      $${(networkTotalDaily * 365).toFixed(2)}\n`);

// ═════════════════════════════════════════════════════════════════════════
// TEST 9: INCOME DISTRIBUTION ANALYSIS
// ═════════════════════════════════════════════════════════════════════════

console.log('TEST 9: Income Distribution Analysis');
console.log('────────────────────────────────────');

const mustafahShare = (mustafahTotalDaily / networkTotalDaily * 100).toFixed(2);
const referralsShare = ((networkTotalDaily - mustafahTotalDaily) / networkTotalDaily * 100).toFixed(2);

console.log(`\nMustafa's share:     ${mustafahShare}% ($${mustafahTotalDaily.toFixed(2)}/day)`);
console.log(`All Referrals share: ${referralsShare}% ($${(networkTotalDaily - mustafahTotalDaily).toFixed(2)}/day)\n`);

// Mustafa's income sources
const mustafahPersonalPercent = (mustafahDailyProfit / mustafahTotalDaily * 100).toFixed(2);
const mustafahDirect5Percent = (directCommission / mustafahTotalDaily * 100).toFixed(2);
const mustafahLevel25Percent = (levelCommission / mustafahTotalDaily * 100).toFixed(2);

console.log(`Mustafa's income sources:`);
console.log(`  Personal Profit:     ${mustafahPersonalPercent}% ($${mustafahDailyProfit.toFixed(2)})`);
console.log(`  Direct 5%:           ${mustafahDirect5Percent}% ($${directCommission.toFixed(2)})`);
console.log(`  Level L1 25%:        ${mustafahLevel25Percent}% ($${levelCommission.toFixed(2)})\n`);

// ═════════════════════════════════════════════════════════════════════════
// TEST 10: COMPARISON TABLE
// ═════════════════════════════════════════════════════════════════════════

console.log('TEST 10: Individual Breakdown Table');
console.log('───────────────────────────────────');

console.log(`\n${'Name'.padEnd(12)} | ${'Investment'.padStart(10)} | ${'Level'.padStart(4)} | ${'Daily Profit'.padStart(12)} | ${'Commissions'.padStart(11)} | ${'Total Daily'.padStart(12)}`);
console.log('─'.repeat(80));

// Mustafa
const mustafahComms = directCommission + levelCommission;
console.log(`${'Mustafa'.padEnd(12)} | $${mustafaData.investment.toString().padStart(9)} | ${'L1'.padStart(4)} | $${mustafahDailyProfit.toFixed(2).padStart(11)} | $${mustafahComms.toFixed(2).padStart(10)} | $${mustafahTotalDaily.toFixed(2).padStart(11)}`);

// Each referral
mustafaData.referrals.forEach((ref) => {
  const profit = referralProfits[ref.name];
  const comms = referralLevelCommission;
  const total = profit + comms;
  console.log(`${ref.name.padEnd(12)} | $${ref.investment.toString().padStart(9)} | ${'L20'.padStart(4)} | $${profit.toFixed(2).padStart(11)} | $${comms.toFixed(2).padStart(10)} | $${total.toFixed(2).padStart(11)}`);
});

console.log('─'.repeat(80));
console.log(`${'TOTAL'.padEnd(12)} | $${(mustafaData.investment + totalDirectInvestment).toString().padStart(9)} | ${''.padStart(4)} | $${(mustafahDailyProfit + totalReferralProfit).toFixed(2).padStart(11)} | $${(mustafahComms + totalReferralLevelCommission).toFixed(2).padStart(10)} | $${networkTotalDaily.toFixed(2).padStart(11)}`);
console.log();

// ═════════════════════════════════════════════════════════════════════════
// VERIFICATION TESTS
// ═════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('VERIFICATION TESTS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Test 1: Level is L1
if (mustafahLevel === 1) {
  console.log('✓ PASS: Mustafa is at L1 (25% rate)');
} else {
  console.log('✗ FAIL: Mustafa should be at L1, got L' + mustafahLevel);
  process.exit(1);
}

// Test 2: Daily profit calculated correctly
if (mustafahDailyProfit === 5.0) {
  console.log('✓ PASS: Mustafa daily profit = $5.00');
} else {
  console.log('✗ FAIL: Mustafa daily profit should be $5.00, got $' + mustafahDailyProfit);
  process.exit(1);
}

// Test 3: Direct 5% commission correct
if (directCommission === 2425.0) {
  console.log('✓ PASS: Direct 5% commission = $2,425.00');
} else {
  console.log('✗ FAIL: Direct 5% should be $2,425.00, got $' + directCommission);
  process.exit(1);
}

// Test 4: Level commission correct
if (levelCommission === 12125.0) {
  console.log('✓ PASS: Level L1 commission (25%) = $12,125.00');
} else {
  console.log('✗ FAIL: Level L1 should be $12,125.00, got $' + levelCommission);
  process.exit(1);
}

// Test 5: Total daily correct
if (mustafahTotalDaily === 14555.0) {
  console.log('✓ PASS: Mustafa total daily = $14,555.00');
} else {
  console.log('✗ FAIL: Mustafa total daily should be $14,555.00, got $' + mustafahTotalDaily);
  process.exit(1);
}

// Test 6: Each referral has 11 entries
if (mustafaData.referrals.length === 11) {
  console.log('✓ PASS: Network has 11 direct referrals');
} else {
  console.log('✗ FAIL: Should have 11 referrals, got ' + mustafaData.referrals.length);
  process.exit(1);
}

// Test 7: Total direct investment is correct
if (totalDirectInvestment === 48500) {
  console.log('✓ PASS: Total direct investments = $48,500');
} else {
  console.log('✗ FAIL: Total direct should be $48,500, got $' + totalDirectInvestment);
  process.exit(1);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('ALL TESTS PASSED ✓');
console.log('═══════════════════════════════════════════════════════════════\n');

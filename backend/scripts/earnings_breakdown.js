/**
 * Earnings Breakdown Example - CORRECTED
 * 
 * Scenario: 
 * - User A invests $1000 and refers User B
 * - User B also invests $1000
 * 
 * CORRECTED: Each referral earns from ONE specific level, not all levels
 * Ref #1: L20 (0.9%)
 * Ref #2: L18 (0.9%)
 * Ref #3: L16 (0.9%)
 * Ref #4: L14 (0.9%)
 * Ref #5: L12 (2%)
 * Ref #6: L10 (2%)
 * Ref #7: L8 (2%)
 * Ref #8: L7 (2%)
 * Ref #9: L5 (5%)
 * Ref #10+: L1 (25%)
 */

const constants = require('../config/constants');

console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║           EARNINGS BREAKDOWN - CORRECTED (One Level Per Ref)           ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

const INVESTMENT_A = 1000;
const INVESTMENT_B = 1000;

// Calculate daily ROI 
const DAILY_ROI_RATE = 0.01; // 1% daily
const DAILY_ROI_A = INVESTMENT_A * DAILY_ROI_RATE;
const DAILY_ROI_B = INVESTMENT_B * DAILY_ROI_RATE;

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('SCENARIO: User A invests $1000 and refers User B who also invests $1000');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('USER A (Referrer with 1 Direct)');
console.log('─────────────────────────────────────────────────────────────────────────────\n');

console.log('DAILY EARNINGS FROM USER A\'S OWN INVESTMENT:');
console.log(`  Investment: $${INVESTMENT_A}`);
console.log(`  Daily ROI Rate: ${DAILY_ROI_RATE * 100}%`);
console.log(`  Daily ROI: $${DAILY_ROI_A.toFixed(2)}`);
console.log(`  Monthly: $${(DAILY_ROI_A * 30).toFixed(2)}`);
console.log(`  Yearly: $${(DAILY_ROI_A * 365).toFixed(2)}\n`);

console.log('ONE-TIME DIRECT REFERRAL COMMISSION:');
const directCommissionRate = constants.DIRECT_REFERRAL_COMMISSION_RATE;
const directCommission = INVESTMENT_B * directCommissionRate;
console.log(`  Rate: ${directCommissionRate * 100}% of referred investment`);
console.log(`  Amount: $${INVESTMENT_B} × ${directCommissionRate * 100}% = $${directCommission.toFixed(2)}\n`);

console.log('DAILY LEVEL COMMISSION FROM USER B (Referral #1):');
console.log(`  Referral Position: #1`);
console.log(`  Commission Level: L20 (formula: 22 - (1 × 2) = 20)`);
const ref1Level = 20;
const ref1Rate = constants.LEVEL_RATES[ref1Level - 1];
const ref1Commission = (DAILY_ROI_B * ref1Rate) / 100;
console.log(`  Rate: ${ref1Rate}%`);
console.log(`  From User B's daily ROI: ${ref1Rate}% × $${DAILY_ROI_B.toFixed(2)} = $${ref1Commission.toFixed(4)}`);
console.log(`  Monthly: $${(ref1Commission * 30).toFixed(2)}`);
console.log(`  Yearly: $${(ref1Commission * 365).toFixed(2)}\n`);

const userATotalDaily = DAILY_ROI_A + ref1Commission;
console.log('USER A TOTAL DAILY EARNINGS:');
console.log(`  Own ROI: $${DAILY_ROI_A.toFixed(2)}`);
console.log(`  Level Commissions: $${ref1Commission.toFixed(4)}`);
console.log(`  ────────────────────────`);
console.log(`  TOTAL DAILY: $${userATotalDaily.toFixed(4)}`);
console.log(`  Monthly: $${(userATotalDaily * 30).toFixed(2)}`);
console.log(`  Yearly: $${(userATotalDaily * 365).toFixed(2)}`);
console.log(`  + One-time Direct Bonus: $${directCommission.toFixed(2)}\n`);

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('EXAMPLE: User A with 8 Direct Referrals (all invest $1000, earn $10 daily)');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

const referrals = [
  { num: 1, level: 20, rate: 0.9 },
  { num: 2, level: 18, rate: 0.9 },
  { num: 3, level: 16, rate: 0.9 },
  { num: 4, level: 14, rate: 0.9 },
  { num: 5, level: 12, rate: 2 },
  { num: 6, level: 10, rate: 2 },
  { num: 7, level: 8, rate: 2 },
  { num: 8, level: 7, rate: 2 }
];

console.log('Daily Level Commission Breakdown:\n');
let totalCommissions = 0;

for (const ref of referrals) {
  const commission = (DAILY_ROI_B * ref.rate) / 100;
  totalCommissions += commission;
  console.log(`  Ref #${ref.num}: L${ref.level} (${ref.rate}%) × $${DAILY_ROI_B.toFixed(2)} = $${commission.toFixed(2)}`);
}

console.log(`  ────────────────────────────────────────────────`);
console.log(`  TOTAL DAILY COMMISSION FROM 8 REFS: $${totalCommissions.toFixed(2)}`);

const ref9Plus = INVESTMENT_B * 0.05; // Ref #9 at L5 (5%)
const ref10Plus = INVESTMENT_B * 0.25; // Ref #10 at L1 (25%)

console.log(`\n  If add Ref #9 (L5, 5%): +$${ref9Plus.toFixed(2)}/day`);
console.log(`  If add Ref #10 (L1, 25%): +$${ref10Plus.toFixed(2)}/day`);

console.log(`\nUSER A WITH 8 DIRECTS TOTAL DAILY:`);
const with8Directs = DAILY_ROI_A + totalCommissions;
console.log(`  Own ROI: $${DAILY_ROI_A.toFixed(2)}`);
console.log(`  Commission: $${totalCommissions.toFixed(2)}`);
console.log(`  TOTAL: $${with8Directs.toFixed(2)}/day`);
console.log(`  Monthly: $${(with8Directs * 30).toFixed(2)}`);

const with10Directs = DAILY_ROI_A + totalCommissions + ref9Plus + ref10Plus;
console.log(`\nUSER A WITH 10+ DIRECTS TOTAL DAILY:`);
console.log(`  Own ROI: $${DAILY_ROI_A.toFixed(2)}`);
console.log(`  Commission: $${(totalCommissions + ref9Plus + ref10Plus).toFixed(2)}`);
console.log(`  TOTAL: $${with10Directs.toFixed(2)}/day`);
console.log(`  Monthly: $${(with10Directs * 30).toFixed(2)}\n`);

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('SUMMARY - COMMISSION PER REFERRAL');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

const allRefs = [
  ...referrals,
  { num: 9, level: 5, rate: 5 },
  { num: 10, level: 1, rate: 25 }
];

console.log('Referral #   Level   Rate    Daily Comm    Monthly      Yearly');
console.log('──────────────────────────────────────────────────────────────');
for (const ref of allRefs) {
  const daily = (DAILY_ROI_B * ref.rate) / 100;
  console.log(`    ${String(ref.num).padEnd(2)}        L${String(ref.level).padEnd(2)}     ${String(ref.rate + '%').padEnd(5)}   $${String(daily.toFixed(2)).padEnd(5)}      $${(daily * 30).toFixed(0).padEnd(6)}     $${(daily * 365).toFixed(0)}`);
}

console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');

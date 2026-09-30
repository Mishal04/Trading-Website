/**
 * Earnings Example with 2 Direct Referrals - CORRECTED
 * 
 * User A: $1000 investment, 2 direct referrals
 *   - User B: $1000 investment (Tier 2: 1.00% daily)
 *   - User C: $12000 investment (Tier 4: 1.25% daily)
 */

const constants = require('../config/constants');

console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║     EARNINGS WITH 2 DIRECTS - CORRECT TIER RATES                     ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

// Tier rates
const TIER_RATES = {
  tier1: 0.01,   // $100-$900: 1.00%
  tier2: 0.01,   // $1,000-$5,000: 1.00%
  tier3: 0.01,   // $6,000-$9,000: 1.00%
  tier4: 0.0125  // $10,000-$25,000: 1.25%
};

// User A
const INVESTMENT_A = 1000;
const DAILY_ROI_RATE_A = TIER_RATES.tier2; // $1000 = Tier 2
const DAILY_ROI_A = INVESTMENT_A * DAILY_ROI_RATE_A;

// User B (Referral #1)
const INVESTMENT_B = 1000;
const DAILY_ROI_RATE_B = TIER_RATES.tier2; // $1000 = Tier 2
const DAILY_ROI_B = INVESTMENT_B * DAILY_ROI_RATE_B;

// User C (Referral #2)
const INVESTMENT_C = 12000;
const DAILY_ROI_RATE_C = TIER_RATES.tier4; // $12000 = Tier 4
const DAILY_ROI_C = INVESTMENT_C * DAILY_ROI_RATE_C;

console.log('TIER RATES:');
console.log('  Tier 1 ($100-$900): 1.00% daily');
console.log('  Tier 2 ($1,000-$5,000): 1.00% daily');
console.log('  Tier 3 ($6,000-$9,000): 1.00% daily');
console.log('  Tier 4 ($10,000-$25,000): 1.25% daily\n');

console.log('SCENARIO: User A ($1000, Tier 2) with 2 Direct Referrals');
console.log(`  - User B: $${INVESTMENT_B} (Tier 2) → ${DAILY_ROI_RATE_B * 100}% daily = $${DAILY_ROI_B.toFixed(2)}/day`);
console.log(`  - User C: $${INVESTMENT_C} (Tier 4) → ${DAILY_ROI_RATE_C * 100}% daily = $${DAILY_ROI_C.toFixed(2)}/day\n`);

// ============================================================================
// USER A (REFERRER WITH 2 DIRECTS)
// ============================================================================

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('USER A (Has 2 Direct Referrals)');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('1. OWN INVESTMENT ROI:');
console.log(`   Investment: $${INVESTMENT_A} (Tier 2)`);
console.log(`   Daily ROI Rate: ${DAILY_ROI_RATE_A * 100}%`);
console.log(`   Daily ROI: $${INVESTMENT_A} × ${DAILY_ROI_RATE_A * 100}% = $${DAILY_ROI_A.toFixed(2)}/day`);
console.log(`   Monthly: $${(DAILY_ROI_A * 30).toFixed(2)}`);
console.log(`   Yearly: $${(DAILY_ROI_A * 365).toFixed(2)}\n`);

console.log('2. ONE-TIME DIRECT REFERRAL COMMISSIONS:');
const directCommissionRate = 0.05;
const directComm_B = INVESTMENT_B * directCommissionRate;
const directComm_C = INVESTMENT_C * directCommissionRate;
const totalDirectComm = directComm_B + directComm_C;

console.log(`   From User B ($${INVESTMENT_B}): $${INVESTMENT_B} × 5% = $${directComm_B.toFixed(2)}`);
console.log(`   From User C ($${INVESTMENT_C}): $${INVESTMENT_C} × 5% = $${directComm_C.toFixed(2)}`);
console.log(`   Total One-Time: $${totalDirectComm.toFixed(2)}\n`);

console.log('3. DAILY LEVEL COMMISSIONS:');
console.log(`   User A has 2 direct referrals`);
const payoutLevel_A = 22 - (2 * 2); // 22 - 4 = 18
const commissionRate_A = constants.LEVEL_RATES[payoutLevel_A - 1]; // L18 = 0.9%

console.log(`   Earns from: L${payoutLevel_A} (formula: 22 - (2×2) = ${payoutLevel_A})`);
console.log(`   Rate: ${commissionRate_A}% (standard rate for Levels 11-20)\n`);

// Commission from each referral
const dailyLevelComm_B = (DAILY_ROI_B * commissionRate_A) / 100;
const dailyLevelComm_C = (DAILY_ROI_C * commissionRate_A) / 100;
const totalDailyLevelComm = dailyLevelComm_B + dailyLevelComm_C;

console.log(`   From User B's $${DAILY_ROI_B.toFixed(2)}/day ROI: ${commissionRate_A}% = $${dailyLevelComm_B.toFixed(4)}/day`);
console.log(`   From User C's $${DAILY_ROI_C.toFixed(2)}/day ROI: ${commissionRate_A}% = $${dailyLevelComm_C.toFixed(4)}/day`);
console.log(`   Total Daily Commission: $${totalDailyLevelComm.toFixed(4)}/day`);
console.log(`   Monthly: $${(totalDailyLevelComm * 30).toFixed(2)}`);
console.log(`   Yearly: $${(totalDailyLevelComm * 365).toFixed(2)}\n`);

const userA_dailyTotal = DAILY_ROI_A + totalDailyLevelComm;

console.log('USER A TOTAL DAILY EARNINGS:');
console.log(`   Own ROI (${DAILY_ROI_RATE_A * 100}%): .................... $${DAILY_ROI_A.toFixed(2)}`);
console.log(`   Level Commission (${commissionRate_A}% × 2): ... $${totalDailyLevelComm.toFixed(4)}`);
console.log(`   ───────────────────────────────────────────`);
console.log(`   TOTAL DAILY: .................... $${userA_dailyTotal.toFixed(4)}/day`);
console.log(`   MONTHLY (30 days): ............. $${(userA_dailyTotal * 30).toFixed(2)}`);
console.log(`   YEARLY: ........................ $${(userA_dailyTotal * 365).toFixed(2)}`);
console.log(`   + ONE-TIME DIRECT BONUSES: ..... $${totalDirectComm.toFixed(2)}\n`);

// ============================================================================
// USER B (REFERRAL #1)
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('USER B (Referral #1 - $1000, Tier 2)');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('1. OWN INVESTMENT ROI:');
console.log(`   Investment: $${INVESTMENT_B} (Tier 2)`);
console.log(`   Daily ROI Rate: ${DAILY_ROI_RATE_B * 100}%`);
console.log(`   Daily ROI: $${INVESTMENT_B} × ${DAILY_ROI_RATE_B * 100}% = $${DAILY_ROI_B.toFixed(2)}/day`);
console.log(`   Monthly: $${(DAILY_ROI_B * 30).toFixed(2)}`);
console.log(`   Yearly: $${(DAILY_ROI_B * 365).toFixed(2)}\n`);

console.log('2. ONE-TIME DIRECT REFERRAL COMMISSION:');
console.log(`   Amount: $0.00`);
console.log(`   Reason: User B hasn't referred anyone\n`);

console.log('3. DAILY LEVEL COMMISSION:');
console.log(`   Amount: $0.00/day`);
console.log(`   Reason: User B has 0 direct referrals\n`);

const userB_dailyTotal = DAILY_ROI_B;

console.log('USER B TOTAL DAILY EARNINGS:');
console.log(`   Own ROI: ........................ $${DAILY_ROI_B.toFixed(2)}/day`);
console.log(`   Level Commission: ............. $0.00/day`);
console.log(`   ───────────────────────────────────────────`);
console.log(`   TOTAL DAILY: ................... $${userB_dailyTotal.toFixed(2)}/day`);
console.log(`   MONTHLY (30 days): ............ $${(userB_dailyTotal * 30).toFixed(2)}`);
console.log(`   YEARLY: ........................ $${(userB_dailyTotal * 365).toFixed(2)}\n`);

// ============================================================================
// USER C (REFERRAL #2)
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('USER C (Referral #2 - $12000, Tier 4)');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('1. OWN INVESTMENT ROI:');
console.log(`   Investment: $${INVESTMENT_C} (Tier 4)`);
console.log(`   Daily ROI Rate: ${DAILY_ROI_RATE_C * 100}%`);
console.log(`   Daily ROI: $${INVESTMENT_C} × ${DAILY_ROI_RATE_C * 100}% = $${DAILY_ROI_C.toFixed(2)}/day`);
console.log(`   Monthly: $${(DAILY_ROI_C * 30).toFixed(2)}`);
console.log(`   Yearly: $${(DAILY_ROI_C * 365).toFixed(2)}\n`);

console.log('2. ONE-TIME DIRECT REFERRAL COMMISSION:');
console.log(`   Amount: $0.00`);
console.log(`   Reason: User C hasn't referred anyone\n`);

console.log('3. DAILY LEVEL COMMISSION:');
console.log(`   Amount: $0.00/day`);
console.log(`   Reason: User C has 0 direct referrals\n`);

const userC_dailyTotal = DAILY_ROI_C;

console.log('USER C TOTAL DAILY EARNINGS:');
console.log(`   Own ROI: ........................ $${DAILY_ROI_C.toFixed(2)}/day`);
console.log(`   Level Commission: ............. $0.00/day`);
console.log(`   ───────────────────────────────────────────`);
console.log(`   TOTAL DAILY: ................... $${userC_dailyTotal.toFixed(2)}/day`);
console.log(`   MONTHLY (30 days): ............ $${(userC_dailyTotal * 30).toFixed(2)}`);
console.log(`   YEARLY: ........................ $${(userC_dailyTotal * 365).toFixed(2)}\n`);

// ============================================================================
// COMPARISON TABLE
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('COMPARISON TABLE');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('                                 USER A         USER B         USER C');
console.log('────────────────────────────────────────────────────────────────────────────');
console.log(`Investment:                     $${INVESTMENT_A}        $${INVESTMENT_B}        $${INVESTMENT_C}`);
console.log(`Tier:                           Tier 2         Tier 2         Tier 4`);
console.log(`Daily Rate:                     ${DAILY_ROI_RATE_A * 100}%          ${DAILY_ROI_RATE_B * 100}%          ${DAILY_ROI_RATE_C * 100}%`);
console.log(`Direct Referrals:               2              0              0`);
console.log(`Unlocked Levels:                L18            None           None`);
console.log('────────────────────────────────────────────────────────────────────────────');
console.log(`Daily ROI:                      $${DAILY_ROI_A.toFixed(2)}          $${DAILY_ROI_B.toFixed(2)}          $${DAILY_ROI_C.toFixed(2)}`);
console.log(`Daily Level Comm (${commissionRate_A}%):        $${totalDailyLevelComm.toFixed(2)}          $0.00          $0.00`);
console.log(`────────────────────────────────────────────────────────────────────────────`);
console.log(`TOTAL DAILY:                    $${userA_dailyTotal.toFixed(2)}          $${userB_dailyTotal.toFixed(2)}          $${userC_dailyTotal.toFixed(2)}`);
console.log(`MONTHLY (30 days):              $${(userA_dailyTotal * 30).toFixed(2)}         $${(userB_dailyTotal * 30).toFixed(2)}          $${(userC_dailyTotal * 30).toFixed(2)}`);
console.log(`YEARLY:                         $${(userA_dailyTotal * 365).toFixed(2)}        $${(userB_dailyTotal * 365).toFixed(2)}        $${(userC_dailyTotal * 365).toFixed(2)}`);
console.log('────────────────────────────────────────────────────────────────────────────');
console.log(`ONE-TIME BONUS:                 $${totalDirectComm.toFixed(2)}         $0.00          $0.00`);
console.log('────────────────────────────────────────────────────────────────────────────\n');

// ============================================================================
// BREAKDOWN SUMMARY
// ============================================================================

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('QUICK SUMMARY - USER A WITH 2 REFERRALS');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log(`OWN INVESTMENT:`);
console.log(`  - Amount: $${INVESTMENT_A} (Tier 2, 1.00% daily)`);
console.log(`  - Daily ROI: $${DAILY_ROI_A.toFixed(2)}\n`);

console.log(`REFERRAL #1 (User B):`);
console.log(`  - Investment: $${INVESTMENT_B} (Tier 2, 1.00% daily)`);
console.log(`  - Their Daily ROI: $${DAILY_ROI_B.toFixed(2)}`);
console.log(`  - Your Commission: ${commissionRate_A}% × $${DAILY_ROI_B.toFixed(2)} = $${dailyLevelComm_B.toFixed(4)}/day`);
console.log(`  - Direct Bonus (one-time): $${directComm_B.toFixed(2)}\n`);

console.log(`REFERRAL #2 (User C):`);
console.log(`  - Investment: $${INVESTMENT_C} (Tier 4, 1.25% daily)`);
console.log(`  - Their Daily ROI: $${DAILY_ROI_C.toFixed(2)}`);
console.log(`  - Your Commission: ${commissionRate_A}% × $${DAILY_ROI_C.toFixed(2)} = $${dailyLevelComm_C.toFixed(4)}/day`);
console.log(`  - Direct Bonus (one-time): $${directComm_C.toFixed(2)}\n`);

console.log(`TOTAL USER A EARNINGS:`);
console.log(`  Daily: $${userA_dailyTotal.toFixed(4)}/day`);
console.log(`    = Own ROI ($${DAILY_ROI_A.toFixed(2)}) + Commissions ($${totalDailyLevelComm.toFixed(4)})`);
console.log(`  Monthly: $${(userA_dailyTotal * 30).toFixed(2)}`);
console.log(`  Yearly: $${(userA_dailyTotal * 365).toFixed(2)}`);
console.log(`  One-Time Bonuses: $${totalDirectComm.toFixed(2)}\n`);

console.log('═══════════════════════════════════════════════════════════════════════════════\n');

/**
 * Final Correct Earnings Example
 * 
 * User A invests $1000 and refers User B who also invests $1000
 * Using CORRECTED commission system with standard level rates
 */

const constants = require('../config/constants');

console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║            FINAL CORRECT EARNINGS BREAKDOWN                           ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

// Both invest $1000
const INVESTMENT_A = 1000;
const INVESTMENT_B = 1000;

// Daily ROI Rate (1% for Plan A)
const DAILY_ROI_RATE = 0.01;
const DAILY_ROI_A = INVESTMENT_A * DAILY_ROI_RATE;
const DAILY_ROI_B = INVESTMENT_B * DAILY_ROI_RATE;

console.log('SCENARIO: User A ($1000) refers User B ($1000)');
console.log('Both earn 1% daily ROI = $10/day each\n');

// ============================================================================
// USER A (REFERRER)
// ============================================================================

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('USER A (Referrer)');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('1. OWN INVESTMENT ROI:');
console.log(`   Investment: $${INVESTMENT_A}`);
console.log(`   Daily ROI (1%): $${DAILY_ROI_A.toFixed(2)}/day`);
console.log(`   Monthly: $${(DAILY_ROI_A * 30).toFixed(2)}`);
console.log(`   Yearly: $${(DAILY_ROI_A * 365).toFixed(2)}\n`);

console.log('2. ONE-TIME DIRECT REFERRAL COMMISSION:');
const directCommissionRate = 0.05; // 5%
const directCommission = INVESTMENT_B * directCommissionRate;
console.log(`   Rate: 5% of referred investment`);
console.log(`   Amount: $${INVESTMENT_B} × 5% = $${directCommission.toFixed(2)}`);
console.log(`   When: Paid once when User B's investment is approved\n`);

console.log('3. DAILY LEVEL COMMISSION FROM USER B:');
console.log(`   User A has 1 direct referral`);
const payoutLevel_A = 20; // 22 - (1 * 2) = 20
const commissionRate_A = constants.LEVEL_RATES[payoutLevel_A - 1]; // L20 = 0.9%
const dailyLevelComm_A = (DAILY_ROI_B * commissionRate_A) / 100;

console.log(`   Earns from: L${payoutLevel_A} (formula: 22 - (1×2) = ${payoutLevel_A})`);
console.log(`   Rate: ${commissionRate_A}% (standard rate for Levels 11-20)`);
console.log(`   From User B's daily ROI: ${commissionRate_A}% × $${DAILY_ROI_B.toFixed(2)} = $${dailyLevelComm_A.toFixed(4)}/day`);
console.log(`   Monthly: $${(dailyLevelComm_A * 30).toFixed(2)}`);
console.log(`   Yearly: $${(dailyLevelComm_A * 365).toFixed(2)}\n`);

const userA_dailyTotal = DAILY_ROI_A + dailyLevelComm_A;

console.log('USER A TOTAL DAILY EARNINGS:');
console.log(`   Own ROI: ........................ $${DAILY_ROI_A.toFixed(2)}`);
console.log(`   Level Commission: ............. $${dailyLevelComm_A.toFixed(4)}`);
console.log(`   ───────────────────────────────────────────`);
console.log(`   TOTAL DAILY: ................... $${userA_dailyTotal.toFixed(4)}/day`);
console.log(`   MONTHLY (30 days): ............ $${(userA_dailyTotal * 30).toFixed(2)}`);
console.log(`   YEARLY: ........................ $${(userA_dailyTotal * 365).toFixed(2)}`);
console.log(`   + ONE-TIME DIRECT BONUS: ...... $${directCommission.toFixed(2)}\n`);

// ============================================================================
// USER B (REFERRED PERSON)
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('USER B (Referred Person)');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('1. OWN INVESTMENT ROI:');
console.log(`   Investment: $${INVESTMENT_B}`);
console.log(`   Daily ROI (1%): $${DAILY_ROI_B.toFixed(2)}/day`);
console.log(`   Monthly: $${(DAILY_ROI_B * 30).toFixed(2)}`);
console.log(`   Yearly: $${(DAILY_ROI_B * 365).toFixed(2)}\n`);

console.log('2. ONE-TIME DIRECT REFERRAL COMMISSION:');
console.log(`   Amount: $0.00`);
console.log(`   Reason: User B hasn't referred anyone yet\n`);

console.log('3. DAILY LEVEL COMMISSION:');
console.log(`   Amount: $0.00/day`);
console.log(`   Reason: User B has 0 direct referrals, so no levels are unlocked\n`);

const userB_dailyTotal = DAILY_ROI_B;

console.log('USER B TOTAL DAILY EARNINGS:');
console.log(`   Own ROI: ........................ $${DAILY_ROI_B.toFixed(2)}`);
console.log(`   Level Commission: ............. $0.00`);
console.log(`   ───────────────────────────────────────────`);
console.log(`   TOTAL DAILY: ................... $${userB_dailyTotal.toFixed(2)}/day`);
console.log(`   MONTHLY (30 days): ............ $${(userB_dailyTotal * 30).toFixed(2)}`);
console.log(`   YEARLY: ........................ $${(userB_dailyTotal * 365).toFixed(2)}`);
console.log(`   + ONE-TIME DIRECT BONUS: ...... $0.00\n`);

// ============================================================================
// SIDE-BY-SIDE COMPARISON
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('SIDE-BY-SIDE COMPARISON');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('                                      USER A           USER B');
console.log('──────────────────────────────────────────────────────────────────────────────');
console.log(`Investment Amount:                    $${INVESTMENT_A}             $${INVESTMENT_B}`);
console.log(`Direct Referrals:                     1                0`);
console.log(`Unlocked Levels:                      L20              None`);
console.log(`──────────────────────────────────────────────────────────────────────────────`);
console.log(`DAILY EARNINGS:`);
console.log(`  Own ROI (1%):                      $${DAILY_ROI_A.toFixed(2)}             $${DAILY_ROI_B.toFixed(2)}`);
console.log(`  Level Commission (0.9%):          $${dailyLevelComm_A.toFixed(4)}            $0.00`);
console.log(`  ─────────────────────────────────────────────────────────────`);
console.log(`  TOTAL DAILY:                       $${userA_dailyTotal.toFixed(4)}            $${userB_dailyTotal.toFixed(2)}`);
console.log(`──────────────────────────────────────────────────────────────────────────────`);
console.log(`MONTHLY (30 days):                    $${(userA_dailyTotal * 30).toFixed(2)}           $${(userB_dailyTotal * 30).toFixed(2)}`);
console.log(`YEARLY (365 days):                    $${(userA_dailyTotal * 365).toFixed(2)}          $${(userB_dailyTotal * 365).toFixed(2)}`);
console.log(`──────────────────────────────────────────────────────────────────────────────`);
console.log(`ONE-TIME DIRECT COMMISSION:           $${directCommission.toFixed(2)} (paid once)   $0.00`);
console.log(`──────────────────────────────────────────────────────────────────────────────\n`);

// ============================================================================
// WHAT HAPPENS WHEN USER B REFERS SOMEONE (User C)
// ============================================================================

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('FUTURE SCENARIO: When User B Refers User C (also invests $1000)');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('User B now has 1 direct referral');
const userB_futureLevel = 20;
const userB_futureRate = constants.LEVEL_RATES[userB_futureLevel - 1];
const userB_futureComm = (DAILY_ROI_B * userB_futureRate) / 100; // From User C's ROI

console.log(`User B unlocks: L${userB_futureLevel}`);
console.log(`When User C earns $${DAILY_ROI_B.toFixed(2)}/day ROI:`);
console.log(`  User B earns: ${userB_futureRate}% × $${DAILY_ROI_B.toFixed(2)} = $${userB_futureComm.toFixed(4)}/day commission`);
console.log(`  User B's NEW total: $${DAILY_ROI_B.toFixed(2)} (own) + $${userB_futureComm.toFixed(4)} (commission) = $${(DAILY_ROI_B + userB_futureComm).toFixed(4)}/day\n`);

console.log('So User B goes from $10.00/day to $10.0900/day (earning from their downline!)\n');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('QUICK SUMMARY - USER A WITH 1 REFERRAL');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log(`Daily Profit (own ROI): ..................... $${DAILY_ROI_A.toFixed(2)}`);
console.log(`Daily Commission (from referral): ........... $${dailyLevelComm_A.toFixed(4)}`);
console.log(`One-Time Direct Commission Bonus: ........... $${directCommission.toFixed(2)}\n`);
console.log(`TOTAL DAILY: ............................... $${userA_dailyTotal.toFixed(4)}/day`);
console.log(`TOTAL MONTHLY: ............................. $${(userA_dailyTotal * 30).toFixed(2)}\n`);

console.log('═══════════════════════════════════════════════════════════════════════════════\n');

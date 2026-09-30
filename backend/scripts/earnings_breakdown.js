/**
 * Earnings Breakdown Example
 * 
 * Scenario: 
 * - User A invests $1000 and refers User B
 * - User B also invests $1000
 * 
 * Shows: Daily profit, direct commission, and level commissions
 */

const constants = require('../config/constants');

console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║               EARNINGS BREAKDOWN - COMPLETE EXAMPLE                    ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

const INVESTMENT_A = 1000;
const INVESTMENT_B = 1000;

// Calculate daily ROI based on package rates
// Assuming Plan A (Investor Plan) with daily ROI rate
const DAILY_ROI_RATE = 0.01; // 1% daily for $1000 investment
const DAILY_ROI_A = INVESTMENT_A * DAILY_ROI_RATE;  // User A's daily ROI from own investment
const DAILY_ROI_B = INVESTMENT_B * DAILY_ROI_RATE;  // User B's daily ROI from own investment

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('SCENARIO: User A invests $1000 and refers User B who also invests $1000');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('USER A (Referrer)');
console.log('─────────────────────────────────────────────────────────────────────────────\n');

console.log('INITIAL STATUS:');
console.log(`  Investment: $${INVESTMENT_A}`);
console.log(`  Direct Referrals: 1 (User B)`);
console.log(`  Unlocked Levels: L21, L20 (2 levels) - just got first direct`);
const levelCountA = constants.getUnlockedLevelCount(1);
const unlockedLevelsA = constants.getUnlockedLevelNumbers(1);
console.log(`  Unlocked Levels Array: [${unlockedLevelsA.join(', ')}]\n`);

console.log('DAILY EARNINGS FROM USER A\'S OWN INVESTMENT:');
console.log(`  Daily ROI Rate: ${DAILY_ROI_RATE * 100}%`);
console.log(`  Daily ROI Amount: $${DAILY_ROI_A.toFixed(2)}`);
console.log(`  Monthly ROI (30 days): $${(DAILY_ROI_A * 30).toFixed(2)}`);
console.log(`  Yearly ROI: $${(DAILY_ROI_A * 365).toFixed(2)}\n`);

console.log('DIRECT REFERRAL COMMISSION (Instant, when User B\'s investment is approved):');
const directCommissionRate = constants.DIRECT_REFERRAL_COMMISSION_RATE;
const directCommission = INVESTMENT_B * directCommissionRate;
console.log(`  Rate: ${directCommissionRate * 100}% of referred person's investment`);
console.log(`  Commission: $${INVESTMENT_B} × ${directCommissionRate * 100}% = $${directCommission.toFixed(2)}`);
console.log(`  NOTE: Paid ONCE when investment is approved (not daily)\n`);

console.log('DAILY LEVEL COMMISSIONS FROM USER B\'S ROI EARNINGS:');
console.log(`  (This is DAILY, from User B's daily ROI of $${DAILY_ROI_B.toFixed(2)})\n`);

let userALevelCommTotal = 0;
for (const level of unlockedLevelsA) {
  const rate = constants.LEVEL_RATES[level - 1];
  const commission = (DAILY_ROI_B * rate) / 100;
  userALevelCommTotal += commission;
  console.log(`  L${String(level).padEnd(2)}: ${String(rate).padEnd(5)}% of $${DAILY_ROI_B.toFixed(2)} = $${commission.toFixed(4)}`);
}
console.log(`  ────────────────────────────────────────────────`);
console.log(`  TOTAL DAILY LEVEL COMMISSION: $${userALevelCommTotal.toFixed(2)}`);
console.log(`  Monthly Level Commission (30 days): $${(userALevelCommTotal * 30).toFixed(2)}`);
console.log(`  Yearly Level Commission: $${(userALevelCommTotal * 365).toFixed(2)}\n`);

const userATotalDaily = DAILY_ROI_A + userALevelCommTotal;
console.log('USER A TOTAL DAILY EARNINGS:');
console.log(`  Own ROI: $${DAILY_ROI_A.toFixed(2)}`);
console.log(`  Level Commissions: $${userALevelCommTotal.toFixed(2)}`);
console.log(`  ────────────────────────`);
console.log(`  TOTAL DAILY: $${userATotalDaily.toFixed(2)}`);
console.log(`  Monthly (30 days): $${(userATotalDaily * 30).toFixed(2)}`);
console.log(`  Yearly: $${(userATotalDaily * 365).toFixed(2)}`);
console.log(`  Plus one-time Direct Commission: $${directCommission.toFixed(2)}\n`);

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('USER B (Referred Person)');
console.log('─────────────────────────────────────────────────────────────────────────────\n');

console.log('INITIAL STATUS:');
console.log(`  Investment: $${INVESTMENT_B}`);
console.log(`  Direct Referrals: 0 (just joined)`);
console.log(`  Unlocked Levels: None (need 1 direct to unlock L21, L20)`);
console.log(`  Unlocked Levels Array: []\n`);

console.log('DAILY EARNINGS FROM USER B\'S OWN INVESTMENT:');
console.log(`  Daily ROI Rate: ${DAILY_ROI_RATE * 100}%`);
console.log(`  Daily ROI Amount: $${DAILY_ROI_B.toFixed(2)}`);
console.log(`  Monthly ROI (30 days): $${(DAILY_ROI_B * 30).toFixed(2)}`);
console.log(`  Yearly ROI: $${(DAILY_ROI_B * 365).toFixed(2)}\n`);

console.log('DIRECT REFERRAL COMMISSION:');
console.log(`  None yet - User B hasn't referred anyone\n`);

console.log('DAILY LEVEL COMMISSIONS:');
console.log(`  None - User B has 0 direct referrals, so no unlocked levels\n`);

const userBTotalDaily = DAILY_ROI_B;
console.log('USER B TOTAL DAILY EARNINGS:');
console.log(`  Own ROI: $${DAILY_ROI_B.toFixed(2)}`);
console.log(`  Level Commissions: $0.00`);
console.log(`  ────────────────────────`);
console.log(`  TOTAL DAILY: $${userBTotalDaily.toFixed(2)}`);
console.log(`  Monthly (30 days): $${(userBTotalDaily * 30).toFixed(2)}`);
console.log(`  Yearly: $${(userBTotalDaily * 365).toFixed(2)}`);
console.log(`  One-time Direct Commission from User A: $0.00\n`);

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('SUMMARY TABLE');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('                                  USER A          USER B');
console.log('─────────────────────────────────────────────────────────────');
console.log(`Investment Amount:                $${INVESTMENT_A}           $${INVESTMENT_B}`);
console.log(`Direct Referrals:                 1               0`);
console.log(`Unlocked Levels:                  2 (L21, L20)    None`);
console.log('─────────────────────────────────────────────────────────────');
console.log(`Daily ROI (own investment):       $${DAILY_ROI_A.toFixed(2)}           $${DAILY_ROI_B.toFixed(2)}`);
console.log(`Daily Level Commission:          $${userALevelCommTotal.toFixed(2)}           $0.00`);
console.log(`────────────────────────────────────────────────────────────`);
console.log(`TOTAL DAILY EARNINGS:             $${userATotalDaily.toFixed(2)}           $${userBTotalDaily.toFixed(2)}`);
console.log('─────────────────────────────────────────────────────────────');
console.log(`Monthly Earnings (30 days):       $${(userATotalDaily * 30).toFixed(2)}          $${(userBTotalDaily * 30).toFixed(2)}`);
console.log(`Yearly Earnings (365 days):       $${(userATotalDaily * 365).toFixed(2)}         $${(userBTotalDaily * 365).toFixed(2)}`);
console.log('─────────────────────────────────────────────────────────────');
console.log(`One-time Direct Commission:       $${directCommission.toFixed(2)} (paid once)    $0.00`);
console.log('─────────────────────────────────────────────────────────────\n');

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('WHAT HAPPENS WHEN USER B REFERS SOMEONE (User C)?');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('User B then gets 1 direct referral and unlocks L21, L20:');
const unlockedLevelsB = constants.getUnlockedLevelNumbers(1);
console.log(`  Unlocked Levels: [${unlockedLevelsB.join(', ')}]\n`);

console.log('If User C also invests $1000 with daily ROI of $10:\n');

let userBLevelCommTotal = 0;
console.log('User B Daily Level Commissions from User C\'s ROI:');
for (const level of unlockedLevelsB) {
  const rate = constants.LEVEL_RATES[level - 1];
  const commission = (DAILY_ROI_B * rate) / 100;
  userBLevelCommTotal += commission;
  console.log(`  L${String(level).padEnd(2)}: ${String(rate).padEnd(5)}% of $${DAILY_ROI_B.toFixed(2)} = $${commission.toFixed(4)}`);
}
console.log(`\nUser B\'s NEW daily earnings: $${DAILY_ROI_B.toFixed(2)} (own) + $${userBLevelCommTotal.toFixed(2)} (commissions) = $${(DAILY_ROI_B + userBLevelCommTotal).toFixed(2)}`);

console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
console.log('KEY TAKEAWAYS');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');
console.log('1. Own ROI: Everyone gets daily ROI from their own investment (1% = $10/day on $1000)');
console.log('2. Direct Commission: 5% instant bonus when someone you refer gets investment approved');
console.log('3. Level Commissions: Daily commissions from downline ROI (need 1+ direct to unlock levels)');
console.log('4. Levels Unlock: 1 direct = 2 levels (L21,L20), 2 directs = 4 levels (L21-L18), etc.');
console.log('5. Network Effect: Building your downline increases daily earnings exponentially\n');

console.log('═══════════════════════════════════════════════════════════════════════════════\n');

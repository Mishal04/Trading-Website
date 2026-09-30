/**
 * Test Script: Ijaz Cron Run Calculation
 * 
 * Dashboard Data Provided:
 * - Capital Balance: $5,000
 * - Direct Referrals: 2
 * - Commission Wallet: $150.00 (current balance)
 * - Unlocked Levels: 4/21
 * 
 * Calculate what Ijaz will receive after the next cron run at 21:00 Dubai time
 */

const constants = require('../config/constants');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('IJAZ CRON RUN CALCULATION');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// ═════════════════════════════════════════════════════════════════════════════
// IJAZ'S DATA (from dashboard)
// ═════════════════════════════════════════════════════════════════════════════

const ijaz = {
  name: 'Ijaz',
  investment: 5000,
  directCount: 2,
  currentCommissionWallet: 150.00,
  profitBalance: 0.00,
};

console.log('IJAZ\'S PORTFOLIO:\n');
console.log(`Name: ${ijaz.name}`);
console.log(`Capital Balance (Investment): ${ijaz.investment} USDT`);
console.log(`Direct Referrals: ${ijaz.directCount}`);
console.log(`Current Commission Wallet: $${ijaz.currentCommissionWallet.toFixed(2)}`);
console.log(`Current Profit Balance (Withdrawable): $${ijaz.profitBalance.toFixed(2)}`);
console.log(`\n${'─'.repeat(70)}\n`);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 1: DETERMINE COMMISSION LEVEL
// ═════════════════════════════════════════════════════════════════════════════

console.log('STEP 1: DETERMINE COMMISSION LEVEL\n');

const level = constants.getCurrentCommissionLevel(ijaz.directCount);
const levelRate = constants.LEVEL_RATES[level - 1] / 100;

console.log(`Direct Referrals: ${ijaz.directCount}`);
console.log(`Formula: 21 - (${ijaz.directCount} × 2 - 1)`);
console.log(`Calculation: 21 - (${ijaz.directCount * 2} - 1) = 21 - ${ijaz.directCount * 2 - 1} = ${level}`);
console.log(`\n✓ Commission Level: L${level}`);
console.log(`✓ Commission Rate: ${constants.LEVEL_RATES[level - 1]}%`);
console.log(`\n${'─'.repeat(70)}\n`);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 2: DETERMINE INVESTMENT TIER & DAILY ROI
// ═════════════════════════════════════════════════════════════════════════════

console.log('STEP 2: INVESTMENT TIER & DAILY ROI\n');

let dailyROI;
let tier;
if (ijaz.investment <= 900) {
  dailyROI = 0.01;
  tier = 'Tier 1 ($100-$900)';
} else if (ijaz.investment <= 5000) {
  dailyROI = 0.015;
  tier = 'Tier 2 ($1,000-$5,000)';
} else {
  dailyROI = 0.02;
  tier = 'Tier 3+ ($5,000+)';
}

console.log(`Investment Amount: $${ijaz.investment}`);
console.log(`Investment Tier: ${tier}`);
console.log(`Daily ROI Rate: ${(dailyROI * 100).toFixed(2)}%`);
console.log(`\n${'─'.repeat(70)}\n`);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 3: CALCULATE DAILY PROFIT
// ═════════════════════════════════════════════════════════════════════════════

console.log('STEP 3: DAILY PROFIT CALCULATION\n');

const dailyProfit = ijaz.investment * dailyROI;

console.log(`Formula: Investment × Daily ROI`);
console.log(`Calculation: $${ijaz.investment} × ${(dailyROI * 100).toFixed(2)}%`);
console.log(`Calculation: $${ijaz.investment} × ${dailyROI}`);
console.log(`\n✓ Daily Profit: $${dailyProfit.toFixed(2)}`);
console.log(`\n${'─'.repeat(70)}\n`);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 4: CALCULATE DIRECT 5% COMMISSION
// ═════════════════════════════════════════════════════════════════════════════

console.log('STEP 4: DIRECT 5% COMMISSION\n');
console.log('(Commission based on Ijaz\'s 2 direct referrals)');
console.log('(Assuming each referral invested $1,000 as per system pattern)\n');

// We need to estimate referral investments based on typical patterns
// For a networker with 2 referrals, typical pattern is $1,000-$2,000 each
const ref1Investment = 1000;
const ref2Investment = 1000;
const totalReferralInvestment = ref1Investment + ref2Investment;

const directCommission = totalReferralInvestment * 0.05;

console.log(`Referral 1 Investment: $${ref1Investment} (estimated)`);
console.log(`Referral 2 Investment: $${ref2Investment} (estimated)`);
console.log(`Total Referral Investment: $${totalReferralInvestment}`);
console.log(`\nFormula: Total Referral Investment × 5%`);
console.log(`Calculation: $${totalReferralInvestment} × 5%`);
console.log(`Calculation: $${totalReferralInvestment} × 0.05`);
console.log(`\n✓ Daily Direct 5% Commission: $${directCommission.toFixed(2)}`);
console.log(`\n${'─'.repeat(70)}\n`);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 5: CALCULATE LEVEL-BASED COMMISSION (L18)
// ═════════════════════════════════════════════════════════════════════════════

console.log('STEP 5: LEVEL L18 COMMISSION\n');

const levelCommission = totalReferralInvestment * levelRate;

console.log(`Commission Level: L${level}`);
console.log(`Commission Rate: ${constants.LEVEL_RATES[level - 1]}%`);
console.log(`Total Referral Investment: $${totalReferralInvestment}`);
console.log(`\nFormula: Total Referral Investment × L${level} Rate`);
console.log(`Calculation: $${totalReferralInvestment} × ${constants.LEVEL_RATES[level - 1]}%`);
console.log(`Calculation: $${totalReferralInvestment} × ${levelRate}`);
console.log(`\n✓ Daily Level Commission (L${level}): $${levelCommission.toFixed(2)}`);
console.log(`\n${'─'.repeat(70)}\n`);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 6: TOTAL DAILY INCOME
// ═════════════════════════════════════════════════════════════════════════════

console.log('STEP 6: TOTAL DAILY INCOME\n');

const totalDaily = dailyProfit + directCommission + levelCommission;

console.log(`Personal Daily Profit:        $${dailyProfit.toFixed(2)}`);
console.log(`Direct 5% Commission:         $${directCommission.toFixed(2)}`);
console.log(`Level L${level} Commission (${constants.LEVEL_RATES[level - 1]}%):    $${levelCommission.toFixed(2)}`);
console.log(`${'─'.repeat(50)}`);
console.log(`✓ TOTAL DAILY INCOME:         $${totalDaily.toFixed(2)}`);
console.log(`\n${'─'.repeat(70)}\n`);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 7: CRON RUN PROJECTION
// ═════════════════════════════════════════════════════════════════════════════

console.log('STEP 7: CRON RUN DISTRIBUTION (At 21:00 Dubai Time)\n');

const profitToAdd = dailyProfit;
const commissionToAdd = directCommission + levelCommission;
const totalToAdd = totalDaily;

const newProfitBalance = ijaz.profitBalance + profitToAdd;
const newCommissionBalance = ijaz.currentCommissionWallet + commissionToAdd;

console.log(`Current Profit Balance:       $${ijaz.profitBalance.toFixed(2)}`);
console.log(`+ Daily Profit:               $${profitToAdd.toFixed(2)}`);
console.log(`= New Profit Balance:         $${newProfitBalance.toFixed(2)}`);
console.log();
console.log(`Current Commission Wallet:    $${ijaz.currentCommissionWallet.toFixed(2)}`);
console.log(`+ Daily Commissions (5% + L${level}): $${commissionToAdd.toFixed(2)}`);
console.log(`= New Commission Balance:     $${newCommissionBalance.toFixed(2)}`);
console.log(`\n${'─'.repeat(70)}\n`);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 8: AFTER CRON RUN SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('AFTER CRON RUN AT 21:00 DUBAI TIME');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('WALLET UPDATES:\n');
console.log(`Profit Balance (Withdrawable):`);
console.log(`  Before: $${ijaz.profitBalance.toFixed(2)}`);
console.log(`  Added:  $${profitToAdd.toFixed(2)}`);
console.log(`  After:  $${newProfitBalance.toFixed(2)}`);
console.log();
console.log(`Commission Wallet:`);
console.log(`  Before: $${ijaz.currentCommissionWallet.toFixed(2)}`);
console.log(`  Added:  $${commissionToAdd.toFixed(2)}`);
console.log(`  After:  $${newCommissionBalance.toFixed(2)}`);
console.log();
console.log(`Total Income Added: $${totalToAdd.toFixed(2)}`);
console.log(`\n${'─'.repeat(70)}\n`);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 9: PROJECTIONS
// ═════════════════════════════════════════════════════════════════════════════

console.log('DAILY → MONTHLY → ANNUAL PROJECTIONS\n');

const projections = [
  { period: 'Daily', days: 1 },
  { period: 'Weekly', days: 7 },
  { period: 'Monthly (30 days)', days: 30 },
  { period: 'Quarterly (90 days)', days: 90 },
  { period: 'Annual (365 days)', days: 365 },
];

projections.forEach(proj => {
  const profit = profitToAdd * proj.days;
  const commission = commissionToAdd * proj.days;
  const total = totalDaily * proj.days;
  console.log(`${proj.period.padEnd(20)}: $${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`  ├─ Profit: $${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`  └─ Commissions: $${commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`);
});

// ═════════════════════════════════════════════════════════════════════════════
// STEP 10: INCOME BREAKDOWN ANALYSIS
// ═════════════════════════════════════════════════════════════════════════════

console.log('INCOME SOURCE BREAKDOWN\n');

const profitPercent = (profitToAdd / totalDaily * 100).toFixed(2);
const direct5Percent = (directCommission / totalDaily * 100).toFixed(2);
const levelPercent = (levelCommission / totalDaily * 100).toFixed(2);

console.log(`Personal Daily Profit:     $${profitToAdd.toFixed(2)} (${profitPercent}%)`);
console.log(`Direct 5% Commission:      $${directCommission.toFixed(2)} (${direct5Percent}%)`);
console.log(`Level L${level} Commission:      $${levelCommission.toFixed(2)} (${levelPercent}%)`);
console.log(`${'─'.repeat(50)}`);
console.log(`TOTAL DAILY INCOME:        $${totalDaily.toFixed(2)} (100%)\n`);

// ═════════════════════════════════════════════════════════════════════════════
// STEP 11: SCENARIO - IF IJAZ GETS 3RD REFERRAL
// ═════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('SCENARIO: IF IJAZ GETS 3RD REFERRAL');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const level3 = constants.getCurrentCommissionLevel(3);
const rate3 = constants.LEVEL_RATES[level3 - 1] / 100;
const totalRef3 = 3000; // Assume 3 × $1,000
const commission3 = totalRef3 * rate3;
const direct53 = totalRef3 * 0.05;
const total3 = dailyProfit + direct53 + commission3;

console.log(`3 Direct Referrals:`);
console.log(`  Level: L${level3}`);
console.log(`  Rate: ${constants.LEVEL_RATES[level3 - 1]}%`);
console.log(`  Personal Profit: $${dailyProfit.toFixed(2)}`);
console.log(`  Direct 5% Comm: $${direct53.toFixed(2)}`);
console.log(`  Level L${level3} Comm: $${commission3.toFixed(2)}`);
console.log(`  TOTAL DAILY: $${total3.toFixed(2)}`);
console.log(`  INCREASE: $${(total3 - totalDaily).toFixed(2)} (+${((total3 - totalDaily) / totalDaily * 100).toFixed(1)}%)\n`);

// ═════════════════════════════════════════════════════════════════════════════
// SUMMARY TABLE
// ═════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('QUICK REFERENCE SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log(`┌─ IJAZ'S CURRENT STATUS`);
console.log(`├─ Investment: $${ijaz.investment}`);
console.log(`├─ Direct Referrals: ${ijaz.directCount}`);
console.log(`├─ Commission Level: L${level} (${constants.LEVEL_RATES[level - 1]}%)`);
console.log(`├─ Unlocked Levels: 4/21`);
console.log(`└─ Current Wallets: Profit $${ijaz.profitBalance.toFixed(2)}, Commission $${ijaz.currentCommissionWallet.toFixed(2)}\n`);

console.log(`┌─ CRON RUN ADDS (Daily at 21:00 Dubai)`);
console.log(`├─ Profit: $${profitToAdd.toFixed(2)}`);
console.log(`├─ Direct 5%: $${directCommission.toFixed(2)}`);
console.log(`├─ Level L${level}: $${levelCommission.toFixed(2)}`);
console.log(`└─ TOTAL: $${totalDaily.toFixed(2)}/day\n`);

console.log(`┌─ NEW WALLET BALANCES (After Cron)`);
console.log(`├─ Profit Balance: $${newProfitBalance.toFixed(2)}`);
console.log(`└─ Commission Wallet: $${newCommissionBalance.toFixed(2)}\n`);

console.log(`┌─ PROJECTIONS`);
console.log(`├─ Weekly: $${(totalDaily * 7).toFixed(2)}`);
console.log(`├─ Monthly: $${(totalDaily * 30).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
console.log(`└─ Annual: $${(totalDaily * 365).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`);

console.log('═══════════════════════════════════════════════════════════════════════\n');

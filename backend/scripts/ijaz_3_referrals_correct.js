/**
 * IJAZ WITH 3 REFERRALS - CORRECT CALCULATION
 * 
 * Replace "Referral3Name" and "Referral3Investment" with actual values
 * 
 * Usage: Update the referrals array below with correct data, then run:
 *   node ijaz_3_referrals_correct.js
 */

const constants = require('../config/constants');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('IJAZ WITH 3 REFERRALS - DAILY EARNINGS CALCULATION');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// IJAZ DATA
// ─────────────────────────────────────────────────────────────────────────────

const ijaz = {
  name: 'Ijaz',
  investment: 5000,
  dailyROIRate: 0.01,
  directCount: 3
};

// ─────────────────────────────────────────────────────────────────────────────
// REFERRALS DATA - UPDATE WITH CORRECT VALUES
// ─────────────────────────────────────────────────────────────────────────────

const referrals = [
  {
    name: 'Shair',
    investment: 1000,
    dailyROIRate: 0.01,
    directCount: 0
  },
  {
    name: 'Shaiq',
    investment: 2000,
    dailyROIRate: 0.01,
    directCount: 0
  },
  {
    name: 'REPLACE_WITH_ACTUAL_NAME',  // ← UPDATE THIS
    investment: 0,  // ← UPDATE THIS WITH INVESTMENT AMOUNT
    dailyROIRate: 0.01,
    directCount: 0
  }
];

console.log('⚠️  INSTRUCTION:');
console.log('─────────────────────────────────────────────────────────────────────────');
console.log('Update the 3rd referral data above:');
console.log('  • name: Change "REPLACE_WITH_ACTUAL_NAME" to the actual name');
console.log('  • investment: Change 0 to the investment amount\n');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('IJAZ\'S METRICS (3 Referrals)');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const totalReferralInvestment = referrals.reduce((sum, r) => sum + r.investment, 0);
const ijazCurrentLevel = constants.getCurrentCommissionLevel(ijaz.directCount);
const ijazLevelRate = constants.LEVEL_RATES[ijazCurrentLevel - 1];
const ijazUnlockedCount = constants.getUnlockedLevelCount(ijaz.directCount);

console.log(`Investment:           $${ijaz.investment.toLocaleString()}`);
console.log(`Direct Referrals:     ${ijaz.directCount}`);
console.log(`Unlocked Levels:      ${ijazUnlockedCount}/21`);
console.log(`Current Level:        L${ijazCurrentLevel}`);
console.log(`Level Rate:           ${ijazLevelRate}%\n`);

console.log('REFERRALS:');
referrals.forEach((ref, i) => {
  console.log(`  ${i + 1}. ${ref.name.padEnd(25)} Investment: $${String(ref.investment).padStart(6)}`);
});
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// IJAZ'S DAILY EARNINGS
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('IJAZ\'S DAILY EARNINGS');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const ijazPersonalROI = ijaz.investment * ijaz.dailyROIRate;
const ijazLevelCommission = totalReferralInvestment * (ijazLevelRate / 100);
const ijazDailyTotal = ijazPersonalROI + ijazLevelCommission;

console.log('Referrals Breakdown:');
referrals.forEach((ref, i) => {
  const levelComm = ref.investment * (ijazLevelRate / 100);
  console.log(`  ${i + 1}. ${ref.name.padEnd(25)} $${String(ref.investment).padStart(6)} × ${ijazLevelRate}% = $${levelComm.toFixed(2)}`);
});

console.log();
console.log(`Personal Daily ROI (1.00%):`);
console.log(`  $${ijaz.investment.toLocaleString()} × 1.00% = $${ijazPersonalROI.toFixed(2)}`);

console.log();
console.log(`Level L${ijazCurrentLevel} Commission (${ijazLevelRate}%):`);
console.log(`  $${totalReferralInvestment.toLocaleString()} × ${ijazLevelRate}% = $${ijazLevelCommission.toFixed(2)}`);

console.log();
console.log('─────────────────────────────────────────────────────────────────────────');
console.log(`IJAZ DAILY TOTAL: $${ijazDailyTotal.toFixed(2)}`);
console.log(`  • Profit Balance:    + $${ijazPersonalROI.toFixed(2)}`);
console.log(`  • Commission Wallet: + $${ijazLevelCommission.toFixed(2)}`);
console.log('─────────────────────────────────────────────────────────────────────────\n');

// ─────────────────────────────────────────────────────────────────────────────
// EACH REFERRAL'S DAILY EARNINGS
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('EACH REFERRAL\'S DAILY EARNINGS');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const referralEarnings = [];

referrals.forEach((ref, i) => {
  const personalROI = ref.investment * ref.dailyROIRate;
  const refCurrentLevel = constants.getCurrentCommissionLevel(ref.directCount || 0);
  const refLevelComm = 0;
  const total = personalROI + refLevelComm;
  
  referralEarnings.push({
    name: ref.name,
    personalROI,
    levelComm: refLevelComm,
    total
  });

  console.log(`📊 ${ref.name.toUpperCase()}\n`);
  console.log(`  Investment:  $${ref.investment.toLocaleString()}`);
  console.log(`  Personal ROI (1.00%): $${personalROI.toFixed(2)}`);
  console.log(`  Level Comm: $${refLevelComm.toFixed(2)} (0 directs)`);
  console.log(`  DAILY TOTAL: $${total.toFixed(2)}\n`);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY TABLE
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('SUMMARY TABLE');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('Person     | Investment | Personal ROI | Level Comm | Total Daily');
console.log('───────────┼────────────┼─────────────┼───────────┼─────────────');
console.log(
  `Ijaz       | $${String(ijaz.investment).padStart(9)} | $${String(ijazPersonalROI.toFixed(2)).padStart(10)} | $${String(ijazLevelCommission.toFixed(2)).padStart(8)} | $${String(ijazDailyTotal.toFixed(2)).padStart(10)}`
);

referralEarnings.forEach((earning, i) => {
  const ref = referrals[i];
  console.log(
    `${ref.name.padEnd(10)}| $${String(ref.investment).padStart(9)} | $${String(earning.personalROI.toFixed(2)).padStart(10)} | $${String(earning.levelComm.toFixed(2)).padStart(8)} | $${String(earning.total.toFixed(2)).padStart(10)}`
  );
});

console.log('───────────┼────────────┼─────────────┼───────────┼─────────────');

const totalInvested = ijaz.investment + totalReferralInvestment;
const totalROI = ijazPersonalROI + referralEarnings.reduce((sum, e) => sum + e.personalROI, 0);
const totalLevelComm = ijazLevelCommission + referralEarnings.reduce((sum, e) => sum + e.levelComm, 0);
const systemTotal = ijazDailyTotal + referralEarnings.reduce((sum, e) => sum + e.total, 0);

console.log(
  `TOTAL      | $${String(totalInvested).padStart(9)} | $${String(totalROI.toFixed(2)).padStart(10)} | $${String(totalLevelComm.toFixed(2)).padStart(8)} | $${String(systemTotal.toFixed(2)).padStart(10)}`
);

console.log();
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('TOTAL SYSTEM PAYOUT TODAY');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log(`Profit Balance:         + $${totalROI.toFixed(2)}`);
console.log(`Commission Wallet:      + $${totalLevelComm.toFixed(2)}`);
console.log('─────────────────────────────');
console.log(`SYSTEM TOTAL:           + $${systemTotal.toFixed(2)}\n`);

console.log('═══════════════════════════════════════════════════════════════════════\n');

process.exit(0);

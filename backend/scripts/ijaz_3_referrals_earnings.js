/**
 * IJAZ WITH 3 REFERRALS - Complete Daily Earnings Calculation
 * Ijaz: $5,000 investment
 * Referral 1 (Shair): $1,000
 * Referral 2 (Shaiq): $2,000
 * Referral 3 (New): $1,500 (assumed - customize as needed)
 */

const constants = require('../config/constants');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('IJAZ WITH 3 REFERRALS - COMPLETE DAILY EARNINGS CALCULATION');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// IJAZ DATA
// ─────────────────────────────────────────────────────────────────────────────

const ijaz = {
  name: 'Ijaz',
  investment: 5000,
  dailyROIRate: 0.01,  // Tier 2: 1.00%
  directCount: 3
};

// ─────────────────────────────────────────────────────────────────────────────
// REFERRALS DATA
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
    name: 'Ayesha',
    investment: 1500,
    dailyROIRate: 0.01,
    directCount: 0
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// CALCULATE IJAZ'S METRICS
// ─────────────────────────────────────────────────────────────────────────────

const totalReferralInvestment = referrals.reduce((sum, r) => sum + r.investment, 0);
const ijazCurrentLevel = constants.getCurrentCommissionLevel(ijaz.directCount);
const ijazLevelRate = constants.LEVEL_RATES[ijazCurrentLevel - 1];
const ijazUnlockedCount = constants.getUnlockedLevelCount(ijaz.directCount);

console.log('📊 IJAZ - UPDATED METRICS\n');
console.log(`Investment:           $${ijaz.investment.toLocaleString()}`);
console.log(`Direct Referrals:     ${ijaz.directCount}`);
console.log(`Unlocked Levels:      ${ijazUnlockedCount}/21`);
console.log(`Current Level:        L${ijazCurrentLevel}`);
console.log(`Level Rate:           ${ijazLevelRate}%\n`);

// ─────────────────────────────────────────────────────────────────────────────
// IJAZ'S DAILY EARNINGS WITH 3 REFERRALS
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
  console.log(`  ${i + 1}. ${ref.name.padEnd(10)} $${String(ref.investment).padStart(6)} × ${ijazLevelRate}% = $${levelComm.toFixed(2)}`);
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
  const refLevelComm = 0;  // No downline, no level commission
  const total = personalROI + refLevelComm;
  
  referralEarnings.push({
    name: ref.name,
    personalROI,
    levelComm: refLevelComm,
    total
  });

  console.log(`📊 ${ref.name.toUpperCase()}\n`);
  console.log(`  Investment:  $${ref.investment.toLocaleString()}`);
  console.log(`  Directs:     ${ref.directCount || 0}`);
  console.log(`  Level:       ${refCurrentLevel ? `L${refCurrentLevel}` : 'None'}\n`);
  
  console.log(`  Personal ROI (1.00%):`);
  console.log(`    $${ref.investment.toLocaleString()} × 1.00% = $${personalROI.toFixed(2)}`);
  
  console.log(`  Level Commission:`);
  console.log(`    ${ref.directCount || 0} directs → No levels unlocked → $0.00`);
  
  console.log();
  console.log(`  DAILY TOTAL: $${total.toFixed(2)}`);
  console.log('  ─────────────────────────────────────────────────────────────────────────\n');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY TABLE
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('SUMMARY - ALL PERSONS DAILY EARNINGS');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('Person     | Investment | ROI Rate | Personal ROI | Level Comm | Total Daily');
console.log('───────────┼────────────┼──────────┼─────────────┼───────────┼─────────────');
console.log(
  `Ijaz       | $${String(ijaz.investment).padStart(9)} | 1.00%    | $${String(ijazPersonalROI.toFixed(2)).padStart(10)} | $${String(ijazLevelCommission.toFixed(2)).padStart(8)} | $${String(ijazDailyTotal.toFixed(2)).padStart(10)}`
);

referralEarnings.forEach((earning, i) => {
  const ref = referrals[i];
  console.log(
    `${ref.name.padEnd(10)}| $${String(ref.investment).padStart(9)} | 1.00%    | $${String(earning.personalROI.toFixed(2)).padStart(10)} | $${String(earning.levelComm.toFixed(2)).padStart(8)} | $${String(earning.total.toFixed(2)).padStart(10)}`
  );
});

console.log('───────────┼────────────┼──────────┼─────────────┼───────────┼─────────────');

const totalInvested = ijaz.investment + totalReferralInvestment;
const totalROI = ijazPersonalROI + referralEarnings.reduce((sum, e) => sum + e.personalROI, 0);
const totalLevelComm = ijazLevelCommission + referralEarnings.reduce((sum, e) => sum + e.levelComm, 0);
const systemTotal = ijazDailyTotal + referralEarnings.reduce((sum, e) => sum + e.total, 0);

console.log(
  `TOTAL      | $${String(totalInvested).padStart(9)} |          | $${String(totalROI.toFixed(2)).padStart(10)} | $${String(totalLevelComm.toFixed(2)).padStart(8)} | $${String(systemTotal.toFixed(2)).padStart(10)}`
);
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// BREAKDOWN BY WALLET TYPE
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('BREAKDOWN BY WALLET TYPE');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('PROFIT BALANCE (Daily ROI):\n');
console.log(`  Ijaz:   + $${ijazPersonalROI.toFixed(2)}`);
referralEarnings.forEach((earning, i) => {
  console.log(`  ${referrals[i].name.padEnd(7)} + $${earning.personalROI.toFixed(2)}`);
});
console.log(`  ─────────────────────────`);
console.log(`  TOTAL:  + $${totalROI.toFixed(2)}\n`);

console.log('COMMISSION WALLET (Level Commission):\n');
console.log(`  Ijaz:   + $${ijazLevelCommission.toFixed(2)}`);
referralEarnings.forEach((earning, i) => {
  console.log(`  ${referrals[i].name.padEnd(7)} + $${earning.levelComm.toFixed(2)}`);
});
console.log(`  ─────────────────────────`);
console.log(`  TOTAL:  + $${totalLevelComm.toFixed(2)}\n`);

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('TOTAL SYSTEM PAYOUT TODAY (Per Cron at 21:00 Dubai)');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log(`Profit Balance:         + $${totalROI.toFixed(2)}`);
console.log(`Commission Wallet:      + $${totalLevelComm.toFixed(2)}`);
console.log('─────────────────────────────');
console.log(`SYSTEM TOTAL:           + $${systemTotal.toFixed(2)}\n`);

console.log('═══════════════════════════════════════════════════════════════════════\n');

process.exit(0);

/**
 * IJAZ WITH ALL REFERRALS - UPDATED CALCULATIONS
 * Using NEW requirement: L1 at 10 directs (25% commission)
 * 
 * Ijaz's referrals:
 * 1. Shair - $1,000
 * 2. Shaiq - $2,000
 * 3. Ayesha - $1,500
 */

const constants = require('../config/constants');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('IJAZ WITH ALL REFERRALS - UPDATED CALCULATIONS');
console.log('(With NEW Requirement: L1 at 10 Directs)');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// IJAZ DATA
const ijaz = {
  name: 'Ijaz',
  investment: 5000,
  dailyROIRate: 0.01
};

// REFERRALS DATA
const referrals = [
  { name: 'Shair', investment: 1000, dailyROIRate: 0.01, directCount: 0 },
  { name: 'Shaiq', investment: 2000, dailyROIRate: 0.01, directCount: 0 },
  { name: 'Ayesha', investment: 1500, dailyROIRate: 0.01, directCount: 0 }
];

const ijazDirectCount = referrals.length; // 3 referrals

// ─────────────────────────────────────────────────────────────────────────────
// CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

const totalReferralInvestment = referrals.reduce((sum, r) => sum + r.investment, 0);
const ijazCurrentLevel = constants.getCurrentCommissionLevel(ijazDirectCount);
const ijazLevelRate = constants.LEVEL_RATES[ijazCurrentLevel - 1];
const ijazUnlockedCount = constants.getUnlockedLevelCount(ijazDirectCount);

console.log('📊 IJAZ - CURRENT STATUS\n');
console.log(`Investment:           $${ijaz.investment.toLocaleString()}`);
console.log(`Direct Referrals:     ${ijazDirectCount}`);
console.log(`Unlocked Levels:      ${ijazUnlockedCount}/21`);
console.log(`Current Level:        L${ijazCurrentLevel}`);
console.log(`Level Rate:           ${ijazLevelRate}%\n`);

// ─────────────────────────────────────────────────────────────────────────────
// IJAZ'S DAILY EARNINGS - CURRENT
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('IJAZ\'S DAILY EARNINGS (3 Referrals)');
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

referrals.forEach((ref) => {
  const personalROI = ref.investment * ref.dailyROIRate;
  const total = personalROI;  // No level commission (0 directs)
  
  referralEarnings.push({
    name: ref.name,
    personalROI,
    total
  });

  console.log(`📊 ${ref.name.toUpperCase()}\n`);
  console.log(`  Investment:         $${ref.investment.toLocaleString()}`);
  console.log(`  Personal ROI (1%):  $${personalROI.toFixed(2)}`);
  console.log(`  Level Commission:   $0.00 (0 directs = no levels)`);
  console.log(`\n  DAILY TOTAL:        $${total.toFixed(2)}\n`);
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
    `${ref.name.padEnd(10)}| $${String(ref.investment).padStart(9)} | $${String(earning.personalROI.toFixed(2)).padStart(10)} | $${String('0.00').padStart(8)} | $${String(earning.total.toFixed(2)).padStart(10)}`
  );
});

console.log('───────────┼────────────┼─────────────┼───────────┼─────────────');

const totalInvested = ijaz.investment + totalReferralInvestment;
const totalROI = ijazPersonalROI + referralEarnings.reduce((sum, e) => sum + e.personalROI, 0);
const totalLevelComm = ijazLevelCommission;
const systemTotal = ijazDailyTotal + referralEarnings.reduce((sum, e) => sum + e.total, 0);

console.log(
  `TOTAL      | $${String(totalInvested).padStart(9)} | $${String(totalROI.toFixed(2)).padStart(10)} | $${String(totalLevelComm.toFixed(2)).padStart(8)} | $${String(systemTotal.toFixed(2)).padStart(10)}`
);

console.log();

// ─────────────────────────────────────────────────────────────────────────────
// BREAKDOWN BY WALLET TYPE
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('BREAKDOWN BY WALLET TYPE');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('PROFIT BALANCE (Daily ROI):');
console.log(`  Ijaz:    + $${ijazPersonalROI.toFixed(2)}`);
referralEarnings.forEach((earning, i) => {
  console.log(`  ${referrals[i].name.padEnd(7)} + $${earning.personalROI.toFixed(2)}`);
});
console.log(`  ─────────────────────────`);
console.log(`  TOTAL:   + $${totalROI.toFixed(2)}\n`);

console.log('COMMISSION WALLET (Level Commission):');
console.log(`  Ijaz:    + $${ijazLevelCommission.toFixed(2)}`);
referralEarnings.forEach((earning, i) => {
  console.log(`  ${referrals[i].name.padEnd(7)} + $0.00`);
});
console.log(`  ─────────────────────────`);
console.log(`  TOTAL:   + $${totalLevelComm.toFixed(2)}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTION TO 10 REFERRALS
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('PROJECTION: IJAZ AT 10 REFERRALS (with NEW requirement)');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// Assume average investment of $1,500 per new referral
const newReferralCount = 7; // From 3 to 10
const avgInvestmentPerRef = 1500;
const projectedNewRefInvestment = newReferralCount * avgInvestmentPerRef;
const projectedTotalRefInvestment = totalReferralInvestment + projectedNewRefInvestment;

const projLevel10 = constants.getCurrentCommissionLevel(10);
const projLevel10Rate = constants.LEVEL_RATES[projLevel10 - 1];

const projPersonalROI = ijaz.investment * ijaz.dailyROIRate;
const projLevelComm = projectedTotalRefInvestment * (projLevel10Rate / 100);
const projDailyTotal = projPersonalROI + projLevelComm;

console.log('Assumptions:');
console.log(`  Current referrals: 3`);
console.log(`  Target referrals:  10`);
console.log(`  New referrals needed: 7`);
console.log(`  Average investment per referral: $${avgInvestmentPerRef.toLocaleString()}`);
console.log(`  Projected total referral investment: $${projectedTotalRefInvestment.toLocaleString()}\n`);

console.log('At 10 Referrals:');
console.log(`  Current Level: L${projLevel10}`);
console.log(`  Commission Rate: ${projLevel10Rate}% (upgraded from ${ijazLevelRate}%)`);
console.log(`  Personal ROI: $${projPersonalROI.toFixed(2)}`);
console.log(`  Level Commission: $${projLevelComm.toFixed(2)}`);
console.log(`\n  DAILY TOTAL: $${projDailyTotal.toFixed(2)}`);
console.log(`  Increase from now: +$${(projDailyTotal - ijazDailyTotal).toFixed(2)}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('CURRENT (3 Referrals):');
console.log(`  Level: L${ijazCurrentLevel} (${ijazLevelRate}%)`);
console.log(`  Daily Total: $${ijazDailyTotal.toFixed(2)}`);
console.log();

console.log('PROJECTED (10 Referrals):');
console.log(`  Level: L${projLevel10} (${projLevel10Rate}%) ← UPGRADED with new requirement`);
console.log(`  Daily Total: $${projDailyTotal.toFixed(2)}`);
console.log();

console.log('IMPROVEMENT:');
console.log(`  Level upgrade: L${ijazCurrentLevel} (${ijazLevelRate}%) → L${projLevel10} (${projLevel10Rate}%)`);
console.log(`  Daily income increase: +$${(projDailyTotal - ijazDailyTotal).toFixed(2)}`);
console.log();

console.log('═══════════════════════════════════════════════════════════════════════\n');

process.exit(0);

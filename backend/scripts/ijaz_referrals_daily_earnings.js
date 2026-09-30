/**
 * Daily Earnings Calculation: Ijaz + Referrals (Shair & Shaiq)
 * What each person gets TODAY from the cron job
 */

const constants = require('../config/constants');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('DAILY EARNINGS CALCULATION - TODAY');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// IJAZ DATA
// ─────────────────────────────────────────────────────────────────────────────

const ijaz = {
  name: 'Ijaz',
  investment: 5000,
  dailyROIRate: 0.01,  // Tier 2: 1.00%
  directCount: 2,
  uplineId: null  // He's the top (no upline in this chain)
};

// ─────────────────────────────────────────────────────────────────────────────
// REFERRALS DATA
// ─────────────────────────────────────────────────────────────────────────────

const shair = {
  name: 'Shair',
  investment: 1000,
  dailyROIRate: 0.01,  // Tier 2: 1.00% ($1,000-$5,000)
  directCount: 0,  // Assumed: no directs (no info provided)
  upline: 'Ijaz'
};

const shaiq = {
  name: 'Shaiq',
  investment: 2000,
  dailyROIRate: 0.01,  // Tier 2: 1.00% ($1,000-$5,000)
  directCount: 0,  // Assumed: no directs (no info provided)
  upline: 'Ijaz'
};

// ─────────────────────────────────────────────────────────────────────────────
// IJAZ DAILY EARNINGS
// ─────────────────────────────────────────────────────────────────────────────

console.log('📊 IJAZ - DAILY EARNINGS TODAY\n');

const ijazPersonalROI = ijaz.investment * ijaz.dailyROIRate;
const ijazDirectCommission = (shair.investment + shaiq.investment) * 0.05;  // ONE-TIME (already received)
const ijazLevelCommissionDaily = (shair.investment + shaiq.investment) * 0.009;  // L18: 0.9%

console.log(`Investment: $${ijaz.investment.toLocaleString()}`);
console.log(`Direct Referrals: ${ijaz.directCount}`);
console.log(`Current Level: L${constants.getCurrentCommissionLevel(ijaz.directCount)} (${constants.LEVEL_RATES[constants.getCurrentCommissionLevel(ijaz.directCount) - 1]}%)\n`);

console.log('TODAY\'S CRON RUN ADDITIONS:');
console.log('─────────────────────────────────────────────────────────────────────────\n');

console.log(`Personal Daily ROI (1.00%):`);
console.log(`  $${ijaz.investment.toLocaleString()} × 1.00% = $${ijazPersonalROI.toFixed(2)}`);
console.log(`  → Goes to: PROFIT BALANCE\n`);

console.log(`Level Commission (L18: 0.9% on referral investments):`);
console.log(`  Shair: $${shair.investment.toLocaleString()} × 0.9% = $${(shair.investment * 0.009).toFixed(2)}`);
console.log(`  Shaiq: $${shaiq.investment.toLocaleString()} × 0.9% = $${(shaiq.investment * 0.009).toFixed(2)}`);
console.log(`  Total: $${ijazLevelCommissionDaily.toFixed(2)}`);
console.log(`  → Goes to: COMMISSION WALLET\n`);

const ijazDailyTotal = ijazPersonalROI + ijazLevelCommissionDaily;
console.log('─────────────────────────────────────────────────────────────────────────');
console.log(`IJAZ GETS TODAY: $${ijazDailyTotal.toFixed(2)}`);
console.log(`  • Profit Balance:      + $${ijazPersonalROI.toFixed(2)}`);
console.log(`  • Commission Wallet:   + $${ijazLevelCommissionDaily.toFixed(2)}`);
console.log('─────────────────────────────────────────────────────────────────────────\n');

// ─────────────────────────────────────────────────────────────────────────────
// SHAIR DAILY EARNINGS
// ─────────────────────────────────────────────────────────────────────────────

console.log('📊 SHAIR (Ijaz\'s Referral #1) - DAILY EARNINGS TODAY\n');

const shairPersonalROI = shair.investment * shair.dailyROIRate;
const shairCommissionLevel = constants.getCurrentCommissionLevel(shair.directCount || 0);
const shairCommissionRate = shairCommissionLevel ? constants.LEVEL_RATES[shairCommissionLevel - 1] : 0;

console.log(`Investment: $${shair.investment.toLocaleString()}`);
console.log(`Direct Referrals: ${shair.directCount || 0}`);
console.log(`Current Level: ${shairCommissionLevel ? `L${shairCommissionLevel}` : 'None'} ${shairCommissionLevel ? `(${shairCommissionRate}%)` : ''}\n`);

console.log('TODAY\'S CRON RUN ADDITIONS:');
console.log('─────────────────────────────────────────────────────────────────────────\n');

console.log(`Personal Daily ROI (1.00%):`);
console.log(`  $${shair.investment.toLocaleString()} × 1.00% = $${shairPersonalROI.toFixed(2)}`);
console.log(`  → Goes to: PROFIT BALANCE\n`);

let shairLevelCommissionDaily = 0;
if (shairCommissionLevel) {
  console.log(`Level Commission (L${shairCommissionLevel}: ${shairCommissionRate}%):`);
  console.log(`  Shair has no downline yet, so NO level commissions`);
  console.log(`  → Goes to: COMMISSION WALLET: $0.00\n`);
} else {
  console.log(`Level Commission:`);
  console.log(`  Shair has 0 directs → No levels unlocked → NO commissions\n`);
}

const shairDailyTotal = shairPersonalROI + shairLevelCommissionDaily;
console.log('─────────────────────────────────────────────────────────────────────────');
console.log(`SHAIR GETS TODAY: $${shairDailyTotal.toFixed(2)}`);
console.log(`  • Profit Balance:      + $${shairPersonalROI.toFixed(2)}`);
console.log(`  • Commission Wallet:   + $${shairLevelCommissionDaily.toFixed(2)}`);
console.log('─────────────────────────────────────────────────────────────────────────\n');

// ─────────────────────────────────────────────────────────────────────────────
// SHAIQ DAILY EARNINGS
// ─────────────────────────────────────────────────────────────────────────────

console.log('📊 SHAIQ (Ijaz\'s Referral #2) - DAILY EARNINGS TODAY\n');

const shaiqPersonalROI = shaiq.investment * shaiq.dailyROIRate;
const shaiqCommissionLevel = constants.getCurrentCommissionLevel(shaiq.directCount || 0);
const shaiqCommissionRate = shaiqCommissionLevel ? constants.LEVEL_RATES[shaiqCommissionLevel - 1] : 0;

console.log(`Investment: $${shaiq.investment.toLocaleString()}`);
console.log(`Direct Referrals: ${shaiq.directCount || 0}`);
console.log(`Current Level: ${shaiqCommissionLevel ? `L${shaiqCommissionLevel}` : 'None'} ${shaiqCommissionLevel ? `(${shaiqCommissionRate}%)` : ''}\n`);

console.log('TODAY\'S CRON RUN ADDITIONS:');
console.log('─────────────────────────────────────────────────────────────────────────\n');

console.log(`Personal Daily ROI (1.00%):`);
console.log(`  $${shaiq.investment.toLocaleString()} × 1.00% = $${shaiqPersonalROI.toFixed(2)}`);
console.log(`  → Goes to: PROFIT BALANCE\n`);

let shaiqLevelCommissionDaily = 0;
if (shaiqCommissionLevel) {
  console.log(`Level Commission (L${shaiqCommissionLevel}: ${shaiqCommissionRate}%):`);
  console.log(`  Shaiq has no downline yet, so NO level commissions`);
  console.log(`  → Goes to: COMMISSION WALLET: $0.00\n`);
} else {
  console.log(`Level Commission:`);
  console.log(`  Shaiq has 0 directs → No levels unlocked → NO commissions\n`);
}

const shaiqDailyTotal = shaiqPersonalROI + shaiqLevelCommissionDaily;
console.log('─────────────────────────────────────────────────────────────────────────');
console.log(`SHAIQ GETS TODAY: $${shaiqDailyTotal.toFixed(2)}`);
console.log(`  • Profit Balance:      + $${shaiqPersonalROI.toFixed(2)}`);
console.log(`  • Commission Wallet:   + $${shaiqLevelCommissionDaily.toFixed(2)}`);
console.log('─────────────────────────────────────────────────────────────────────────\n');

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY TABLE
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('SUMMARY - TODAY\'S TOTAL EARNINGS');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const totalSystem = ijazDailyTotal + shairDailyTotal + shaiqDailyTotal;

console.log('Person        | Investment | Personal ROI | Level Comm | Total Daily');
console.log('──────────────┼────────────┼──────────────┼───────────┼─────────────');
console.log(
  `Ijaz (Upline) | $${String(ijaz.investment).padStart(9)} | $${String(ijazPersonalROI.toFixed(2)).padStart(11)} | $${String(ijazLevelCommissionDaily.toFixed(2)).padStart(8)} | $${String(ijazDailyTotal.toFixed(2)).padStart(10)}`
);
console.log(
  `Shair (Ref#1) | $${String(shair.investment).padStart(9)} | $${String(shairPersonalROI.toFixed(2)).padStart(11)} | $${String(shairLevelCommissionDaily.toFixed(2)).padStart(8)} | $${String(shairDailyTotal.toFixed(2)).padStart(10)}`
);
console.log(
  `Shaiq (Ref#2) | $${String(shaiq.investment).padStart(9)} | $${String(shaiqPersonalROI.toFixed(2)).padStart(11)} | $${String(shaiqLevelCommissionDaily.toFixed(2)).padStart(8)} | $${String(shaiqDailyTotal.toFixed(2)).padStart(10)}`
);
console.log('──────────────┼────────────┼──────────────┼───────────┼─────────────');
console.log(
  `TOTAL SYSTEM  | $${String(ijaz.investment + shair.investment + shaiq.investment).padStart(9)} | $${String((ijazPersonalROI + shairPersonalROI + shaiqPersonalROI).toFixed(2)).padStart(11)} | $${String((ijazLevelCommissionDaily + shairLevelCommissionDaily + shaiqLevelCommissionDaily).toFixed(2)).padStart(8)} | $${String(totalSystem.toFixed(2)).padStart(10)}`
);
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// BREAKDOWN BY WALLET
// ─────────────────────────────────────────────────────────────────────────────

console.log('BREAKDOWN BY WALLET TYPE:\n');

const totalProfitROI = ijazPersonalROI + shairPersonalROI + shaiqPersonalROI;
const totalLevelCommission = ijazLevelCommissionDaily + shairLevelCommissionDaily + shaiqLevelCommissionDaily;

console.log(`Total Profit Balance (ROI):     $${totalProfitROI.toFixed(2)}`);
console.log(`  ├─ Ijaz:   $${ijazPersonalROI.toFixed(2)}`);
console.log(`  ├─ Shair:  $${shairPersonalROI.toFixed(2)}`);
console.log(`  └─ Shaiq:  $${shaiqPersonalROI.toFixed(2)}`);
console.log();
console.log(`Total Commission Wallet:        $${totalLevelCommission.toFixed(2)}`);
console.log(`  ├─ Ijaz:   $${ijazLevelCommissionDaily.toFixed(2)}`);
console.log(`  ├─ Shair:  $${shairLevelCommissionDaily.toFixed(2)}`);
console.log(`  └─ Shaiq:  $${shaiqLevelCommissionDaily.toFixed(2)}`);
console.log();
console.log('═══════════════════════════════════════════════════════════════════════');
console.log(`TOTAL SYSTEM PAYOUT TODAY: $${totalSystem.toFixed(2)}`);
console.log('═══════════════════════════════════════════════════════════════════════\n');

process.exit(0);

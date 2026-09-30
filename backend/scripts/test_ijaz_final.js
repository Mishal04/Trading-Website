/**
 * IJAZ FINAL VERIFICATION - Correct Commission Distribution
 * 
 * User: Ijaz
 * Investment: $5,000 (Tier 2: 1.00% daily)
 * Direct Referrals: 2
 *   - Shair: $1,000
 *   - Shaiq: $2,000 
 * Current Level: L18 (0.9%)
 */

const constants = require('../config/constants');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('IJAZ - CORRECTED COMMISSION VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// User data
const ijaz = {
  name: 'Ijaz',
  totalInvested: 5000,
  directCount: 2,
  wallet: {
    profit: 0,
    commission: 150  // From direct 5% ONE-TIME approval
  }
};

const referrals = [
  { name: 'Shair', investment: 1000 },
  { name: 'Shaiq', investment: 2000 }
];

const totalReferralInvestment = 3000;

console.log('USER PROFILE:');
console.log(`  Name: ${ijaz.name}`);
console.log(`  Investment: $${ijaz.totalInvested.toLocaleString()}`);
console.log(`  Direct Referrals: ${ijaz.directCount}`);
console.log(`  Current Commission Level: L18 (0.9%)`);
console.log(`  Current Wallet Commission: $${ijaz.wallet.commission.toFixed(2)}\n`);

// Calculations
const tier2Rate = 0.01;  // 1.00%
const personalDailyProfit = ijaz.totalInvested * tier2Rate;
const directCommissionOneTime = totalReferralInvestment * 0.05;  // $150 already credited
const levelCommissionDaily = totalReferralInvestment * 0.009;     // 0.9% = L18 rate

console.log('COMMISSION BREAKDOWN:\n');

console.log('1. DIRECT 5% COMMISSION (ONE-TIME on investment approval)');
console.log('─────────────────────────────────────────────────────────');
console.log(`   When investments approved, Ijaz received ONCE:`);
referrals.forEach((ref) => {
  const comm = ref.investment * 0.05;
  console.log(`   ${ref.name.padEnd(10)} $${ref.investment.toLocaleString().padEnd(6)} × 5% = $${comm.toFixed(2)}`);
});
console.log(`   Total: $${directCommissionOneTime.toFixed(2)} ✓ (already in wallet)\n`);

console.log('2. PERSONAL DAILY ROI (DAILY per cron, Tier 2)');
console.log('─────────────────────────────────────────────────────');
console.log(`   $${ijaz.totalInvested.toLocaleString()} × 1.00% = $${personalDailyProfit.toFixed(2)}/day\n`);

console.log('3. LEVEL L18 COMMISSION (DAILY per cron, 0.9%)');
console.log('─────────────────────────────────────────────────────');
referrals.forEach((ref) => {
  const comm = ref.investment * 0.009;
  console.log(`   ${ref.name.padEnd(10)} $${ref.investment.toLocaleString().padEnd(6)} × 0.9% = $${comm.toFixed(2)}`);
});
console.log(`   Total: $${levelCommissionDaily.toFixed(2)}/day\n`);

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('CRON RUN - WHAT GETS ADDED DAILY (21:00 Dubai time)');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('PROFIT BALANCE:');
console.log(`  Before: $${ijaz.wallet.profit.toFixed(2)}`);
console.log(`  Add:    + $${personalDailyProfit.toFixed(2)} (daily ROI)`);
console.log(`  After:  $${(ijaz.wallet.profit + personalDailyProfit).toFixed(2)}\n`);

console.log('COMMISSION WALLET:');
console.log(`  Before: $${ijaz.wallet.commission.toFixed(2)} (from direct 5% ONE-TIME)`);
console.log(`  Add:    + $${levelCommissionDaily.toFixed(2)} (ONLY level commission - NOT direct 5% again)`);
console.log(`  After:  $${(ijaz.wallet.commission + levelCommissionDaily).toFixed(2)}\n`);

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('FINAL DASHBOARD VALUES (AFTER CRON)');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('Capital Balance:                $5,000.00 (unchanged)');
console.log(`Profit Balance:                 $${(ijaz.wallet.profit + personalDailyProfit).toFixed(2)} (was $${ijaz.wallet.profit.toFixed(2)})`);
console.log(`Commission Wallet:              $${(ijaz.wallet.commission + levelCommissionDaily).toFixed(2)} (was $${ijaz.wallet.commission.toFixed(2)})`);
console.log(`Direct Referrals:               ${ijaz.directCount}`);
console.log(`Unlocked Levels:                4 / 21\n`);

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('✅ SUMMARY: WHAT YOU GET');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('Daily (Per Cron Cycle):');
console.log(`  ✓ Profit Balance:       + $${personalDailyProfit.toFixed(2)}`);
console.log(`  ✓ Commission Wallet:    + $${levelCommissionDaily.toFixed(2)}`);
console.log(`  ─────────────────────────────`);
console.log(`  Total Added Daily:      $${(personalDailyProfit + levelCommissionDaily).toFixed(2)}\n`);

console.log('One-Time (Already Received):');
console.log(`  ✓ Direct 5% Commission: $${directCommissionOneTime.toFixed(2)} (when investments approved)\n`);

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('KEY POINT: YOU DO NOT WANT $327 - YOU WANT $177');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('The cron run should ADD ONLY $27 (level commission)');
console.log('NOT $177 (which was $150 direct 5% + $27 level)');
console.log('\nDirect 5% is ONE-TIME on investment approval.');
console.log('Level Commission is DAILY from the cron job.\n');

process.exit(0);

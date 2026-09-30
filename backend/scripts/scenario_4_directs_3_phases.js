/**
 * SCENARIO: User with 4 Direct Referrals across 3 Phases
 * 
 * Shows complete breakdown of:
 * 1. Own investment returns (Phase 1 → Phase 2 → Phase 3)
 * 2. Commission earnings from 4 direct referrals
 * 3. Total daily/monthly earnings progression
 */

const {
  getInvestmentPhase,
  getDailyRateForPhase,
  getMonthlyRatePhase3,
  INVESTOR_PHASE_1_MONTHS
} = require('../config/investorConstants');
const constants = require('../config/constants');

console.log('═══════════════════════════════════════════════════════════════════════════════════');
console.log('SCENARIO: User "Ahmed" with 4 Direct Referrals - Complete 3-Phase Analysis');
console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────────────────
// SETUP: Ahmed's Investment & Referrals
// ─────────────────────────────────────────────────────────────────────────────────────────

console.log('📊 SETUP\n');

const ahmedInvestment = {
  amount: 5000,
  createdAt: new Date('2024-10-01'),  // Started 12+ months ago (past Phase 1 & 2)
  desc: 'Ahmed\'s own investment'
};

const directReferrals = [
  { name: 'Ali', amount: 1000, desc: '$1k - Package 1' },
  { name: 'Fatima', amount: 3000, desc: '$3k - Package 2' },
  { name: 'Omar', amount: 8000, desc: '$8k - Package 3' },
  { name: 'Zahra', amount: 15000, desc: '$15k - Package 4' }
];

console.log(`Ahmed's Investment: $${ahmedInvestment.amount}`);
console.log(`Ahmed's Direct Referrals: ${directReferrals.length}\n`);

for (const ref of directReferrals) {
  console.log(`  • ${ref.name}: ${ref.desc}`);
}

// Commission level for 4 directs
const directCount = 4;
const payoutLevel = 22 - (directCount * 2);  // 22 - 8 = L14
const LEVEL_RATES = constants.LEVEL_RATES;
const commissionRate = LEVEL_RATES[payoutLevel - 1];

console.log(`\nAhmed's Direct Count: ${directCount}`);
console.log(`Commission Payout Level: L${payoutLevel}`);
console.log(`Commission Rate: ${commissionRate}%`);

// ─────────────────────────────────────────────────────────────────────────────────────────
// PHASE 1: Months 0-6 (Plan A Rates)
// ─────────────────────────────────────────────────────────────────────────────────────────

console.log('\n\n' + '═'.repeat(87));
console.log('PHASE 1: MONTHS 0-6 (Plan A Rates)');
console.log('═'.repeat(87));
console.log('\nAhmed\'s Investment: $5000 (Package 2)');
console.log('All Referrals: Also in Phase 1 (Plan A rates applied)\n');

// Note: This is a hypothetical scenario - Ahmed's investment is 12+ months old
// But we simulate what Phase 1 would look like for calculation purposes
const phase1Date = new Date();
phase1Date.setMonth(phase1Date.getMonth() - 2);  // Simulate 2 months in

const ahmedPhase1DailyRate = 1.0;  // Plan A: Package 2 = 1%
const ahmedPhase1DailyROI = ahmedInvestment.amount * (ahmedPhase1DailyRate / 100);
const ahmedPhase1MonthlyROI = ahmedPhase1DailyROI * 30.44;

console.log(`Ahmed's Daily ROI: $${ahmedPhase1DailyROI.toFixed(2)} (${ahmedPhase1DailyRate}%)`);
console.log(`Ahmed's Monthly ROI: $${ahmedPhase1MonthlyROI.toFixed(2)}`);
console.log('\n📋 COMMISSIONS FROM REFERRALS (Phase 1 - Plan A):\n');

let phase1TotalCommission = 0;
const phase1Details = [];

for (const ref of directReferrals) {
  // Determine package
  let pkg = ref.amount <= 900 ? 1 : (ref.amount <= 5000 ? 2 : (ref.amount <= 9000 ? 3 : 4));
  const dailyRate = pkg === 1 ? 1.0 : (pkg === 2 ? 1.0 : (pkg === 3 ? 1.0 : 1.25));
  const dailyROI = ref.amount * (dailyRate / 100);
  
  const commission = (ref.amount * commissionRate) / 100;
  phase1TotalCommission += commission;
  
  phase1Details.push({
    name: ref.name,
    amount: ref.amount,
    dailyRate,
    dailyROI,
    commission
  });
  
  console.log(`  ${ref.name} (${ref.desc}):`);
  console.log(`    Investment ROI: ${dailyRate}% = $${dailyROI.toFixed(2)}/day = $${(dailyROI * 30.44).toFixed(2)}/month`);
  console.log(`    Commission (L${payoutLevel} @ ${commissionRate}%): $${commission.toFixed(2)}`);
}

const phase1TotalDaily = ahmedPhase1DailyROI + (phase1TotalCommission / 30.44);
const phase1TotalMonthly = phase1TotalDaily * 30.44;
const phase1Total6Months = phase1TotalMonthly * 6;

console.log(`\n💰 PHASE 1 SUMMARY (6 months):`);
console.log(`  Own Daily ROI: $${ahmedPhase1DailyROI.toFixed(2)}`);
console.log(`  Daily Commissions: $${(phase1TotalCommission / 30.44).toFixed(2)}`);
console.log(`  ─────────────────────────────────`);
console.log(`  Total Daily Earnings: $${phase1TotalDaily.toFixed(2)}`);
console.log(`  Total Monthly Earnings: $${phase1TotalMonthly.toFixed(2)}`);
console.log(`  Total 6-Month Earnings: $${phase1Total6Months.toFixed(2)}`);

// ─────────────────────────────────────────────────────────────────────────────────────────
// PHASE 2: Months 6-12 (Plan B Rates)
// ─────────────────────────────────────────────────────────────────────────────────────────

console.log('\n\n' + '═'.repeat(87));
console.log('PHASE 2: MONTHS 6-12 (Plan B Rates)');
console.log('═'.repeat(87));
console.log('\nAhmed\'s Investment: $5000 (Package 2)');
console.log('All Referrals: Also in Phase 2 (Plan B rates applied)\n');

const ahmedPhase2DailyRate = 0.75;  // Plan B: Package 2 = 0.75%
const ahmedPhase2DailyROI = ahmedInvestment.amount * (ahmedPhase2DailyRate / 100);
const ahmedPhase2MonthlyROI = ahmedPhase2DailyROI * 30.44;

console.log(`Ahmed's Daily ROI: $${ahmedPhase2DailyROI.toFixed(2)} (${ahmedPhase2DailyRate}%)`);
console.log(`Ahmed's Monthly ROI: $${ahmedPhase2MonthlyROI.toFixed(2)}`);
console.log('\n📋 COMMISSIONS FROM REFERRALS (Phase 2 - Plan B):\n');

let phase2TotalCommission = 0;

for (const ref of directReferrals) {
  let pkg = ref.amount <= 900 ? 1 : (ref.amount <= 5000 ? 2 : (ref.amount <= 9000 ? 3 : 4));
  const dailyRate = pkg === 1 ? 0.75 : (pkg === 2 ? 0.75 : (pkg === 3 ? 0.75 : 1.0));
  const dailyROI = ref.amount * (dailyRate / 100);
  
  const commission = (ref.amount * commissionRate) / 100;
  phase2TotalCommission += commission;
  
  console.log(`  ${ref.name} (${ref.desc}):`);
  console.log(`    Investment ROI: ${dailyRate}% = $${dailyROI.toFixed(2)}/day = $${(dailyROI * 30.44).toFixed(2)}/month`);
  console.log(`    Commission (L${payoutLevel} @ ${commissionRate}%): $${commission.toFixed(2)}`);
}

const phase2TotalDaily = ahmedPhase2DailyROI + (phase2TotalCommission / 30.44);
const phase2TotalMonthly = phase2TotalDaily * 30.44;
const phase2Total6Months = phase2TotalMonthly * 6;

console.log(`\n💰 PHASE 2 SUMMARY (6 months):`);
console.log(`  Own Daily ROI: $${ahmedPhase2DailyROI.toFixed(2)}`);
console.log(`  Daily Commissions: $${(phase2TotalCommission / 30.44).toFixed(2)}`);
console.log(`  ─────────────────────────────────`);
console.log(`  Total Daily Earnings: $${phase2TotalDaily.toFixed(2)}`);
console.log(`  Total Monthly Earnings: $${phase2TotalMonthly.toFixed(2)}`);
console.log(`  Total 6-Month Earnings: $${phase2Total6Months.toFixed(2)}`);

// ─────────────────────────────────────────────────────────────────────────────────────────
// PHASE 3: Months 12+ (Monthly Rate)
// ─────────────────────────────────────────────────────────────────────────────────────────

console.log('\n\n' + '═'.repeat(87));
console.log('PHASE 3: MONTHS 12+ (8% Monthly Perpetual Yield)');
console.log('═'.repeat(87));
console.log('\nAhmed\'s Investment: $5000 (Package 2)');
console.log('All Referrals: Also in Phase 3 (Monthly 8% applied)\n');

const monthlyRate = 0.08;
const dailyEquivalent = monthlyRate / 30.44;

const ahmedPhase3MonthlyROI = ahmedInvestment.amount * monthlyRate;
const ahmedPhase3DailyROI = ahmedPhase3MonthlyROI / 30.44;

console.log(`Ahmed's Monthly ROI: 8% = $${ahmedPhase3MonthlyROI.toFixed(2)}`);
console.log(`Ahmed's Daily ROI: ${(dailyEquivalent * 100).toFixed(4)}% = $${ahmedPhase3DailyROI.toFixed(2)}`);
console.log('\n📋 COMMISSIONS FROM REFERRALS (Phase 3 - 8% Monthly):\n');

let phase3TotalCommission = 0;

for (const ref of directReferrals) {
  const monthlyROI = ref.amount * monthlyRate;
  const dailyROI = monthlyROI / 30.44;
  
  const commission = (ref.amount * commissionRate) / 100;
  phase3TotalCommission += commission;
  
  console.log(`  ${ref.name} (${ref.desc}):`);
  console.log(`    Investment ROI: 8% monthly = $${monthlyROI.toFixed(2)}/month = $${dailyROI.toFixed(2)}/day`);
  console.log(`    Commission (L${payoutLevel} @ ${commissionRate}%): $${commission.toFixed(2)}`);
}

const phase3TotalDaily = ahmedPhase3DailyROI + (phase3TotalCommission / 30.44);
const phase3TotalMonthly = phase3TotalDaily * 30.44;
const phase3TotalAnnually = phase3TotalMonthly * 12;

console.log(`\n💰 PHASE 3 SUMMARY (Monthly Perpetual):`);
console.log(`  Own Daily ROI: $${ahmedPhase3DailyROI.toFixed(2)}`);
console.log(`  Daily Commissions: $${(phase3TotalCommission / 30.44).toFixed(2)}`);
console.log(`  ─────────────────────────────────`);
console.log(`  Total Daily Earnings: $${phase3TotalDaily.toFixed(2)}`);
console.log(`  Total Monthly Earnings: $${phase3TotalMonthly.toFixed(2)}`);
console.log(`  Total Annual Earnings: $${phase3TotalAnnually.toFixed(2)}`);

// ─────────────────────────────────────────────────────────────────────────────────────────
// CUMULATIVE ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────────────────

console.log('\n\n' + '═'.repeat(87));
console.log('CUMULATIVE EARNINGS PROGRESSION');
console.log('═'.repeat(87) + '\n');

console.log('Timeline of Ahmed\'s Earnings:');
console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ Phase 1 (Months 1-6):    Daily Avg: $' + phase1TotalDaily.toFixed(2).padEnd(8) + ' | Monthly: $' + phase1TotalMonthly.toFixed(2).padEnd(10) + ' | 6mo Total: $' + phase1Total6Months.toFixed(2) + '  │');
console.log('│ Phase 2 (Months 7-12):   Daily Avg: $' + phase2TotalDaily.toFixed(2).padEnd(8) + ' | Monthly: $' + phase2TotalMonthly.toFixed(2).padEnd(10) + ' | 6mo Total: $' + phase2Total6Months.toFixed(2) + '  │');
console.log('│ Phase 3 (Month 13+):     Daily Avg: $' + phase3TotalDaily.toFixed(2).padEnd(8) + ' | Monthly: $' + phase3TotalMonthly.toFixed(2).padEnd(10) + ' | Annual:    $' + phase3TotalAnnually.toFixed(2) + '  │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');

const totalFirst12Months = phase1Total6Months + phase2Total6Months;
const avgMonthlyYears2Plus = phase3TotalMonthly;

console.log(`📈 EARNINGS SUMMARY:\n`);
console.log(`  First 6 months (Phase 1):       $${phase1Total6Months.toFixed(2)}`);
console.log(`  Next 6 months (Phase 2):        $${phase2Total6Months.toFixed(2)}`);
console.log(`  ─────────────────────────────────────────`);
console.log(`  Total First Year:               $${totalFirst12Months.toFixed(2)}`);
console.log(`  \n  Year 2+ (per month):           $${avgMonthlyYears2Plus.toFixed(2)}`);
console.log(`  Year 2+ (per year):             $${phase3TotalAnnually.toFixed(2)}`);

// ─────────────────────────────────────────────────────────────────────────────────────────
// DETAILED BREAKDOWN TABLE
// ─────────────────────────────────────────────────────────────────────────────────────────

console.log('\n\n' + '═'.repeat(87));
console.log('DETAILED EARNINGS BREAKDOWN TABLE');
console.log('═'.repeat(87) + '\n');

console.log('PHASE 1 (Plan A - 1%, 1%, 1%, 1.25% daily rates):');
console.log('┌─────────────────┬──────────────┬──────────────┬──────────────────────┐');
console.log('│ Referral        │ Daily ROI    │ Commissions  │ Total Earnings       │');
console.log('│                 │ (Per Month)  │ (Per Month)  │ (Per Month)          │');
console.log('├─────────────────┼──────────────┼──────────────┼──────────────────────┤');

for (const detail of phase1Details) {
  const dailyROI = detail.dailyROI * 30.44;
  const commMonthly = detail.commission;
  const totalMonthly = dailyROI + commMonthly;
  console.log(`│ ${detail.name.padEnd(15)} │ $${dailyROI.toFixed(2).padStart(10)} │ $${commMonthly.toFixed(2).padStart(10)} │ $${totalMonthly.toFixed(2).padStart(17)} │`);
}

console.log('├─────────────────┼──────────────┼──────────────┼──────────────────────┤');
const phase1OwnMonthly = ahmedPhase1MonthlyROI;
const phase1CommMonthly = phase1TotalCommission;
const phase1TotalByRef = phase1OwnMonthly + phase1CommMonthly;
console.log(`│ TOTAL (Ahmed)   │ $${phase1OwnMonthly.toFixed(2).padStart(10)} │ $${phase1CommMonthly.toFixed(2).padStart(10)} │ $${phase1TotalByRef.toFixed(2).padStart(17)} │`);
console.log('└─────────────────┴──────────────┴──────────────┴──────────────────────┘\n');

console.log('PHASE 2 (Plan B - 0.75%, 0.75%, 0.75%, 1% daily rates):');
console.log('┌─────────────────┬──────────────┬──────────────┬──────────────────────┐');
console.log('│ Referral        │ Daily ROI    │ Commissions  │ Total Earnings       │');
console.log('│                 │ (Per Month)  │ (Per Month)  │ (Per Month)          │');
console.log('├─────────────────┼──────────────┼──────────────┼──────────────────────┤');

for (const ref of directReferrals) {
  let pkg = ref.amount <= 900 ? 1 : (ref.amount <= 5000 ? 2 : (ref.amount <= 9000 ? 3 : 4));
  const dailyRate = pkg === 1 ? 0.75 : (pkg === 2 ? 0.75 : (pkg === 3 ? 0.75 : 1.0));
  const dailyROI = ref.amount * (dailyRate / 100);
  const monthlyROI = dailyROI * 30.44;
  const commission = (ref.amount * commissionRate) / 100;
  const total = monthlyROI + commission;
  
  console.log(`│ ${ref.name.padEnd(15)} │ $${monthlyROI.toFixed(2).padStart(10)} │ $${commission.toFixed(2).padStart(10)} │ $${total.toFixed(2).padStart(17)} │`);
}

console.log('├─────────────────┼──────────────┼──────────────┼──────────────────────┤');
const phase2OwnMonthly = ahmedPhase2MonthlyROI;
const phase2CommMonthly = phase2TotalCommission;
const phase2TotalByRef = phase2OwnMonthly + phase2CommMonthly;
console.log(`│ TOTAL (Ahmed)   │ $${phase2OwnMonthly.toFixed(2).padStart(10)} │ $${phase2CommMonthly.toFixed(2).padStart(10)} │ $${phase2TotalByRef.toFixed(2).padStart(17)} │`);
console.log('└─────────────────┴──────────────┴──────────────┴──────────────────────┘\n');

console.log('PHASE 3 (Perpetual 8% Monthly):');
console.log('┌─────────────────┬──────────────┬──────────────┬──────────────────────┐');
console.log('│ Referral        │ Monthly ROI  │ Commissions  │ Total Earnings       │');
console.log('│                 │ (Per Month)  │ (Per Month)  │ (Per Month)          │');
console.log('├─────────────────┼──────────────┼──────────────┼──────────────────────┤');

for (const ref of directReferrals) {
  const monthlyROI = ref.amount * monthlyRate;
  const commission = (ref.amount * commissionRate) / 100;
  const total = monthlyROI + commission;
  
  console.log(`│ ${ref.name.padEnd(15)} │ $${monthlyROI.toFixed(2).padStart(10)} │ $${commission.toFixed(2).padStart(10)} │ $${total.toFixed(2).padStart(17)} │`);
}

console.log('├─────────────────┼──────────────┼──────────────┼──────────────────────┤');
const phase3OwnMonthly = ahmedPhase3MonthlyROI;
const phase3CommMonthly = phase3TotalCommission;
const phase3TotalByRef = phase3OwnMonthly + phase3CommMonthly;
console.log(`│ TOTAL (Ahmed)   │ $${phase3OwnMonthly.toFixed(2).padStart(10)} │ $${phase3CommMonthly.toFixed(2).padStart(10)} │ $${phase3TotalByRef.toFixed(2).padStart(17)} │`);
console.log('└─────────────────┴──────────────┴──────────────┴──────────────────────┘\n');

// ─────────────────────────────────────────────────────────────────────────────────────────
// KEY INSIGHTS
// ─────────────────────────────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(87));
console.log('KEY INSIGHTS');
console.log('═'.repeat(87) + '\n');

console.log('📊 Rate Changes Impact:');
console.log(`  • Phase 1 → Phase 2: ROI drops from $${phase1TotalMonthly.toFixed(2)} to $${phase2TotalMonthly.toFixed(2)}/month (${((phase2TotalMonthly / phase1TotalMonthly - 1) * 100).toFixed(1)}% reduction)`);
console.log(`  • Phase 2 → Phase 3: ROI drops from $${phase2TotalMonthly.toFixed(2)} to $${phase3TotalMonthly.toFixed(2)}/month (${((phase3TotalMonthly / phase2TotalMonthly - 1) * 100).toFixed(1)}% reduction)`);

console.log(`\n💡 Commission Independence:`);
console.log(`  • Commissions remain stable at $${phase1TotalCommission.toFixed(2)}/month regardless of phase`);
console.log(`  • Ahmed earns same commission from each referral across all phases`);
console.log(`  • Only referral ROI changes by phase, not commission structure`);

console.log(`\n📈 Long-term Stability (Year 2+):`);
console.log(`  • Fixed 8% monthly on $${ahmedInvestment.amount} = $${ahmedPhase3MonthlyROI.toFixed(2)}/month from own investment`);
console.log(`  • Plus consistent $${phase3TotalCommission.toFixed(2)}/month from 4 referrals`);
console.log(`  • Total monthly income stabilizes at $${phase3TotalMonthly.toFixed(2)} (predictable)`);

console.log('\n═════════════════════════════════════════════════════════════════════════════════════\n');

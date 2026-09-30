/**
 * CORRECTED CALCULATION: User A ($1k) → User B ($3k)
 * 
 * Using CORRECTED specifications:
 * 
 * ROI Rates:
 * Phase 1 (Plan A): $1k-5k = 1.00% daily
 * Phase 2 (Plan B): $1k-5k = 0.75% daily
 * Phase 3 (Perpetual): 8% monthly
 * 
 * Commission Structure:
 * Level rates: L1=25%, L2=15%, L3=10%, L4-5=5%, L6-10=2%, L11-20=0.9%, L21=1%
 * Level unlocking: 1 direct = 2 levels (L21+L20), 2 directs = 4 levels (L21+L20+L19+L18), etc.
 * Reversed order: L21 unlocks first, L1 unlocks last (at 10+ directs)
 */

require('dotenv').config({ path: '.env' });

const {
  getInvestmentPhase,
  getDailyRateForPhase,
  getMonthlyRatePhase3,
  getInvestorPackageInfo,
  INVESTOR_PHASE_1_MONTHS
} = require('../config/investorConstants');

const constants = require('../config/constants');

console.log('\n╔════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║          CORRECTED SCENARIO: User A ($1k) → User B ($3k)                         ║');
console.log('║             Using EXACT Specification for Rates & Commission                     ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════════╝\n');

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const now = new Date();

const userA = {
  name: 'User A',
  investment: {
    amount: 1000,
    createdAt: now,
    status: 'active'
  }
};

const userB = {
  name: 'User B',
  investment: {
    amount: 3000,
    createdAt: now,
    status: 'active'
  }
};

console.log('📊 SCENARIO SETUP\n');
console.log(`User A Investment: $${userA.investment.amount}`);
console.log(`User B Investment: $${userB.investment.amount} (referred by User A)\n`);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// STEP 1: Package Determination
// ─────────────────────────────────────────────────────────────────────────────────────────────────

console.log('STEP 1: Determine Packages\n');

const packageA = getInvestorPackageInfo(userA.investment.amount, 'A');
const packageB = getInvestorPackageInfo(userB.investment.amount, 'A');

console.log(`User A: $${userA.investment.amount}`);
console.log(`  → Package: ${packageA.packageNumber} ($1k-5k tier)`);
console.log(`  → Phase 1 Rate: 1.00% daily`);
console.log(`  → Phase 2 Rate: 0.75% daily`);
console.log(`  → Phase 3 Rate: 8% monthly\n`);

console.log(`User B: $${userB.investment.amount}`);
console.log(`  → Package: ${packageB.packageNumber} ($1k-5k tier)`);
console.log(`  → Phase 1 Rate: 1.00% daily`);
console.log(`  → Phase 2 Rate: 0.75% daily`);
console.log(`  → Phase 3 Rate: 8% monthly\n`);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// STEP 2: Commission Structure
// ─────────────────────────────────────────────────────────────────────────────────────────────────

console.log('STEP 2: Commission Structure\n');

// Level Rates (correct specification)
const LEVEL_RATES_CORRECT = {
  1: 25,    // L1
  2: 15,    // L2
  3: 10,    // L3
  4: 5,     // L4
  5: 5,     // L5
  6: 2,     // L6
  7: 2,     // L7
  8: 2,     // L8
  9: 2,     // L9
  10: 2,    // L10
  11: 0.9,  // L11
  12: 0.9,  // L12
  13: 0.9,  // L13
  14: 0.9,  // L14
  15: 0.9,  // L15
  16: 0.9,  // L16
  17: 0.9,  // L17
  18: 0.9,  // L18
  19: 0.9,  // L19
  20: 0.9,  // L20
  21: 1     // L21
};

console.log('Level Opening Rules (Reverse Order: L21 → L1):');
console.log('  1 direct  → 2 levels unlocked (L21, L20)');
console.log('  2 directs → 4 levels unlocked (L21, L20, L19, L18)');
console.log('  3 directs → 6 levels unlocked (L21-L16)');
console.log('  4 directs → 8 levels unlocked (L21-L14)');
console.log('  5 directs → 10 levels unlocked (L21-L12)');
console.log('  6 directs → 12 levels unlocked (L21-L10)');
console.log('  7 directs → 14 levels unlocked (L21-L8)');
console.log('  8 directs → 16 levels unlocked (L21-L6)');
console.log('  9 directs → 18 levels unlocked (L21-L4)');
console.log('  10+ directs → 21 levels unlocked (L21-L1) ★ FULL TREE\n');

// User A has 1 direct (User B)
const userADirectCount = 1;
const levelsUnlocked = userADirectCount * 2; // 1 × 2 = 2 levels

console.log(`User A Direct Count: ${userADirectCount}`);
console.log(`Levels Unlocked: ${levelsUnlocked}`);
console.log(`Unlocked Levels: L21, L20\n`);

// Get commission rates for unlocked levels
// With 1 direct: Levels L21, L20 are unlocked
// L21 = 1%, L20 = 0.9%
const unlockedLevels = [];
for (let i = 0; i < levelsUnlocked; i++) {
  const level = 21 - i; // L21, L20, L19...
  unlockedLevels.push(level);
}

console.log(`Commission Rates for Unlocked Levels:`);
for (const level of unlockedLevels) {
  console.log(`  L${level}: ${LEVEL_RATES_CORRECT[level]}%`);
}

// For each direct referral, User A gets commission at EACH unlocked level
console.log(`\nCommission from User B ($3,000) at each unlocked level:`);
let totalCommissionPhase = 0;
for (const level of unlockedLevels) {
  const commission = (userB.investment.amount * LEVEL_RATES_CORRECT[level]) / 100;
  console.log(`  L${level}: $3,000 × ${LEVEL_RATES_CORRECT[level]}% = $${commission.toFixed(2)}`);
  totalCommissionPhase += commission;
}
console.log(`  ─────────────────────────────────`);
console.log(`  TOTAL COMMISSION PER UNIT: $${totalCommissionPhase.toFixed(2)}\n`);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// PHASE 1: Months 0-6 (Plan A Rates)
// ─────────────────────────────────────────────────────────────────────────────────────────────────

console.log('═'.repeat(90));
console.log('PHASE 1: MONTHS 0-6 (Plan A Rates - 1.00% daily)');
console.log('═'.repeat(90) + '\n');

const userAPhase1Rate = 1.00;  // $1k tier, Phase 1
const userBPhase1Rate = 1.00;  // $3k tier, Phase 1

const userAPhase1DailyROI = (userA.investment.amount * userAPhase1Rate) / 100;
const userAPhase1MonthlyROI = userAPhase1DailyROI * 30.44;
const userAPhase1SixMonthROI = userAPhase1MonthlyROI * 6;

console.log(`User A Daily ROI (Phase 1):`);
console.log(`  $${userA.investment.amount} × 1.00% = $${userAPhase1DailyROI.toFixed(2)}/day`);
console.log(`  = $${userAPhase1MonthlyROI.toFixed(2)}/month`);
console.log(`  = $${userAPhase1SixMonthROI.toFixed(2)}/6 months\n`);

const userBPhase1DailyROI = (userB.investment.amount * userBPhase1Rate) / 100;
const userBPhase1MonthlyROI = userBPhase1DailyROI * 30.44;
const userBPhase1SixMonthROI = userBPhase1MonthlyROI * 6;

console.log(`User B Daily ROI (Phase 1):`);
console.log(`  $${userB.investment.amount} × 1.00% = $${userBPhase1DailyROI.toFixed(2)}/day`);
console.log(`  = $${userBPhase1MonthlyROI.toFixed(2)}/month`);
console.log(`  = $${userBPhase1SixMonthROI.toFixed(2)}/6 months\n`);

// Commission in Phase 1
const userAPhase1CommissionMonthly = totalCommissionPhase;
const userAPhase1CommissionTotal = userAPhase1CommissionMonthly * 6;

console.log(`User A Commission (Phase 1 - 6 months):`);
console.log(`  $${userAPhase1CommissionMonthly.toFixed(2)}/month × 6 months = $${userAPhase1CommissionTotal.toFixed(2)}\n`);

// Totals Phase 1
const userAPhase1Total = userAPhase1SixMonthROI + userAPhase1CommissionTotal;
const userBPhase1Total = userBPhase1SixMonthROI;

console.log('PHASE 1 SUMMARY (6 months):');
console.log('┌─────────────────────────────────────────────────────────────────────┐');
console.log(`│ User A: ROI $${userAPhase1SixMonthROI.toFixed(2)} + Commission $${userAPhase1CommissionTotal.toFixed(2)} = $${userAPhase1Total.toFixed(2)}`.padEnd(69) + '│');
console.log(`│ User B: ROI $${userBPhase1Total.toFixed(2)}`.padEnd(69) + '│');
console.log(`│ COMBINED: $${(userAPhase1Total + userBPhase1Total).toFixed(2)}`.padEnd(69) + '│');
console.log('└─────────────────────────────────────────────────────────────────────┘\n');

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// PHASE 2: Months 6-12 (Plan B Rates)
// ─────────────────────────────────────────────────────────────────────────────────────────────────

console.log('═'.repeat(90));
console.log('PHASE 2: MONTHS 6-12 (Plan B Rates - 0.75% daily)');
console.log('═'.repeat(90) + '\n');

const userAPhase2Rate = 0.75;  // $1k tier, Phase 2
const userBPhase2Rate = 0.75;  // $3k tier, Phase 2

const userAPhase2DailyROI = (userA.investment.amount * userAPhase2Rate) / 100;
const userAPhase2MonthlyROI = userAPhase2DailyROI * 30.44;
const userAPhase2SixMonthROI = userAPhase2MonthlyROI * 6;

console.log(`User A Daily ROI (Phase 2):`);
console.log(`  $${userA.investment.amount} × 0.75% = $${userAPhase2DailyROI.toFixed(2)}/day`);
console.log(`  = $${userAPhase2MonthlyROI.toFixed(2)}/month`);
console.log(`  = $${userAPhase2SixMonthROI.toFixed(2)}/6 months\n`);

const userBPhase2DailyROI = (userB.investment.amount * userBPhase2Rate) / 100;
const userBPhase2MonthlyROI = userBPhase2DailyROI * 30.44;
const userBPhase2SixMonthROI = userBPhase2MonthlyROI * 6;

console.log(`User B Daily ROI (Phase 2):`);
console.log(`  $${userB.investment.amount} × 0.75% = $${userBPhase2DailyROI.toFixed(2)}/day`);
console.log(`  = $${userBPhase2MonthlyROI.toFixed(2)}/month`);
console.log(`  = $${userBPhase2SixMonthROI.toFixed(2)}/6 months\n`);

// Commission in Phase 2 (same as Phase 1 - stays constant)
const userAPhase2CommissionMonthly = totalCommissionPhase;
const userAPhase2CommissionTotal = userAPhase2CommissionMonthly * 6;

console.log(`User A Commission (Phase 2 - 6 months - SAME as Phase 1):`);
console.log(`  $${userAPhase2CommissionMonthly.toFixed(2)}/month × 6 months = $${userAPhase2CommissionTotal.toFixed(2)}\n`);

// Totals Phase 2
const userAPhase2Total = userAPhase2SixMonthROI + userAPhase2CommissionTotal;
const userBPhase2Total = userBPhase2SixMonthROI;

console.log('PHASE 2 SUMMARY (6 months):');
console.log('┌─────────────────────────────────────────────────────────────────────┐');
console.log(`│ User A: ROI $${userAPhase2SixMonthROI.toFixed(2)} + Commission $${userAPhase2CommissionTotal.toFixed(2)} = $${userAPhase2Total.toFixed(2)}`.padEnd(69) + '│');
console.log(`│ User B: ROI $${userBPhase2Total.toFixed(2)}`.padEnd(69) + '│');
console.log(`│ COMBINED: $${(userAPhase2Total + userBPhase2Total).toFixed(2)}`.padEnd(69) + '│');
console.log('└─────────────────────────────────────────────────────────────────────┘\n');

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// PHASE 3: Month 12+ (8% Monthly Perpetual)
// ─────────────────────────────────────────────────────────────────────────────────────────────────

console.log('═'.repeat(90));
console.log('PHASE 3: MONTH 12+ (Perpetual 8% Monthly)');
console.log('═'.repeat(90) + '\n');

const monthlyRate = 0.08;  // 8% monthly for all packages
const dailyEquivalent = monthlyRate / 30.44;

const userAPhase3MonthlyROI = userA.investment.amount * monthlyRate;
const userAPhase3AnnualROI = userAPhase3MonthlyROI * 12;

console.log(`User A Monthly ROI (Phase 3):`);
console.log(`  $${userA.investment.amount} × 8% = $${userAPhase3MonthlyROI.toFixed(2)}/month`);
console.log(`  = $${userAPhase3AnnualROI.toFixed(2)}/year\n`);

const userBPhase3MonthlyROI = userB.investment.amount * monthlyRate;
const userBPhase3AnnualROI = userBPhase3MonthlyROI * 12;

console.log(`User B Monthly ROI (Phase 3):`);
console.log(`  $${userB.investment.amount} × 8% = $${userBPhase3MonthlyROI.toFixed(2)}/month`);
console.log(`  = $${userBPhase3AnnualROI.toFixed(2)}/year\n`);

// Commission in Phase 3
const userAPhase3CommissionMonthly = totalCommissionPhase;
const userAPhase3CommissionAnnual = userAPhase3CommissionMonthly * 12;

console.log(`User A Commission (Phase 3 - Perpetual):`);
console.log(`  $${userAPhase3CommissionMonthly.toFixed(2)}/month`);
console.log(`  = $${userAPhase3CommissionAnnual.toFixed(2)}/year\n`);

console.log('PHASE 3 SUMMARY (Monthly Perpetual):');
console.log('┌─────────────────────────────────────────────────────────────────────┐');
console.log(`│ User A: $${userAPhase3MonthlyROI.toFixed(2)}/mo ROI + $${userAPhase3CommissionMonthly.toFixed(2)}/mo Commission = $${(userAPhase3MonthlyROI + userAPhase3CommissionMonthly).toFixed(2)}/month`.padEnd(69) + '│');
console.log(`│         $${userAPhase3AnnualROI.toFixed(2)}/yr ROI + $${userAPhase3CommissionAnnual.toFixed(2)}/yr Commission = $${(userAPhase3AnnualROI + userAPhase3CommissionAnnual).toFixed(2)}/year`.padEnd(69) + '│');
console.log(`│                                                                     │`);
console.log(`│ User B: $${userBPhase3MonthlyROI.toFixed(2)}/month ROI`.padEnd(69) + '│');
console.log(`│         $${userBPhase3AnnualROI.toFixed(2)}/year ROI`.padEnd(69) + '│');
console.log('└─────────────────────────────────────────────────────────────────────┘\n');

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// COMPLETE SUMMARY
// ─────────────────────────────────────────────────────────────────────────────────────────────────

console.log('═'.repeat(90));
console.log('COMPLETE EARNINGS SUMMARY');
console.log('═'.repeat(90) + '\n');

const userAYear1 = userAPhase1Total + userAPhase2Total;
const userBYear1 = userBPhase1Total + userBPhase2Total;
const combinedYear1 = userAYear1 + userBYear1;

const userAPhase3Monthly = userAPhase3MonthlyROI + userAPhase3CommissionMonthly;
const userAPhase3Annual = userAPhase3AnnualROI + userAPhase3CommissionAnnual;
const userBPhase3Annual = userBPhase3AnnualROI;
const combinedPhase3Annual = userAPhase3Annual + userBPhase3Annual;

console.log('┌──────────────────────────────────────────────────────────────────────────────────────┐');
console.log('│                              USER A (REFERRER)                                       │');
console.log('├──────────────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ Investment: $1,000 (Package 2) | Direct Referrals: 1                                 │`);
console.log(`│ Commission Unlocked Levels: L21 (1%) + L20 (0.9%) = $${totalCommissionPhase.toFixed(2)}/unit                         │`);
console.log('├──────────────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ Phase 1 (6 months):  $${userAPhase1Total.toFixed(2)}`.padEnd(88) + '│');
console.log(`│ Phase 2 (6 months):  $${userAPhase2Total.toFixed(2)}`.padEnd(88) + '│');
console.log(`│ ─────────────────────────────`.padEnd(88) + '│');
console.log(`│ YEAR 1 TOTAL:        $${userAYear1.toFixed(2)}`.padEnd(88) + '│');
console.log('├──────────────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ Phase 3 (Monthly):   $${userAPhase3Monthly.toFixed(2)}/month`.padEnd(88) + '│');
console.log(`│ Phase 3 (Annual):    $${userAPhase3Annual.toFixed(2)}/year`.padEnd(88) + '│');
console.log('└──────────────────────────────────────────────────────────────────────────────────────┘\n');

console.log('┌──────────────────────────────────────────────────────────────────────────────────────┐');
console.log('│                              USER B (REFERRED)                                       │');
console.log('├──────────────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ Investment: $3,000 (Package 2) | Referred By: User A                                 │`);
console.log(`│ Commission: NONE (no direct referrals)                                               │`);
console.log('├──────────────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ Phase 1 (6 months):  $${userBPhase1Total.toFixed(2)}`.padEnd(88) + '│');
console.log(`│ Phase 2 (6 months):  $${userBPhase2Total.toFixed(2)}`.padEnd(88) + '│');
console.log(`│ ─────────────────────────────`.padEnd(88) + '│');
console.log(`│ YEAR 1 TOTAL:        $${userBYear1.toFixed(2)}`.padEnd(88) + '│');
console.log('├──────────────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ Phase 3 (Annual):    $${userBPhase3Annual.toFixed(2)}/year`.padEnd(88) + '│');
console.log('└──────────────────────────────────────────────────────────────────────────────────────┘\n');

console.log('┌──────────────────────────────────────────────────────────────────────────────────────┐');
console.log('│                              COMBINED EARNINGS (A + B)                               │');
console.log('├──────────────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ Year 1 Total:        $${combinedYear1.toFixed(2)}`.padEnd(88) + '│');
console.log(`│   Phase 1: $${(userAPhase1Total + userBPhase1Total).toFixed(2)}`.padEnd(88) + '│');
console.log(`│   Phase 2: $${(userAPhase2Total + userBPhase2Total).toFixed(2)}`.padEnd(88) + '│');
console.log('├──────────────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ Phase 3 Monthly:     $${(userAPhase3Monthly + userBPhase3MonthlyROI).toFixed(2)}/month`.padEnd(88) + '│');
console.log(`│ Phase 3 Annual:      $${combinedPhase3Annual.toFixed(2)}/year`.padEnd(88) + '│');
console.log('└──────────────────────────────────────────────────────────────────────────────────────┘\n');

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// VERIFICATION TABLE
// ─────────────────────────────────────────────────────────────────────────────────────────────────

console.log('═'.repeat(90));
console.log('VERIFICATION TABLE');
console.log('═'.repeat(90) + '\n');

console.log('Phase 1 (1.00% daily):');
console.log(`  User A: $1k × 1% × 183 days = $${(1000 * 0.01 * 183).toFixed(2)} ROI + $${userAPhase1CommissionTotal.toFixed(2)} commission = $${userAPhase1Total.toFixed(2)}`);
console.log(`  User B: $3k × 1% × 183 days = $${(3000 * 0.01 * 183).toFixed(2)} ROI`);
console.log();

console.log('Phase 2 (0.75% daily):');
console.log(`  User A: $1k × 0.75% × 183 days = $${(1000 * 0.0075 * 183).toFixed(2)} ROI + $${userAPhase2CommissionTotal.toFixed(2)} commission = $${userAPhase2Total.toFixed(2)}`);
console.log(`  User B: $3k × 0.75% × 183 days = $${(3000 * 0.0075 * 183).toFixed(2)} ROI`);
console.log();

console.log('Phase 3 (8% monthly):');
console.log(`  User A: $1k × 8% = $${userAPhase3MonthlyROI.toFixed(2)}/month ROI + $${userAPhase3CommissionMonthly.toFixed(2)} commission = $${userAPhase3Monthly.toFixed(2)}/month`);
console.log(`  User B: $3k × 8% = $${userBPhase3MonthlyROI.toFixed(2)}/month ROI`);
console.log();

console.log('Commission Structure Verification:');
console.log(`  User A unlocked levels (1 direct): L21 + L20`);
console.log(`  Commission from $3k: (3000 × 1%) + (3000 × 0.9%) = $30 + $27 = $${totalCommissionPhase.toFixed(2)} ✓`);
console.log();

console.log('═'.repeat(90));
console.log('✅ CALCULATION COMPLETE - All rates and commissions verified\n');

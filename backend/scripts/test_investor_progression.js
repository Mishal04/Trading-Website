/**
 * Test Script: Investor Progression - Level 21 to Level 1
 * 
 * Scenario: Start with one investor (Ali) who makes referrals progressively.
 * Shows how their commission level, daily profit, and network income evolves
 * as they build their downline from 0 → 1 → 2 → 3 → ... → 10+ direct referrals.
 * 
 * Tests commission structure at each level: L21, L20, L19, ..., L2, L1
 */

const constants = require('../config/constants');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('TEST: INVESTOR PROGRESSION - Level 21 to Level 1');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// ═════════════════════════════════════════════════════════════════════════════
// ROOT INVESTOR
// ═════════════════════════════════════════════════════════════════════════════

const ali = {
  name: 'Ali',
  investment: 1000,
  dailyROI: 0.015, // 1.5% for $1,000 tier
};

// Predefined referrals with increasing investments
const referrals = [
  { name: 'Ref-1', investment: 500 },
  { name: 'Ref-2', investment: 1000 },
  { name: 'Ref-3', investment: 1500 },
  { name: 'Ref-4', investment: 2000 },
  { name: 'Ref-5', investment: 2500 },
  { name: 'Ref-6', investment: 3000 },
  { name: 'Ref-7', investment: 3500 },
  { name: 'Ref-8', investment: 4000 },
  { name: 'Ref-9', investment: 4500 },
  { name: 'Ref-10', investment: 5000 },
  { name: 'Ref-11+', investment: 5500 },
];

// Daily ROI rates by investment
const getDailyROI = (investment) => {
  if (investment <= 900) return 0.01;      // Tier 1: 1%
  if (investment <= 5000) return 0.015;    // Tier 2: 1.5%
  return 0.02;                             // Tier 3+: 2%
};

// Calculate personal daily profit
const getPersonalProfit = (investment) => {
  return investment * getDailyROI(investment);
};

// Direct 5% commission
const DIRECT_COMMISSION_RATE = 0.05;

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

const formatCurrency = (num) => `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPercent = (num) => `${(num * 100).toFixed(2)}%`;

const getCommissionLevel = (directCount) => {
  return constants.getCurrentCommissionLevel(directCount);
};

const getLevelRate = (level) => {
  if (!level || level < 1 || level > 21) return 0;
  return constants.LEVEL_RATES[level - 1] / 100;
};

// ═════════════════════════════════════════════════════════════════════════════
// PROGRESSION TEST: 0 to 11+ REFERRALS
// ═════════════════════════════════════════════════════════════════════════════

console.log(`Root Investor: ${ali.name}`);
console.log(`Personal Investment: ${formatCurrency(ali.investment)}`);
console.log(`Daily ROI Rate: ${formatPercent(ali.dailyROI)}`);
console.log(`Personal Daily Profit: ${formatCurrency(getPersonalProfit(ali.investment))}`);
console.log(`\n${'─'.repeat(120)}\n`);

// Track progression
const progressionData = [];

// Start: 0 referrals
console.log('SCENARIO 0: Zero Referrals (Starting)');
console.log('─'.repeat(120));
console.log(`Direct Referrals: 0`);
console.log(`Commission Level: NONE (no network income)`);
console.log(`Daily Personal Profit: ${formatCurrency(getPersonalProfit(ali.investment))}`);
console.log(`Daily Commission Income: ${formatCurrency(0)}`);
console.log(`Daily Total Income: ${formatCurrency(getPersonalProfit(ali.investment))}`);
console.log(`\n${'─'.repeat(120)}\n`);

progressionData.push({
  referralCount: 0,
  level: null,
  levelRate: 0,
  directInvestment: 0,
  personalProfit: getPersonalProfit(ali.investment),
  directCommission: 0,
  levelCommission: 0,
  totalDaily: getPersonalProfit(ali.investment),
});

// Loop through 1 to 11+ referrals
for (let refCount = 1; refCount <= 11; refCount++) {
  console.log(`SCENARIO ${refCount}: ${refCount} Direct Referral${refCount > 1 ? 's' : ''}`);
  console.log('─'.repeat(120));

  // Get current referrals
  const currentReferrals = referrals.slice(0, refCount);
  const totalDirectInvestment = currentReferrals.reduce((sum, ref) => sum + ref.investment, 0);

  // Calculate commission level
  const currentLevel = getCommissionLevel(refCount);
  const levelRate = getLevelRate(currentLevel);
  
  // Calculate incomes
  const personalProfit = getPersonalProfit(ali.investment);
  const directCommission = totalDirectInvestment * DIRECT_COMMISSION_RATE;
  const levelCommission = totalDirectInvestment * levelRate;
  const totalDaily = personalProfit + directCommission + levelCommission;

  // Display
  console.log(`Direct Referrals: ${refCount}`);
  console.log(`Commission Level: L${currentLevel} (${formatPercent(levelRate)})`);
  console.log(`Formula: 21 - (${refCount} × 2 - 1) = ${currentLevel}`);
  console.log();

  console.log('Referrals Summary:');
  currentReferrals.forEach((ref, idx) => {
    console.log(`  ${(idx + 1).toString().padStart(2)} | ${ref.name.padEnd(10)} | Investment: ${formatCurrency(ref.investment).padStart(12)} | Daily ROI: ${formatPercent(getDailyROI(ref.investment)).padStart(8)} | Daily Profit: ${formatCurrency(getPersonalProfit(ref.investment)).padStart(12)}`);
  });
  console.log();

  console.log(`Total Direct Investment: ${formatCurrency(totalDirectInvestment)}`);
  console.log();

  console.log(`Income Breakdown:`);
  console.log(`  Personal Daily Profit (1.5%)    : ${formatCurrency(personalProfit).padStart(12)}`);
  console.log(`  Direct 5% Commission            : ${formatCurrency(directCommission).padStart(12)}`);
  console.log(`  Level L${currentLevel} Commission (${formatPercent(levelRate).padStart(5)}): ${formatCurrency(levelCommission).padStart(12)}`);
  console.log(`  ${'─'.repeat(52)}`);
  console.log(`  TOTAL DAILY INCOME              : ${formatCurrency(totalDaily).padStart(12)}`);
  console.log();

  // Projections
  console.log(`Projections:`);
  console.log(`  Daily  : ${formatCurrency(totalDaily)}`);
  console.log(`  Monthly: ${formatCurrency(totalDaily * 30)}`);
  console.log(`  Annual : ${formatCurrency(totalDaily * 365)}`);
  console.log();

  // Store data
  progressionData.push({
    referralCount: refCount,
    level: currentLevel,
    levelRate: levelRate,
    directInvestment: totalDirectInvestment,
    personalProfit,
    directCommission,
    levelCommission,
    totalDaily,
  });

  console.log(`${'─'.repeat(120)}\n`);
}

// ═════════════════════════════════════════════════════════════════════════════
// DETAILED LEVEL BREAKDOWN TABLE (21 → 1)
// ═════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('LEVEL-BY-LEVEL BREAKDOWN (L21 → L1)');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log(`${'Directs'.padEnd(8)} | ${'Level'.padEnd(5)} | ${'Rate'.padEnd(8)} | ${'Team Volume'.padEnd(12)} | ${'Personal'.padStart(12)} | ${'Direct 5%'.padStart(12)} | ${'Level Comm'.padStart(12)} | ${'Total Daily'.padStart(12)} | ${'Monthly'.padStart(12)}`);
console.log('─'.repeat(130));

progressionData.forEach((data) => {
  const directs = data.referralCount === 0 ? '—' : String(data.referralCount);
  const level = data.level === null ? '—' : `L${data.level}`;
  const rate = data.levelRate === 0 ? '—' : formatPercent(data.levelRate);
  
  console.log(
    `${directs.padEnd(8)} | ${level.padEnd(5)} | ${rate.padEnd(8)} | ${formatCurrency(data.directInvestment).padEnd(12)} | ` +
    `${formatCurrency(data.personalProfit).padStart(12)} | ` +
    `${formatCurrency(data.directCommission).padStart(12)} | ` +
    `${formatCurrency(data.levelCommission).padStart(12)} | ` +
    `${formatCurrency(data.totalDaily).padStart(12)} | ` +
    `${formatCurrency(data.totalDaily * 30).padStart(12)}`
  );
});

console.log();

// ═════════════════════════════════════════════════════════════════════════════
// COMMISSION LEVEL & RATE TABLE
// ═════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('COMMISSION LEVEL UNLOCK PROGRESSION');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log(`${'Directs'.padEnd(8)} | ${'Current Level'.padEnd(15)} | ${'Rate'.padEnd(8)} | ${'Unlocked Levels (Reverse Order: L21→L1)'.padEnd(60)}`);
console.log('─'.repeat(120));

for (let d = 0; d <= 11; d++) {
  const level = getCommissionLevel(d);
  const rate = level ? `${constants.LEVEL_RATES[level - 1]}%` : '—';
  const directs = d === 0 ? '0' : String(d);
  const levelStr = level ? `L${level}` : '—';
  
  let unlockedLevels = '—';
  if (level) {
    const unlockedCount = constants.getUnlockedLevelCount(d);
    const levelNumbers = constants.getUnlockedLevelNumbers(d);
    unlockedLevels = `${unlockedCount} levels: ${levelNumbers.join(', ')}`;
  }
  
  console.log(`${directs.padEnd(8)} | ${levelStr.padEnd(15)} | ${rate.padEnd(8)} | ${unlockedLevels}`);
}

console.log();

// ═════════════════════════════════════════════════════════════════════════════
// GROWTH COMPARISON
// ═════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('GROWTH ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('Daily Income Growth (0 → 11 referrals):\n');
const startIncome = progressionData[0].totalDaily;
const endIncome = progressionData[11].totalDaily;
const growthAmount = endIncome - startIncome;
const growthPercent = (growthAmount / startIncome) * 100;

console.log(`Starting Income (0 referrals):   ${formatCurrency(startIncome)}`);
console.log(`Ending Income (11 referrals):    ${formatCurrency(endIncome)}`);
console.log(`Growth Amount:                   ${formatCurrency(growthAmount)}`);
console.log(`Growth Percentage:               ${growthPercent.toFixed(2)}%`);
console.log(`Growth Factor:                   ${(endIncome / startIncome).toFixed(2)}x\n`);

// Milestone analysis
console.log('Key Milestones:\n');
const milestones = [1, 2, 5, 10, 11];
milestones.forEach((m) => {
  const data = progressionData[m];
  const increase = data.totalDaily - startIncome;
  const percent = (increase / startIncome) * 100;
  console.log(`${m} referral${m > 1 ? 's' : ''}:  Level L${data.level} (${constants.LEVEL_RATES[data.level - 1]}%) → Daily: ${formatCurrency(data.totalDaily)} (↑${percent.toFixed(1)}%)`);
});

console.log();

// ═════════════════════════════════════════════════════════════════════════════
// INCOME SOURCE BREAKDOWN BY STAGE
// ═════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('INCOME SOURCE CONTRIBUTION');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log(`${'Directs'.padEnd(8)} | ${'Personal%'.padEnd(12)} | ${'Direct 5%'.padEnd(12)} | ${'Level Comm%'.padEnd(12)}`);
console.log('─'.repeat(60));

progressionData.slice(1).forEach((data) => {
  const total = data.totalDaily;
  const personalPct = ((data.personalProfit / total) * 100).toFixed(2);
  const directPct = ((data.directCommission / total) * 100).toFixed(2);
  const levelPct = ((data.levelCommission / total) * 100).toFixed(2);
  
  console.log(
    `${data.referralCount.toString().padEnd(8)} | ` +
    `${personalPct.padEnd(12)}% | ` +
    `${directPct.padEnd(12)}% | ` +
    `${levelPct.padEnd(12)}%`
  );
});

console.log();

// ═════════════════════════════════════════════════════════════════════════════
// VERIFICATION
// ═════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('VERIFICATION CHECKS');
console.log('═══════════════════════════════════════════════════════════════════════\n');

let allPass = true;

// Check 1: Level progression is correct
console.log('✓ Level Progression Check:');
const expectedLevels = [null, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2, 1];
progressionData.forEach((data, idx) => {
  const expectedLevel = expectedLevels[idx];
  const actualLevel = data.level;
  const pass = expectedLevel === actualLevel;
  if (!pass) allPass = false;
  console.log(`  ${idx} refs: Expected L${expectedLevel || '?'}, Got L${actualLevel || '?'} ${pass ? '✓' : '✗'}`);
});

console.log();

// Check 2: Income always increases with more referrals
console.log('✓ Income Monotonic Increase Check:');
let monotonic = true;
for (let i = 1; i < progressionData.length; i++) {
  if (progressionData[i].totalDaily < progressionData[i - 1].totalDaily) {
    monotonic = false;
    console.log(`  ✗ Income decreased at ${i} refs`);
  }
}
if (monotonic) {
  console.log('  ✓ Income continuously increases with more referrals');
}
allPass = allPass && monotonic;

console.log();

// Check 3: 11+ referrals reaches L1
const finalData = progressionData[11];
if (finalData.level === 1) {
  console.log('✓ Level L1 Achievement: 11+ referrals reaches L1 (25%) ✓');
} else {
  console.log(`✗ Level L1 Achievement: Expected L1, got L${finalData.level} ✗`);
  allPass = false;
}

console.log();

// ═════════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════');
if (allPass) {
  console.log('✓ ALL VERIFICATION CHECKS PASSED');
} else {
  console.log('✗ SOME CHECKS FAILED');
}
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('Summary Statistics:\n');
console.log(`Starting Investment: ${formatCurrency(ali.investment)}`);
console.log(`Personal Daily Profit (constant): ${formatCurrency(getPersonalProfit(ali.investment))}`);
console.log(`\nProgression with Network Growth:`);
console.log(`  0 referrals:   Level=—,  Income=${formatCurrency(progressionData[0].totalDaily)}`);
console.log(`  1 referral:    Level=L20, Income=${formatCurrency(progressionData[1].totalDaily)}`);
console.log(`  5 referrals:   Level=L12, Income=${formatCurrency(progressionData[5].totalDaily)}`);
console.log(`  10 referrals:  Level=L2,  Income=${formatCurrency(progressionData[10].totalDaily)}`);
console.log(`  11 referrals:  Level=L1,  Income=${formatCurrency(progressionData[11].totalDaily)}`);
console.log(`\nIncome Multiplier: ${(progressionData[11].totalDaily / progressionData[0].totalDaily).toFixed(2)}x\n`);

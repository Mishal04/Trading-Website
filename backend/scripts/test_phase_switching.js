/**
 * Test script for phase-based rate switching
 * 
 * Tests:
 * 1. Investment created today (Phase 1) → should use Plan A rates (1%, 1%, 1%, 1.25%)
 * 2. Investment created 7 months ago (Phase 2) → should use Plan B rates (0.75%, 0.75%, 0.75%, 1%)
 * 3. Investment created 13 months ago (Phase 3) → should use monthly rate (8%) converted to daily
 */

const {
  getInvestmentPhase,
  getDailyRateForPhase,
  getMonthlyRatePhase3,
  INVESTOR_PHASE_1_MONTHS,
  INVESTOR_PHASE_2_MONTHS
} = require('../config/investorConstants');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('PHASE SWITCHING TEST');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Test 1: Investment created today (Phase 1)
console.log('TEST 1: Investment created TODAY (Phase 1)');
console.log('───────────────────────────────────────────');
const now = new Date();
const phase1CreatedAt = new Date(now);

const phase1 = getInvestmentPhase(phase1CreatedAt);
console.log(`✓ Created at: ${phase1CreatedAt.toISOString()}`);
console.log(`✓ Phase detected: ${phase1} (expected: 1)`);

const rates1 = [
  { pkg: 1, expected: 1.0 },
  { pkg: 2, expected: 1.0 },
  { pkg: 3, expected: 1.0 },
  { pkg: 4, expected: 1.25 }
];

console.log('\nPhase 1 rates (Plan A):');
for (const { pkg, expected } of rates1) {
  const rate = getDailyRateForPhase(pkg, phase1CreatedAt);
  const match = Math.abs(rate - expected) < 0.001 ? '✓' : '✗';
  console.log(`  ${match} Package ${pkg}: ${rate}% (expected: ${expected}%)`);
}

// Test 2: Investment created 7 months ago (Phase 2)
console.log('\n\nTEST 2: Investment created 7 MONTHS ago (Phase 2)');
console.log('───────────────────────────────────────────────');
const phase2CreatedAt = new Date(now);
phase2CreatedAt.setMonth(phase2CreatedAt.getMonth() - 7);

const phase2 = getInvestmentPhase(phase2CreatedAt);
console.log(`✓ Created at: ${phase2CreatedAt.toISOString()}`);
console.log(`✓ Phase detected: ${phase2} (expected: 2)`);

const rates2 = [
  { pkg: 1, expected: 0.75 },
  { pkg: 2, expected: 0.75 },
  { pkg: 3, expected: 0.75 },
  { pkg: 4, expected: 1.0 }
];

console.log('\nPhase 2 rates (Plan B):');
for (const { pkg, expected } of rates2) {
  const rate = getDailyRateForPhase(pkg, phase2CreatedAt);
  const match = Math.abs(rate - expected) < 0.001 ? '✓' : '✗';
  console.log(`  ${match} Package ${pkg}: ${rate}% (expected: ${expected}%)`);
}

// Test 3: Investment created 13 months ago (Phase 3)
console.log('\n\nTEST 3: Investment created 13 MONTHS ago (Phase 3)');
console.log('────────────────────────────────────────────────');
const phase3CreatedAt = new Date(now);
phase3CreatedAt.setMonth(phase3CreatedAt.getMonth() - 13);

const phase3 = getInvestmentPhase(phase3CreatedAt);
console.log(`✓ Created at: ${phase3CreatedAt.toISOString()}`);
console.log(`✓ Phase detected: ${phase3} (expected: 3)`);

// In Phase 3, daily rate is None (monthly rate is used instead)
console.log('\nPhase 3 rates (Monthly → Daily conversion):');
const monthlyRate = getMonthlyRatePhase3();
const dailyEquivalent = monthlyRate / 30.44;
console.log(`  ✓ Monthly rate: ${(monthlyRate * 100).toFixed(2)}%`);
console.log(`  ✓ Daily equivalent: ${(dailyEquivalent * 100).toFixed(4)}%`);

// Test phase boundary calculations
console.log('\n\n═══════════════════════════════════════════════════════════════════');
console.log('PHASE BOUNDARY VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════════\n');

console.log(`Phase 1 duration: 0-${INVESTOR_PHASE_1_MONTHS} months`);
console.log(`Phase 2 duration: ${INVESTOR_PHASE_1_MONTHS}-${INVESTOR_PHASE_1_MONTHS + INVESTOR_PHASE_2_MONTHS} months`);
console.log(`Phase 3 duration: ${INVESTOR_PHASE_1_MONTHS + INVESTOR_PHASE_2_MONTHS}+ months`);

// Test boundary cases
const testCases = [
  { months: 0, expectedPhase: 1, desc: 'Start of Phase 1' },
  { months: 5.9, expectedPhase: 1, desc: 'Near end of Phase 1' },
  { months: 6, expectedPhase: 2, desc: 'Start of Phase 2' },
  { months: 11.9, expectedPhase: 2, desc: 'Near end of Phase 2' },
  { months: 12, expectedPhase: 3, desc: 'Start of Phase 3' },
  { months: 24, expectedPhase: 3, desc: 'Far into Phase 3' }
];

console.log('\nBoundary test cases:');
for (const { months, expectedPhase, desc } of testCases) {
  const testDate = new Date(now);
  testDate.setMonth(testDate.getMonth() - months);
  const detectedPhase = getInvestmentPhase(testDate);
  const match = detectedPhase === expectedPhase ? '✓' : '✗';
  console.log(`  ${match} ${months}mo: Phase ${detectedPhase} (expected: ${expectedPhase}) - ${desc}`);
}

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('EXAMPLE EARNINGS CALCULATIONS');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Example: $5,000 investment in different phases
const investmentAmount = 5000;
const packageNumber = 2; // $5,000 is in Package 2

console.log(`Investment: $${investmentAmount} (Package ${packageNumber})\n`);

// Phase 1
const phase1Rate = getDailyRateForPhase(packageNumber, phase1CreatedAt);
const phase1DailyRoi = investmentAmount * (phase1Rate / 100);
console.log(`Phase 1 (0-6 months, Plan A, ${phase1Rate}%):`);
console.log(`  Daily ROI: $${phase1DailyRoi.toFixed(2)}`);
console.log(`  Monthly ROI: $${(phase1DailyRoi * 30.44).toFixed(2)}`);
console.log(`  6-month total: $${(phase1DailyRoi * 30.44 * 6).toFixed(2)}`);

// Phase 2
const phase2Rate = getDailyRateForPhase(packageNumber, phase2CreatedAt);
const phase2DailyRoi = investmentAmount * (phase2Rate / 100);
console.log(`\nPhase 2 (6-12 months, Plan B, ${phase2Rate}%):`);
console.log(`  Daily ROI: $${phase2DailyRoi.toFixed(2)}`);
console.log(`  Monthly ROI: $${(phase2DailyRoi * 30.44).toFixed(2)}`);
console.log(`  6-month total: $${(phase2DailyRoi * 30.44 * 6).toFixed(2)}`);

// Phase 3
const phase3MonthlyRate = getMonthlyRatePhase3();
const phase3DailyRate = phase3MonthlyRate / 30.44;
const phase3DailyRoi = investmentAmount * (phase3DailyRate / 100);
console.log(`\nPhase 3 (12+ months, Monthly ${(phase3MonthlyRate * 100).toFixed(1)}%, ${(phase3DailyRate * 100).toFixed(4)}% daily):`);
console.log(`  Daily ROI: $${phase3DailyRoi.toFixed(2)}`);
console.log(`  Monthly ROI: $${(phase3DailyRoi * 30.44).toFixed(2)}`);
console.log(`  Annual ROI (from Phase 3): $${(phase3DailyRoi * 30.44 * 12).toFixed(2)}`);

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('TEST COMPLETE');
console.log('═══════════════════════════════════════════════════════════════════\n');

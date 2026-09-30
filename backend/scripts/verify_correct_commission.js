/**
 * Verify Commission Logic - Using Standard Level Rates
 */

const constants = require('../config/constants');

console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║    COMMISSION MAPPING - USING STANDARD LEVEL RATES                    ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

const mapping = [
  { directs: 1, level: 20, formula: '22 - (1×2) = 20' },
  { directs: 2, level: 18, formula: '22 - (2×2) = 18' },
  { directs: 3, level: 16, formula: '22 - (3×2) = 16' },
  { directs: 4, level: 14, formula: '22 - (4×2) = 14' },
  { directs: 5, level: 12, formula: '22 - (5×2) = 12' },
  { directs: 6, level: 10, formula: '22 - (6×2) = 10' },
  { directs: 7, level: 8, formula: '22 - (7×2) = 8' },
  { directs: 8, level: 6, formula: '22 - (8×2) = 6' },
  { directs: 9, level: 4, formula: '22 - (9×2) = 4' },
  { directs: 10, level: 1, formula: '10+ directs = L1' }
];

console.log('Directs  Level  Formula              Rate  Description');
console.log('────────────────────────────────────────────────────────────────────────');

for (const item of mapping) {
  const rate = constants.LEVEL_RATES[item.level - 1];
  const rateStr = rate + '%';
  
  let description = '';
  if (item.level >= 11 && item.level <= 20) {
    description = '(Levels 11-20: 0.9%)';
  } else if (item.level >= 6 && item.level <= 10) {
    description = '(Levels 6-10: 2%)';
  } else if (item.level >= 4 && item.level <= 5) {
    description = '(Levels 4-5: 5%)';
  } else if (item.level === 3) {
    description = '(Level 3: 10%)';
  } else if (item.level === 2) {
    description = '(Level 2: 15%)';
  } else if (item.level === 1) {
    description = '(Level 1: 25%)';
  }
  
  console.log(`${String(item.directs).padEnd(8)} L${String(item.level).padEnd(4)} ${item.formula.padEnd(20)} ${String(rateStr).padEnd(4)} ${description}`);
}

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('EXAMPLE COMMISSIONS\n');

const examples = [
  { directs: 1, refROI: 10 },
  { directs: 6, refROI: 10 },
  { directs: 9, refROI: 10 },
  { directs: 10, refROI: 10 }
];

for (const ex of examples) {
  let level, rate;
  
  if (ex.directs >= 10) {
    level = 1;
  } else {
    level = 22 - (ex.directs * 2);
  }
  
  rate = constants.LEVEL_RATES[level - 1];
  const commission = (ex.refROI * rate) / 100;
  
  console.log(`${ex.directs} direct(s) → L${level} (${rate}%) of $${ex.refROI} ROI = $${commission.toFixed(2)}/day`);
}

console.log('\n════════════════════════════════════════════════════════════════════════════════\n');

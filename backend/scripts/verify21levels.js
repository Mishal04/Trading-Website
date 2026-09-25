// Verification script — 21-level commission system
const constants = require('../config/constants');
const RATES = constants.LEVEL_RATES;

const TARGET = [
  25, 15, 10, 5, 5,
  2, 2, 2, 2, 2,
  0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9,
  1
];

console.log('=== LEVEL_RATES VERIFICATION ===');
console.log('Entry count:', RATES.length, '(expected 21)');
const sum = RATES.reduce((a, b) => a + b, 0);
console.log('Sum:', sum.toFixed(4), '(expected 80.0000)');

let allMatch = true;
RATES.forEach((r, i) => {
  const ok = r === TARGET[i];
  if (!ok) allMatch = false;
  console.log('L' + (i+1) + ': ' + r + '%', ok ? 'OK' : 'MISMATCH expected ' + TARGET[i]);
});
console.log('All entries match target:', allMatch ? 'YES' : 'NO - FAILURES ABOVE');

console.log('\n=== LEVEL_UNLOCK_RULES ===');
const rules = constants.LEVEL_UNLOCK_RULES;
console.log('10 key =>', rules[10], '(expected 21)');

console.log('\n=== 21-LEVEL SIMULATION (base profit: $1000) ===');
const BASE = 1000;
let totalCommission = 0;
for (let i = 0; i < RATES.length; i++) {
  const ratePercent = RATES[i];
  const commission = Number(((BASE * ratePercent) / 100).toFixed(4));
  totalCommission += commission;
  console.log('L' + (i+1) + ' (' + ratePercent + '%): $' + commission);
}
console.log('\nTotal commission paid: $' + totalCommission.toFixed(4));
console.log('As % of base: ' + (totalCommission / BASE * 100).toFixed(4) + '% (expected 80.0000%)');
console.log('Loop exits after L21: RATES.length =', RATES.length, '-- no L22-L25 processed');
console.log('\nOverall:', allMatch && RATES.length === 21 && rules[10] === 21 ? 'ALL CHECKS PASSED' : 'FAILURES DETECTED');
process.exit(allMatch && RATES.length === 21 && rules[10] === 21 ? 0 : 1);

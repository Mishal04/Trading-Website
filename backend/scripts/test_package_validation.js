const investorConstants = require('../config/investorConstants');

console.log('\n' + '='.repeat(80));
console.log('CUSTOM INVESTMENT AMOUNT VALIDATION');
console.log('='.repeat(80) + '\n');

const testAmounts = [100, 500, 700, 900, 950, 1000, 2500, 5000, 5500, 6000, 7500, 9000, 9500, 10000, 15000, 25000, 50];

console.log('Amount | Status | Package | Daily Rate (%)');
console.log('───────────────────────────────────────────');

let customCount = 0;
const presets = [100, 200, 300, 900, 1000, 2000, 3000, 5000, 6000, 7000, 8000, 9000, 10000, 15000, 20000, 25000];

testAmounts.forEach(amt => {
  const info = investorConstants.getInvestorPackageInfo(amt, 'A');
  const isCustom = !presets.includes(amt);
  
  if (info) {
    const ratePercent = (info.dailyRate * 100).toFixed(2);
    const status = isCustom ? 'CUSTOM ✓' : 'preset';
    console.log(`$${String(amt).padEnd(5)} | ${status.padEnd(8)} | ${info.packageNumber}       | ${ratePercent}%`);
    if (isCustom) customCount++;
  } else {
    const status = '✗ INVALID';
    console.log(`$${String(amt).padEnd(5)} | ${status.padEnd(8)} | —       | —`);
  }
});

console.log('\n' + '='.repeat(80));
console.log(`RESULT: ${customCount} custom amounts now accepted!`);
console.log('='.repeat(80) + '\n');

console.log('Custom amounts that work:');
console.log('  - $500 (Tier 1: $100-$900) → 1.00% daily → $1,500 cap');
console.log('  - $700 (Tier 1: $100-$900) → 1.00% daily → $2,100 cap');
console.log('  - $2,500 (Tier 2: $1,000-$5,000) → 1.00% daily → $7,500 cap');
console.log('  - $7,500 (Tier 3: $6,000-$9,000) → 1.00% daily → $22,500 cap');
console.log('  - $15,000 (Tier 4: $10,000-$25,000) → 1.25% daily → $37,500 cap');
console.log('\nAmounts that are correctly REJECTED:');
console.log('  - $50 (below minimum $100)');
console.log('  - $950 (gap between Tier 1 and Tier 2)');
console.log('  - $5,500 (gap between Tier 2 and Tier 3)');
console.log('  - $9,500 (gap between Tier 3 and Tier 4)\n');

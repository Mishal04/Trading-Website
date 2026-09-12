/**
 * Investor Plan constants.
 * All rates are stored as decimals (e.g. 0.0075 = 0.75%).
 *
 * Package tiers:
 *  1 → $100, $200, $300, $900
 *  2 → $1000, $2000, $3000, $5000
 *  3 → $6000, $7000, $8000, $9000
 *  4 → $10,000+
 *
 * After 6 months → 8% per month regardless of plan/package.
 * Income cap → 3× invested amount.
 */

const INVESTOR_PACKAGES = {
  1: [100, 200, 300, 900],
  2: [1000, 2000, 3000, 5000],
  3: [6000, 7000, 8000, 9000],
  4: 'open'   // $10,000 and above (any amount ≥10000)
};

const INVESTOR_DAILY_RATES = {
  A: {
    1: 0.0075,  // 0.75%
    2: 0.009,   // 0.90%
    3: 0.01,    // 1.00%
    4: 0.0125   // 1.25%
  },
  B: {
    1: 0.005,   // 0.50%
    2: 0.0075,  // 0.75%
    3: 0.01,    // 1.00%
    4: 0.0125   // 1.25%
  }
};

const INVESTOR_MONTHLY_RATE = 0.08;   // 8% per month after 6 months
const INVESTOR_INCOME_CAP   = 3;      // 3× invested amount
const INVESTOR_SWITCH_MONTHS = 6;     // months before switching to monthly mode

/**
 * Given an amount and a plan ('A'|'B'), returns { packageNumber, dailyRate }.
 * Returns null if amount is below minimum ($100).
 */
function getInvestorPackageInfo(amount, plan) {
  if (!amount || amount < 100) return null;

  let packageNumber;
  if (amount >= 10000) {
    packageNumber = 4;
  } else if (amount >= 6000) {
    packageNumber = 3;
  } else if (amount >= 1000) {
    packageNumber = 2;
  } else if (amount >= 100) {
    // Package 1 only allows specific amounts
    const pkg1Amounts = INVESTOR_PACKAGES[1];
    if (!pkg1Amounts.includes(amount)) return null;
    packageNumber = 1;
  } else {
    return null;
  }

  const dailyRate = INVESTOR_DAILY_RATES[plan]?.[packageNumber];
  if (dailyRate === undefined) return null;

  return { packageNumber, dailyRate };
}

/**
 * Returns all valid investment amounts for display on the landing page.
 */
function getAllInvestorPackages() {
  return [
    { pkg: 1, amounts: [100, 200, 300, 900],
      rateA: '0.75% / day', rateB: '0.50% / day' },
    { pkg: 2, amounts: [1000, 2000, 3000, 5000],
      rateA: '0.90% / day', rateB: '0.75% / day' },
    { pkg: 3, amounts: [6000, 7000, 8000, 9000],
      rateA: '1.00% / day', rateB: '1.00% / day' },
    { pkg: 4, amounts: ['$10,000+'],
      rateA: '1.25% / day', rateB: '1.25% / day' }
  ];
}

module.exports = {
  INVESTOR_PACKAGES,
  INVESTOR_DAILY_RATES,
  INVESTOR_MONTHLY_RATE,
  INVESTOR_INCOME_CAP,
  INVESTOR_SWITCH_MONTHS,
  getInvestorPackageInfo,
  getAllInvestorPackages
};

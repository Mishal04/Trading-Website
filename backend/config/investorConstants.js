/**
 * Investor Plan constants.
 * All rates are stored as decimals (e.g. 0.0075 = 0.75%).
 *
 * ONE single rate table — no time-based switching, no tiers.
 * Every investor always gets the rate below based on Plan (A/B) + Package (1-4).
 *
 * Package tiers (strict discrete amounts — must exactly match):
 *  1 → $100, $200, $300, $900
 *  2 → $1000, $2000, $3000, $5000
 *  3 → $6000, $7000, $8000, $9000
 *  4 → $10,000, $15,000, $20,000, $25,000
 *
 * After 6 months → 8% per month regardless of plan/package.
 * Income cap → 3× invested amount.
 */

const INVESTOR_PACKAGES = {
  1: [100, 200, 300, 900],
  2: [1000, 2000, 3000, 5000],
  3: [6000, 7000, 8000, 9000],
  4: [10000, 15000, 20000, 25000]
};

const INVESTOR_DAILY_RATES = {
  A: {
    1: 0.0075,  // 0.75%
    2: 0.01,    // 1.00%
    3: 0.0125,  // 1.25%
    4: 0.015    // 1.50%
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
 * Returns package details: { packageNumber, dailyRate }.
 * Uses strict discrete-amount validation — amount must exactly match
 * one of the listed values in the package. No range-based checks.
 */
function getInvestorPackageInfo(amount, plan) {
  const num = Number(amount);
  if (!num || num < 100) return null;

  let packageNumber = null;

  // Strict discrete match — check every package for an exact match
  for (const [pkgNum, amounts] of Object.entries(INVESTOR_PACKAGES)) {
    if (amounts.includes(num)) {
      packageNumber = Number(pkgNum);
      break;
    }
  }

  if (!packageNumber) return null;

  const effectivePlan = plan === 'B' ? 'B' : 'A';
  const dailyRate = INVESTOR_DAILY_RATES[effectivePlan]?.[packageNumber];
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
      rateA: '1.00% / day', rateB: '0.75% / day' },
    { pkg: 3, amounts: [6000, 7000, 8000, 9000],
      rateA: '1.25% / day', rateB: '1.00% / day' },
    { pkg: 4, amounts: [10000, 15000, 20000, 25000],
      rateA: '1.50% / day', rateB: '1.25% / day' }
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

/**
 * Investor Plan constants & helper functions (Frontend)
 * Mirrors backend/config/investorConstants.js
 *
 * ONE single rate table — no time-based switching, no tiers.
 * Every investor always gets the rate below based on Plan (A/B) + Package (1-4).
 */

export const INVESTOR_PACKAGES = {
  1: [100, 200, 300, 900],
  2: [1000, 2000, 3000, 5000],
  3: [6000, 7000, 8000, 9000],
  4: [10000, 15000, 20000, 25000]
};

export const INVESTOR_DAILY_RATES = {
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

/**
 * Returns package details: { packageNumber, dailyRate }
 * Strict discrete-amount validation — amount must exactly match.
 */
export function getInvestorPackageInfo(amount, plan = 'A') {
  const num = Number(amount);
  if (!num || num < 100) return null;

  let packageNumber = null;

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

/**
 * Investor Plan constants & helper functions (Frontend)
 * Mirrors backend/config/investorConstants.js
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

export const INVESTOR_REDUCED_RATES = {
  A: {
    1: 0.006,   // 0.60%
    2: 0.008,   // 0.80%
    3: 0.01,    // 1.00%
    4: 0.012    // 1.20%
  },
  B: {
    1: 0.004,   // 0.40%
    2: 0.006,   // 0.60%
    3: 0.008,   // 0.80%
    4: 0.01     // 1.00%
  }
};

export const INVESTOR_PHASE_START = new Date('2026-10-01');
export const INVESTOR_PHASE_END   = new Date('2026-12-31');

/**
 * Returns 'standard' for dates on/before Dec 31, 2026; 'reduced' for Jan 1, 2027 onward.
 */
export function getInvestorRateTier(date = new Date()) {
  return date <= INVESTOR_PHASE_END ? 'standard' : 'reduced';
}

/**
 * Returns package details: { packageNumber, dailyRate, rateTier }
 */
export function getInvestorPackageInfo(amount, plan = 'A', rateTier = null) {
  const num = Number(amount);
  if (!num || num < 100) return null;

  let packageNumber;
  if (num >= 10000) {
    packageNumber = 4;
  } else if (num >= 6000) {
    packageNumber = 3;
  } else if (num >= 1000) {
    packageNumber = 2;
  } else if (num >= 100) {
    packageNumber = 1;
  } else {
    return null;
  }

  const effectivePlan = plan === 'B' ? 'B' : 'A';
  const tier = rateTier || getInvestorRateTier();
  const rates = tier === 'reduced' ? INVESTOR_REDUCED_RATES : INVESTOR_DAILY_RATES;
  const dailyRate = rates[effectivePlan]?.[packageNumber];
  if (dailyRate === undefined) return null;

  return { packageNumber, dailyRate, rateTier: tier };
}

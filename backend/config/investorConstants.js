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
  4: [10000, 15000, 20000, 25000]  // ASSUMPTION — client to confirm exact amounts
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

// ── Reduced rates (phased — applies to investments created Jan 1, 2027+) ──
// PLACEHOLDER — client has not confirmed final reduced rate.
// Currently set to standard rate minus 20%.
const INVESTOR_REDUCED_RATES = {
  A: {
    1: 0.006,   // 0.60% (PLACEHOLDER: standard 0.75% - 20%)
    2: 0.008,   // 0.80% (PLACEHOLDER: standard 1.00% - 20%)
    3: 0.01,    // 1.00% (PLACEHOLDER: standard 1.25% - 20%)
    4: 0.012    // 1.20% (PLACEHOLDER: standard 1.50% - 20%)
  },
  B: {
    1: 0.004,   // 0.40% (PLACEHOLDER: standard 0.50% - 20%)
    2: 0.006,   // 0.60% (PLACEHOLDER: standard 0.75% - 20%)
    3: 0.008,   // 0.80% (PLACEHOLDER: standard 1.00% - 20%)
    4: 0.01     // 1.00% (PLACEHOLDER: standard 1.25% - 20%)
  }
};

// Phase boundary — standard rate window: Oct 1 – Dec 31, 2026
const INVESTOR_PHASE_START = new Date('2026-10-01');
const INVESTOR_PHASE_END   = new Date('2026-12-31');

/**
 * Returns 'standard' for any date on or before INVESTOR_PHASE_END (Dec 31, 2026),
 * including dates before the phase start (pre-launch / testing period).
 * Returns 'reduced' only for dates after Dec 31, 2026 (Jan 1, 2027 onward).
 */
function getInvestorRateTier(date = new Date()) {
  return date <= INVESTOR_PHASE_END ? 'standard' : 'reduced';
}

/**
 * Updated getInvestorPackageInfo — now accepts an optional rateTier override.
 * Returns { packageNumber, dailyRate, rateTier }.
 */
function getInvestorPackageInfo(amount, plan, rateTier = null) {
  if (!amount || amount < 100) return null;

  let packageNumber;
  if (amount >= 10000) {
    packageNumber = 4;
  } else if (amount >= 6000) {
    packageNumber = 3;
  } else if (amount >= 1000) {
    packageNumber = 2;
  } else if (amount >= 100) {
    const pkg1Amounts = INVESTOR_PACKAGES[1];
    if (!pkg1Amounts.includes(amount)) return null;
    packageNumber = 1;
  } else {
    return null;
  }

  const tier = rateTier || getInvestorRateTier();
  const rates = tier === 'reduced' ? INVESTOR_REDUCED_RATES : INVESTOR_DAILY_RATES;
  const dailyRate = rates[plan]?.[packageNumber];
  if (dailyRate === undefined) return null;

  return { packageNumber, dailyRate, rateTier: tier };
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
    { pkg: 4, amounts: ['$10,000+'],
      rateA: '1.50% / day', rateB: '1.25% / day' }
  ];
}

module.exports = {
  INVESTOR_PACKAGES,
  INVESTOR_DAILY_RATES,
  INVESTOR_REDUCED_RATES,
  INVESTOR_PHASE_START,
  INVESTOR_PHASE_END,
  INVESTOR_MONTHLY_RATE,
  INVESTOR_INCOME_CAP,
  INVESTOR_SWITCH_MONTHS,
  getInvestorRateTier,
  getInvestorPackageInfo,
  getAllInvestorPackages
};

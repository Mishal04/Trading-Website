/**
 * Investor Plan constants with 3-phase ROI structure.
 * Rates stored as percentages: 1 = 1.00% daily, 0.75 = 0.75% daily, etc.
 *
 * 3-PHASE MODEL (time-based on investment age):
 *  Phase 1 (0-6 months): Plan A daily rates
 *  Phase 2 (6-12 months): Plan B daily rates
 *  Phase 3 (12+ months): 8-10% monthly (perpetual yield)
 *
 * Package tiers (strict discrete amounts — must exactly match):
 *  1 → $100, $200, $300, $900
 *  2 → $1000, $2000, $3000, $5000
 *  3 → $6000, $7000, $8000, $9000
 *  4 → $10,000, $15,000, $20,000, $25,000
 *
 * Income cap → 3× invested amount.
 */

const INVESTOR_PACKAGES = {
  1: [100, 200, 300, 900],
  2: [1000, 2000, 3000, 5000],
  3: [6000, 7000, 8000, 9000],
  4: [10000, 15000, 20000, 25000]
};

// Phase 1 (0-6 months): Plan A
const INVESTOR_DAILY_RATES_PHASE_1 = {
  1: 1,       // 1.00% per day
  2: 1,       // 1.00% per day
  3: 1,       // 1.00% per day
  4: 1.25     // 1.25% per day
};

// Phase 2 (6-12 months): Plan B
const INVESTOR_DAILY_RATES_PHASE_2 = {
  1: 0.75,    // 0.75% per day
  2: 0.75,    // 0.75% per day
  3: 0.75,    // 0.75% per day
  4: 1        // 1.00% per day
};

// Legacy structure (for backwards compatibility if needed)
const INVESTOR_DAILY_RATES = {
  A: INVESTOR_DAILY_RATES_PHASE_1,
  B: INVESTOR_DAILY_RATES_PHASE_2
};

const INVESTOR_MONTHLY_RATE_PHASE_3 = 0.08;   // 8% per month (Phase 3, 12+ months)
const INVESTOR_MONTHLY_RATE_MIN = 0.08;       // Minimum 8% per month
const INVESTOR_MONTHLY_RATE_MAX = 0.10;       // Maximum 10% per month (adjustable by admin)

const INVESTOR_INCOME_CAP   = 3;      // 3× invested amount
const INVESTOR_PHASE_1_MONTHS = 6;    // Months 0-6: Phase 1
const INVESTOR_PHASE_2_MONTHS = 6;    // Months 6-12: Phase 2
// Months 12+: Phase 3

/**
 * Determine which phase an investment is in based on its creation date.
 * @param {Date} createdAt - Investment creation date
 * @returns {number} Phase number: 1, 2, or 3
 */
function getInvestmentPhase(createdAt) {
  if (!createdAt) return 1; // Default to Phase 1

  const now = new Date();
  const ageInMs = now - new Date(createdAt);
  const ageInMonths = ageInMs / (1000 * 60 * 60 * 24 * 30.44); // Average days per month

  if (ageInMonths < INVESTOR_PHASE_1_MONTHS) {
    return 1;
  } else if (ageInMonths < INVESTOR_PHASE_1_MONTHS + INVESTOR_PHASE_2_MONTHS) {
    return 2;
  } else {
    return 3;
  }
}

/**
 * Get the correct daily rate for an investment based on its phase and package.
 * @param {number} packageNumber - Package tier (1-4)
 * @param {Date} createdAt - Investment creation date
 * @returns {number|null} Daily rate as percentage (e.g., 1.0 for 1.00%), or null if invalid
 */
function getDailyRateForPhase(packageNumber, createdAt) {
  const phase = getInvestmentPhase(createdAt);
  const pkg = Number(packageNumber);

  if (pkg < 1 || pkg > 4) return null;

  if (phase === 1) {
    return INVESTOR_DAILY_RATES_PHASE_1[pkg];
  } else if (phase === 2) {
    return INVESTOR_DAILY_RATES_PHASE_2[pkg];
  } else {
    // Phase 3: Return null (monthly logic handled separately)
    return null;
  }
}

/**
 * Get the monthly rate for Phase 3 (perpetual yield phase, 12+ months).
 * Currently returns the minimum rate; admin can adjust as needed.
 * @returns {number} Monthly rate as decimal (e.g., 0.08 for 8%)
 */
function getMonthlyRatePhase3() {
  return INVESTOR_MONTHLY_RATE_PHASE_3;
}

/**
 * Returns package details: { packageNumber, dailyRate }.
 * NOW PHASE-AWARE: dailyRate is for Phase 1 (initial investment creation).
 * During profit distribution, use getDailyRateForPhase() to get the current rate based on age.
 * 
 * Supports both discrete preset amounts AND any custom amount within a tier's range.
 * 
 * Tier ranges:
 *  Package 1: $100-$900
 *  Package 2: $1,000-$5,000
 *  Package 3: $6,000-$9,000
 *  Package 4: $10,000-$25,000
 */
function getInvestorPackageInfo(amount, plan) {
  const num = Number(amount);
  if (!num || num < 100) return null;

  let packageNumber = null;

  // First: Check if amount is a preset (discrete match)
  for (const [pkgNum, amounts] of Object.entries(INVESTOR_PACKAGES)) {
    if (amounts.includes(num)) {
      packageNumber = Number(pkgNum);
      break;
    }
  }

  // Second: If not a preset, check if it falls within any package's range
  if (!packageNumber) {
    const ranges = [
      { pkg: 1, min: 100, max: 900 },
      { pkg: 2, min: 1000, max: 5000 },
      { pkg: 3, min: 6000, max: 9000 },
      { pkg: 4, min: 10000, max: 25000 }
    ];

    for (const range of ranges) {
      if (num >= range.min && num <= range.max) {
        packageNumber = range.pkg;
        break;
      }
    }
  }

  if (!packageNumber) return null;

  // For investment creation, use Phase 1 rate (Plan A)
  const dailyRate = INVESTOR_DAILY_RATES_PHASE_1[packageNumber];
  if (dailyRate === undefined) return null;

  return { packageNumber, dailyRate };
}

/**
 * Returns all valid investment amounts for display on the landing page.
 */
function getAllInvestorPackages() {
  return [
    { pkg: 1, amounts: [100, 200, 300, 900],
      rateA: '1.00% / day', rateB: '0.75% / day' },
    { pkg: 2, amounts: [1000, 2000, 3000, 5000],
      rateA: '1.00% / day', rateB: '0.75% / day' },
    { pkg: 3, amounts: [6000, 7000, 8000, 9000],
      rateA: '1.00% / day', rateB: '0.75% / day' },
    { pkg: 4, amounts: [10000, 15000, 20000, 25000],
      rateA: '1.25% / day', rateB: '1.00% / day' }
  ];
}

module.exports = {
  INVESTOR_PACKAGES,
  INVESTOR_DAILY_RATES_PHASE_1,
  INVESTOR_DAILY_RATES_PHASE_2,
  INVESTOR_DAILY_RATES,
  INVESTOR_MONTHLY_RATE_PHASE_3,
  INVESTOR_MONTHLY_RATE_MIN,
  INVESTOR_MONTHLY_RATE_MAX,
  INVESTOR_INCOME_CAP,
  INVESTOR_PHASE_1_MONTHS,
  INVESTOR_PHASE_2_MONTHS,
  getInvestmentPhase,
  getDailyRateForPhase,
  getMonthlyRatePhase3,
  getInvestorPackageInfo,
  getAllInvestorPackages
};

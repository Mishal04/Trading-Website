// backend/config/constants.js
// New business constants for Group Trading Plan

module.exports = {
  // Activation packages (USD)
  PACKAGES: [100, 300, 500, 1000, 2000, 5000, 7000, 10000],

  // ROI periods and rates (daily percentages)
  ROI_PERIODS: [
    {
      name: 'Period A',
      start: new Date('2026-10-01'),
      end: new Date('2027-03-01'),
      rates: [
        { min: 100, max: 900, daily: 0.01 },
        { min: 1000, max: 5000, daily: 0.015 },
        { min: 7000, max: Infinity, daily: 0.02 }
      ]
    },
    {
      name: 'Period B',
      start: new Date('2027-04-01'),
      end: new Date('2027-09-01'),
      rates: [
        { min: 100, max: 1000, daily: 0.005 },
        { min: 2000, max: 5000, daily: 0.0075 },
        { min: 7000, max: Infinity, daily: 0.01 }
      ]
    },
    {
      name: 'Period C',
      start: new Date('2027-09-01'),
      end: null,
      rates: [
        { min: 0, max: Infinity, monthly: 0.08 }
      ]
    }
  ],

  // 21‑level income distribution (total 80.00%)
  LEVEL_RATES: [
    25,   // L1
    15,   // L2
    10,   // L3
    5,    // L4
    5,    // L5
    // L6–L10 (2% each)
    2, 2, 2, 2, 2,
    // L11–L20 (0.9% each)
    0.9, 0.9, 0.9, 0.9, 0.9,
    0.9, 0.9, 0.9, 0.9, 0.9,
    // L21
    1
  ],

  // Level unlocking based on direct referral count
  LEVEL_UNLOCK_RULES: {
    1: 2,
    2: 4,
    3: 6,
    4: 8,
    5: 10,
    6: 12,
    7: 14,
    8: 16,
    9: 18,
    10: 21
  },

  // Income caps (multiples of investment)
  INCOME_CAPS: {
    investor: 5,
    working_leader: 5
  },

  // Achievement reward tiers (Business Volume → Reward in USDT)
  ACHIEVEMENT_TIERS: [
    { name: 'Pioneer', bv: 1000, reward: 20 },
    { name: 'Builder', bv: 5000, reward: 100 },
    { name: 'Achiever', bv: 7500, reward: 140 },
    { name: 'Influencer', bv: 10000, reward: 200 },
    { name: 'Mentor', bv: 15000, reward: 300 },
    { name: 'Captain', bv: 20000, reward: 400 },
    { name: 'Champion', bv: 25000, reward: 500 },
    { name: 'Elite', bv: 35000, reward: 700 },
    { name: 'Visionary', bv: 45000, reward: 900 },
    { name: 'Innovator', bv: 50000, reward: 1000 },
    { name: 'Prestige', bv: 75000, reward: 1500 },
    { name: 'Titan', bv: 100000, reward: 2000 },
    { name: 'Legend', bv: 150000, reward: 3000 },
    { name: 'Bronze Elite', bv: 200000, reward: 4000 },
    { name: 'Silver Elite', bv: 250000, reward: 5000 },
    { name: 'Gold Elite', bv: 300000, reward: 6000 },
    { name: 'Platinum Elite', bv: 500000, reward: 10000 },
    { name: 'Ruby Elite', bv: 1000000, reward: 20000 },
    { name: 'Emerald Elite', bv: 2500000, reward: 50000 },
    { name: 'Sapphire Elite', bv: 5000000, reward: 100000 },
    { name: 'Diamond Elite', bv: 10000000, reward: 400000 },
    { name: 'Crown Elite', bv: 25000000, reward: 1000000 },
    { name: 'Global Leader', bv: 50000000, reward: 2000000 },
    { name: 'Legacy Founder', bv: 100000000, reward: 4000000 }
  ],

  // Withdrawal settings
  WITHDRAWAL: {
    minAmount: 20,
    networks: ['BEP20', 'TRC20']
  },

  // ── Regular User (Tier) discrete package amounts ───────────────────────────
  // 4 tiers mirroring the Investor Portal Package 1-4 structure.
  // ASSUMPTION: Package 4 amounts ($10k/$15k/$20k/$25k) — CLIENT MUST CONFIRM.
  USER_PACKAGES: {
    1: [100, 200, 300, 900],
    2: [1000, 2000, 3000, 5000],
    3: [6000, 7000, 8000, 9000],
    4: [10000, 15000, 20000, 25000]  // ASSUMPTION — client to confirm exact amounts
  },

  // ── Regular User flat daily rates ─────────────────────────────────────────
  // Flat rates per tier — permanent standard rates with no time-based switching.
  USER_DAILY_RATES: {
    standard: {
      1: 0.75,   // 0.75%
      2: 1.00,   // 1.00%
      3: 1.25,   // 1.25%
      4: 1.50    // 1.50%
    }
  },

  // ── Direct referral commission ────────────────────────────────────────────
  // Instant 5% commission credited to referrer on investment approval.
  // Separate from the 21-level daily profit commission system.
  DIRECT_REFERRAL_COMMISSION_RATE: 0.05
};

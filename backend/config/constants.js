// backend/config/constants.js
// New business constants for Group Trading Plan

module.exports = {
  // Activation packages (USD)
  PACKAGES: [100, 300, 500, 1000, 2000, 5000, 7000, 10000],

  // ROI periods and rates (daily percentages)
  ROI_PERIODS: [
    {
      name: 'Period A',
      start: new Date('2026-09-10'),
      end: new Date('2027-03-09'),
      rates: [
        { min: 100, max: 900, daily: 0.01 },
        { min: 1000, max: 5000, daily: 0.015 },
        { min: 7000, max: Infinity, daily: 0.02 }
      ]
    },
    {
      name: 'Period B',
      start: new Date('2027-03-10'),
      end: new Date('2027-09-09'),
      rates: [
        { min: 100, max: 1000, daily: 0.005 },
        { min: 2000, max: 5000, daily: 0.0075 },
        { min: 7000, max: Infinity, daily: 0.01 }
      ]
    },
    {
      name: 'Period C',
      start: new Date('2027-09-10'),
      end: null,
      rates: [
        { min: 0, max: Infinity, monthly: 0.08 }
      ]
    }
  ],

  // 21‑level income distribution (total 80%)
  LEVEL_RATES: [
    0.25, // L1
    0.15, // L2
    0.10, // L3
    0.05, // L4
    0.05, // L5
    // L6–L10
    0.02, 0.02, 0.02, 0.02, 0.02,
    // L11–L20
    0.009, 0.009, 0.009, 0.009, 0.009,
    0.009, 0.009, 0.009, 0.009, 0.009,
    // L21
    0.01
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
    minAmount: 10,
    networks: ['BEP20', 'TRC20']
  },

  // ── Direct referral commission ────────────────────────────────────────────
  // Instant 5% commission credited to referrer on investment approval.
  // Separate from the 21-level daily profit commission system.
  DIRECT_REFERRAL_COMMISSION_RATE: 0.05
};

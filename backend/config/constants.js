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
  // Index matches Level: LEVEL_RATES[1] = L1, LEVEL_RATES[10] = L10, etc.
  LEVEL_RATES: [
    0,    // Index 0 = Unused (no L0)
    25,   // Index 1 = L1
    15,   // Index 2 = L2
    10,   // Index 3 = L3
    5,    // Index 4 = L4
    5,    // Index 5 = L5
    // Index 6-10 = L6-L10 (2% each)
    2, 2, 2, 2, 2,
    // Index 11-20 = L11-L20 (0.9% each)
    0.9, 0.9, 0.9, 0.9, 0.9,
    0.9, 0.9, 0.9, 0.9, 0.9,
    // Index 21 = L21
    1
  ],

  // Level unlocking based on direct referral count
  // Levels unlock from L1 upward (direct commissions first, then deeper levels)
  LEVEL_UNLOCK_RULES: {
    1: 2,    // 1 direct: 2 levels (L1, L2)
    2: 4,    // 2 directs: 4 levels (L1-L4)
    3: 6,    // 3 directs: 6 levels (L1-L6)
    4: 8,    // 4 directs: 8 levels (L1-L8)
    5: 10,   // 5 directs: 10 levels (L1-L10)
    6: 12,   // 6 directs: 12 levels (L1-L12)
    7: 14,   // 7 directs: 14 levels (L1-L14)
    8: 16,   // 8 directs: 16 levels (L1-L16)
    9: 18,   // 9 directs: 18 levels (L1-L18)
    10: 21   // 10+ directs: all 21 levels (L1-L21)
  },

  // Income caps (multiples of investment)
  INCOME_CAPS: {
    investor: 3,
    working_leader: 3
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
  DIRECT_REFERRAL_COMMISSION_RATE: 0.05,

  // ── Helper functions for level unlock logic ──────────────────────────────
  // REVERSE UNLOCK ORDER: L21 → L20 → ... → L1
  // The client wants highest levels to unlock first.
  
  /**
   * Get the count of unlocked levels based on direct referral count.
   * Returns the NUMBER of levels unlocked (not which levels).
   * @param {number} directCount
   * @returns {number} Count of unlocked levels (0-21)
   */
  getUnlockedLevelCount(directCount) {
    if (directCount >= 10) return 21;
    const rules = this.LEVEL_UNLOCK_RULES;
    return rules[directCount] || 0;
  },

  /**
   * Check if a specific level is unlocked for a given direct count.
   * Uses forward unlock order: L1 unlocks first, then L2, L3, ... L21 last.
   * 
   * Example:
   *   directCount=0 → 1 level unlocked → L1 only
   *   directCount=1 → 2 levels unlocked → L1, L2 are unlocked
   *   directCount=2 → 4 levels unlocked → L1, L2, L3, L4 are unlocked
   *   directCount=8 → 16 levels unlocked → L1-L16 are unlocked
   *   directCount=10 → 21 levels unlocked → all L1-L21 are unlocked
   * 
   * @param {number} level - Network level (1-21)
   * @param {number} directCount - Number of direct referrals
   * @returns {boolean} True if level is unlocked
   */
  isLevelUnlocked(level, directCount) {
    if (level < 1 || level > 21) return false;
    
    // With 0 directs, users can still earn L1 commissions
    if (!directCount || directCount <= 0) {
      return level === 1;  // Only L1 unlocked for users with 0 directs
    }
    
    const unlockedCount = this.getUnlockedLevelCount(directCount);
    if (unlockedCount <= 0) return false;
    
    // Unlock from L1 upward: L1 is level 1, L2 is level 2, etc.
    // For a level to be unlocked, it must be <= unlockedCount
    return level <= unlockedCount;
  },

  /**
   * Get array of actual level numbers that are unlocked for a given direct count.
   * Returns in order: [L1, L2, L3, ...] up to the highest unlocked level.
   * 
   * Example:
   *   directCount=1 → [1, 2]
   *   directCount=2 → [1, 2, 3, 4]
   *   directCount=8 → [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
   *   directCount=10 → [1, 2, 3, ..., 20, 21]
   * 
   * @param {number} directCount
   * @returns {number[]} Array of unlocked level numbers in ascending order
   */
  getUnlockedLevelNumbers(directCount) {
    const count = this.getUnlockedLevelCount(directCount);
    if (count <= 0) return [];
    // Return levels from 1 up to count
    // Example: count=2 → [1, 2]
    // Example: count=4 → [1, 2, 3, 4]
    return Array.from({ length: count }, (_, index) => index + 1);
  },

  /**
   * Get the HIGHEST level unlocked (maximum earning potential) for a user.
   * 
   * With levels unlocking from L1 → L21, this returns the "frontier" level reached.
   * It's used for display purposes (e.g., "Your current level is L10").
   * 
   * For commissions, use getUnlockedLevelNumbers() instead to get ALL unlocked levels.
   * 
   * Examples:
   *   directCount=1 → L2 (can earn from L1, L2)
   *   directCount=2 → L4 (can earn from L1, L2, L3, L4)
   *   directCount=8 → L16 (can earn from L1, L2, ..., L16)
   *   directCount=10 → L21 (can earn from all L1-L21)
   * 
   * Formula: highestLevel = unlockedCount
   * 
   * @param {number} directCount
   * @returns {number|null} Highest unlocked level (1-21) or null if no directs
   */
  getCurrentCommissionLevel(directCount) {
    if (!directCount || directCount <= 0) {
      return null;  // No levels unlocked
    }
    
    const unlockedCount = this.getUnlockedLevelCount(directCount);
    if (unlockedCount <= 0) return null;
    
    // Highest level = unlockedCount
    // Example: unlockedCount=2 → L2 (L1, L2)
    // Example: unlockedCount=4 → L4 (L1, L2, L3, L4)
    return unlockedCount;
  }

};

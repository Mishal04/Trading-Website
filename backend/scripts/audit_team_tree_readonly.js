/**
 * audit_team_tree_readonly.js
 * 
 * READ-ONLY audit script to verify team tree consistency and compute live team investment totals.
 * 
 * Purpose:
 *   1. For every user, compute downline count using ancestorPath vs. referredBy recursion (up to 21 levels)
 *   2. Print users where the two counts differ
 *   3. For the 20 users with the largest teams, print:
 *      - Live team investment (sum of active investments from downline users, from both Investment and InvestorInvestment)
 *      - Stored teamBusiness.total counter
 * 
 * Uses only find() and aggregate() — NO write operations (insert, update, delete, save, create, or findByIdAndUpdate)
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Investment = require('../src/models/Investment');
const InvestorInvestment = require('../src/models/InvestorInvestment');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

/**
 * Recursively count downline users by walking referredBy tree up to maxLevel
 * @param {ObjectId} userId - The root user ID
 * @param {number} maxLevel - Maximum depth (default 21)
 * @returns {Promise<number>} - Total count of downline users
 */
async function countDownlineByReferredBy(userId, maxLevel = 21) {
  if (maxLevel <= 0) return 0;

  // Find all direct referrals
  const directReferrals = await User.find({ referredBy: userId }).select('_id').lean();
  
  if (directReferrals.length === 0) {
    return 0;
  }

  let count = directReferrals.length;

  // Recursively count downline for each direct
  for (const direct of directReferrals) {
    count += await countDownlineByReferredBy(direct._id, maxLevel - 1);
  }

  return count;
}

/**
 * Count downline users by checking who has userId in their ancestorPath array
 * @param {ObjectId} userId - The root user ID
 * @returns {Promise<number>} - Total count
 */
async function countDownlineByAncestorPath(userId) {
  const count = await User.countDocuments({
    ancestorPath: userId
  });
  return count;
}

/**
 * Compute live team investment by summing active investments of all downline users
 * Uses both Investment and InvestorInvestment models
 * @param {ObjectId} userId - The root user ID
 * @returns {Promise<{investmentTotal: number, investmentCount: number}>}
 */
async function computeLiveTeamInvestment(userId) {
  // Get all downline user IDs (using ancestorPath, with fallback to referredBy)
  const downlineUsers = await User.find({
    ancestorPath: userId
  }).select('_id').lean();

  const downlineIds = downlineUsers.map(u => u._id);

  if (downlineIds.length === 0) {
    return { investmentTotal: 0, investmentCount: 0 };
  }

  // Sum active investments from Investment model
  const investmentAgg = await Investment.aggregate([
    {
      $match: {
        userId: { $in: downlineIds },
        status: 'active',
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Sum active investments from InvestorInvestment model
  const investorInvestmentAgg = await InvestorInvestment.aggregate([
    {
      $match: {
        userId: { $in: downlineIds },
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const investmentData = investmentAgg.length > 0 ? investmentAgg[0] : { totalAmount: 0, count: 0 };
  const investorData = investorInvestmentAgg.length > 0 ? investorInvestmentAgg[0] : { totalAmount: 0, count: 0 };

  const investmentTotal = Number((investmentData.totalAmount + investorData.totalAmount).toFixed(2));
  const investmentCount = investmentData.count + investorData.count;

  return { investmentTotal, investmentCount };
}

/**
 * Main audit function
 */
async function auditTeamTree() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('📊 AUDIT: Team Tree Consistency\n');
    console.log('=' .repeat(100));

    // ─── SECTION 1: Find users with mismatched downline counts ───────────────
    console.log('\n📋 SECTION 1: Users with mismatched downline counts (ancestorPath vs. referredBy)\n');

    const allUsers = await User.find().select('_id name email referredBy ancestorPath teamBusiness').lean();
    const mismatchedUsers = [];

    console.log(`Checking ${allUsers.length} users...`);

    for (const user of allUsers) {
      const byAncestorPath = await countDownlineByAncestorPath(user._id);
      const byReferredBy = await countDownlineByReferredBy(user._id);

      if (byAncestorPath !== byReferredBy) {
        mismatchedUsers.push({
          userId: user._id,
          name: user.name,
          email: user.email,
          byAncestorPath,
          byReferredBy,
          difference: Math.abs(byAncestorPath - byReferredBy)
        });
      }
    }

    if (mismatchedUsers.length === 0) {
      console.log('✅ No mismatches found — all users have consistent downline counts.\n');
    } else {
      console.log(`⚠️  Found ${mismatchedUsers.length} users with mismatches:\n`);
      mismatchedUsers.forEach(u => {
        console.log(`  👤 ${u.name} (${u.email})`);
        console.log(`     ancestorPath count: ${u.byAncestorPath}, referredBy count: ${u.byReferredBy}, diff: ${u.difference}`);
      });
      console.log();
    }

    // ─── SECTION 2: Top 20 users by team size and their investment totals ─────
    console.log('\n' + '='.repeat(100));
    console.log('\n📊 SECTION 2: Top 20 users by team size (with live vs. stored investment totals)\n');

    // Get all users sorted by downline count (ancestorPath-based)
    const usersWithCounts = [];

    for (const user of allUsers) {
      const count = await countDownlineByAncestorPath(user._id);
      if (count > 0) {
        usersWithCounts.push({
          userId: user._id,
          name: user.name,
          email: user.email,
          downlineCount: count,
          storedTeamBusinessTotal: (user.teamBusiness && user.teamBusiness.total) || 0
        });
      }
    }

    // Sort by downline count descending
    usersWithCounts.sort((a, b) => b.downlineCount - a.downlineCount);

    // Take top 20
    const top20 = usersWithCounts.slice(0, 20);

    console.log(`Top 20 users (by downline count):\n`);

    for (let i = 0; i < top20.length; i++) {
      const user = top20[i];
      const { investmentTotal, investmentCount } = await computeLiveTeamInvestment(user.userId);

      console.log(`${String(i + 1).padStart(2, ' ')}. ${user.name} (${user.email})`);
      console.log(`    Downline Count: ${user.downlineCount}`);
      console.log(`    Live Team Investment: $${Number(investmentTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${investmentCount} active investments)`);
      console.log(`    Stored teamBusiness.total: $${Number(user.storedTeamBusinessTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      const difference = investmentTotal - user.storedTeamBusinessTotal;
      if (Math.abs(difference) > 0.01) {
        console.log(`    ⚠️  MISMATCH: Live ${investmentTotal > user.storedTeamBusinessTotal ? '+' : '-'}$${Math.abs(difference).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} vs stored`);
      }
      console.log();
    }

    console.log('=' .repeat(100));
    console.log('\n✅ Audit complete\n');

  } catch (err) {
    console.error('❌ Audit error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the audit
auditTeamTree().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

const express = require('express');
const router = express.Router();
const {
  getTeamBusiness,
  getDownline,
  getTeamStats
} = require('../controllers/teamController');
const { protect } = require('../middleware/auth');

router.use(protect); // Protect all team routes

router.get('/business', getTeamBusiness);
router.get('/downline', getDownline);
router.get('/stats', getTeamStats);

/**
 * GET /api/team/debug
 * Temporary diagnostic endpoint — shows raw referredBy + ancestorPath data
 * for the logged-in user's referrals. Remove after confirming data is correct.
 */
router.get('/debug', async (req, res) => {
  const User = require('../models/User');
  const userId = req.user._id;

  // Who this user referred
  const directByReferredBy = await User.find({ referredBy: userId })
    .select('name email referralCode referredBy ancestorPath totalInvestment isActive')
    .lean();

  // Who has this user in their ancestorPath
  const byAncestorPath = await User.find({ ancestorPath: userId })
    .select('name email referralCode referredBy ancestorPath totalInvestment isActive')
    .lean();

  // Current user's own data
  const me = await User.findById(userId)
    .select('name email referralCode referredBy ancestorPath totalInvestment isActive')
    .lean();

  return res.json({
    success: true,
    data: {
      me: {
        _id:          me._id,
        name:         me.name,
        referralCode: me.referralCode,
        referredBy:   me.referredBy,
        ancestorPath: me.ancestorPath,
      },
      directReferralsByReferredBy: directByReferredBy.map(u => ({
        _id:          u._id,
        name:         u.name,
        email:        u.email,
        referredBy:   u.referredBy,
        ancestorPath: u.ancestorPath,
        totalInvestment: u.totalInvestment,
        isActive:     u.isActive,
      })),
      deepDownlineByAncestorPath: byAncestorPath.map(u => ({
        _id:          u._id,
        name:         u.name,
        email:        u.email,
        referredBy:   u.referredBy,
        ancestorPath: u.ancestorPath,
      })),
      summary: {
        directByReferredBy_count: directByReferredBy.length,
        deepByAncestorPath_count: byAncestorPath.length,
      }
    }
  });
});

module.exports = router;

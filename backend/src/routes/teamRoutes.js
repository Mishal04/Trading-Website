const express = require('express');
const router = express.Router();
const {
  getTeamBusiness,
  getDownline,
  getTeamStats
} = require('../controllers/teamController');
const { protect, networkerAccess } = require('../middleware/auth');

router.use(protect); // Protect all team routes

router.get('/business', networkerAccess, getTeamBusiness);
router.get('/downline', networkerAccess, getDownline);
router.get('/stats', networkerAccess, getTeamStats);

module.exports = router;

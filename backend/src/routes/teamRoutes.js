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

module.exports = router;

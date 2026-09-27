const express = require('express');
const router = express.Router();
const {
  getMyCommissions,
  getCommissionsByLevel,
  getCommissionSummary
} = require('../controllers/commissionController');
const { protect } = require('../middleware/auth');

router.use(protect); // Protect all commission routes

router.get('/my', getMyCommissions);
router.get('/summary', getCommissionSummary);
router.get('/level/:level', getCommissionsByLevel);

module.exports = router;

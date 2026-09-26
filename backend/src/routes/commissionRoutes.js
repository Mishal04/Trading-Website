const express = require('express');
const router = express.Router();
const {
  getMyCommissions,
  getCommissionsByLevel,
  getCommissionSummary
} = require('../controllers/commissionController');
const { protect, networkerAccess } = require('../middleware/auth');

router.use(protect); // Protect all commission routes

router.get('/my', networkerAccess, getMyCommissions);
router.get('/summary', networkerAccess, getCommissionSummary);
router.get('/level/:level', networkerAccess, getCommissionsByLevel);

module.exports = router;

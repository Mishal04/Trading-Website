const express = require('express');
const router = express.Router();
const { getDashboardStats, getUserTransactions } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/transactions', getUserTransactions);

module.exports = router;

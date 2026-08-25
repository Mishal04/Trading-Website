const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllUsers,
  getAllInvestments,
  injectRealizedProfit,
  updateWithdrawalStatus,
  manualCommissionAdjustment,
  getSystemStats
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

const validateProfitInject = [
  body('amount')
    .isNumeric().withMessage('Amount must be a valid number')
    .custom(val => val > 0).withMessage('Amount must be greater than 0')
];

router.use(protect); // Must be authenticated
router.use(admin);   // Must have admin role

router.get('/users', getAllUsers);
router.get('/investments', getAllInvestments);
router.post('/profit/inject', validateProfitInject, injectRealizedProfit);
router.put('/withdrawals/:id', updateWithdrawalStatus);
router.post('/commission/adjust', manualCommissionAdjustment);
router.get('/stats', getSystemStats);

module.exports = router;

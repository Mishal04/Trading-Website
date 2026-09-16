const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  requestWithdrawal,
  getWithdrawalHistory,
  getWithdrawalById
} = require('../controllers/withdrawalController');
const { protect } = require('../middleware/auth');

const validateWithdrawalRequest = [
  body('amount')
    .isNumeric().withMessage('Amount must be a number')
    .custom(val => Number(val) >= 20).withMessage('Minimum withdrawal amount is $20')
    .custom(val => Number(val) <= 500000).withMessage('Maximum withdrawal amount is $500,000'),
  body('type')
    .isIn(['capital', 'profit', 'commission']).withMessage('Type must be capital, profit, or commission'),
  body('walletAddress')
    .optional()
    .isString().withMessage('Wallet address must be a string')
    .trim()
    .isLength({ max: 200 }).withMessage('Wallet address must be 200 characters or less'),
  body('network')
    .exists().withMessage('Network is required')
    .isIn(['BEP20', 'TRC20']).withMessage('Network must be BEP20 or TRC20')
];

router.use(protect); // Protect all withdrawal routes

router.post('/request', validateWithdrawalRequest, requestWithdrawal);
router.get('/history', getWithdrawalHistory);
router.get('/:id', getWithdrawalById);

module.exports = router;

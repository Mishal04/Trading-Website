const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createInvestment,
  getMyInvestments,
  getInvestmentById,
  withdrawInvestment
} = require('../controllers/investmentController');
const { protect } = require('../middleware/auth');

const validateCreateInvestment = [
  body('amount')
    .isNumeric().withMessage('Amount must be a number')
    .custom(value => value >= 100).withMessage('Minimum investment amount is $100')
    .custom(value => value <= 1000000).withMessage('Maximum investment amount is $1,000,000'),
  // Transaction ID is required — admin needs it to verify the payment
  body('transactionId')
    .notEmpty().withMessage('Transaction ID / Reference Number is required')
    .isString().withMessage('Transaction ID must be a string')
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Transaction ID must be between 3 and 100 characters'),
  // Payment proof URL or text note — optional but recommended
  body('paymentProof')
    .optional({ checkFalsy: true })
    .isString().withMessage('Payment proof must be a string')
    .trim()
    .isLength({ max: 500 }).withMessage('Payment proof must be 500 characters or less'),
  // Optional note from user to admin
  body('paymentNote')
    .optional({ checkFalsy: true })
    .isString().withMessage('Note must be a string')
    .trim()
    .isLength({ max: 300 }).withMessage('Note must be 300 characters or less'),
];

router.use(protect); // Protect all investment routes

router.post('/create', validateCreateInvestment, createInvestment);
router.get('/my', getMyInvestments);
router.post('/withdraw', withdrawInvestment);
router.get('/:id', getInvestmentById);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { transferFunds, listTransfers } = require('../controllers/walletController');

// Validation for transfer
const validateTransfer = [
  body('to').exists().withMessage('Recipient identifier is required').isString().trim().isLength({ min: 1, max: 200 }),
  body('amount')
    .isNumeric().withMessage('Amount must be a number')
    .custom(val => Number(val) > 0).withMessage('Amount must be greater than 0'),
  body('note').optional().isString().trim().isLength({ max: 200 }).withMessage('Note must be 200 chars or less')
];

router.use(protect);
router.post('/transfer', validateTransfer, transferFunds);
router.get('/transfers', listTransfers);

module.exports = router;

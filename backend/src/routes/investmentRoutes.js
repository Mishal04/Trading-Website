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
];

router.use(protect); // Protect all investment routes

router.post('/create', validateCreateInvestment, createInvestment);
router.get('/my', getMyInvestments);
router.post('/withdraw', withdrawInvestment);
router.get('/:id', getInvestmentById);

module.exports = router;

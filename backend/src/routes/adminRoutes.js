const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const {
  getSystemStats,
  getSystemPools,
  getAllUsers,
  toggleUserActive,
  getAllInvestments,
  approveInvestment,
  rejectInvestment,
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  completeWithdrawal,
  updateWithdrawalStatus,
  injectRealizedProfit,
  manualCommissionAdjustment
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(protect);
router.use(admin);

// ── Stats & Pools ────────────────────────────────────────────────────────────
router.get('/stats',  getSystemStats);
router.get('/pools',  getSystemPools);

// ── Users ────────────────────────────────────────────────────────────────────
router.get('/users',               getAllUsers);
router.patch('/users/:id/toggle',  toggleUserActive);

// ── Investments ──────────────────────────────────────────────────────────────
router.get('/investments',                  getAllInvestments);
router.patch('/investments/:id/approve',    approveInvestment);
router.patch('/investments/:id/reject',     rejectInvestment);

// ── Withdrawals ──────────────────────────────────────────────────────────────
router.get('/withdrawals',                  getAllWithdrawals);
router.patch('/withdrawals/:id/approve',    approveWithdrawal);
router.patch('/withdrawals/:id/reject',     rejectWithdrawal);
router.patch('/withdrawals/:id/complete',   completeWithdrawal);
// Legacy single-action route (kept for backward compat)
router.put('/withdrawals/:id',              updateWithdrawalStatus);

// ── Profit Injection ─────────────────────────────────────────────────────────
const validateProfitInject = [
  body('amount')
    .isNumeric().withMessage('Amount must be a valid number')
    .custom(val => Number(val) > 0).withMessage('Amount must be greater than 0')
];
router.post('/profit/inject', validateProfitInject, injectRealizedProfit);

// ── Manual Wallet Adjustment ─────────────────────────────────────────────────
router.post('/commission/adjust', manualCommissionAdjustment);

module.exports = router;

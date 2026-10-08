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
  approvePlanInvestment,
  rejectInvestment,
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  completeWithdrawal,
  updateWithdrawalStatus,
  injectRealizedProfit,
  manualCommissionAdjustment,
  creditRoi,
  updateUserRole,
  checkAchievements,
  claimAchievements,
  toggleNetworkerAccess,
  updateUserPlan,
  creditUserRoi,
  updateUser,
  getUserTransactions,
  adminDepositToUser,
  adminWithdrawFromUser,
  generateImpersonationToken,
  getImpersonationLogs,
  getUserPaymentInfo,
  getUserUplineDownline,
  getAllWallets,
  getCurrentWallet,
  createWallet,
  setCurrentWallet,
  updateWallet,
  deleteWallet,
  getAdminSettings,
  updateAdminSettings
} = require('../controllers/adminController');

// Validation for ROI credit
const validateRoiCredit = [
  body('userId').isMongoId().withMessage('Valid userId required'),
  body('investmentId').isMongoId().withMessage('Valid investmentId required'),
  body('amount').isNumeric().withMessage('Amount must be a number').custom(v => Number(v) > 0).withMessage('Amount must be > 0')
];
// ── Public / Client Accessible Endpoints (Deposit Wallet & Bank Details) ───────
router.get('/wallets/current', getCurrentWallet);        // Active crypto deposit wallet
router.get('/settings',        getAdminSettings);        // Admin bank details & general settings

const { protect, admin } = require('../middleware/auth');

// All subsequent admin routes require authentication + admin role
router.use(protect);
router.use(admin);

// ── Stats & Pools ────────────────────────────────────────────────────────────
router.get('/stats',  getSystemStats);
router.get('/pools',  getSystemPools);

// ── Users ────────────────────────────────────────────────────────────────────
router.get('/users',                           getAllUsers);
router.patch('/users/:id/toggle',              toggleUserActive);
router.patch('/users/:id',                     updateUser);                   // NEW: Update user profile (name, email, phone, bank details)
router.patch('/users/:id/role',                updateUserRole);
router.patch('/users/:id/networker-access',    toggleNetworkerAccess);
router.patch('/users/:id/plan',                updateUserPlan);
router.get('/users/:id/transactions',          getUserTransactions);         // NEW: Get user transaction history
router.get('/users/:id/payment-info',          getUserPaymentInfo);           // NEW: Get user payment info (wallet, TXN ID, bank details)
router.get('/users/:id/upline-downline',       getUserUplineDownline);        // NEW: Get user's upline and downline
router.post('/users/:id/credit-roi',           creditUserRoi);  // NEW: Credit ROI to user's Plan A/B investment
router.post('/users/:id/deposit',              adminDepositToUser);  // NEW: Admin deposit to user wallet
router.post('/users/:id/withdraw',             adminWithdrawFromUser);  // NEW: Admin withdraw from user wallet
router.post('/users/:id/impersonate',          generateImpersonationToken);  // NEW: Admin login as user

// ── Impersonation Logs ───────────────────────────────────────────────────────
router.get('/impersonation-logs',              getImpersonationLogs);  // NEW: View all impersonation sessions

// ── Achievements ─────────────────────────────────────────────────────────────
router.post('/achievements/check/:userId', checkAchievements);
router.post('/achievements/claim', claimAchievements);

// ── Investments ──────────────────────────────────────────────────────────────
router.get('/investments',                     getAllInvestments);
router.patch('/investments/plan/:id/approve',  approvePlanInvestment);  // NEW: Approve Plan A/B investment (must come before /investments/:id/approve)
router.patch('/investments/:id/approve',       approveInvestment);
router.patch('/investments/:id/reject',        rejectInvestment);

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
router.post('/roi/credit', validateRoiCredit, creditRoi);

// ── Manual Wallet Adjustment ─────────────────────────────────────────────────
const validateWalletAdjust = [
  body('userId')
    .notEmpty().withMessage('userId is required')
    .isMongoId().withMessage('Invalid userId format'),
  body('amount')
    .isNumeric().withMessage('Amount must be a number')
    .custom(val => val !== 0).withMessage('Amount cannot be zero'),
  body('walletType')
    .isIn(['capital', 'profit', 'commission']).withMessage('walletType must be capital, profit, or commission'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 }).withMessage('Description must be 200 characters or less'),
];
router.post('/commission/adjust', validateWalletAdjust, manualCommissionAdjustment);

// ── System Wallets (Admin Management) ──────────────────────────────────────────
router.get('/wallets',                    getAllWallets);           // Get all wallets (admin only)
router.post('/wallets',                   createWallet);            // Create new wallet
router.put('/wallets/set-current',        setCurrentWallet);        // Set wallet as current
router.put('/wallets/:walletId',          updateWallet);            // Update wallet details
router.delete('/wallets/:walletId',       deleteWallet);            // Archive wallet

// ── Admin Settings (Admin Management) ──────────────────────────────────────────
router.put('/settings',                   updateAdminSettings);     // Update admin settings (admin only)

module.exports = router;

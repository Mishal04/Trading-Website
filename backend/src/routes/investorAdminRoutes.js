const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  getAllInvestors,
  updateInvestorPlan,
  toggleInvestorActive,
  getInvestorInvestments,
  getAllInvestorInvestments,
  approveInvestorInvestment,
  rejectInvestorInvestment,
  creditInvestorRoi
} = require('../controllers/investorAdminController');

// All routes require admin access
router.use(protect);
router.use(admin);

// ── Investor list & plan management ──────────────────────────────────────────
router.get('/',                         getAllInvestors);
router.patch('/:id/plan',               updateInvestorPlan);
router.patch('/:id/toggle',             toggleInvestorActive);

// ── Per-investor investments & ROI ────────────────────────────────────────────
router.get('/:id/investments',          getInvestorInvestments);
router.post('/:id/credit-roi',          creditInvestorRoi);

// ── All investments (admin overview) ─────────────────────────────────────────
router.get('/investments/all',              getAllInvestorInvestments);
router.patch('/investments/:id/approve',    approveInvestorInvestment);
router.patch('/investments/:id/reject',     rejectInvestorInvestment);

module.exports = router;

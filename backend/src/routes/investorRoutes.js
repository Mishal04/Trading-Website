const express = require('express');
const router = express.Router();
const { protectInvestor } = require('../middleware/investorAuth');
const {
  registerInvestor,
  loginInvestor,
  getInvestorMe,
  createInvestorInvestment,
  getMyInvestments,
  getInvestorDashboard,
  withdrawPrincipal,
  withdrawRoi
} = require('../controllers/investorController');

// ── Public auth ──────────────────────────────────────────────────────────────
router.post('/auth/register', registerInvestor);
router.post('/auth/login',    loginInvestor);

// ── Protected investor routes ────────────────────────────────────────────────
router.use(protectInvestor);

router.get('/auth/me',   getInvestorMe);
router.get('/dashboard', getInvestorDashboard);

// Investments
router.post('/investments/create',             createInvestorInvestment);
router.get('/investments/my',                  getMyInvestments);
router.post('/investments/withdraw-principal', withdrawPrincipal);
router.post('/investments/withdraw-roi',       withdrawRoi);

module.exports = router;

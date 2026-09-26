import axios from 'axios';

// In production, fallback to '/api' (same-origin reverse proxy) if VITE_API_URL is omitted.
// Localhost is strictly used as a fallback in local development mode.
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Investor API instance (uses separate localStorage key) ────────────────────
const investorApiInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

investorApiInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('investor_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

investorApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('investor_token');
      localStorage.removeItem('investor_user');
      if (!window.location.pathname.startsWith('/investor')) {
        window.location.href = '/investor/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyEmail: (token) => api.get(`/auth/verify/${token}`),
  me: () => api.get('/auth/me'),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
};

// Investment endpoints
export const investmentAPI = {
  // Old endpoint (tier system)
  create: (payload) => api.post('/investments/create', payload),
  // Phase 2 endpoint (plan system A/B)
  plan: (payload) => api.post('/investments/plan', payload),
  getMy:  (params)  => api.get('/investments/my', { params }),
  getById: (id)     => api.get(`/investments/${id}`),
  withdraw: (investmentId) => api.post('/investments/withdraw', { investmentId }),
};

// Withdrawal endpoints
export const withdrawalAPI = {
  request: (data) => api.post('/withdrawals/request', data),
  getHistory: (params) => api.get('/withdrawals/history', { params }),
  getById: (id) => api.get(`/withdrawals/${id}`),
};

// Team endpoints
export const teamAPI = {
  getBusiness: () => api.get('/team/business'),
  getDownline: (params) => api.get('/team/downline', { params }),
  getStats: () => api.get('/team/stats'),
};

// Commission endpoints
export const commissionAPI = {
  getMy: (params) => api.get('/commissions/my', { params }),
  getSummary: () => api.get('/commissions/summary'),
  getByLevel: (level, params) => api.get(`/commissions/level/${level}`, { params }),
};

// Dashboard endpoints
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Wallet / P2P endpoints
export const walletAPI = {
  transfer: (data) => api.post('/wallet/transfer', data),
  getTransfers: (params) => api.get('/wallet/transfers', { params }),
};

// Admin endpoints
export const adminAPI = {
  // Stats & Pools
  getStats:  ()       => api.get('/admin/stats'),
  getPools:  ()       => api.get('/admin/pools'),

  // Users
  getUsers:       (params) => api.get('/admin/users', { params }),
  toggleUser:     (id)     => api.patch(`/admin/users/${id}/toggle`),
  updateUserRole: (id, data) => api.patch(`/admin/users/${id}/role`, data),
  toggleNetworkerAccess: (id, grant) => api.patch(`/admin/users/${id}/networker-access`, { grant }),

  // Investments
  getInvestments:     (params) => api.get('/admin/investments', { params }),
  approveInvestment:  (id)     => api.patch(`/admin/investments/${id}/approve`),
  rejectInvestment:   (id, adminNote) =>
    api.patch(`/admin/investments/${id}/reject`, { adminNote }),

  // Withdrawals
  getWithdrawals:     (params) => api.get('/admin/withdrawals', { params }),
  approveWithdrawal:  (id, adminNote) =>
    api.patch(`/admin/withdrawals/${id}/approve`, { adminNote }),
  rejectWithdrawal:   (id, adminNote) =>
    api.patch(`/admin/withdrawals/${id}/reject`,  { adminNote }),
  completeWithdrawal: (id, adminNote) =>
    api.patch(`/admin/withdrawals/${id}/complete`, { adminNote }),

  // Profit injection & ROI credit
  injectProfit: (amount, note) =>
    api.post('/admin/profit/inject', { amount, note }),
  creditRoi: (data) =>
    api.post('/admin/roi/credit', data),

  // Achievements
  checkAchievements: (userId) =>
    api.post(`/admin/achievements/check/${userId}`),
  claimAchievements: (data) =>
    api.post('/admin/achievements/claim', data),

  // Manual wallet adjustment
  adjustWallet: (data) => api.post('/admin/commission/adjust', data),

  // ── Investor admin endpoints ──────────────────────────────────────────────
  getInvestors:      (params) => api.get('/admin/investors', { params }),
  updateInvestorPlan:(id, plan) => api.patch(`/admin/investors/${id}/plan`, { plan }),
  toggleInvestor:    (id)     => api.patch(`/admin/investors/${id}/toggle`),
  getInvestorInvestments: (id) => api.get(`/admin/investors/${id}/investments`),
  getAllInvestorInvestments: (params) => api.get('/admin/investors/investments/all', { params }),
  approveInvestorInvestment: (id) => api.patch(`/admin/investors/investments/${id}/approve`),
  rejectInvestorInvestment:  (id, adminNote) => api.patch(`/admin/investors/investments/${id}/reject`, { adminNote }),
  creditInvestorRoi: (investorId, data) => api.post(`/admin/investors/${investorId}/credit-roi`, data),
};

export { investorApiInstance };

// Investor (self) endpoints
export const investorAPI = {
  register:  (data) => investorApiInstance.post('/investors/auth/register', data),
  login:     (data) => investorApiInstance.post('/investors/auth/login', data),
  me:        ()     => investorApiInstance.get('/investors/auth/me'),
  dashboard: ()     => investorApiInstance.get('/investors/dashboard'),
  createInvestment: (data) => investorApiInstance.post('/investors/investments/create', data),
  getMyInvestments: ()     => investorApiInstance.get('/investors/investments/my'),
  withdrawPrincipal:(data) => investorApiInstance.post('/investors/investments/withdraw-principal', data),
  withdrawRoi:      (data) => investorApiInstance.post('/investors/investments/withdraw-roi', data),
};

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  create: (amount) => api.post('/investments/create', { amount }),
  getMy: (params) => api.get('/investments/my', { params }),
  getById: (id) => api.get(`/investments/${id}`),
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

// Admin endpoints
export const adminAPI = {
  // Stats & Pools
  getStats:  ()       => api.get('/admin/stats'),
  getPools:  ()       => api.get('/admin/pools'),

  // Users
  getUsers:       (params) => api.get('/admin/users', { params }),
  toggleUser:     (id)     => api.patch(`/admin/users/${id}/toggle`),

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

  // Profit injection
  injectProfit: (amount, note) =>
    api.post('/admin/profit/inject', { amount, note }),

  // Manual wallet adjustment
  adjustWallet: (data) => api.post('/admin/commission/adjust', data),
};

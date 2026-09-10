const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/database');

const authRoutes          = require('./routes/authRoutes');
const investmentRoutes    = require('./routes/investmentRoutes');
const commissionRoutes    = require('./routes/commissionRoutes');
const withdrawalRoutes    = require('./routes/withdrawalRoutes');
const teamRoutes          = require('./routes/teamRoutes');
const walletRoutes        = require('./routes/walletRoutes');
const adminRoutes         = require('./routes/adminRoutes');
const dashboardRoutes     = require('./routes/dashboardRoutes');
const investorRoutes      = require('./routes/investorRoutes');
const investorAdminRoutes = require('./routes/investorAdminRoutes');
const initCronJobs        = require('./config/cronJobs');

const app = express();

// ── Trust Proxy (Required when deployed behind Railway, Render, Nginx, Cloudflare) ──
app.set('trust proxy', 1);

// ── Trusted origins ───────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

// Parse CLIENT_URL from process.env (supports single URL or comma-separated list)
const envClientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/+$/, ''))
  : [];

const allowedOrigins = [
  'https://solvextrade.com',
  'https://www.solvextrade.com',
  ...envClientUrls,
  // Keep localhost only for development
  ...(!isProduction ? [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ] : [])
].filter(Boolean);

// Deduplicate origins
const uniqueAllowedOrigins = Array.from(new Set(allowedOrigins));

// ── Security headers (Helmet) ─────────────────────────────────────────────────
app.use(
  helmet({
    // Content-Security-Policy — tight whitelist
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'"],
        styleSrc:       ["'self'", "'unsafe-inline'"],   // inline styles needed by Vite
        imgSrc:         ["'self'", 'data:', 'https:'],
        connectSrc:     ["'self'", ...uniqueAllowedOrigins],
        fontSrc:        ["'self'", 'https:', 'data:'],
        objectSrc:      ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    // HTTP Strict Transport Security — 1 year in production
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy:  { policy: 'strict-origin-when-cross-origin' },
    frameguard:      { action: 'deny' },
    noSniff:         true,
    xssFilter:       true,
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
// Only allow listed origins — no wildcard fallback.
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin requests (no Origin header) and listed origins only
      if (!origin || uniqueAllowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin '${origin}' not allowed`), false);
    },
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Rate limiters ─────────────────────────────────────────────────────────────
// Strict limiter for auth endpoints that are brute-force targets
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,   // 15 minutes
  max:              20,                // 20 attempts per window
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { success: false, message: 'Too many requests, please try again in 15 minutes.' },
});

// Very tight limiter for password-reset — avoids enumeration timing attacks
const passwordLimiter = rateLimit({
  windowMs:         60 * 60 * 1000,   // 1 hour
  max:              5,
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { success: false, message: 'Too many password reset attempts, please try again in 1 hour.' },
});

// General API limiter — prevents DoS across all other endpoints
const generalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

app.use('/api/auth/login',            authLimiter);
app.use('/api/auth/register',         authLimiter);
app.use('/api/auth/forgot-password',  passwordLimiter);
app.use('/api/auth/reset-password',   passwordLimiter);
app.use('/api',                       generalLimiter);

// ── Body parsing — explicit size limit to prevent payload flooding ─────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── NoSQL injection sanitization ──────────────────────────────────────────────
// express-mongo-sanitize v2.2.0 does `req.query = target` which throws in
// Express 5 because req.query is a read-only getter. We replace it with a
// custom middleware that:
//   • sanitizes req.body and req.params normally (they are writable)
//   • sanitizes req.query by mutating the object in-place (no reassignment)
const { sanitize: mongoSanitizeValue } = mongoSanitize;

app.use((req, res, next) => {
  // Sanitize body and params — safe to reassign in Express 5
  if (req.body)   req.body   = mongoSanitizeValue(req.body,   { replaceWith: '_' });
  if (req.params) req.params = mongoSanitizeValue(req.params, { replaceWith: '_' });

  // Sanitize query by mutating keys in-place — never reassign req.query
  if (req.query && typeof req.query === 'object') {
    const PROHIBITED = /^\$|\./;
    const REPLACE    = /^\$|\./g;
    const sanitizeObj = (obj) => {
      Object.keys(obj).forEach((key) => {
        if (PROHIBITED.test(key)) {
          const val = obj[key];
          delete obj[key];
          const safeKey = key.replace(REPLACE, '_');
          if (safeKey !== '__proto__' && safeKey !== 'constructor' && safeKey !== 'prototype') {
            obj[safeKey] = val;
          }
        } else if (obj[key] && typeof obj[key] === 'object') {
          sanitizeObj(obj[key]);
        }
      });
    };
    sanitizeObj(req.query);
  }

  next();
});

// ── HTTP Parameter Pollution protection ───────────────────────────────────────
// NOTE: hpp 0.2.3 is incompatible with Express 5 (req.query is read-only).
// Express 5's query parser already returns arrays for duplicate params, so
// hpp is not needed — duplicate params are handled at the route/controller level.

// ── Compression & logging ─────────────────────────────────────────────────────
app.use(compression());
// Only log in development — avoid leaking request details in production logs
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── API routes ────────────────────────────────────────────────────────────────
const { getUserTransactions } = require('./controllers/dashboardController');
const { protect } = require('./middleware/auth');

app.use('/api/auth',              authRoutes);
app.use('/api/investments',       investmentRoutes);
app.use('/api/commissions',       commissionRoutes);
app.use('/api/withdrawals',       withdrawalRoutes);
app.use('/api/team',              teamRoutes);
app.use('/api/wallet',            walletRoutes);
app.use('/api/admin',             adminRoutes);
app.use('/api/dashboard',         dashboardRoutes);
app.use('/api/transactions',      protect, getUserTransactions);
// ── Investor system (completely separate) ────────────────────────────────────
app.use('/api/investors',         investorRoutes);
app.use('/api/admin/investors',   investorAdminRoutes);

// Health check — no sensitive info exposed
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: Date.now() });
});

// Serve frontend static build files if dist folder exists
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  console.log('Serving frontend static files from:', frontendDistPath);
  app.use(express.static(frontendDistPath));

  // Express 5 compatible SPA fallback
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Trading Platform API', 
      version: '1.0.0',
      status: 'active'
    });
  });
}

// 404 handler for unmatched API routes
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: 'API route not found'
    });
  }
  res.status(404).send('Page not found');
});

// Global Error Handler — no internal stack traces leaked to client in production
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err.stack);
  } else {
    console.error('Error:', err.message);
  }
  const statusCode = err.status || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal Server Error'
      : (err.message || 'Internal Server Error'),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  initCronJobs();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`API URL: http://localhost:${PORT}/api`);
  });
};

startServer();

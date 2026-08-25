const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') }); // Explicit path to backend/.env
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const connectDB = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const commissionRoutes = require('./routes/commissionRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const teamRoutes = require('./routes/teamRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const initCronJobs = require('./config/cronJobs');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { getUserTransactions } = require('./controllers/dashboardController');
const { protect } = require('./middleware/auth');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/transactions', protect, getUserTransactions);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
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

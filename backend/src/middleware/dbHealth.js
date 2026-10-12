const mongoose = require('mongoose');

/**
 * Middleware to check MongoDB connection status before processing auth requests.
 * Prevents cascading failures when database is temporarily unavailable.
 */
const checkDBHealth = (req, res, next) => {
  // Check MongoDB connection state
  if (mongoose.connection.readyState !== 1) {
    console.warn(`[DB HEALTH] Request received but database not connected. State: ${mongoose.connection.readyState}`);
    
    return res.status(503).json({
      success: false,
      message: 'Server is temporarily unavailable. Please try again in a few moments.',
      code: 'SERVICE_UNAVAILABLE'
    });
  }
  
  next();
};

/**
 * Get current database connection status.
 * States: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 */
const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

module.exports = { checkDBHealth, getDBStatus };

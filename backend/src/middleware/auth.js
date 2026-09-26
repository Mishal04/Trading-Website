const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      if (!req.user.isActive) {
        return res.status(401).json({ 
          success: false,
          message: 'Account is deactivated' 
        });
      }
      
      return next(); // Bug fix #4: return so we don't fall through to the !token check below
    } catch (error) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, token failed' 
      });
    }
  }
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized, no token' 
    });
  }
};

const admin = async (req, res, next) => {
  if (req.user && req.user.accountType === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      success: false,
      message: 'Access denied. Admin privileges required' 
    });
  }
};

const verified = async (req, res, next) => {
  if (req.user && req.user.isVerified) {
    next();
  } else {
    res.status(403).json({ 
      success: false,
      message: 'Please verify your email first' 
    });
  }
};

/**
 * hasNetworkerAccess — helper (not middleware).
 *
 * Returns true if the user has been explicitly granted Networker section access
 * by an admin. NEVER checks investment status, directCount, or any other field.
 *
 * Usage (future route guards, Phase 3):
 *   const { hasNetworkerAccess } = require('../middleware/auth');
 *   if (!hasNetworkerAccess(req.user)) return res.status(403).json(...)
 *
 * The 21-level commission engine (commissionService.distributeLevelCommissions)
 * must NEVER call or import this helper — commission accrues regardless of
 * Networker access status.
 *
 * @param {object} user - A populated User document or plain user object
 * @returns {boolean}
 */
const hasNetworkerAccess = (user) => {
  return Boolean(user && user.networkerAccessGranted === true);
};

/**
 * networkerAccess — middleware.
 * 
 * Checks if the current user has been granted Networker section access by admin.
 * Returns 403 if access is not granted.
 * 
 * Usage: router.get('/my', networkerAccess, getMyCommissions);
 */
const networkerAccess = (req, res, next) => {
  if (!hasNetworkerAccess(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Networker section is locked. Contact admin to unlock.'
    });
  }
  next();
};

module.exports = { protect, admin, verified, hasNetworkerAccess, networkerAccess };

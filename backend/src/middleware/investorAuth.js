const jwt = require('jsonwebtoken');
const Investor = require('../models/Investor');

/**
 * Middleware: authenticate an investor via JWT.
 * Tokens for investors carry { id, type: 'investor' }.
 */
const protectInvestor = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Ensure token was issued for an investor
      if (decoded.type !== 'investor') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized as investor'
        });
      }

      req.investor = await Investor.findById(decoded.id).select('-password');

      if (!req.investor) {
        return res.status(401).json({ success: false, message: 'Investor not found' });
      }
      if (!req.investor.isActive) {
        return res.status(401).json({ success: false, message: 'Investor account is deactivated' });
      }

      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

module.exports = { protectInvestor };

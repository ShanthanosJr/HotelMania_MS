const jwt = require('jsonwebtoken');
const User = require('../models/User');

const STAFF_ROLES = ['admin', 'receptionist', 'housekeeping'];

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, v: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// Middleware to protect routes
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // Tokens issued before the last password change / logout are rejected
    if ((decoded.v || 0) !== (req.user.tokenVersion || 0)) {
      return res.status(401).json({ message: 'Session expired, please log in again' });
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Not authorized, invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

// Restrict a route to the given roles
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user found' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

const admin = authorize('admin');
const staff = authorize(...STAFF_ROLES);
const isStaff = (user) => !!user && STAFF_ROLES.includes(user.role);

module.exports = { protect, authorize, admin, staff, isStaff, signToken, STAFF_ROLES };

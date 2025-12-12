const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const RefreshToken = require('../models/RefreshToken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  try {
    // Get token from header, cookie, or session
    let token = null;
    
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Check cookie
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // Check session
    if (!token && req.session && req.session.token) {
      token = req.session.token;
    }
    
    // If no token found, try to use session user as fallback
    if (!token && req.session && req.session.users) {
      req.user = req.session.users;
      return next();
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error during token verification'
    });
  }
};

// Optional token verification (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  try {
    // Get token from various sources
    let token = null;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (!token && req.session && req.session.token) {
      token = req.session.token;
    }
    
    // If no token, continue without user
    if (!token) {
      req.user = null;
      return next();
    }
    
    // Verify token if present
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    // If token is invalid, continue without user
    req.user = null;
    next();
  }
};

// Check if user is authenticated (for routes that require login)
const isAuthenticated = (req, res, next) => {
  try {
    // Check session first (most common in this app)
    if (req.session && req.session.users) {
      req.user = req.session.users;
      return next();
    }
    
    // Then check for JWT token
    let token = null;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (!token && req.session && req.session.token) {
      token = req.session.token;
    }
    
    if (!token) {
      // For web routes, redirect to login
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      } else {
        return res.redirect('/auth/login-page');
      }
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Authentication check error:', error);
    
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    } else {
      return res.redirect('/auth/login-page');
    }
  }
};

// Check if user is business user
const isBusiness = (req, res, next) => {
  try {
    // Check session business
    if (req.session && req.session.business) {
      req.user = req.session.business;
      req.user.isBusiness = true;
      return next();
    }
    
    // Check JWT token with business role
    let token = null;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (!token && req.session && req.session.token) {
      token = req.session.token;
    }
    
    if (!token) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required'
        });
      } else {
        return res.redirect('/business/login-page');
      }
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET);
    
    if (decoded.role !== 'business' && !decoded.isBusiness) {
      return res.status(403).json({
        success: false,
        message: 'Business access required'
      });
    }
    
    req.user = decoded;
    req.user.isBusiness = true;
    
    next();
  } catch (error) {
    console.error('Business authentication error:', error);
    
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({
        success: false,
        message: 'Business authentication required'
      });
    } else {
      return res.redirect('/business/login-page');
    }
  }
};

// Generate JWT tokens
const generateToken = async (user, userAgent = '', ipAddress = '') => {
  const isBiz = user instanceof mongoose.model('Business');
  const tokenData = {
    id: user._id,
    email: user.email,
    type: 'access',
    role: isBiz ? 'business' : (user.role || 'user'),
    ...(isBiz ? { 
      companyName: user.companyName,
      businessId: user._id 
    } : { username: user.username })
  };

  const accessToken = jwt.sign(
    tokenData,
    process.env.JWT_SECRET || process.env.SESSION_SECRET,
    { expiresIn: isBiz ? '8h' : '24h' }
  );

  const refreshToken = await RefreshToken.createToken(
    { ...user.toObject(), userType: isBiz ? 'business' : 'user' }, 
    userAgent, 
    ipAddress
  );

  return { accessToken, refreshToken };
};

// Set tokens in cookie and session
const setToken = async (req, res, { accessToken, refreshToken }) => {
  // Set access token in cookie
  if (accessToken) {
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
      sameSite: 'strict'
    });
    
    // Set in session
    if (req.session) {
      req.session.accessToken = accessToken;
    }
  }
  
  // Set refresh token in httpOnly cookie if it's a new token
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  }
};

module.exports = {
  verifyToken,
  optionalAuth,
  isAuthenticated,
  isBusiness,
  generateToken,
  setToken
};

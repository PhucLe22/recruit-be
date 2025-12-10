// Middleware to check if user is logged in
const isLogin = (req, res, next) => {
  try {
    // Check for regular user session
    if (req.session && req.session.users) {
      req.user = req.session.users;
      req.isLogin = true;
      req.userType = 'user';
      return next();
    }

    // Check for business user session
    if (req.session && req.session.business) {
      req.user = req.session.business;
      req.isLogin = true;
      req.userType = 'business';
      return next();
    }

    // Check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET);
        
        req.user = decoded;
        req.isLogin = true;
        req.userType = decoded.isBusiness ? 'business' : 'user';
        return next();
      } catch (tokenError) {
        // Token is invalid, continue without user
        console.warn('Invalid JWT token:', tokenError.message);
      }
    }

    // Check for JWT token in cookies
    if (req.cookies && req.cookies.token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET || process.env.SESSION_SECRET);
        
        req.user = decoded;
        req.isLogin = true;
        req.userType = decoded.isBusiness ? 'business' : 'user';
        return next();
      } catch (tokenError) {
        // Token is invalid, continue without user
        console.warn('Invalid cookie token:', tokenError.message);
      }
    }

    // No user found, continue as guest
    req.user = null;
    req.isLogin = false;
    req.userType = null;
    
    next();
  } catch (error) {
    console.error('Error in isLogin middleware:', error);
    req.user = null;
    req.isLogin = false;
    req.userType = null;
    next();
  }
};

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  if (!req.isLogin || !req.user) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    } else {
      // Redirect to login page based on user type preference
      const loginPath = req.userType === 'business' ? '/business/login-page' : '/auth/loginRIX';
      return res.redirect(loginPath);
    }
  }
  
  next();
};

// Middleware to require business authentication
const requireBusinessAuth = (req, res, next) => {
  if (!req.isLogin || !req.user || req.userType !== 'business') {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({
        success: false,
        message: 'Business authentication required'
      });
    } else {
      return res.redirect('/business/login-page');
    }
  }
  
  next();
};

// Middleware to require user authentication (not business)
const requireUserAuth = (req, res, next) => {
  if (!req.isLogin || !req.user || req.userType !== 'user') {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    } else {
      return res.redirect('/auth/login-page');
    }
  }
  
  next();
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.isLogin || !req.user) {
    return res.redirect('/auth/login-page');
  }
  
  // Check if user has admin role
  if (req.user.role !== 'admin' && !req.user.isAdmin) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    } else {
      return res.redirect('/auth/login-page');
    }
  }
  
  next();
};

// Middleware to make user data available in templates
const makeUserDataAvailable = (req, res, next) => {
  // Add user data to res.locals for templates
  res.locals.user = req.user;
  res.locals.isLogin = req.isLogin;
  res.locals.userType = req.userType;
  
  // Add user data to response object for controllers
  res.user = req.user;
  res.isLogin = req.isLogin;
  res.userType = req.userType;
  
  next();
};

// Helper function to get current user info
const getCurrentUser = (req) => {
  return req.user || null;
};

// Helper function to check if current user is the owner of a resource
const isResourceOwner = (req, resourceUserId) => {
  if (!req.user || !req.isLogin) return false;
  
  return req.user._id.toString() === resourceUserId.toString();
};

// Helper function to check if current user can edit a resource
const canEditResource = (req, resourceUserId, resourceBusinessId = null) => {
  if (!req.user || !req.isLogin) return false;
  
  // User can edit their own resources
  if (req.userType === 'user' && req.user._id.toString() === resourceUserId.toString()) {
    return true;
  }
  
  // Business can edit their own resources
  if (req.userType === 'business' && resourceBusinessId && 
      req.user._id.toString() === resourceBusinessId.toString()) {
    return true;
  }
  
  // Admin can edit everything
  if (req.user.role === 'admin' || req.user.isAdmin) {
    return true;
  }
  
  return false;
};

module.exports = {
  isLogin,
  requireAuth,
  requireBusinessAuth,
  requireUserAuth,
  requireAdmin,
  makeUserDataAvailable,
  getCurrentUser,
  isResourceOwner,
  canEditResource
};

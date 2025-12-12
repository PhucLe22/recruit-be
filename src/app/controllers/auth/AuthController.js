const User = require('../../models/User');
const Business = require('../../models/Business');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { generateToken, setToken } = require('../../../middlewares/verifyToken');
const RefreshToken = require('../../../models/RefreshToken');
const { multipleMongooseToObject } = require('../../../util/mongoose');

class AuthController {
  // GET /auth/login
  showLoginPage(req, res) {
    res.render('auth/login', {
      layout: false,
      title: 'Đăng nhập',
      user: null,
      isBusiness: false,
      error_msg: req.flash('error_msg'),
      success_msg: req.flash('success_msg'),
      error: req.flash('error')
    });
  }

  // GET /auth/register/user
  showRegisterPage(req, res) {
    res.render('users/register', {
    layout: false,
    title: 'Đăng ký tài khoản',
    user: null,
    isBusiness: false
    });
  }

  // GET /auth/register/business
  showRegisterBusinessPage(req, res) {
    res.render('businesses/register', {
    layout: false,
    title: 'Đăng ký tài khoản',
    user: null,
    isBusiness: true
    });
  }

  // GET /auth/profile
  showProfilePage(req, res) {
    const user = req.session.user;
    res.render('users/profile', {
      title: 'Hồ sơ cá nhân',
      user: multipleMongooseToObject(user),
    });
  }

    static async findUserByEmail(email) {
    // Try to find in User collection first
    const user = await User.findOne({ email });
    if (user) return { user, isBusiness: false };
    
    // If not found, try Business collection
    const business = await Business.findOne({ email });
    return { 
      user: business, 
      isBusiness: !!business 
    };
  }

  // POST /auth/login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user in either collection
      const { user, isBusiness } = await AuthController.findUserByEmail(email);
      
      // Check if user exists and password matches
      if (!user || !(await bcrypt.compare(password, user.password))) {
        req.flash('error_msg', 'Email hoặc mật khẩu không chính xác');
        return res.redirect('/auth/login');
      }

      // Set session based on user type
      if (isBusiness) {
        // For business users
        req.session.business = {
          _id: user._id,
          companyName: user.companyName || user.businessName || user.username,
          email: user.email,
          username: user.username,
          role: user.role || 'business',
          isBusiness: true,
          logoPath: user.logoPath || '/images/default-business-logo.png',
          // Include any other business-specific fields
          ...(user.businessData ? { businessData: user.businessData } : {})
        };
      } else {
        // For regular users
        req.session.user = {
          _id: user._id,
          name: user.name || user.username,
          email: user.email,
          username: user.username,
          role: user.role || 'user',
          isBusiness: false,
          avatar: user.avatar || '/images/default-avatar.png',
          ...(user.profile ? { profile: user.profile } : {})
        };
      }

      // Generate and set tokens
      const userAgent = req.get('user-agent') || '';
      const ipAddress = req.ip || req.connection.remoteAddress;
      const { accessToken, refreshToken } = await generateToken(user, userAgent, ipAddress);
      await setToken(req, res, { accessToken, refreshToken });

      // Explicitly save session before redirect
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
        }
        
        // Set success message and redirect
        const redirectPath = isBusiness ? '/business/dashboard' : '/?login=success';
        req.flash('success_msg', 'Đăng nhập thành công!');
        return res.redirect(redirectPath);
      });

    } catch (error) {
      console.error('Login error:', error);
      req.flash('error_msg', 'Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại sau.');
      return res.redirect('/auth/login?error=' + encodeURIComponent(error.message));
    }
  }

  // POST /auth/refresh-token
  async refreshToken(req, res) {
      try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
        
        if (!refreshToken) {
          return res.status(401).json({
            success: false,
            message: 'Refresh token is required'
          });
        }

        // Find the refresh token in the database
        const tokenDoc = await RefreshToken.findOne({ 
          token: refreshToken,
          isRevoked: { $ne: true }
        }).populate('userId');

        if (!tokenDoc) {
          return res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
          });
        }

        // Check if token is expired
        if (tokenDoc.expiresAt < new Date()) {
          // Mark as revoked
          tokenDoc.isRevoked = true;
          await tokenDoc.save();
          
          // Clear the refresh token cookie
          res.clearCookie('refreshToken');
          
          return res.status(401).json({
            success: false,
            message: 'Refresh token has expired'
          });
        }

        // Generate new tokens
        const user = tokenDoc.userId;
        const userAgent = req.get('user-agent') || '';
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        const { accessToken, refreshToken: newRefreshToken } = await generateToken(
          {
            _id: user._id,
            email: user.email,
            username: user.username,
            role: user.role || 'user',
            isBusiness: user.isBusiness || false
          },
          userAgent,
          ipAddress
        );

        // Set the new tokens
        await setToken(req, res, { accessToken, refreshToken: newRefreshToken });

        // Update last used timestamp
        tokenDoc.lastUsedAt = new Date();
        await tokenDoc.save();

        // Return the new access token
        return res.json({
          success: true,
          accessToken,
          refreshToken: newRefreshToken
        });

      } catch (error) {
        console.error('Refresh token error:', error);
        return res.status(500).json({
          success: false,
          message: 'Error refreshing token'
        });
      }
    }

  // POST /auth/register
  async register(req, res) {
    try {
      const { username, email, password, confirmPassword, phone, gender } = req.body;

      // Validate required fields
      if (!username || !email || !password || !confirmPassword) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(400).json({
            success: false,
            message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
          });
        }
        req.flash('error', 'Vui lòng điền đầy đủ thông tin bắt buộc');
        return res.redirect('/auth/register');
      }

      // Check if passwords match
      if (password !== confirmPassword) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(400).json({
            success: false,
            errors: { confirmPassword: 'Mật khẩu không khớp' }
          });
        }
        req.flash('error', 'Mật khẩu không khớp');
        return res.redirect('/auth/register');
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(400).json({
            success: false,
            errors: { email: 'Email đã được sử dụng' }
          });
        }
        req.flash('error', 'Email đã được sử dụng');
        return res.redirect('/auth/register');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user with role = 1 (regular user)
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        phone: phone || '',
        gender: gender || '',
        role: 1, // Regular user role
        status: 'active'
      });

      await newUser.save();

      // Handle JSON/API response
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(200).json({
          success: true,
          message: 'Đăng ký thành công! Vui lòng đăng nhập.'
        });
      }

      // Handle web response
      req.flash('success', 'Đăng ký thành công! Vui lòng đăng nhập.');
      res.redirect('/auth/login');

    } catch (error) {
      console.error('Register error:', error);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const errors = {};
        Object.keys(error.errors).forEach(key => {
          errors[key] = error.errors[key].message;
        });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(400).json({
            success: false,
            errors
          });
        }

        req.flash('error', 'Vui lòng kiểm tra lại thông tin');
        return res.redirect('/auth/register');
      }

      // Handle other errors
      const errorMessage = 'Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại sau.';
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({
          success: false,
          message: errorMessage
        });
      }

      req.flash('error', errorMessage);
      res.redirect('/auth/register');
    }
  }

  // POST /auth/logout
  logout(req, res) {
    // Clear HTTP-only cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ success: false, message: 'Logout failed' });
      }
      
      // Clear any other auth-related cookies
      res.clearCookie('connect.sid', { path: '/' });
      
      // Handle JSON/API response
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, message: 'Logged out successfully' });
      }
      
      // Redirect for web requests
      res.redirect('/auth/login');
    });
  }

  // GET /auth/forgot-password
  showForgotPassword(req, res) {
    res.render('auth/forgot-password', {
      title: 'Quên mật khẩu',
      user: null
    });
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      const user = await User.findOne({ email });
      
      if (!user) {
        req.flash('error', 'Email không tồn tại');
        return res.redirect('/auth/forgot-password');
      }

      // TODO: Send reset email
      req.flash('success', 'Email đặt lại mật khẩu đã được gửi');
      res.redirect('/auth/login');
    } catch (error) {
      console.error('Forgot password error:', error);
      req.flash('error', 'Gửi email thất bại');
      res.redirect('/auth/forgot-password');
    }
  }

  // GET /auth/reset-password
  showResetPassword(req, res) {
    res.render('auth/reset', {
      title: 'Đặt lại mật khẩu',
      token: req.params.token,
      user: null
    });
  }

  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { password } = req.body;

      // TODO: Verify token and update password
      req.flash('success', 'Mật khẩu đã được đặt lại');
      res.redirect('/auth/login');
    } catch (error) {
      console.error('Reset password error:', error);
      req.flash('error', 'Đặt lại mật khẩu thất bại');
      res.redirect('/auth/reset-password/' + token);
    }
  }

  // GET /auth/verify-email
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      
      // TODO: Verify email token
      req.flash('success', 'Email đã được xác thực');
      res.redirect('/auth/login');
    } catch (error) {
      console.error('Verify email error:', error);
      req.flash('error', 'Xác thực email thất bại');
      res.redirect('/auth/login');
    }
  }

  // GET /auth/resend-verification
  async resendVerification(req, res) {
    try {
      const { email } = req.body;
      
      // TODO: Resend verification email
      req.flash('success', 'Email xác thực đã được gửi lại');
      res.redirect('/auth/login');
    } catch (error) {
      console.error('Resend verification error:', error);
      req.flash('error', 'Gửi lại email thất bại');
      res.redirect('/auth/login');
    }
  }
}

module.exports = new AuthController();

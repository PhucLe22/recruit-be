const User = require('../../models/User');
const Business = require('../../models/Business');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { generateToken, setToken } = require('../../../middlewares/verifyToken');
const RefreshToken = require('../../../models/RefreshToken');
const { multipleMongooseToObject } = require('../../../util/mongoose');
const EmailService = require('../../../services/EmailService');

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
      const user2 = await Business.findOne({ email });
      
      if (!user && !user2) {
        req.flash('error', 'Email không tồn tại');
        return res.redirect('/auth/forgot-password');
      }

      // Send OTP for password reset
      const otpResult = await EmailService.sendOTP(email, 'password reset');
      
      if (!otpResult.success) {
        console.error('Failed to send OTP:', otpResult.error);
        req.flash('error', 'Gửi email OTP thất bại. Vui lòng thử lại sau.');
        return res.redirect('/auth/forgot-password');
      }

      // Store email in session for verification
      req.session.resetEmail = email;
      req.session.otpExpiresAt = otpResult.expiresAt;

      req.flash('success', 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra email.');
      res.redirect('/auth/verify-otp');
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

  // GET /auth/verify-otp
  showVerifyOTP(req, res) {
    if (!req.session.resetEmail) {
      req.flash('error', 'Phiên làm việc đã hết hạn. Vui lòng bắt đầu lại.');
      return res.redirect('/auth/forgot-password');
    }

    res.render('auth/verify-otp', {
      title: 'Xác thực OTP',
      email: req.session.resetEmail,
      expiresAt: req.session.otpExpiresAt,
      user: null
    });
  }

  // POST /auth/verify-otp
  async verifyOTP(req, res) {
    try {
      const { otp } = req.body;
      const email = req.session.resetEmail;

      if (!email) {
        req.flash('error', 'Phiên làm việc đã hết hạn. Vui lòng bắt đầu lại.');
        return res.redirect('/auth/forgot-password');
      }

      // Verify OTP using EmailService
      const verificationResult = EmailService.verifyOTP(email, otp);

      if (!verificationResult.success) {
        req.flash('error', verificationResult.message);
        return res.redirect('/auth/verify-otp');
      }

      // OTP verified successfully, generate reset token
      const resetToken = jwt.sign(
        { email, type: 'password-reset' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '15m' }
      );

      // Clear session data
      delete req.session.resetEmail;
      delete req.session.otpExpiresAt;

      req.flash('success', 'OTP đã được xác thực. Vui lòng đặt lại mật khẩu của bạn.');
      res.redirect(`/auth/reset-password/${resetToken}`);

    } catch (error) {
      console.error('OTP verification error:', error);
      req.flash('error', 'Xác thực OTP thất bại');
      res.redirect('/auth/verify-otp');
    }
  }

  // POST /auth/resend-otp
  async resendOTP(req, res) {
    try {
      const email = req.session.resetEmail;

      if (!email) {
        req.flash('error', 'Phiên làm việc đã hết hạn. Vui lòng bắt đầu lại.');
        return res.redirect('/auth/forgot-password');
      }

      // Send new OTP
      const otpResult = await EmailService.sendOTP(email, 'password reset');
      
      if (!otpResult.success) {
        console.error('Failed to resend OTP:', otpResult.error);
        req.flash('error', 'Gửi lại OTP thất bại. Vui lòng thử lại sau.');
        return res.redirect('/auth/verify-otp');
      }

      req.session.otpExpiresAt = otpResult.expiresAt;
      req.flash('success', 'Mã OTP mới đã được gửi đến email của bạn.');
      res.redirect('/auth/verify-otp');

    } catch (error) {
      console.error('Resend OTP error:', error);
      req.flash('error', 'Gửi lại OTP thất bại');
      res.redirect('/auth/verify-otp');
    }
  }

  async resetPassword(req, res) {
    try {
      // Get token from URL parameter or request body
      const token = req.params.token || req.body.token;
      const { password, confirmPassword } = req.body;

      if (!token) {
        req.flash('error', 'Token không hợp lệ hoặc đã hết hạn');
        return res.redirect('/auth/forgot-password');
      }

      // Verify reset token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      } catch (error) {
        req.flash('error', 'Token không hợp lệ hoặc đã hết hạn');
        return res.redirect('/auth/forgot-password');
      }

      // Check if token is for password reset
      if (decoded.type !== 'password-reset') {
        req.flash('error', 'Token không hợp lệ');
        return res.redirect('/auth/forgot-password');
      }

      // Validate passwords
      if (!password || !confirmPassword) {
        req.flash('error', 'Vui lòng điền đầy đủ mật khẩu');
        return res.redirect(`/auth/reset-password/${token}`);
      }

      if (password !== confirmPassword) {
        req.flash('error', 'Mật khẩu không khớp');
        return res.redirect(`/auth/reset-password/${token}`);
      }

      // Find user and update password
      const user = await User.findOne({ email: decoded.email });
      const business = await Business.findOne({ email: decoded.email });

      if (user) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.updateOne(
          { email: decoded.email },
          { password: hashedPassword }
        );
      } else if (business) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await Business.updateOne(
          { email: decoded.email },
          { password: hashedPassword }
        );
      } else {
        req.flash('error', 'Người dùng không tồn tại');
        return res.redirect('/auth/forgot-password');
      }

      req.flash('success', 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập.');
      res.redirect('/auth/login');

    } catch (error) {
      console.error('Reset password error:', error);
      req.flash('error', 'Đặt lại mật khẩu thất bại');
      res.redirect(`/auth/reset-password/${token}`);
    }
  }

  // GET /auth/verify-email
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      
      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      } catch (error) {
        req.flash('error', 'Token không hợp lệ hoặc đã hết hạn');
        return res.redirect('/auth/login');
      }

      // Check if token is for email verification
      if (decoded.type !== 'email-verification') {
        req.flash('error', 'Token không hợp lệ');
        return res.redirect('/auth/login');
      }

      // Find and update user verification status
      const user = await User.findOne({ email: decoded.email });
      const business = await Business.findOne({ email: decoded.email });

      if (user) {
        await User.updateOne(
          { email: decoded.email },
          { emailVerified: true, emailVerifiedAt: new Date() }
        );
      } else if (business) {
        await Business.updateOne(
          { email: decoded.email },
          { emailVerified: true, emailVerifiedAt: new Date() }
        );
      } else {
        req.flash('error', 'Người dùng không tồn tại');
        return res.redirect('/auth/login');
      }

      req.flash('success', 'Email đã được xác thực thành công');
      res.redirect('/auth/login');

    } catch (error) {
      console.error('Verify email error:', error);
      req.flash('error', 'Xác thực email thất bại');
      res.redirect('/auth/login');
    }
  }

  // POST /auth/resend-verification
  async resendVerification(req, res) {
    try {
      const { email } = req.body;
      
      // Find user
      const user = await User.findOne({ email });
      const business = await Business.findOne({ email });

      if (!user && !business) {
        req.flash('error', 'Email không tồn tại');
        return res.redirect('/auth/login');
      }

      // Send OTP for email verification
      const otpResult = await EmailService.sendOTP(email, 'email verification');
      
      if (!otpResult.success) {
        console.error('Failed to send verification OTP:', otpResult.error);
        req.flash('error', 'Gửi email xác thực thất bại. Vui lòng thử lại sau.');
        return res.redirect('/auth/login');
      }

      // Store email in session for verification
      req.session.verificationEmail = email;
      req.session.verificationExpiresAt = otpResult.expiresAt;

      req.flash('success', 'Mã OTP xác thực đã được gửi đến email của bạn.');
      res.redirect('/auth/verify-email-otp');

    } catch (error) {
      console.error('Resend verification error:', error);
      req.flash('error', 'Gửi lại email thất bại');
      res.redirect('/auth/login');
    }
  }

  // GET /auth/verify-email-otp
  showVerifyEmailOTP(req, res) {
    if (!req.session.verificationEmail) {
      req.flash('error', 'Phiên làm việc đã hết hạn. Vui lòng bắt đầu lại.');
      return res.redirect('/auth/login');
    }

    res.render('auth/verify-email-otp', {
      title: 'Xác thực Email',
      email: req.session.verificationEmail,
      expiresAt: req.session.verificationExpiresAt,
      user: null
    });
  }

  // POST /auth/verify-email-otp
  async verifyEmailOTP(req, res) {
    try {
      const { otp } = req.body;
      const email = req.session.verificationEmail;

      if (!email) {
        req.flash('error', 'Phiên làm việc đã hết hạn. Vui lòng bắt đầu lại.');
        return res.redirect('/auth/login');
      }

      // Verify OTP using EmailService
      const verificationResult = EmailService.verifyOTP(email, otp);

      if (!verificationResult.success) {
        req.flash('error', verificationResult.message);
        return res.redirect('/auth/verify-email-otp');
      }

      // OTP verified successfully, update user verification status
      const user = await User.findOne({ email });
      const business = await Business.findOne({ email });

      if (user) {
        await User.updateOne(
          { email },
          { emailVerified: true, emailVerifiedAt: new Date() }
        );
      } else if (business) {
        await Business.updateOne(
          { email },
          { emailVerified: true, emailVerifiedAt: new Date() }
        );
      }

      // Clear session data
      delete req.session.verificationEmail;
      delete req.session.verificationExpiresAt;

      req.flash('success', 'Email đã được xác thực thành công. Vui lòng đăng nhập.');
      res.redirect('/auth/login');

    } catch (error) {
      console.error('Email OTP verification error:', error);
      req.flash('error', 'Xác thực email thất bại');
      res.redirect('/auth/verify-email-otp');
    }
  }
}

module.exports = new AuthController();

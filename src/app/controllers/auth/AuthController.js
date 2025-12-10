const User = require('../../models/User');
const Business = require('../../models/Business');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');

class AuthController {
  // Show login page
  showLoginPage(req, res) {
    res.render('auth/login', {
      layout: false,
      title: 'Đăng nhập',
      user: null
    });
  }

  // Show register page
  showRegisterPage(req, res) {
    res.render('auth/register', {
      layout: false,
      title: 'Đăng ký',
      user: null
    });
  }

  // Show profile page
  showProfilePage(req, res) {
    res.render('users/profile', {
      title: 'Hồ sơ cá nhân',
      user: req.session.users || null
    });
  }

  // Handle login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      
      if (!user) {
        req.flash('error', 'Email hoặc mật khẩu không đúng');
        return res.redirect('/auth/login-page');
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        req.flash('error', 'Email hoặc mật khẩu không đúng');
        return res.redirect('/auth/login-page');
      }

      // Set session
      req.session.users = user;
      
      req.flash('success', 'Đăng nhập thành công');
      res.redirect('/');
    } catch (error) {
      console.error('Login error:', error);
      req.flash('error', 'Đăng nhập thất bại');
      res.redirect('/auth/login-page');
    }
  }

  // Handle register
  async register(req, res) {
    try {
      const { username, email, password, phone, gender, degree, experience } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      
      if (existingUser) {
        req.flash('error', 'Email đã tồn tại');
        return res.redirect('/auth/register-page');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        phone,
        gender,
        degree,
        experience
      });

      await newUser.save();

      req.flash('success', 'Đăng ký thành công. Vui lòng đăng nhập.');
      res.redirect('/auth/login-page');
    } catch (error) {
      console.error('Register error:', error);
      req.flash('error', 'Đăng ký thất bại');
      res.redirect('/auth/register-page');
    }
  }

  // Handle logout
  logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/auth/login-page');
    });
  }

  // Update profile
  async updateProfile(req, res) {
    try {
      const userId = req.session.users._id;
      const { username, email, phone, gender, degree, experience } = req.body;

      await User.findByIdAndUpdate(userId, {
        username,
        email,
        phone,
        gender,
        degree,
        experience
      });

      // Update session
      const updatedUser = await User.findById(userId);
      req.session.users = updatedUser;

      req.flash('success', 'Cập nhật hồ sơ thành công');
      res.redirect('/auth/profile-page');
    } catch (error) {
      console.error('Update profile error:', error);
      req.flash('error', 'Cập nhật hồ sơ thất bại');
      res.redirect('/auth/profile-page');
    }
  }

  // Google OAuth
  googleAuth(req, res, next) {
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  }

  googleCallback(req, res, next) {
    passport.authenticate('google', (err, user) => {
      if (err) {
        console.error('Google auth error:', err);
        return res.redirect('/auth/login-page');
      }

      if (!user) {
        return res.redirect('/auth/login-page');
      }

      req.session.users = user;
      res.redirect('/');
    })(req, res, next);
  }

  // Forgot password
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
      res.redirect('/auth/login-page');
    } catch (error) {
      console.error('Forgot password error:', error);
      req.flash('error', 'Gửi email thất bại');
      res.redirect('/auth/forgot-password');
    }
  }

  // Reset password
  showResetPassword(req, res) {
    res.render('auth/reset-password', {
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
      res.redirect('/auth/login-page');
    } catch (error) {
      console.error('Reset password error:', error);
      req.flash('error', 'Đặt lại mật khẩu thất bại');
      res.redirect('/auth/reset-password/' + token);
    }
  }

  // Verify email
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      
      // TODO: Verify email token
      req.flash('success', 'Email đã được xác thực');
      res.redirect('/auth/login-page');
    } catch (error) {
      console.error('Verify email error:', error);
      req.flash('error', 'Xác thực email thất bại');
      res.redirect('/auth/login-page');
    }
  }

  // Resend verification
  async resendVerification(req, res) {
    try {
      const { email } = req.body;
      
      // TODO: Resend verification email
      req.flash('success', 'Email xác thực đã được gửi lại');
      res.redirect('/auth/login-page');
    } catch (error) {
      console.error('Resend verification error:', error);
      req.flash('error', 'Gửi lại email thất bại');
      res.redirect('/auth/login-page');
    }
  }
}

module.exports = new AuthController();

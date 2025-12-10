const Business = require('../../../app/models/Business');

class LoginController {
  // Show login page
  showLoginPage(req, res) {
    try {
      const errors = req.session.errors || [];
      const success = req.session.success || '';
      
      // Clear session messages
      req.session.errors = null;
      req.session.success = null;
      
      res.render('business/login', {
        layout: 'business/main',
        errors,
        success,
        title: 'Đăng nhập nhà tuyển dụng',
        description: 'Đăng nhập tài khoản nhà tuyển dụng'
      });
    } catch (error) {
      console.error('Error showing login page:', error);
      res.status(500).render('error', {
        message: 'Lỗi khi tải trang đăng nhập',
        error
      });
    }
  }

  // Process login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const errors = [];

      // Validation
      if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.push('Email không hợp lệ');
      }

      if (!password) {
        errors.push('Mật khẩu là bắt buộc');
      }

      if (errors.length > 0) {
        req.session.errors = errors;
        return res.redirect('/business/login');
      }

      // Find business by email
      const business = await Business.findOne({ email: email.toLowerCase() });

      if (!business) {
        req.session.errors = ['Email hoặc mật khẩu không đúng'];
        return res.redirect('/business/login');
      }

      // Check password
      const isPasswordValid = await business.comparePassword(password);

      if (!isPasswordValid) {
        req.session.errors = ['Email hoặc mật khẩu không đúng'];
        return res.redirect('/business/login');
      }

      // Check if account is active
      if (!business.isActive) {
        req.session.errors = ['Tài khoản đã bị vô hiệu hóa'];
        return res.redirect('/business/login');
      }

      // Update last login
      business.lastLogin = new Date();
      await business.save();

      // Create session
      req.session.business = {
        _id: business._id,
        companyName: business.companyName,
        email: business.email,
        isVerified: business.isVerified,
        logo: business.logo,
        subscription: business.subscription
      };

      // Clear session messages
      req.session.errors = null;
      req.session.success = null;

      res.redirect('/business/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      req.session.errors = ['Đã xảy ra lỗi trong quá trình đăng nhập'];
      res.redirect('/business/login');
    }
  }

  // Logout
  logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/business/login');
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.redirect('/business/login');
    }
  }

  // Show forgot password page
  showForgotPasswordPage(req, res) {
    try {
      const errors = req.session.errors || [];
      const success = req.session.success || '';
      
      req.session.errors = null;
      req.session.success = null;
      
      res.render('business/forgot-password', {
        layout: 'business/main',
        errors,
        success,
        title: 'Quên mật khẩu',
        description: 'Khôi phục mật khẩu tài khoản nhà tuyển dụng'
      });
    } catch (error) {
      console.error('Error showing forgot password page:', error);
      res.status(500).render('error', {
        message: 'Lỗi khi tải trang quên mật khẩu',
        error
      });
    }
  }

  // Process forgot password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        req.session.errors = ['Email là bắt buộc'];
        return res.redirect('/business/forgot-password');
      }

      const business = await Business.findOne({ email: email.toLowerCase() });

      if (!business) {
        req.session.errors = ['Email không tồn tại'];
        return res.redirect('/business/forgot-password');
      }

      // Generate reset token
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

      business.resetPasswordToken = resetToken;
      business.resetPasswordExpires = resetPasswordExpires;
      await business.save();

      // TODO: Send reset password email
      // await EmailService.sendPasswordResetEmail(business.email, resetToken);

      req.session.success = 'Email khôi phục mật khẩu đã được gửi';
      res.redirect('/business/login');
    } catch (error) {
      console.error('Forgot password error:', error);
      req.session.errors = ['Đã xảy ra lỗi. Vui lòng thử lại'];
      res.redirect('/business/forgot-password');
    }
  }

  // Show reset password page
  showResetPasswordPage(req, res) {
    try {
      const { token } = req.params;
      const errors = req.session.errors || [];
      
      req.session.errors = null;
      
      res.render('business/reset-password', {
        layout: 'business/main',
        errors,
        token,
        title: 'Đặt lại mật khẩu',
        description: 'Tạo mật khẩu mới cho tài khoản'
      });
    } catch (error) {
      console.error('Error showing reset password page:', error);
      res.status(500).render('error', {
        message: 'Lỗi khi tải trang đặt lại mật khẩu',
        error
      });
    }
  }

  // Process reset password
  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { password, confirmPassword } = req.body;

      const errors = [];

      if (!password || password.length < 6) {
        errors.push('Mật khẩu phải có ít nhất 6 ký tự');
      }

      if (password !== confirmPassword) {
        errors.push('Mật khẩu xác nhận không khớp');
      }

      if (errors.length > 0) {
        req.session.errors = errors;
        return res.redirect(`/business/reset-password/${token}`);
      }

      const business = await Business.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!business) {
        req.session.errors = ['Link khôi phục mật khẩu không hợp lệ hoặc đã hết hạn'];
        return res.redirect('/business/forgot-password');
      }

      // Update password
      business.password = password;
      business.resetPasswordToken = null;
      business.resetPasswordExpires = null;
      await business.save();

      req.session.success = 'Mật khẩu đã được cập nhật thành công';
      res.redirect('/business/login');
    } catch (error) {
      console.error('Reset password error:', error);
      req.session.errors = ['Đã xảy ra lỗi. Vui lòng thử lại'];
      res.redirect(`/business/reset-password/${req.params.token}`);
    }
  }
}

module.exports = new LoginController();

const Business = require('../../../app/models/Business');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class RegisterController {
  // Show registration page
  showRegisterPage(req, res) {
    try {
      const errors = req.session.errors || [];
      const success = req.session.success || '';
      
      // Clear session messages
      req.session.errors = null;
      req.session.success = null;
      
      res.render('business/register', {
        layout: 'business/main',
        errors,
        success,
        formData: req.session.formData || {},
        title: 'Đăng ký nhà tuyển dụng',
        description: 'Đăng ký tài khoản nhà tuyển dụng để đăng tin tuyển dụng'
      });
    } catch (error) {
      console.error('Error showing register page:', error);
      res.status(500).render('error', {
        message: 'Lỗi khi tải trang đăng ký',
        error
      });
    }
  }

  // Process registration
  async register(req, res) {
    try {
      const {
        companyName,
        email,
        password,
        confirmPassword,
        phone,
        address,
        website,
        description,
        industry,
        companySize,
        foundedYear
      } = req.body;

      const errors = [];

      // Validation
      if (!companyName || companyName.trim().length < 2) {
        errors.push('Tên công ty phải có ít nhất 2 ký tự');
      }

      if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.push('Email không hợp lệ');
      }

      if (!password || password.length < 6) {
        errors.push('Mật khẩu phải có ít nhất 6 ký tự');
      }

      if (password !== confirmPassword) {
        errors.push('Mật khẩu xác nhận không khớp');
      }

      // Check if email already exists
      const existingBusiness = await Business.findOne({ email: email.toLowerCase() });
      if (existingBusiness) {
        errors.push('Email này đã được đăng ký');
      }

      if (errors.length > 0) {
        req.session.errors = errors;
        req.session.formData = req.body;
        return res.redirect('/business/register');
      }

      // Create new business
      const verificationToken = uuidv4();
      
      const business = new Business({
        companyName: companyName.trim(),
        email: email.toLowerCase(),
        password,
        phone: phone ? phone.trim() : null,
        address: {
          street: address?.street?.trim() || null,
          city: address?.city?.trim() || null,
          state: address?.state?.trim() || null,
          country: address?.country?.trim() || 'Vietnam',
          zipCode: address?.zipCode?.trim() || null
        },
        website: website ? website.trim() : null,
        description: description ? description.trim() : null,
        industry: industry ? industry.trim() : null,
        companySize,
        foundedYear: foundedYear ? parseInt(foundedYear) : null,
        verificationToken,
        isActive: true
      });

      await business.save();

      // Clear session data
      req.session.errors = null;
      req.session.formData = null;
      req.session.success = 'Đăng ký thành công! Vui lòng đăng nhập.';

      // Auto login after registration
      req.session.business = {
        _id: business._id,
        companyName: business.companyName,
        email: business.email,
        isVerified: business.isVerified
      };

      res.redirect('/business/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      req.session.errors = ['Đã xảy ra lỗi trong quá trình đăng ký. Vui lòng thử lại.'];
      req.session.formData = req.body;
      res.redirect('/business/register');
    }
  }

  // Verify email
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      const business = await Business.findOne({ verificationToken: token });

      if (!business) {
        req.session.errors = ['Link xác nhận không hợp lệ hoặc đã hết hạn'];
        return res.redirect('/business/login');
      }

      business.isVerified = true;
      business.verificationToken = null;
      await business.save();

      req.session.success = 'Email đã được xác nhận thành công!';
      res.redirect('/business/login');
    } catch (error) {
      console.error('Email verification error:', error);
      req.session.errors = ['Đã xảy ra lỗi khi xác nhận email'];
      res.redirect('/business/login');
    }
  }

  // Resend verification email
  async resendVerification(req, res) {
    try {
      const { email } = req.body;

      const business = await Business.findOne({ email: email.toLowerCase() });

      if (!business) {
        return res.json({
          success: false,
          message: 'Email không tồn tại'
        });
      }

      if (business.isVerified) {
        return res.json({
          success: false,
          message: 'Email này đã được xác nhận'
        });
      }

      // Generate new verification token
      const verificationToken = uuidv4();
      business.verificationToken = verificationToken;
      await business.save();

      // TODO: Send verification email
      // await EmailService.sendVerificationEmail(business.email, verificationToken);

      res.json({
        success: true,
        message: 'Email xác nhận đã được gửi lại'
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.json({
        success: false,
        message: 'Đã xảy ra lỗi. Vui lòng thử lại'
      });
    }
  }

  // Check if email is available
  async checkEmailAvailability(req, res) {
    try {
      const { email } = req.query;

      if (!email) {
        return res.json({
          available: false,
          message: 'Email là bắt buộc'
        });
      }

      const business = await Business.findOne({ email: email.toLowerCase() });

      res.json({
        available: !business,
        message: business ? 'Email này đã được đăng ký' : 'Email có thể sử dụng'
      });
    } catch (error) {
      console.error('Check email availability error:', error);
      res.json({
        available: false,
        message: 'Đã xảy ra lỗi'
      });
    }
  }

  // Check if company name is available
  async checkCompanyNameAvailability(req, res) {
    try {
      const { companyName } = req.query;

      if (!companyName) {
        return res.json({
          available: false,
          message: 'Tên công ty là bắt buộc'
        });
      }

      const business = await Business.findOne({ 
        companyName: new RegExp(`^${companyName}$`, 'i') 
      });

      res.json({
        available: !business,
        message: business ? 'Tên công ty này đã được đăng ký' : 'Tên công ty có thể sử dụng'
      });
    } catch (error) {
      console.error('Check company name availability error:', error);
      res.json({
        available: false,
        message: 'Đã xảy ra lỗi'
      });
    }
  }
}

module.exports = new RegisterController();




const User = require('../models/User');
const bcrypt = require('bcrypt');

module.exports = {
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
      return res.redirect('/auth/login-page');
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
      return res.redirect('/auth/login-page');
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
      return res.redirect('/auth/login-page');
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
      return res.json({
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
      return res.redirect('/auth/login');
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
    res.redirect('/auth/login');
  }
}
}
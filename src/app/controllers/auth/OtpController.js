const User = require('../../../app/models/User');
const { generateEmailOTP, generatePhoneOTP, verifyOTP } = require('../../../middlewares/generateOtp');

class OtpController {
  // Send OTP
  async sendOTP(req, res) {
    try {
      const { email, phone, type = 'email' } = req.body;

      if (type === 'email' && !email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      if (type === 'phone' && !phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      let otpData;

      if (type === 'email') {
        // Check if user exists
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        otpData = await generateEmailOTP(email);
      } else if (type === 'phone') {
        // Check if user exists
        const user = await User.findOne({ phone });
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        otpData = await generatePhoneOTP(phone);
      }

      // Store OTP in session
      req.session.otp = {
        code: otpData.otp,
        expiresAt: otpData.expiresAt,
        email: type === 'email' ? email : null,
        phone: type === 'phone' ? phone : null,
        type
      };

      res.json({
        success: true,
        message: `OTP sent to ${type === 'email' ? 'email' : 'phone'}`,
        expiresAt: otpData.expiresAt
        // In production, don't return the OTP
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending OTP',
        error: error.message
      });
    }
  }

  // Verify OTP
  async verifyOTP(req, res) {
    try {
      const { otp, email, phone, type = 'email' } = req.body;

      if (!otp) {
        return res.status(400).json({
          success: false,
          message: 'OTP is required'
        });
      }

      const storedOTPData = req.session.otp;

      if (!storedOTPData) {
        return res.status(400).json({
          success: false,
          message: 'No OTP found. Please request a new OTP'
        });
      }

      // Verify OTP
      const verification = verifyOTP(storedOTPData.code, otp, storedOTPData.expiresAt);

      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          message: verification.message
        });
      }

      // Mark user as verified
      if (type === 'email' && storedOTPData.email) {
        await User.findOneAndUpdate(
          { email: storedOTPData.email.toLowerCase() },
          { isEmailVerified: true }
        );
      } else if (type === 'phone' && storedOTPData.phone) {
        await User.findOneAndUpdate(
          { phone: storedOTPData.phone },
          { isPhoneVerified: true }
        );
      }

      // Clear OTP from session
      delete req.session.otp;

      res.json({
        success: true,
        message: 'OTP verified successfully'
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Error verifying OTP',
        error: error.message
      });
    }
  }

  // Resend OTP
  async resendOTP(req, res) {
    try {
      const { email, phone, type = 'email' } = req.body;

      if (type === 'email' && !email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      if (type === 'phone' && !phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      // Clear existing OTP
      delete req.session.otp;

      // Generate new OTP
      let otpData;

      if (type === 'email') {
        otpData = await generateEmailOTP(email);
      } else if (type === 'phone') {
        otpData = await generatePhoneOTP(phone);
      }

      // Store new OTP in session
      req.session.otp = {
        code: otpData.otp,
        expiresAt: otpData.expiresAt,
        email: type === 'email' ? email : null,
        phone: type === 'phone' ? phone : null,
        type
      };

      res.json({
        success: true,
        message: `New OTP sent to ${type === 'email' ? 'email' : 'phone'}`,
        expiresAt: otpData.expiresAt
        // In production, don't return the OTP
      });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Error resending OTP',
        error: error.message
      });
    }
  }

  // Check OTP status
  async checkOTPStatus(req, res) {
    try {
      const storedOTPData = req.session.otp;

      if (!storedOTPData) {
        return res.json({
          success: true,
          hasOTP: false,
          message: 'No OTP found'
        });
      }

      const isExpired = new Date() > new Date(storedOTPData.expiresAt);

      if (isExpired) {
        delete req.session.otp;
        return res.json({
          success: true,
          hasOTP: false,
          message: 'OTP has expired'
        });
      }

      res.json({
        success: true,
        hasOTP: true,
        type: storedOTPData.type,
        email: storedOTPData.email,
        phone: storedOTPData.phone,
        expiresAt: storedOTPData.expiresAt
      });
    } catch (error) {
      console.error('Check OTP status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking OTP status',
        error: error.message
      });
    }
  }
}

module.exports = new OtpController();

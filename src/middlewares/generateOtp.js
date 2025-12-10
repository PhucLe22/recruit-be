const crypto = require('crypto');

// Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Generate OTP with expiry time
const generateOTPWithExpiry = (expiryMinutes = 5) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  return {
    otp,
    expiresAt
  };
};

// Verify OTP
const verifyOTP = (storedOTP, userOTP, expiresAt) => {
  if (!storedOTP || !userOTP) {
    return { valid: false, message: 'OTP is required' };
  }
  
  if (storedOTP !== userOTP) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  if (new Date() > new Date(expiresAt)) {
    return { valid: false, message: 'OTP has expired' };
  }
  
  return { valid: true, message: 'OTP verified successfully' };
};

// Middleware to generate and send OTP
const generateOTPMiddleware = async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required'
      });
    }
    
    const { otp, expiresAt } = generateOTPWithExpiry();
    
    // TODO: Send OTP via email or SMS
    // For now, just return the OTP (in production, don't return OTP)
    
    // Store OTP in session or database
    req.session = req.session || {};
    req.session.otp = {
      code: otp,
      expiresAt,
      email: email || null,
      phone: phone || null
    };
    
    res.json({
      success: true,
      message: 'OTP generated successfully',
      // In production, remove this line
      otp: otp,
      expiresAt
    });
  } catch (error) {
    console.error('Generate OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating OTP',
      error: error.message
    });
  }
};

// Middleware to verify OTP
const verifyOTPMiddleware = async (req, res, next) => {
  try {
    const { otp } = req.body;
    
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
    
    const verification = verifyOTP(storedOTPData.code, otp, storedOTPData.expiresAt);
    
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }
    
    // Clear OTP from session after successful verification
    delete req.session.otp;
    
    // Mark user as verified
    req.session.verified = true;
    
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
};

// Middleware to check if user is OTP verified
const checkOTPVerification = (req, res, next) => {
  if (!req.session.verified) {
    return res.status(401).json({
      success: false,
      message: 'OTP verification required'
    });
  }
  
  next();
};

// Generate OTP for email verification
const generateEmailOTP = async (email) => {
  const { otp, expiresAt } = generateOTPWithExpiry(10); // 10 minutes expiry
  
  // TODO: Send OTP via email service
  // await EmailService.sendOTP(email, otp);
  
  return {
    otp,
    expiresAt
  };
};

// Generate OTP for phone verification
const generatePhoneOTP = async (phone) => {
  const { otp, expiresAt } = generateOTPWithExpiry(5); // 5 minutes expiry
  
  // TODO: Send OTP via SMS service
  // await SMSService.sendOTP(phone, otp);
  
  return {
    otp,
    expiresAt
  };
};

module.exports = {
  generateOTP,
  generateOTPWithExpiry,
  verifyOTP,
  generateOTPMiddleware,
  verifyOTPMiddleware,
  checkOTPVerification,
  generateEmailOTP,
  generatePhoneOTP
};

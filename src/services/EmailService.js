const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.transporter = null;
    this.otpStore = new Map(); // In-memory OTP storage (consider Redis for production)
    this.isInitialized = false;
  }

  /**
   * Initialize nodemailer transporter (lazy initialization)
   */
  initializeTransporter() {
    if (this.isInitialized) {
      return;
    }

    // Check if email credentials are configured
    const emailUser = process.env.EMAIL_USER || process.env.MAIL_USER || process.env.EMAIL_ADDRESS;
    const emailPass = process.env.EMAIL_PASS || process.env.MAIL_PASS || process.env.EMAIL_PASSWORD;
    
    if (!emailUser || !emailPass) {
      console.warn('Email credentials not found in environment variables. Email functionality will be disabled.');
      console.warn('Please set EMAIL_USER/MAIL_USER and EMAIL_PASS/MAIL_PASS in your .env file');
      console.warn('For development, you can use Mailtrap or Ethereal email services');
      this.isInitialized = true;
      return;
    }

    // For development, use ethereal.email or Gmail
    // For production, configure with your email service provider
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || process.env.MAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || process.env.MAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    // Verify transporter configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email transporter configuration error:', error);
      } else {
        console.log('Email transporter is ready to send messages');
      }
    });

    this.isInitialized = true;
  }

  /**
   * Generate a 6-digit OTP
   * @returns {string} 6-digit OTP
   */
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Store OTP with expiration time (default 10 minutes)
   * @param {string} email - User email
   * @param {string} otp - Generated OTP
   * @param {number} expirationMinutes - OTP expiration time in minutes
   */
  storeOTP(email, otp, expirationMinutes = 10) {
    const expirationTime = Date.now() + (expirationMinutes * 60 * 1000);
    this.otpStore.set(email, {
      otp,
      expiresAt: expirationTime,
      attempts: 0,
      maxAttempts: 3
    });

    // Clean up expired OTPs periodically
    this.cleanupExpiredOTPs();
  }

  /**
   * Verify OTP for given email
   * @param {string} email - User email
   * @param {string} inputOTP - User provided OTP
   * @returns {object} Verification result
   */
  verifyOTP(email, inputOTP) {
    const storedData = this.otpStore.get(email);

    if (!storedData) {
      return {
        success: false,
        message: 'OTP not found or expired'
      };
    }

    // Check if OTP has expired
    if (Date.now() > storedData.expiresAt) {
      this.otpStore.delete(email);
      return {
        success: false,
        message: 'OTP has expired'
      };
    }

    // Check maximum attempts
    if (storedData.attempts >= storedData.maxAttempts) {
      this.otpStore.delete(email);
      return {
        success: false,
        message: 'Maximum OTP attempts reached'
      };
    }

    // Increment attempts
    storedData.attempts++;

    // Verify OTP
    if (storedData.otp === inputOTP) {
      this.otpStore.delete(email);
      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } else {
      return {
        success: false,
        message: 'Invalid OTP',
        attemptsLeft: storedData.maxAttempts - storedData.attempts
      };
    }
  }

  /**
   * Clean up expired OTPs
   */
  cleanupExpiredOTPs() {
    const now = Date.now();
    for (const [email, data] of this.otpStore.entries()) {
      if (now > data.expiresAt) {
        this.otpStore.delete(email);
      }
    }
  }

  /**
   * Send OTP email
   * @param {string} email - Recipient email
   * @param {string} purpose - Purpose of OTP (e.g., 'email verification', 'password reset')
   * @returns {object} Send result
   */
  async sendOTP(email, purpose = 'email verification') {
    try {
      // Initialize transporter if not already done
      this.initializeTransporter();
      
      // Check if transporter is initialized
      if (!this.transporter) {
        return {
          success: false,
          message: 'Email service not configured. Please set EMAIL_USER/MAIL_USER and EMAIL_PASS/MAIL_PASS in your .env file.',
          error: 'Email transporter not initialized'
        };
      }

      // Generate OTP
      const otp = this.generateOTP();
      
      // Store OTP with 10-minute expiration
      this.storeOTP(email, otp);

      // Create email content
      const subject = `Your OTP Code for ${purpose}`;
      const html = this.generateOTPEmailTemplate(otp, purpose);

      // Send email
      const emailUser = process.env.EMAIL_USER || process.env.MAIL_USER || process.env.EMAIL_ADDRESS;
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.MAIL_FROM || `"CV Recruitment Platform" <${emailUser}>`,
        to: email,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        message: 'OTP sent successfully',
        messageId: result.messageId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
      };

    } catch (error) {
      console.error('Error sending OTP email:', error);
      return {
        success: false,
        message: 'Failed to send OTP',
        error: error.message
      };
    }
  }

  /**
   * Generate HTML email template for OTP
   * @param {string} otp - The OTP code
   * @param {string} purpose - Purpose of the OTP
   * @returns {string} HTML email template
   */
  generateOTPEmailTemplate(otp, purpose) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Verification</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            color: #007bff;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .otp-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 30px 0;
          }
          .otp-code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">CV Recruitment Platform</div>
            <h2>One-Time Password (OTP)</h2>
          </div>

          <p>Hello,</p>
          <p>You have requested a one-time password for <strong>${purpose}</strong>. Please use the following OTP code:</p>

          <div class="otp-box">
            <p>Your OTP Code:</p>
            <div class="otp-code">${otp}</div>
          </div>

          <div class="warning">
            <strong>Important:</strong>
            <ul>
              <li>This OTP will expire in <strong>10 minutes</strong></li>
              <li>Never share this code with anyone</li>
              <li>We will never ask for your OTP via phone or social media</li>
            </ul>
          </div>

          <p>If you didn't request this OTP, please ignore this email or contact our support team.</p>

          <div class="footer">
            <p>This is an automated message from CV Recruitment Platform.</p>
            <p>&copy; ${new Date().getFullYear()} CV Recruitment Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send general email (non-OTP)
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML content
   * @param {string} text - Plain text content (optional)
   * @returns {object} Send result
   */
  async sendEmail(to, subject, html, text = null) {
    try {
      // Initialize transporter if not already done
      this.initializeTransporter();
      
      // Check if transporter is initialized
      if (!this.transporter) {
        return {
          success: false,
          message: 'Email service not configured. Please set EMAIL_USER/MAIL_USER and EMAIL_PASS/MAIL_PASS in your .env file.',
          error: 'Email transporter not initialized'
        };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.MAIL_FROM || `"CV Recruitment Platform" <${process.env.EMAIL_USER || process.env.MAIL_USER}>`,
        to: to,
        subject: subject,
        html: html,
        text: text
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId
      };

    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        message: 'Failed to send email',
        error: error.message
      };
    }
  }

  /**
   * Check if OTP exists for email
   * @param {string} email - User email
   * @returns {boolean} True if OTP exists
   */
  hasOTP(email) {
    const storedData = this.otpStore.get(email);
    if (!storedData) return false;
    
    // Check if expired
    if (Date.now() > storedData.expiresAt) {
      this.otpStore.delete(email);
      return false;
    }
    
    return true;
  }

  /**
   * Get remaining time for OTP
   * @param {string} email - User email
   * @returns {number} Remaining time in milliseconds, 0 if not found
   */
  getOTPExpirationTime(email) {
    const storedData = this.otpStore.get(email);
    if (!storedData) return 0;
    
    const remaining = storedData.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }
}

module.exports = new EmailService();

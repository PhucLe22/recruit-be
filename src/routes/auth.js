const express = require('express');
const router = express.Router();
const authController = require('../app/controllers/auth/AuthController');

router.get('/login', authController.showLoginPage);
router.post('/login', authController.login);

router.get('/register', authController.showRegisterPage);
router.post('/register', authController.register);

router.get('/logout', authController.logout);
router.get('/forgot-password', authController.showForgotPassword);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/:token', authController.showResetPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.post('/reset-password', authController.resetPassword); // Handle form submission with hidden token
router.post('/refresh-token', authController.refreshToken);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// OTP routes
router.get('/verify-otp', authController.showVerifyOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.get('/verify-email-otp', authController.showVerifyEmailOTP);
router.post('/verify-email-otp', authController.verifyEmailOTP);

module.exports = router;

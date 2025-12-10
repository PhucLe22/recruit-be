const express = require('express');
const router = express.Router();
const authController = require('../app/controllers/auth/AuthController');
const { verifyToken } = require('../middlewares/verifyToken');

// Login page
router.get('/login-page', authController.showLoginPage);

// Register page
router.get('/register-page', authController.showRegisterPage);

// Profile page
router.get('/profile-page', authController.showProfilePage);

// Handle login
router.post('/login', authController.login);

// Handle register
router.post('/register', authController.register);

// Handle logout
router.get('/logout', authController.logout);

// Update profile
router.post('/profile/edit', verifyToken, authController.updateProfile);

// Google OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// Forgot password
router.get('/forgot-password', authController.showForgotPassword);
router.post('/forgot-password', authController.forgotPassword);

// Reset password
router.get('/reset-password/:token', authController.showResetPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Verify email
router.get('/verify-email/:token', authController.verifyEmail);

// Resend verification
router.post('/resend-verification', authController.resendVerification);

module.exports = router;

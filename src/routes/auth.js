const express = require('express');
const router = express.Router();
const authController = require('../app/controllers/auth/AuthController');
const {isLogin} = require('../middlewares/isLogin');

router.get('/login', authController.showLoginPage);
router.post('/login', authController.login);

router.get('/register', authController.showRegisterPage);
router.post('/register', authController.register);

router.get('/logout', authController.logout);
router.get('/forgot-password', authController.showForgotPassword);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/:token', authController.showResetPassword);
router.post('/refresh-token', authController.refreshToken);
router.post('/reset-password/:token', authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

module.exports = router;

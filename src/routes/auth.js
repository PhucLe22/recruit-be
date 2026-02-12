const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../app/controllers/auth/AuthController');
const { generateToken, setToken } = require('../middlewares/verifyToken');

router.get('/login', authController.showLoginPage);
router.post('/login', authController.login);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/login', failureFlash: 'Đăng nhập Google thất bại' }),
    async (req, res) => {
        try {
            const user = req.user;
            // Set session
            req.session.user = {
                _id: user._id,
                name: user.name || user.username,
                email: user.email,
                username: user.username,
                role: user.role || 'user',
                isBusiness: false,
                avatar: user.avatar || '/images/default-avatar.png',
            };

            // Generate and set JWT tokens
            const userAgent = req.get('user-agent') || '';
            const ipAddress = req.ip || req.connection.remoteAddress;
            const { accessToken, refreshToken } = await generateToken(user, userAgent, ipAddress);
            await setToken(req, res, { accessToken, refreshToken });

            req.session.save((err) => {
                if (err) console.error('Session save error:', err);
                req.flash('success_msg', 'Đăng nhập Google thành công!');
                res.redirect('/?login=success');
            });
        } catch (error) {
            console.error('Google callback error:', error);
            req.flash('error_msg', 'Đã xảy ra lỗi khi đăng nhập Google.');
            res.redirect('/auth/login');
        }
    }
);

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

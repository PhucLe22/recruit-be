const express = require('express');
const router = express.Router();
const { generateOtp } = require('../middlewares/generateOtp');

const otpController = require('../app/controllers/auth/OtpController');

router.post('/checkOtp', otpController.checkOTPStatus);
router.post('/verify', otpController.verifyOTP);

router.get('/business', async (req, res, next) => {
    try {
        await generateOtp(req, res, next);
        res.status(200).render('business/otp', { layout: false });
    } catch (error) {
        next(error);
    }
});
router.get('/auth', async (req, res, next) => {
    try {
        await generateOtp(req, res, next);
        res.status(200).render('users/otp2', { layout: false });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

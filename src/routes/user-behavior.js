const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
const userBehaviorController = require('../app/controllers/users/userBehavior/UserBehaviorController');

// Track user behavior
router.post('/track', verifyToken, userBehaviorController.trackBehavior);

// Get user behavior data
router.get('/user/:userId', verifyToken, userBehaviorController.getUserBehavior);

// Get user recommendations
router.get('/recommendations/:userId', verifyToken, userBehaviorController.getRecommendations);

// Update user preferences
router.post('/preferences', verifyToken, userBehaviorController.updatePreferences);

// Get user analytics
router.get('/analytics/:userId', verifyToken, userBehaviorController.getUserAnalytics);

module.exports = router;

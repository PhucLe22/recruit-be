const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
const recommendationController = require('../app/controllers/users/recommendations/RecommendationController');

// Get job recommendations for user
router.get('/jobs/:userId', verifyToken, recommendationController.getJobRecommendations);

// Get personalized recommendations
router.get('/personalized/:userId', verifyToken, recommendationController.getPersonalizedRecommendations);

// Get popular jobs
router.get('/popular', recommendationController.getPopularJobs);

// Get similar jobs
router.get('/similar/:jobId', recommendationController.getSimilarJobs);

// Update recommendation feedback
router.post('/feedback', verifyToken, recommendationController.updateFeedback);

// Get recommendation analytics
router.get('/analytics/:userId', verifyToken, recommendationController.getRecommendationAnalytics);

module.exports = router;

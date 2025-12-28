const express = require('express');
const router = express.Router();
const AISearchController = require('../app/controllers/users/AISearchController');
const { verifyToken } = require('../middlewares/verifyToken');

router.post('/smart-search', AISearchController.smartSearch);
router.post('/cv-matching', AISearchController.matchCV);
router.get('/recommendations/:userId', verifyToken, AISearchController.getPersonalizedRecommendations);
router.get('/analyze-job/:jobId', AISearchController.analyzeJob);
router.post('/job-recommendations', AISearchController.getPersonalityBasedRecommendations);

module.exports = router;

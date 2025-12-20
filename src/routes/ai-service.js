// File: /src/routes/ai-service.js
const express = require('express');
const router = express.Router();
const AIServiceController = require('../app/controllers/ai/AIServiceController');
const { isLogin } = require('../middlewares/isLogin');
const upload = require('../middlewares/upload');

// User Management
router.post('/users', AIServiceController.createUser.bind(AIServiceController));
router.get('/users', isLogin, AIServiceController.getUsers.bind(AIServiceController));

// Resume Operations
router.post('/upload_resume', isLogin, upload.single('file'), AIServiceController.uploadResume.bind(AIServiceController));
router.get('/resume/:username', isLogin, AIServiceController.getResume.bind(AIServiceController));
router.delete('/resume/:username', isLogin, AIServiceController.deleteResume.bind(AIServiceController));
router.post('/resume/:username/suggest_improvements', isLogin, AIServiceController.suggestResumeImprovements.bind(AIServiceController));

// Job Operations
router.get('/users/:username/jobs', isLogin, AIServiceController.getUserJobs.bind(AIServiceController));
router.get('/api/jobs-suggestion/:username', isLogin, AIServiceController.getJobSuggestions.bind(AIServiceController));

// Google Meet
router.post('/meets', isLogin, AIServiceController.createGoogleMeet.bind(AIServiceController));

// Auth
router.get('/auth/google/url', (req, res) => {
    res.json({ url: AIServiceController.getGoogleAuthUrl() });
});

router.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    const result = await AIServiceController.handleGoogleAuthCallback(code);
    res.json(result);
});

// Health Check
router.get('/health', AIServiceController.checkHealth.bind(AIServiceController));

module.exports = router;
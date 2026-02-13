const express = require('express');
const router = express.Router();
const AIServiceController = require('../app/controllers/ai/AIServiceController');
const { isLogin, requireAuth } = require('../middlewares/isLogin');
const upload = require('../middlewares/upload');

router.post('/upload_resume', isLogin, requireAuth, upload.single('file'), AIServiceController.uploadResume.bind(AIServiceController));
router.get('/resume/:username', isLogin, requireAuth, AIServiceController.getResume.bind(AIServiceController));
router.delete('/resume/:username', isLogin, requireAuth, AIServiceController.deleteResume.bind(AIServiceController));
router.post('/resume/:username/suggest_improvements', isLogin, requireAuth, AIServiceController.suggestResumeImprovements.bind(AIServiceController));
router.get('/jobs-suggestion/:username', isLogin, requireAuth, AIServiceController.getJobSuggestions.bind(AIServiceController));
router.get('/users/:username/jobs', isLogin, requireAuth, AIServiceController.getUserJobs.bind(AIServiceController));
router.get('/health', AIServiceController.checkHealth.bind(AIServiceController));

module.exports = router;
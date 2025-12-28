const express = require('express');
const router = express.Router();
const AIServiceController = require('../app/controllers/ai/AIServiceController');
const { isLogin } = require('../middlewares/isLogin');
const upload = require('../middlewares/upload');

router.post('/upload_resume', isLogin, upload.single('file'), AIServiceController.uploadResume.bind(AIServiceController));
router.get('/resume/:username', isLogin, AIServiceController.getResume.bind(AIServiceController));
router.delete('/resume/:username', isLogin, AIServiceController.deleteResume.bind(AIServiceController));
router.post('/resume/:username/suggest_improvements', isLogin, AIServiceController.suggestResumeImprovements.bind(AIServiceController));
router.get('/health', AIServiceController.checkHealth.bind(AIServiceController));

module.exports = router;
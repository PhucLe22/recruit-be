const express = require('express');
const router = express.Router();
const PersonalityAssessmentController = require('../app/controllers/PersonalityAssessmentController');
const { verifyToken } = require('../middlewares/verifyToken');
const { isLogin } = require('../middlewares/isLogin');

// MBTI Assessment Routes
router.get('/mbti', PersonalityAssessmentController.getMBTIAssessment.bind(PersonalityAssessmentController));
router.post('/mbti/submit', verifyToken, PersonalityAssessmentController.submitMBTIAssessment.bind(PersonalityAssessmentController));
router.get('/mbti/results/:resultId', PersonalityAssessmentController.getMBTIResults.bind(PersonalityAssessmentController));
router.get('/mbti/user-results', verifyToken, PersonalityAssessmentController.getUserMBTIResults.bind(PersonalityAssessmentController));
router.get('/api/mbti/latest/:userId', PersonalityAssessmentController.getLatestMBTIResult.bind(PersonalityAssessmentController));

// Big Five Assessment Routes
router.get('/big-five', PersonalityAssessmentController.getBigFiveAssessment.bind(PersonalityAssessmentController));
router.post('/big-five/submit', verifyToken, PersonalityAssessmentController.submitBigFiveAssessment.bind(PersonalityAssessmentController));
router.get('/big-five/results/:resultId', PersonalityAssessmentController.getBigFiveResults.bind(PersonalityAssessmentController));
router.get('/big-five/user-results', verifyToken, PersonalityAssessmentController.getUserBigFiveResults.bind(PersonalityAssessmentController));
router.get('/api/big-five/latest/:userId', PersonalityAssessmentController.getLatestBigFiveResult.bind(PersonalityAssessmentController));

// DISC Assessment Routes
router.get('/disc', PersonalityAssessmentController.getDISCAssessment.bind(PersonalityAssessmentController));
router.post('/disc/submit', verifyToken, PersonalityAssessmentController.submitDISCAssessment.bind(PersonalityAssessmentController));
router.get('/disc/results/:resultId', PersonalityAssessmentController.getDISCResults.bind(PersonalityAssessmentController));
router.get('/disc/user-results', verifyToken, PersonalityAssessmentController.getUserDISCResults.bind(PersonalityAssessmentController));
router.get('/api/disc/latest/:userId', PersonalityAssessmentController.getLatestDISCResult.bind(PersonalityAssessmentController));

// Frontend routes
router.get('/', (req, res, next) => {
    console.log('Personality assessments frontend route hit!');
    PersonalityAssessmentController.getAssessmentHome(req, res, next);
});

// API routes
router.use('/api', (req, res, next) => {
    // This will handle all /api/personality-assessments/api/* routes
    next();
});

module.exports = router;
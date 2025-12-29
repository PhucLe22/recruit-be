const express = require('express');
const router = express.Router();
const PersonalityAssessmentController = require('../app/controllers/users/PersonalityAssessmentController');
const { isLogin } = require('../middlewares/isLogin');

// Frontend routes
router.get('/', (req, res, next) => {
    console.log('Personality assessments frontend route hit!');
    PersonalityAssessmentController.getAssessmentHome(req, res, next);
});

// MBTI Assessment
router.get('/mbti', PersonalityAssessmentController.getMBTIAssessment.bind(PersonalityAssessmentController));
router.post('/mbti/submit', PersonalityAssessmentController.submitMBTIAssessment.bind(PersonalityAssessmentController));
router.get('/mbti/results/:resultId', PersonalityAssessmentController.getMBTIResults.bind(PersonalityAssessmentController));

// Big Five Assessment
router.get('/big-five', PersonalityAssessmentController.getBigFiveAssessment.bind(PersonalityAssessmentController));
router.post('/big-five/submit', PersonalityAssessmentController.submitBigFiveAssessment.bind(PersonalityAssessmentController));
router.get('/big-five/results/:resultId', PersonalityAssessmentController.getBigFiveResults.bind(PersonalityAssessmentController));

// DISC Assessment
router.get('/disc', PersonalityAssessmentController.getDISCAssessment.bind(PersonalityAssessmentController));
router.post('/disc/submit', PersonalityAssessmentController.submitDISCAssessment.bind(PersonalityAssessmentController));
router.get('/disc/results/:resultId', PersonalityAssessmentController.getDISCResults.bind(PersonalityAssessmentController));

// API routes for user assessment history
router.get('/mbti/user-results', isLogin, PersonalityAssessmentController.getUserMBTIResults.bind(PersonalityAssessmentController));
router.get('/big-five/user-results', isLogin, PersonalityAssessmentController.getUserBigFiveResults.bind(PersonalityAssessmentController));
router.get('/disc/user-results', isLogin, PersonalityAssessmentController.getUserDISCResults.bind(PersonalityAssessmentController));

module.exports = router;

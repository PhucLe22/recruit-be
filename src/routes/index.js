const express = require('express');
const router = express.Router();

// Import all route files
const homeRouter = require('./home');
const usersRouter = require('./users');
const jobRouter = require('./job');
const cvRouter = require('./cv');
const businessRouter = require('./business');
const adminRouter = require('./admin');
const authRouter = require('./auth');
const otpRouter = require('./otp');
const searchRouter = require('./search');
const userBehaviorRouter = require('./user-behavior');
const recommendationRouter = require('./recommendations');
const aiSearchRouter = require('./ai-search');
const personalityAssessmentsRouter = require('./personality-assessments');
const frontendPersonalityAssessmentsRouter = require('./frontend/personality-assessments');
const cvAssistantRouter = require("./cv-assistant");
const aiServiceRouter = require("./ai-service");

// Mount all routes
router.use('/otp', otpRouter);
router.use('/admin', adminRouter);
router.use('/business', businessRouter);
router.use('/cv', cvRouter);
router.use('/jobs', jobRouter);
router.use('/users', usersRouter);
router.use('/auth', authRouter);
router.use('/search', searchRouter);
router.use('/api/behavior', userBehaviorRouter);
router.use('/api/recommendations', recommendationRouter);
router.use('/api/ai', aiSearchRouter);
// API routes for personality assessments
router.use('/api/personality-assessments', personalityAssessmentsRouter);

// Frontend routes for personality assessments
router.use('/personality-assessments', frontendPersonalityAssessmentsRouter);
router.use('/cv-assistant', cvAssistantRouter);
router.use('/ai-service', aiServiceRouter);

// Home route should be last to avoid catching other routes
router.use('/', homeRouter);

// Export the router
module.exports = function(app) {
    console.log('Mounting routes...');
    try {
        // Mount the router to the app
        app.use(router);
        console.log('✓ All routes mounted successfully');
        return router;
    } catch (error) {
        console.error('Error mounting routes:', error);
        throw error;
    }
};

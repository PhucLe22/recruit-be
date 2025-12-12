const express = require('express');
const router = express.Router();
const userJobController = require('../app/controllers/users/UserJobController');
const applyController = require('../app/controllers/job/ApplyController');
const { requireUserAuth } = require('../middlewares/isLogin');

// User profile page
router.get('/profile', (req, res) => {
  res.render('users/profile', {
    title: 'User Profile',
    user: req.session.user || null
  });
});

// User settings page
router.get('/settings', (req, res) => {
  res.render('users/settings', {
    title: 'User Settings',
    user: req.session.user || null
  });
});

// User saved jobs page
router.get('/saved-jobs', requireUserAuth, userJobController.savedJobs);

// User applied jobs page
router.get('/applied-jobs', requireUserAuth, userJobController.appliedJobs);

// API to get user's applied jobs
router.get('/applied-jobs/api', requireUserAuth, applyController.getUserApplications);

// API to unsave a job
router.delete('/saved-jobs/:jobId', requireUserAuth, userJobController.unsaveJob);

module.exports = router;

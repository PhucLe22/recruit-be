const express = require('express');
const router = express.Router();
const userJobController = require('../app/controllers/users/UserJobController');
const applyController = require('../app/controllers/job/ApplyController');
const UserController = require('../app/controllers/users/UserController');
const userController = new UserController();
const { requireUserAuth } = require('../middlewares/isLogin');
const { uploadAvatar } = require('../helpers/uploadHelper');

router.get('/profile', requireUserAuth, userController.showProfile.bind(userController));
router.post('/profile', requireUserAuth, userController.updateProfile.bind(userController));
router.get('/saved-jobs', requireUserAuth, userJobController.savedJobs);
router.get('/applied-jobs', requireUserAuth, userJobController.appliedJobs);
router.get('/applied-jobs/api', requireUserAuth, applyController.getUserApplications);
router.delete('/saved-jobs/:jobId', requireUserAuth, userJobController.unsaveJob);
router.post('/upload-avatar', requireUserAuth, uploadAvatar.single('avatar'), userController.uploadAvatar.bind(userController));
// CV Routes
router.get('/cv', requireUserAuth, userController.viewCV.bind(userController));
// Handle both /view-cv and /view-cv/:userId
router.get(['/view-cv', '/view-cv/:userId'], requireUserAuth, userController.viewCV.bind(userController));
// Handle both /download-cv and /download-cv/:userId
router.get(['/download-cv', '/download-cv/:userId'], requireUserAuth, userController.downloadCV.bind(userController));

module.exports = router;

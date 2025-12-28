const express = require('express');
const router = express.Router();
const ActivityTracker = require('../middlewares/activityTracker');
const jobController = require('../app/controllers/job/JobController');
const searchController = require('../app/controllers/job/SearchController');
const applyController = require('../app/controllers/job/ApplyController');
const saveJobController = require('../app/controllers/job/SaveJobController');
const jobCategoryController = require('../app/controllers/job/JobCategoryController');
const {isLogin} = require('../middlewares/isLogin');

// Add smart search API endpoint
router.post('/apply/:slug', isLogin, applyController.apply);
router.post('/save/:jobId', isLogin, saveJobController.saveJob);
router.delete('/save/:jobId', isLogin, saveJobController.unsaveJob);
router.get('/saved/:jobId', isLogin, saveJobController.checkJobSaved);
router.get('/export-jobs', jobController.exportJobsForFaiss);
router.get('/search', searchController.search);
router.get('/search-results', searchController.searchResults);
router.get('/api/load-more', jobController.loadMore);
router.get('/category/:slug', jobController.getJobsByCategory);
router.get('/api/search', searchController.apiSearch);
router.get('/grouped-by-field', jobController.getGroupedByField);
router.get('/api/job-fields', jobController.getJobFields);
router.get('/', jobController.index);
router.get('/remote', jobController.remoteJobs);
router.get('/all', jobController.allJobs);
router.get('/all-categories', jobCategoryController.getAllCategories);
router.get('/:slug', ActivityTracker.trackJobView, jobController.show);

module.exports = router;

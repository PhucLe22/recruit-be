const express = require('express');
const router = express.Router();
const searchController = require('../app/controllers/users/search/SearchController');

// Search results page
router.get('/', searchController.search);

// Advanced search
router.get('/advanced', searchController.advancedSearch);

// Search suggestions
router.get('/suggestions', searchController.getSuggestions);

// Search filters
router.get('/filters', searchController.getFilters);

module.exports = router;

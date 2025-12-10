const express = require('express');
const router = express.Router();
const HomeControllerEnhanced = require('../app/controllers/HomeController');

// Home page route
router.get('/', HomeControllerEnhanced.index);

module.exports = router;

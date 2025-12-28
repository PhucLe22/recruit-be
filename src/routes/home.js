const express = require('express');
const router = express.Router();
const HomeController = require('../app/controllers/users/HomeController');
// Home page route
router.get('/', (req, res, next) => HomeController.index(req, res, next));

module.exports = router;

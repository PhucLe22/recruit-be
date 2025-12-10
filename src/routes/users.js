const express = require('express');
const router = express.Router();

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

module.exports = router;

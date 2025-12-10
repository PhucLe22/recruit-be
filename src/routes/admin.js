const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');

// Admin dashboard
router.get('/dashboard', verifyToken, (req, res) => {
  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    user: req.user
  });
});

// Admin users management
router.get('/users', verifyToken, (req, res) => {
  res.render('admin/users', {
    title: 'Users Management',
    user: req.user
  });
});

// Admin jobs management
router.get('/jobs', verifyToken, (req, res) => {
  res.render('admin/jobs', {
    title: 'Jobs Management',
    user: req.user
  });
});

// Admin analytics
router.get('/analytics', verifyToken, (req, res) => {
  res.render('admin/analytics', {
    title: 'Analytics',
    user: req.user
  });
});

module.exports = router;

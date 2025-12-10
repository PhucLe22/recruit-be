const express = require('express');
const router = express.Router();
const { isLogin } = require('../middlewares/isLogin');

// CV Assistant page
router.get('/', isLogin, (req, res) => {
    try {
        res.render('cv-assistant', { 
            title: 'CV Assistant',
            user: req.session.user || null,
            layout: 'main',
            currentUser: req.session.user || null
        });
    } catch (error) {
        console.error('Error rendering CV Assistant page:', error);
        res.status(500).render('error', {
            message: 'An error occurred while loading the CV Assistant',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

module.exports = router;

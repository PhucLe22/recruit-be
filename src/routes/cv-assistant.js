const express = require('express');
const router = express.Router();
const { isLogin } = require('../middlewares/isLogin');

// CV Assistant page
router.get('/', isLogin, async (req, res) => {
    try {
        let userCVData = null;
        
        // If user is logged in, try to get their CV data
        if (req.session?.user) {
            try {
                // Import AIServiceController to get CV data
                const aiController = require('../app/controllers/ai/AIServiceController');
                const username = req.session.user.username || req.session.user.name;
                
                if (username) {
                    const cvResponse = await new Promise((resolve) => {
                        const mockReq = { params: { username } };
                        const mockRes = {
                            json: (data) => resolve(data),
                            status: () => ({ json: (data) => resolve(data) })
                        };
                        aiController.getResume(mockReq, mockRes);
                    });
                    
                    if (!cvResponse.error) {
                        userCVData = cvResponse;
                    }
                }
            } catch (error) {
                console.log('Could not fetch user CV data:', error.message);
            }
        }
        
        res.render('cv-assistant', {
            title: 'CV Assistant',
            user: req.user || req.session.user || null,
            currentUser: req.user || req.session.user || null,
            isLogin: req.isLogin || false,
            userCVData: userCVData,
            aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
            layout: 'main'
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

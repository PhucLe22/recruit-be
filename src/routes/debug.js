const express = require('express');
const router = express.Router();
const User = require('../app/models/User');

// Debug route to list all usernames
router.get('/debug/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username _id email').sort({ username: 1 });
        res.json({
            success: true,
            count: users.length,
            users: users.map(user => ({
                _id: user._id,
                username: user.username,
                email: user.email
            }))
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
});

module.exports = router;

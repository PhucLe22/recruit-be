// This middleware ensures consistent authentication state across all views
const isLogin = require('./isLogin');

function authState(req, res, next) {
    // Get user from session or token
    const user = req.user || (req.session && (req.session.users || req.session.business));
    
    // Set user data for all views
    if (user) {
        res.locals.user = {
            _id: user._id,
            name: user.name || user.username || user.companyName,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            savedJobsCount: user.savedJobs?.length || 0,
            applicationsCount: user.applications?.length || 0
        };
        res.locals.isAuthenticated = true;
    } else {
        res.locals.user = null;
        res.locals.isAuthenticated = false;
    }
    
    next();
}

module.exports = authState;

// Middleware to set layout to false for business routes
module.exports = (req, res, next) => {
    // Set layout to false for all business routes
    res.locals.layout = false;
    next();
};

const Business = require('../app/models/Business');

const businessDataMiddleware = async (req, res, next) => {
  try {
    // If user is authenticated as business, fetch business data
    if (req.user && (req.user.id || req.user._id)) {
      const businessId = req.user.id || req.user._id;
      const business = await Business.findById(businessId);
      
      // Make business data available to all views
      res.locals.business = business;
      
      // Debug logging for CV data
      if (business) {
        console.log('Business data found:', {
          id: business._id,
          companyName: business.companyName,
          hasLogo: !!business.logoPath,
          hasCV: !!business.cvPath,
          cvFilename: business.cvFilename
        });
      } else {
        console.log('No business data found for ID:', businessId);
      }
    }
    
    next();
  } catch (error) {
    console.error('Business data middleware error:', error);
    next();
  }
};

module.exports = businessDataMiddleware;

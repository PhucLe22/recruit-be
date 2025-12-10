const Activity = require('../app/models/Activity');

// Middleware to track user activity
const activityTracker = async (req, res, next) => {
  try {
    // Skip tracking for certain routes
    const skipRoutes = ['/api/', '/static/', '/images/', '/css/', '/js/'];
    const shouldSkip = skipRoutes.some(route => req.path.startsWith(route));
    
    if (shouldSkip) {
      return next();
    }

    // Get user information
    let user = null;
    let business = null;
    
    // Check for regular user
    if (req.session && req.session.users) {
      user = req.session.users;
    }
    
    // Check for business user
    if (req.session && req.session.business) {
      business = req.session.business;
    }

    // Only track if user is logged in
    if (!user && !business) {
      return next();
    }

    // Get job information if applicable
    let jobInfo = null;
    if (req.params.slug) {
      try {
        const Job = require('../app/models/Job');
        const job = await Job.findOne({ slug: req.params.slug });
        if (job) {
          jobInfo = {
            title: job.title,
            type: job.type,
            city: job.city,
            salary: job.salary
          };
        }
      } catch (error) {
        console.error('Error fetching job info for activity tracking:', error);
      }
    }

    // Create activity record
    const activityData = {
      user_id: user ? user._id : null,
      business_id: business ? business._id : null,
      action: getActivityAction(req.method, req.path),
      path: req.path,
      method: req.method,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      timestamp: new Date(),
      job_info: jobInfo
    };

    // Save activity asynchronously (don't block the response)
    Activity.create(activityData).catch(error => {
      console.error('Error saving activity:', error);
    });

    next();
  } catch (error) {
    console.error('Activity tracker error:', error);
    next(); // Continue even if tracking fails
  }
};

// Helper function to determine action type
function getActivityAction(method, path) {
  if (path.includes('/jobs/') && path.includes('/apply')) {
    return 'job_apply';
  }
  if (path.includes('/jobs/') && method === 'GET') {
    return 'job_view';
  }
  if (path.includes('/jobs/save')) {
    return 'job_save';
  }
  if (path.includes('/jobs/unsave')) {
    return 'job_unsave';
  }
  if (path.includes('/profile')) {
    return 'profile_view';
  }
  if (path.includes('/search')) {
    return 'job_search';
  }
  if (path.includes('/login')) {
    return 'login';
  }
  if (path.includes('/register')) {
    return 'register';
  }
  if (path.includes('/logout')) {
    return 'logout';
  }
  
  return 'page_view';
}

// Middleware to track job views specifically
const trackJobView = async (req, res, next) => {
  try {
    const { slug, id } = req.params;
    const jobIdentifier = slug || id;
    
    if (!jobIdentifier) {
      return next();
    }

    let user = null;
    let business = null;
    
    if (req.session && req.session.users) {
      user = req.session.users;
    }
    
    if (req.session && req.session.business) {
      business = req.session.business;
    }

    if (!user && !business) {
      return next();
    }

    // Get job information
    let jobInfo = null;
    try {
      const Job = require('../app/models/Job');
      const job = await Job.findOne({ 
        $or: [{ slug: jobIdentifier }, { _id: jobIdentifier }] 
      });
      if (job) {
        jobInfo = {
          title: job.title,
          type: job.type,
          city: job.city,
          salary: job.salary
        };
      }
    } catch (error) {
      console.error('Error fetching job info for view tracking:', error);
    }

    // Create activity record for job view
    const activityData = {
      user_id: user ? user._id : null,
      business_id: business ? business._id : null,
      action: 'job_view',
      path: req.path,
      method: req.method,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      timestamp: new Date(),
      job_info: jobInfo
    };

    // Save asynchronously
    Activity.create(activityData).catch(error => {
      console.error('Error saving job view activity:', error);
    });

    next();
  } catch (error) {
    console.error('Job view tracker error:', error);
    next();
  }
};

// Middleware to track job applications
const trackJobApplication = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return next();
    }

    let user = null;
    
    if (req.session && req.session.users) {
      user = req.session.users;
    }

    if (!user) {
      return next();
    }

    // Get job information
    let jobInfo = null;
    try {
      const Job = require('../app/models/Job');
      const job = await Job.findOne({ slug: slug });
      if (job) {
        jobInfo = {
          title: job.title,
          type: job.type,
          city: job.city,
          salary: job.salary
        };
      }
    } catch (error) {
      console.error('Error fetching job info for application tracking:', error);
    }

    // Create activity record for job application
    const activityData = {
      user_id: user._id,
      action: 'job_apply',
      path: req.path,
      method: req.method,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      timestamp: new Date(),
      job_info: jobInfo
    };

    // Save asynchronously
    Activity.create(activityData).catch(error => {
      console.error('Error saving job application activity:', error);
    });

    next();
  } catch (error) {
    console.error('Job application tracker error:', error);
    next();
  }
};

// Middleware to track job saves
const trackJobSave = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return next();
    }

    let user = null;
    
    if (req.session && req.session.users) {
      user = req.session.users;
    }

    if (!user) {
      return next();
    }

    // Get job information
    let jobInfo = null;
    try {
      const Job = require('../app/models/Job');
      const job = await Job.findById(jobId);
      if (job) {
        jobInfo = {
          title: job.title,
          type: job.type,
          city: job.city,
          salary: job.salary
        };
      }
    } catch (error) {
      console.error('Error fetching job info for save tracking:', error);
    }

    const action = req.method === 'POST' ? 'job_save' : 'job_unsave';

    // Create activity record
    const activityData = {
      user_id: user._id,
      action: action,
      path: req.path,
      method: req.method,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      timestamp: new Date(),
      job_info: jobInfo
    };

    // Save asynchronously
    Activity.create(activityData).catch(error => {
      console.error('Error saving job save activity:', error);
    });

    next();
  } catch (error) {
    console.error('Job save tracker error:', error);
    next();
  }
};

// Function to get user activity statistics
const getUserActivityStats = async (userId) => {
  try {
    const stats = await Activity.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          latest: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return stats;
  } catch (error) {
    console.error('Error getting user activity stats:', error);
    return [];
  }
};

// Function to get job view statistics
const getJobViewStats = async (jobId) => {
  try {
    const stats = await Activity.countDocuments({
      'job_info.title': { $exists: true },
      action: 'job_view'
    });

    return stats;
  } catch (error) {
    console.error('Error getting job view stats:', error);
    return 0;
  }
};

module.exports = {
  activityTracker,
  trackJobView,
  trackJobApplication,
  trackJobSave,
  getUserActivityStats,
  getJobViewStats
};

const Job = require('../../../app/models/Job');
const AppliedJobs = require('../../../app/models/AppliedJobs');
const Business = require('../../../app/models/Business');

class DashboardController {
  // Show dashboard
  async showDashboard(req, res) {
    try {
      if (!req.session.business) {
        return res.redirect('/business/login');
      }

      const businessId = req.session.business._id;

      // Get dashboard stats
      const [
        totalJobs,
        activeJobs,
        totalApplications,
        recentApplications,
        recentJobs
      ] = await Promise.all([
        Job.countDocuments({ businessId }),
        Job.countDocuments({ businessId, isActive: true, expiryTime: { $gte: new Date() } }),
        AppliedJobs.countDocuments({ business_id: businessId }),
        AppliedJobs.find({ business_id: businessId })
          .populate('user_id', 'fullName email phone')
          .populate('job_id', 'title')
          .sort({ applied_at: -1 })
          .limit(5),
        Job.find({ businessId })
          .sort({ createdAt: -1 })
          .limit(5)
      ]);

      // Get application stats by status
      const applicationStats = await AppliedJobs.aggregate([
        { $match: { business_id: businessId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get job views stats (simplified)
      const jobViews = await Job.aggregate([
        { $match: { businessId } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$views' },
            avgViews: { $avg: '$views' }
          }
        }
      ]);

      const stats = {
        totalJobs,
        activeJobs,
        totalApplications,
        totalViews: jobViews[0]?.totalViews || 0,
        avgViews: Math.round(jobViews[0]?.avgViews || 0)
      };

      // Format application stats
      const appStats = {
        pending: 0,
        viewed: 0,
        shortlisted: 0,
        rejected: 0,
        hired: 0
      };

      applicationStats.forEach(stat => {
        appStats[stat._id] = stat.count;
      });

      res.render('businesses/dashboard', {
        layout: 'business',
        business: req.session.business,
        stats,
        applicationStats: appStats,
        recentApplications,
        recentJobs,
        title: 'Dashboard',
        description: 'Tổng quan hoạt động tuyển dụng'
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).render('error', {
        message: 'Lỗi khi tải dashboard',
        error
      });
    }
  }

  // Get dashboard data (API endpoint)
  async getDashboardData(req, res) {
    try {
      if (!req.session.business) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const businessId = req.session.business._id;
      const { period = '7d' } = req.query;

      // Calculate date range
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case '1d':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      // Get time series data
      const applicationsByDay = await AppliedJobs.aggregate([
        {
          $match: {
            business_id: businessId,
            applied_at: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$applied_at'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const jobsByDay = await Job.aggregate([
        {
          $match: {
            businessId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Get top performing jobs
      const topJobs = await Job.find({ businessId })
        .sort({ views: -1, applicationCount: -1 })
        .limit(5)
        .select('title views applicationCount createdAt');

      res.json({
        success: true,
        data: {
          applicationsByDay,
          jobsByDay,
          topJobs
        }
      });
    } catch (error) {
      console.error('Get dashboard data error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard data',
        error: error.message
      });
    }
  }

  // Get application trends
  async getApplicationTrends(req, res) {
    try {
      if (!req.session.business) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const businessId = req.session.business._id;
      const { period = '30d' } = req.query;

      // Calculate date range
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      // Get application trends
      const trends = await AppliedJobs.aggregate([
        {
          $match: {
            business_id: businessId,
            applied_at: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$applied_at' },
              month: { $month: '$applied_at' },
              day: { $dayOfMonth: '$applied_at' }
            },
            applications: { $sum: 1 },
            pending: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
              }
            },
            viewed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'viewed'] }, 1, 0]
              }
            },
            shortlisted: {
              $sum: {
                $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0]
              }
            },
            rejected: {
              $sum: {
                $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
              }
            },
            hired: {
              $sum: {
                $cond: [{ $eq: ['$status', 'hired'] }, 1, 0]
              }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      res.json({
        success: true,
        trends
      });
    } catch (error) {
      console.error('Get application trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching application trends',
        error: error.message
      });
    }
  }
}

module.exports = new DashboardController();

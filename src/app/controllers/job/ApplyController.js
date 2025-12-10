const Job = require('../../../app/models/Job');
const AppliedJobs = require('../../../app/models/AppliedJobs');
const CV = require('../../../app/models/CV');
const Business = require('../../../app/models/Business');
const User = require('../../../app/models/User');
const ActivityTracker = require('../../../middlewares/activityTracker');

class ApplyController {
  // Apply for a job
  async apply(req, res) {
    try {
      const userId = req.user?._id;
      const { jobId } = req.params;
      const { cvId, coverLetter, notes } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if job exists and is active
      const job = await Job.findById(jobId).populate('businessId');
      if (!job || job.expiryTime < new Date()) {
        return res.status(404).json({
          success: false,
          message: 'Job not found or expired'
        });
      }

      // Check if already applied
      const existingApplication = await AppliedJobs.findOne({
        user_id: userId,
        job_id: jobId
      });

      if (existingApplication) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied for this job'
        });
      }

      // Verify CV belongs to user
      if (cvId) {
        const cv = await CV.findById(cvId);
        if (!cv || cv.user_id.toString() !== userId) {
          return res.status(400).json({
            success: false,
            message: 'Invalid CV'
          });
        }
      }

      // Create application
      const application = new AppliedJobs({
        user_id: userId,
        job_id: jobId,
        business_id: job.businessId._id,
        cv_id: cvId || null,
        cover_letter: coverLetter || null,
        notes: notes || null
      });

      await application.save();

      // Track activity
      await ActivityTracker.trackJobApplication(userId, jobId, {
        cvId,
        coverLetter: coverLetter ? 'provided' : null,
        notes: notes ? 'provided' : null
      }, req);

      // Update job application count
      await Job.findByIdAndUpdate(jobId, {
        $inc: { applicationCount: 1 }
      });

      res.json({
        success: true,
        message: 'Application submitted successfully',
        application: {
          id: application._id,
          appliedAt: application.applied_at,
          status: application.status
        }
      });
    } catch (error) {
      console.error('Apply error:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting application',
        error: error.message
      });
    }
  }

  // Get user's applications
  async getUserApplications(req, res) {
    try {
      const userId = req.user?._id;
      const { page = 1, limit = 10, status } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const applications = await AppliedJobs.getUserApplications(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });

      const total = await AppliedJobs.countDocuments({
        user_id: userId,
        ...(status && { status })
      });

      res.json({
        success: true,
        applications,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching applications',
        error: error.message
      });
    }
  }

  // Get application details
  async getApplication(req, res) {
    try {
      const userId = req.user?._id;
      const { applicationId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const application = await AppliedJobs.findById(applicationId)
        .populate('job_id')
        .populate('business_id', 'companyName logo email phone')
        .populate('cv_id');

      if (!application || application.user_id.toString() !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      res.json({
        success: true,
        application
      });
    } catch (error) {
      console.error('Get application error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching application',
        error: error.message
      });
    }
  }

  // Withdraw application
  async withdraw(req, res) {
    try {
      const userId = req.user?._id;
      const { applicationId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const application = await AppliedJobs.findById(applicationId);

      if (!application || application.user_id.toString() !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Only allow withdrawal if status is pending
      if (application.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Cannot withdraw application after it has been viewed'
        });
      }

      await application.deleteOne();

      // Update job application count
      await Job.findByIdAndUpdate(application.job_id, {
        $inc: { applicationCount: -1 }
      });

      res.json({
        success: true,
        message: 'Application withdrawn successfully'
      });
    } catch (error) {
      console.error('Withdraw error:', error);
      res.status(500).json({
        success: false,
        message: 'Error withdrawing application',
        error: error.message
      });
    }
  }

  // Get application stats
  async getStats(req, res) {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const stats = await AppliedJobs.getApplicationStats(userId);

      const result = {
        pending: 0,
        viewed: 0,
        shortlisted: 0,
        rejected: 0,
        hired: 0,
        total: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
      });

      res.json({
        success: true,
        stats: result
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching application stats',
        error: error.message
      });
    }
  }
}

module.exports = new ApplyController();

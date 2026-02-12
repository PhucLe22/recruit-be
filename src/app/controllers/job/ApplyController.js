const Job = require('../../../app/models/Job');
const AppliedJobs = require('../../../app/models/AppliedJobs');
const CV = require('../../../app/models/CV');
const Business = require('../../../app/models/Business');
const User = require('../../../app/models/User');
const ActivityTracker = require('../../../middlewares/activityTracker');
const EmailService = require('../../../services/EmailService');
const fs = require('fs');
const path = require('path');

class ApplyController {
  // Apply for a job
  async apply(req, res, next) {
    try {
      // Validate session
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }

      const userId = req.session.user._id;

      // Get user data
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const { slug } = req.params;

      // Get job
      const job = await Job.findOne({ slug }).populate("businessId");
      if (!job || job.expiryTime < new Date()) {
        return res.status(404).json({
          success: false,
          message: "Job not found or expired"
        });
      }

      // Check existing application
      const existingApplication = await AppliedJobs.findOne({
        user_id: userId,
        job_id: job._id
      });

      if (existingApplication) {
        return res.status(400).json({
          success: false,
          message: "You have already applied for this job"
        });
      }

      // Handle CV: check existing or process uploaded file
      let cv = await CV.findOne({ username: user.username });

      if (req.file) {
        // User uploaded a new CV file during application
        if (cv) {
          // Delete old file from disk if replacing
          if (cv.file_path) {
            try {
              if (fs.existsSync(cv.file_path)) {
                fs.unlinkSync(cv.file_path);
              }
            } catch (err) {
              console.error('Failed to delete old CV file:', err);
            }
          }
          cv.file_path = req.file.path;
          cv.filename = req.file.originalname;
          cv.uploaded_at = new Date();
          await cv.save();
        } else {
          // Create new CV record
          cv = await CV.create({
            user_id: userId,
            username: user.username,
            file_path: req.file.path,
            filename: req.file.originalname,
            uploaded_at: new Date(),
          });
        }
        // Update user.cvPath for consistency
        await User.findByIdAndUpdate(userId, { cvPath: req.file.path });
      } else if (!cv) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng tải lên CV để ứng tuyển."
        });
      }

      // Create application
      const businessId = job.businessId?._id || job.businessId;
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: "Công ty tuyển dụng không tồn tại."
        });
      }
      const application = new AppliedJobs({
        user_id: userId,
        job_id: job._id,
        business_id: businessId,
        cv_id: cv._id
      });
      await application.save();

      // Trigger real-time update to business dashboard
      try {
        const businessRoutes = require('../../../routes/business');
        if (businessRoutes.sendApplicationUpdate && job.businessId) {
          // Populate application data for real-time update
          const populatedApplication = await AppliedJobs.findById(application._id)
            .populate('user_id', 'fullName email')
            .populate('job_id', 'title');
          
          businessRoutes.sendApplicationUpdate(job.businessId._id, populatedApplication);
          console.log('Real-time update triggered for business:', job.businessId._id);
        }
      } catch (realtimeError) {
        console.error('Failed to send real-time update:', realtimeError);
      }

      // Get business details from AppliedJobs
      const appliedJob = await AppliedJobs.findById(application._id);

      let business = null;
      if (appliedJob.business_id) {
        business = await Business.findById(appliedJob.business_id);
      }

      // Fallback to job's businessId if business lookup fails
      if (!business && job.businessId) {
        business = await Business.findById(job.businessId._id || job.businessId);
      }

      // Increase application count
      await Job.findByIdAndUpdate(job._id, {
        $inc: { applicationCount: 1 }
      });

      // Send confirmation email to applicant
      try {
        const templatePath = path.join(__dirname, '../../../templates/job-application-confirmation.html');
        const emailTemplate = fs.readFileSync(templatePath, 'utf8');

        const emailContent = emailTemplate
          .replace(/\{\{applicantName\}\}/g, user.name || user.username)
          .replace(/\{\{jobTitle\}\}/g, job.title)
          .replace(/\{\{companyName\}\}/g, business?.companyName || 'Unknown Company')
          .replace(/\{\{appliedDate\}\}/g, new Date().toLocaleDateString())
          .replace(/\{\{applicationId\}\}/g, application._id)
          .replace(/\{\{dashboardUrl\}\}/g, `${req.app.locals.baseUrl}/dashboard`);

        await EmailService.sendEmail(
          user.email,
          'Application Submitted Successfully',
          emailContent
        );
      } catch (emailError) {
        console.error('Failed to send application confirmation email:', emailError);
        // Continue with response even if email fails
      }

      return res.json({
        success: true,
        message: "Application submitted successfully",
        application: {
          id: application._id,
          appliedAt: application.applied_at,
          status: application.status
        }
      });

    } catch (error) {
      // Clean up uploaded file if something went wrong
      if (req.file && req.file.path) {
        try {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        } catch (cleanupErr) {
          console.error('Failed to clean up uploaded file:', cleanupErr);
        }
      }
      console.error("Apply error:", error.message, error.stack);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi gửi đơn ứng tuyển. Vui lòng thử lại.",
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  }


  // Get user's applications
  async getUserApplications(req, res) {
    try {
      // Use session-based authentication like other methods
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.session.user._id;
      const { page = 1, limit = 10, status } = req.query;

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

      if (!application || application.user_id !== userId) {
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

      if (!application || application.user_id !== userId) {
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

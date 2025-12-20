const Job = require('../../../app/models/Job');
const AppliedJobs = require('../../../app/models/AppliedJobs');
const User = require('../../../app/models/User');

class JobDetailController {
    // View job details and applications
    async viewJobDetail(req, res, next) {
        try {
            const { id } = req.params;
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

            if (!businessId) {
                return res.redirect('/business/login-page');
            }

            // Find job with business verification
            const job = await Job.findOne({ _id: id, business_id: businessId });
            if (!job) {
                return res.status(404).render('error', {
                    message: 'Job not found',
                    error: 'The requested job does not exist or you do not have permission to view it.'
                });
            }

            // Get all applications for this job
            const applications = await AppliedJobs.find({ job_id: id })
                .populate('user_id', 'fullName email phone avatar')
                .sort({ applied_at: -1 });

            // Calculate application statistics
            const stats = {
                totalApplications: applications.length,
                pendingApplications: applications.filter(app => app.status === 'pending').length,
                shortlistedApplications: applications.filter(app => app.status === 'shortlisted').length,
                rejectedApplications: applications.filter(app => app.status === 'rejected').length,
                hiredApplications: applications.filter(app => app.status === 'hired').length,
                viewedApplications: applications.filter(app => app.status === 'viewed').length
            };

            // Format applications for display
            const formattedApplications = applications.map(app => ({
                ...app.toObject(),
                applied_at: app.applied_at.toLocaleDateString('vi-VN'),
                statusBadge: this.getStatusBadge(app.status)
            }));

            // Format job details
            const formattedJob = {
                ...job.toObject(),
                createdAt: job.createdAt.toLocaleDateString('vi-VN'),
                deadline: job.deadline ? job.deadline.toLocaleDateString('vi-VN') : null,
                salary: job.salary || 'Negotiable',
                status: job.status || 'active'
            };

            res.render('business/job-detail', {
                layout: false,
                job: formattedJob,
                applications: formattedApplications,
                stats,
                title: `${job.title} - Job Details`,
                description: `View details and applications for ${job.title} position`
            });

        } catch (error) {
            console.error('Error viewing job detail:', error);
            next(error);
        }
    }

    // Helper method for status badges
    getStatusBadge(status) {
        const statusMap = {
            'pending': '<span class="badge bg-warning">Pending</span>',
            'viewed': '<span class="badge bg-info">Viewed</span>',
            'shortlisted': '<span class="badge bg-primary">Shortlisted</span>',
            'rejected': '<span class="badge bg-danger">Rejected</span>',
            'hired': '<span class="badge bg-success">Hired</span>'
        };
        return statusMap[status] || `<span class="badge bg-secondary">${status}</span>`;
    }
}

module.exports = new JobDetailController();

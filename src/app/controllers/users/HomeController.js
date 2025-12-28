const Job = require('../../../app/models/Job');
const { formatRelativeTime } = require('../../../helpers/dateHelper');

/**
 * Home Controller
 * Handles requests for the home page
 */
class HomeController {
    /**
     * Render the home page
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static async index(req, res, next) {
        try {
            // Fetch active jobs that haven't expired
            const now = new Date();
            const jobs = await Job.find({ 
                expiryTime: { $gte: now },
                status: 'active'
            })
            .populate('businessId', 'companyName logo')
            .sort({ createdAt: -1 })
            .limit(12) // Limit to 12 jobs for the initial load
            .lean();

            // Format jobs for the view
            const validJobs = jobs.map(job => ({
                ...job,
                companyName: job.businessId?.companyName || job.companyName || 'Công ty',
                companyLogo: job.logoPath || job.businessId?.logo || null,
                time: formatRelativeTime(job.createdAt),
                salary: job.salary || 'Thỏa thuận',
                location: job.city || 'Địa điểm',
                type: job.type || 'Toàn thời gian',
                description: job.description || 'Mô tả công việc sẽ được cập nhật',
                featured: job.isRecommended || false,
                remote: job.type === 'Remote' || job.type === 'remote'
            }));

            // Render the home page with jobs data
            res.render('home', {
                title: 'Trang chủ',
                user: req.user || null,
                validJobs: validJobs || []
            });
        } catch (error) {
            console.error('Error in HomeController.index:', error);
            // Still render the page even if there's an error
            res.render('home', {
                title: 'Trang chủ',
                user: req.user || null,
                validJobs: []
            });
        }
    }
}

module.exports = HomeController;

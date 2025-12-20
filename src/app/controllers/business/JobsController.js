const Job = require('../../../app/models/Job');
const AppliedJobs = require('../../../app/models/AppliedJobs');

class JobsController {
    // View all jobs for business
    async viewJobs(req, res, next) {
        try {
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

            if (!businessId) {
                return res.redirect('/business/login-page');
            }

            // Pagination settings
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Search and filter parameters
            const search = req.query.search || '';
            const status = req.query.status || '';
            const field = req.query.field || '';

            // Build search query
            let query = { business_id: businessId };
            
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { field: { $regex: search, $options: 'i' } },
                    { location: { $regex: search, $options: 'i' } }
                ];
            }
            
            if (status) {
                query.status = status;
            }
            
            if (field) {
                query.field = { $regex: field, $options: 'i' };
            }

            // Get jobs with pagination
            const jobs = await Job.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            // Get total count for pagination
            const totalJobs = await Job.countDocuments(query);

            // Calculate application statistics for each job
            const jobsWithStats = await Promise.all(
                jobs.map(async (job) => {
                    const applicationCount = await AppliedJobs.countDocuments({ job_id: job._id });
                    const pendingCount = await AppliedJobs.countDocuments({ 
                        job_id: job._id, 
                        status: 'pending' 
                    });
                    const shortlistedCount = await AppliedJobs.countDocuments({ 
                        job_id: job._id, 
                        status: 'shortlisted' 
                    });
                    const hiredCount = await AppliedJobs.countDocuments({ 
                        job_id: job._id, 
                        status: 'hired' 
                    });

                    return {
                        ...job.toObject(),
                        applicationCount,
                        pendingCount,
                        shortlistedCount,
                        hiredCount,
                        createdAt: job.createdAt.toLocaleDateString('vi-VN'),
                        deadline: job.deadline ? job.deadline.toLocaleDateString('vi-VN') : null
                    };
                })
            );

            // Calculate statistics
            const stats = {
                totalJobs: totalJobs,
                activeJobs: await Job.countDocuments({ 
                    business_id: businessId, 
                    status: 'active' 
                }),
                totalApplications: await AppliedJobs.countDocuments({ 
                    business_id: businessId 
                }),
                pendingApplications: await AppliedJobs.countDocuments({ 
                    business_id: businessId, 
                    status: 'pending' 
                })
            };

            res.render('business/jobs', {
                layout: false,
                jobs: jobsWithStats,
                stats,
                currentPage: page,
                totalPages: Math.ceil(totalJobs / limit),
                hasNextPage: page < Math.ceil(totalJobs / limit),
                hasPrevPage: page > 1,
                search,
                status,
                field,
                title: 'Manage Jobs',
                description: 'View and manage your job postings and applications'
            });

        } catch (error) {
            console.error('Error viewing jobs:', error);
            next(error);
        }
    }
}

module.exports = new JobsController();

const Job = require('../../models/Job');
const JobField = require('../../models/JobField');
const { formatDate } = require('../../../middlewares/formatDate');

class JobCategoryController {
    // Get all job categories with job counts
    async getAllCategories(req, res, next) {
        try {
            const now = new Date();

            // Get all job fields with job counts using aggregation
            const fieldsWithJobs = await JobField.aggregate([
                {
                    $lookup: {
                        from: 'jobs',
                        let: { fieldName: '$name' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $gte: ['$expiryTime', now] },
                                            {
                                                $or: [
                                                    { $eq: ['$field', '$$fieldName'] },
                                                    { $eq: ['$jobField', '$$fieldName'] },
                                                    {
                                                        $or: [
                                                            { $regexMatch: { 
                                                                input: '$$fieldName', 
                                                                regex: { $ifNull: ['$field', ''] },
                                                                options: 'i' 
                                                            }},
                                                            { $regexMatch: { 
                                                                input: '$$fieldName', 
                                                                regex: { $ifNull: ['$jobField', ''] },
                                                                options: 'i' 
                                                            }}
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    title: 1,
                                    slug: 1,
                                    salary: 1,
                                    city: 1,
                                    type: 1,
                                    description: 1,
                                    logoPath: 1,
                                    companyName: 1,
                                    businessId: 1,
                                    createdAt: 1
                                }
                            },
                            { $limit: 5 } // Limit to 5 jobs per category
                        ],
                        as: 'jobs'
                    }
                },
                {
                    $addFields: {
                        jobCount: { $size: '$jobs' }
                    }
                },
                {
                    $sort: { jobCount: -1, name: 1 }
                }
            ]);

            // Populate business info for each job
            const populatedFields = await Job.populate(fieldsWithJobs, {
                path: 'jobs.businessId',
                select: 'companyName logo',
                model: 'Business'
            });

            // Format the data for the view
            const formattedFields = populatedFields.map(field => ({
                ...field,
                icon: field.icon || 'fa-briefcase', // Add default icon
                jobs: field.jobs.map(job => ({
                    id: job._id,
                    slug: job.slug,
                    title: job.title,
                    company: job.businessId?.companyName || job.companyName || 'Công ty',
                    salary: job.salary || 'Thỏa thuận',
                    location: job.city || job.location || 'Hà Nội',
                    type: job.type || 'Toàn thời gian',
                    description: job.description ?
                        (job.description.length > 120 ? 
                         job.description.substring(0, 120) + '...' : 
                         job.description) :
                        'Mô tả chưa được cập nhật...',
                    createdAt: formatDate(job.createdAt),
                    companyLogo: job.logoPath || job.businessId?.logo || null
                }))
            }));

            // Filter out fields with no jobs
            const fieldsWithJobsOnly = formattedFields.filter(field => field.jobCount > 0);

            res.render('jobs/all-categories', {
                title: 'Tất cả ngành nghề',
                fieldsWithJobs: fieldsWithJobsOnly,
                totalFields: fieldsWithJobsOnly.length,
                totalJobs: fieldsWithJobsOnly.reduce((sum, field) => sum + field.jobCount, 0),
                layout: 'main',
                user: req.account || null,
                isLogin: req.isAuthenticated ? req.isAuthenticated() : false
            });

        } catch (error) {
            console.error('Error in getAllCategories:', error);
            next(error);
        }
    }

    // Get jobs by category slug
    async getJobsByCategory(req, res, next) {
        try {
            const { slug } = req.params;
            const now = new Date();
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const skip = (page - 1) * limit;

            // Find the job field by slug
            const jobField = await JobField.findOne({ slug });
            if (!jobField) {
                return res.status(404).render('404', {
                    title: 'Không tìm thấy danh mục',
                    message: 'Danh mục công việc không tồn tại hoặc đã bị xóa.'
                });
            }

            // Build query for jobs in this category
            const query = {
                $and: [
                    { expiryTime: { $gte: now } },
                    {
                        $or: [
                            { field: jobField._id },
                            { jobField: jobField._id },
                            { field: jobField.name },
                            { jobField: jobField.name },
                            { field: { $regex: jobField.name, $options: 'i' } },
                            { jobField: { $regex: jobField.name, $options: 'i' } }
                        ]
                    }
                ]
            };

            // Get jobs with pagination
            const [jobs, total] = await Promise.all([
                Job.find(query)
                    .populate('businessId', 'companyName logo')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Job.countDocuments(query)
            ]);

            const totalPages = Math.ceil(total / limit);
            const jobFields = await JobField.find({}).sort({ name: 1 });

            res.render('jobs/category', {
                title: `${jobField.name} - Tuyển dụng, tìm việc làm mới nhất`,
                currentField: {
                    ...jobField.toObject(),
                    jobCount: total
                },
                jobs: jobs.map(job => ({
                    ...job,
                    id: job._id.toString(),
                    company: job.businessId?.companyName || job.companyName || 'Công ty',
                    logo: job.businessId?.logo || job.logoPath || null,
                    location: job.city || job.location || 'Hà Nội',
                    salary: job.salary || 'Thỏa thuận',
                    type: job.type || 'Toàn thời gian',
                    slug: job.slug || `job-${job._id.toString()}`
                })),
                jobFields,
                currentPage: page,
                totalPages,
                totalJobs: total,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                },
                user: req.account || null,
                isLogin: req.isAuthenticated ? req.isAuthenticated() : false
            });

        } catch (error) {
            console.error('Error in getJobsByCategory:', error);
            next(error);
        }
    }
}

module.exports = new JobCategoryController();

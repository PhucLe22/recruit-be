const AppliedJob = require('../../models/AppliedJobs');
const SavedJob = require('../../models/SavedJobs');
const Job = require('../../models/Job');
const Business = require('../../models/Business');

// Helper functions
const getStatusColor = (status) => {
    const colors = {
        pending: '#f59e0b',
        approved: '#10b981',
        rejected: '#ef4444',
        scheduled: '#3b82f6',
    };
    return colors[status] || '#6b7280';
};

const getStatusText = (status) => {
    const texts = {
        pending: 'Đang chờ xét duyệt',
        approved: 'Đã duyệt',
        rejected: 'Bị từ chối',
        scheduled: 'Đã lên lịch phỏng vấn',
    };
    return texts[status] || 'Không xác định';
};

class UserJobController {
    // Trang hiển thị jobs đã ứng tuyển
    async appliedJobs(req, res, next) {
        try {
            // Use req.user directly since req.account should be set by middleware
            const user = req.user || req.account;
            if (!user || !user._id) {
                return res.status(401).send('Unauthorized');
            }
            
            const userId = user._id;

            // Lấy các jobs đã ứng tuyển với populate thông tin chi tiết
            // Thử tìm với ObjectId trước, nếu không có thì thử với String
            let appliedJobs = await AppliedJob.find({ user_id: userId })
                .populate('job_id')
                .populate('business_id')
                .sort({ createdAt: -1 });

            if (appliedJobs.length === 0) {
                appliedJobs = await AppliedJob.find({
                    user_id: userId.toString(),
                })
                    .populate('job_id')
                    .populate('business_id')
                    .sort({ createdAt: -1 });
            }

            // Lấy danh sách job đã lưu để so sánh (cũng thử cả hai cách)
            let savedJobs = await SavedJob.find({ user_id: userId });
            if (savedJobs.length === 0) {
                savedJobs = await SavedJob.find({ user_id: userId.toString() });
            }
            const savedJobIds = savedJobs.map((savedJob) =>
                savedJob.job_id.toString(),
            );

            // Transform data cho template
            const transformedJobs = appliedJobs.map((appliedJob) => {
                const job = appliedJob.job_id;
                const business = appliedJob.business_id;

                if (!job) {
                    return {
                        ...appliedJob.toObject(),
                        isDeleted: true,
                        jobTitle: 'Job đã bị xóa',
                        companyName: 'Công ty không xác định',
                    };
                }

                return {
                    ...appliedJob.toObject(),
                    jobTitle: job.title || 'Không có tiêu đề',
                    slug: job.slug || '', // Add slug for job detail link
                    salary: job.salary || 'Thỏa thuận',
                    city: job.city || 'Không xác định',
                    type: job.type || 'Full-time',
                    description: job.description
                        ? job.description.length > 150
                            ? job.description.substring(0, 150) + '...'
                            : job.description
                        : 'Không có mô tả',
                    companyName:
                        business?.companyName || 'Công ty không xác định',
                    businessId: business?._id,
                    isSaved: savedJobIds.includes(job._id.toString()),
                    isDeleted: false,
                    statusColor: getStatusColor(appliedJob.status),
                    statusText: getStatusText(appliedJob.status),
                    appliedDate:
                        appliedJob.createdAt.toLocaleDateString('vi-VN'),
                };
            });

            res.render('users/applied-jobs', {
                appliedJobs: transformedJobs,
                totalJobs: appliedJobs.length,
                user: req.account,
                isLogin: true,
                styles: ['/css/applied-jobs.css'],
                scripts: ['/js/applied-jobs.js'],
            });
        } catch (error) {
            next(error);
        }
    }

    // Trang hiển thị jobs đã lưu
    async savedJobs(req, res, next) {
        try {
            // Use req.user directly since req.account should be set by middleware
            const user = req.user || req.account;
            if (!user || !user._id) {
                return res.status(401).send('Unauthorized');
            }
            
            const userId = user._id;

            // Lấy các jobs đã lưu với populate thông tin chi tiết
            // Thử tìm với ObjectId trước, nếu không có thì thử với String
            let savedJobs = await SavedJob.find({ user_id: userId })
                .populate({
                    path: 'job_id',
                    populate: {
                        path: 'businessId', // Fixed: businessId not business_id
                        model: 'Business',
                    },
                })
                .sort({ createdAt: -1 });

            // Nếu không tìm thấy với ObjectId, thử với String
            if (savedJobs.length === 0) {
                savedJobs = await SavedJob.find({ user_id: userId.toString() })
                    .populate({
                        path: 'job_id',
                        populate: {
                            path: 'businessId', // Fixed: businessId not business_id
                            model: 'Business',
                        },
                    })
                    .sort({ createdAt: -1 });
            }

            // Lấy danh sách job đã ứng tuyển để so sánh (cũng thử cả hai cách)
            let appliedJobs = await AppliedJob.find({ user_id: userId });
            if (appliedJobs.length === 0) {
                appliedJobs = await AppliedJob.find({
                    user_id: userId.toString(),
                });
            }
            const appliedJobIds = appliedJobs.map((appliedJob) =>
                appliedJob.job_id.toString(),
            );

            // Transform data cho template
            const transformedJobs = savedJobs.map((savedJob) => {
                const job = savedJob.job_id;

                if (!job) {
                    return {
                        ...savedJob.toObject(),
                        isDeleted: true,
                        jobTitle: 'Job đã bị xóa',
                        companyName: 'Công ty không xác định',
                    };
                }

                const business = job.businessId;
                return {
                    ...savedJob.toObject(),
                    jobId: job._id, // Đảm bảo có jobId
                    slug: job.slug || '', // Add slug for job detail and apply links
                    jobTitle: job.title || 'Không có tiêu đề',
                    salary: job.salary || 'Thỏa thuận',
                    city: job.city || 'Không xác định',
                    type: job.type || 'Full-time',
                    description: job.description
                        ? job.description.length > 150
                            ? job.description.substring(0, 150) + '...'
                            : job.description
                        : 'Không có mô tả',
                    companyName:
                        business?.companyName || 'Công ty không xác định',
                    businessId: business?._id,
                    isApplied: appliedJobIds.includes(job._id.toString()),
                    isDeleted: false,
                    savedDate: savedJob.createdAt.toLocaleDateString('vi-VN'),
                };
            });

            res.render('users/saved-jobs', {
                savedJobs: transformedJobs,
                totalJobs: savedJobs.length,
                user: req.account,
                isLogin: true,
            });
        } catch (error) {
            next(error);
        }
    }

    // API để unsave job
    async unsaveJob(req, res, next) {
        try {
            // Use req.user directly since req.account should be set by middleware
            const user = req.user || req.account;
            if (!user || !user._id) {
                return res.status(401).send('Unauthorized');
            }
            
            const userId = user._id;
            const { jobId } = req.params;

            await SavedJob.findOneAndDelete({ user_id: userId, job_id: jobId });

            res.json({
                success: true,
                message: 'Đã xóa job khỏi danh sách lưu',
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserJobController();

const JobApplied = require('../../models/AppliedJobs');
const Job = require('../../models/Job');
const Business = require('../../models/Business');
const { multipleMongooseToObject } = require('../../../util/mongoose');
const { formatDate } = require('../../../middlewares/formatDate');

class BusinessController {
    update(req, res, next) {
        const jobAppliedId = req.params.jobAppliedId;
        const newStatus = req.body.status;

        JobApplied.updateOne({ _id: jobAppliedId }, { status: newStatus })
            .then((result) => {
                console.log('Update result:', result);
                res.json({
                    success: true,
                    message: 'Status updated',
                    status: newStatus,
                });
            })
            .catch((err) => {
                console.error(err);
                res.status(500).json({
                    success: false,
                    message: 'Server error',
                });
            });
    }
    async jobList(req, res, next) {
        try {
            const business = req.account;
            if (!business || !business.id) {
                return res.status(400).send('Business account not found');
            }

            // Pagination settings
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Count total documents for pagination
            const total = await Job.countDocuments({ businessId: business.id });

            // Get paginated jobs
            const jobs = await Job.find({ businessId: business.id })
                .populate({
                    path: 'businessId',
                    select: 'companyName email',
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            const jobsList = jobs.map((job) => ({
                ...job,
                madeDate: formatDate(job.createdAt),
                expiredDate: formatDate(job.expiryTime),
                businessLink: `/business/profile/${job.businessId._id}`,
                business: {
                    name: job.businessId.companyName,
                    email: job.businessId.email,
                    id: job.businessId._id.toString(),
                },
            }));

            const totalPages = Math.ceil(total / limit);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1;

            res.status(200).render('business/jobs/list', {
                jobsList: jobsList,
                layout: false,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage,
                    hasPreviousPage,
                    nextPage: hasNextPage ? page + 1 : null,
                    previousPage: hasPreviousPage ? page - 1 : null
                }
            });
        } catch (error) {
            console.error('Error in jobList:', error);
            next(error);
        }
    }
}

module.exports = new BusinessController();

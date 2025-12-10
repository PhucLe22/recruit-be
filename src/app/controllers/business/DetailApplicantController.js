const AppliedJobs = require('../../../app/models/AppliedJobs');
const User = require('../../../app/models/User');
const { multipleMongooseToObject } = require('../../../util/mongoose');

class DetailApplicantController {
    async detail(req, res, next) {
        try {
            console.log('=== APPLICANTS LIST REQUEST ===');
            console.log('Request URL: ' + req.originalUrl);
            console.log('Request Method: ' + req.method);
            console.log('Request Query: ' + JSON.stringify(req.query, null, 2));
            
            const businessId = req.account.id;
            console.log('Business ID: ' + businessId);

            // Pagination settings
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Count total documents for pagination
            console.log('Counting total applications for business...');
            const total = await AppliedJobs.countDocuments({ businessId });
            console.log('Total applications found:', total);

            // Get job applications with user population
            console.log('Fetching job applications...');
            console.log(`Pagination - Page: ${page}, Limit: ${limit}, Skip: ${skip}`);
            
            let jobApplieds = await AppliedJobs.find({ businessId })
                .populate('userId', 'name fullName email avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
                
            console.log(`Found ${jobApplieds.length} job applications`);
            // If population fails or userId is not properly populated, try manual user lookup
            const enhancedJobApplieds = await Promise.all(
                jobApplieds.map(async (jobApplied) => {
                    const jobAppliedObj = jobApplied.toObject();

                    try {
                        // If userId is populated and has user data
                        if (
                            jobApplied.userId &&
                            typeof jobApplied.userId === 'object'
                        ) {
                            jobAppliedObj.username =
                                jobApplied.userId.name ||
                                jobApplied.userId.fullName ||
                                jobApplied.userId.email ||
                                jobApplied.email;
                            jobAppliedObj.userEmail =
                                jobApplied.userId.email || jobApplied.email;
                            jobAppliedObj.userAvatar = jobApplied.userId.avatar;
                        }
                        // If userId exists but might be string ID, try to find user manually
                        else if (jobApplied.userId) {
                            const User = require('../../models/User');
                            const user = await User.findById(
                                jobApplied.userId,
                            ).select('name fullName email avatar');
                            if (user) {
                                jobAppliedObj.username =
                                    user.name ||
                                    user.fullName ||
                                    user.email ||
                                    jobApplied.email;
                                jobAppliedObj.userEmail =
                                    user.email || jobApplied.email;
                                jobAppliedObj.userAvatar = user.avatar;
                            } else {
                                // Fallback to email if user not found
                                jobAppliedObj.username = jobApplied.email;
                                jobAppliedObj.userEmail = jobApplied.email;
                            }
                        }
                        // No userId available, use email
                        else {
                            jobAppliedObj.username = jobApplied.email;
                            jobAppliedObj.userEmail = jobApplied.email;
                        }
                    } catch (error) {
                        console.error('=== ERROR IN APPLICANTS LIST ===');
                        console.error('Error details:', {
                            message: error.message,
                            stack: error.stack,
                            name: error.name,
                            ...(error.response && { response: error.response.data })
                        });
                        console.error('Request details:', {
                            url: req.originalUrl,
                            method: req.method,
                            query: req.query,
                            params: req.params,
                            body: req.body,
                            businessId: req.account?.id
                        });
                        next(error);
                        // Always fallback to email
                        jobAppliedObj.username = jobApplied.email;
                        jobAppliedObj.userEmail = jobApplied.email;
                    }

                    return jobAppliedObj;
                }),
            );

            const totalPages = Math.ceil(total / limit);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1;

            console.log('Rendering template with data...');
            if (enhancedJobApplieds.length > 0) {
                console.log('Job applications data sample: ' + 
                    JSON.stringify(enhancedJobApplieds[0], (key, value) => {
                        // Handle circular references and undefined values
                        if (value === undefined) return 'undefined';
                        if (typeof value === 'object' && value !== null) {
                            return '[Object]'; // Prevent deep object logging
                        }
                        return value;
                    }, 2));
            }
            
            res.status(200).render('business/applicants', {
                jobApplieds: enhancedJobApplieds,
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
            next(error);
        }
    }
}
module.exports = new DetailApplicantController();

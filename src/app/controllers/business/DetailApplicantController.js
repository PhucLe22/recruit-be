const AppliedJobs = require('../../../app/models/AppliedJobs');
const User = require('../../../app/models/User');
const CV = require('../../../app/models/CV');
const { multipleMongooseToObject } = require('../../../util/mongoose');

class DetailApplicantController {
    // View individual applicant details
    async viewApplicant(req, res, next) {
        try {
            console.log('=== APPLICANT DETAIL REQUEST ===');
            console.log('Application ID:', req.params.id);
            
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;
            const applicationId = req.params.id;

            if (!businessId) {
                return res.redirect('/business/login-page');
            }

            // Find application with all populated data
            const application = await AppliedJobs.findById(applicationId)
                .populate('user_id', 'fullName email phone avatar')
                .populate('job_id', 'title field location salary')
                .populate('cv_id', 'originalName filePath createdAt');

            if (!application) {
                return res.status(404).render('error', {
                    message: 'Application not found',
                    error: 'The requested application could not be found'
                });
            }

            // Verify this application belongs to the business
            if (application.business_id.toString() !== businessId.toString()) {
                return res.status(403).render('error', {
                    message: 'Access denied',
                    error: 'You do not have permission to view this application'
                });
            }

            // Find all CVs for this user
            const userCVs = await CV.find({ user_id: application.user_id._id })
                .sort({ createdAt: -1 });

            // Format data for template
            const formattedApplication = {
                ...application.toObject(),
                applied_at: application.applied_at.toLocaleDateString('vi-VN'),
                user: {
                    ...application.user_id.toObject(),
                    createdAt: application.user_id.createdAt?.toLocaleDateString('vi-VN')
                },
                job: {
                    ...application.job_id.toObject(),
                    createdAt: application.job_id.createdAt?.toLocaleDateString('vi-VN')
                },
                cv: {
                    ...application.cv_id?.toObject(),
                    createdAt: application.cv_id?.createdAt?.toLocaleDateString('vi-VN'),
                    fileSize: application.cv_id?.fileSize ? `${(application.cv_id.fileSize / 1024).toFixed(1)} KB` : 'Unknown'
                }
            };

            const formattedCVs = userCVs.map(cv => ({
                ...cv.toObject(),
                createdAt: cv.createdAt.toLocaleDateString('vi-VN'),
                fileSize: cv.fileSize ? `${(cv.fileSize / 1024).toFixed(1)} KB` : 'Unknown',
                fileUrl: cv.filePath ? `/uploads/cvs/${cv.filePath.split('/').pop()}` : null
            }));

            res.render('business/applicant-detail', {
                layout: 'business',
                application: formattedApplication,
                userCVs: formattedCVs,
                title: `Applicant - ${application.user_id.fullName}`,
                description: `Application details for ${application.job_id.title}`
            });

        } catch (error) {
            console.error('Error viewing applicant details:', error);
            next(error);
        }
    }

    async detail(req, res, next) {
        try {
            console.log('=== APPLICANTS LIST REQUEST ===');
            console.log('Request URL: ' + req.originalUrl);
            console.log('Request Method: ' + req.method);
            console.log('Request Query: ' + JSON.stringify(req.query, null, 2));
            
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;
            console.log('Business ID: ' + businessId);

            // Pagination settings
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Search parameters
            const search = req.query.search || '';
            const status = req.query.status || '';
            const jobTitle = req.query.jobTitle || '';

            // Build search query
            let query = { business_id: businessId };
            
            if (search) {
                // Search by applicant name or email
                query.$or = [
                    { 'user_id.fullName': { $regex: search, $options: 'i' } },
                    { 'user_id.email': { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }
            
            if (status) {
                query.status = status;
            }
            
            if (jobTitle) {
                query['job_id.title'] = { $regex: jobTitle, $options: 'i' };
            }

            // Count total documents for pagination
            console.log('Counting total applications for business...');
            console.log('Search query:', JSON.stringify(query, null, 2));
            const total = await AppliedJobs.countDocuments(query);
            console.log('Total applications found:', total);

            // Get job applications with user population
            console.log('Fetching job applications...');
            console.log(`Pagination - Page: ${page}, Limit: ${limit}, Skip: ${skip}`);
            
            let jobApplieds = await AppliedJobs.find(query)
                .populate('user_id', 'fullName email phone avatar')
                .populate('job_id', 'title')
                .populate('cv_id')
                .sort({ applied_at: -1 })
                .skip(skip)
                .limit(limit);
                
            console.log(`Found ${jobApplieds.length} job applications`);
            // If population fails or user_id is not properly populated, try manual user lookup
            const enhancedJobApplieds = await Promise.all(
                jobApplieds.map(async (jobApplied) => {
                    const jobAppliedObj = jobApplied.toObject();

                    // Map schema fields to template expectations
                    jobAppliedObj.jobTitle = jobApplied.job_id?.title || 'Unknown Position';
                    jobAppliedObj.cvId = jobApplied.cv_id || jobApplied._id;
                    jobAppliedObj.createdAt = jobApplied.applied_at || jobApplied.createdAt;
                    jobAppliedObj.status = jobApplied.status || 'pending';

                    try {
                        // If user_id is populated and has user data
                        if (
                            jobApplied.user_id &&
                            typeof jobApplied.user_id === 'object'
                        ) {
                            console.log('=== POPULATED USER DATA ===');
                            console.log('User object:', JSON.stringify(jobApplied.user_id, null, 2));
                            console.log('Available fields:', Object.keys(jobApplied.user_id));
                            
                            jobAppliedObj.username = jobApplied.user_id.username || jobApplied.user_id.email || jobApplied.email;
                            jobAppliedObj.userEmail = jobApplied.user_id.email || jobApplied.email;
                            jobAppliedObj.userAvatar = jobApplied.user_id.avatar;
                            
                            console.log('Mapped username:', jobAppliedObj.username);
                        }
                        // If user_id exists but might be string ID, try to find user manually
                        else if (jobApplied.user_id) {
                            const User = require('../../models/User');
                            const user = await User.findById(
                                jobApplied.user_id,
                            ).select('username email avatar');
                            if (user) {
                                console.log('=== MANUALLY FETCHED USER ===');
                                console.log('User object:', JSON.stringify(user, null, 2));
                                console.log('Available fields:', Object.keys(user));
                                
                                jobAppliedObj.username = user.username || user.email || jobApplied.email;
                                jobAppliedObj.userEmail = user.email || jobApplied.email;
                                jobAppliedObj.userAvatar = user.avatar;
                                
                                console.log('Mapped username:', jobAppliedObj.username);
                            } else {
                                // Fallback to email if user not found
                                jobAppliedObj.username = jobApplied.email;
                                jobAppliedObj.userEmail = jobApplied.email;
                            }
                        }
                        // No user_id available, use email
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
                search: search,
                status: status,
                jobTitle: jobTitle,
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

    async updateApplicationStatus(req, res, next) {
        try {
            console.log('=== UPDATE APPLICATION STATUS REQUEST ===');
            console.log('Application ID:', req.params.id);
            console.log('New Status:', req.body.status);
            
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;
            const applicationId = req.params.id;
            const { status } = req.body;

            if (!businessId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            if (!status) {
                return res.status(400).json({ success: false, message: 'Status is required' });
            }

            // Find application and verify ownership
            const application = await AppliedJobs.findById(applicationId);
            if (!application) {
                return res.status(404).json({ success: false, message: 'Application not found' });
            }

            if (application.business_id.toString() !== businessId.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            // Update application status
            const updatedApplication = await AppliedJobs.findByIdAndUpdate(
                applicationId,
                { status: status },
                { new: true, runValidators: true }
            );

            if (!updatedApplication) {
                return res.status(400).json({ success: false, message: 'Failed to update application' });
            }

            console.log('Application status updated successfully:', updatedApplication.status);

            res.json({ 
                success: true, 
                message: 'Application status updated successfully',
                data: {
                    id: updatedApplication._id,
                    status: updatedApplication.status
                }
            });

        } catch (error) {
            console.error('Error updating application status:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }
}

module.exports = new DetailApplicantController();

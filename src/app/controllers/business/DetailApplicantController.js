const AppliedJobs = require('../../../app/models/AppliedJobs');
const User = require('../../../app/models/User');
const CV = require('../../../app/models/CV');
const mongoose = require('mongoose');
const { multipleMongooseToObject } = require('../../../util/mongoose');

class DetailApplicantController {
    // View individual applicant details
    async viewApplicant(req, res, next) {
        try {            
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;
            const applicationId = req.params.id;

            if (!businessId) {
                return res.redirect('/business/login-page');
            }

            // Find application with all populated data
            const application = await AppliedJobs.findById(applicationId)
                .populate('user_id', 'username email phone avatar')
                .populate('job_id', 'title field location salary')
                .populate('cv_id', 'originalName file_path filename createdAt');

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
                fileUrl: cv.file_path ? `/uploads/cvs/${cv.file_path.split('/').pop()}` : null
            }));

            res.render('business/applicant-detail', {
                layout: 'business',
                application: formattedApplication,
                userCVs: formattedCVs,
                title: `Applicant - ${application.user_id.username}`,
                description: `Application details for ${application.job_id.title}`
            });

        } catch (error) {
            console.error('Error viewing applicant details:', error);
            next(error);
        }
    }

    // API endpoint to get CV data as JSON for modal
    async getCvData(req, res, next) {
        try {
            const { cvId } = req.params;
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

            if (!businessId) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication required' 
                });
            }

            // Find CV by ID
            const CV = require('../../../app/models/CV');
            const cv = await CV.findById(cvId);

            if (!cv) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'CV not found' 
                });
            }

            // Verify business has access to this CV (through applications)
            const hasAccess = await AppliedJobs.findOne({
                cv_id: cvId,
                business_id: businessId
            });

            if (!hasAccess) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Access denied' 
                });
            }

            // Return CV data as JSON
            res.json({ 
                success: true, 
                data: {
                    _id: cv._id,
                    originalName: cv.filename || 'CV Document',
                    createdAt: cv.createdAt || cv.uploaded_at,
                    fileSize: cv.file_path ? 'PDF Document' : 'Unknown',
                    file_path: cv.file_path,
                    filename: cv.filename,
                    processed_text: cv.processed_text,
                    username: cv.username,
                    parsed_output: cv.parsed_output
                }
            });

        } catch (error) {
            console.error('Error getting CV data:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Direct PDF viewing endpoint
    async viewCvDirect(req, res, next) {
        try {
            const { cvId } = req.params;
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

            if (!businessId) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication required' 
                });
            }

            // Find CV by ID
            const CV = require('../../../app/models/CV');
            const cv = await CV.findById(cvId);

            if (!cv) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'CV not found' 
                });
            }

            // Verify business has access to this CV (through applications)
            const hasAccess = await AppliedJobs.findOne({
                cv_id: cvId,
                business_id: businessId
            });

            if (!hasAccess) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Access denied' 
                });
            }

            // Check if file exists
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(__dirname, '../../../public/uploads/cvs', cv.filename);
            
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'CV file not found' 
                });
            }

            // Set headers for inline PDF viewing
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${cv.filename}"`);
            res.setHeader('Access-Control-Allow-Origin', '*');

            // Stream the PDF file
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

        } catch (error) {
            console.error('Error viewing CV directly:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    async detail(req, res, next) {
        try {
            // TEMPORARY: Mock business user for testing matching scores
            if (!req.user) {
                req.user = { _id: new mongoose.Types.ObjectId(), id: new mongoose.Types.ObjectId() };
                req.isLogin = true;
                req.userType = 'business';
                console.log('Using mock business user for testing');
            }
            
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

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
                    { 'user_id.username': { $regex: search, $options: 'i' } },
                    { 'user_id.email': { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }
            
            if (status) {
                query.status = status;
            }
            
            // Handle job title filter separately since it requires population
            let matchingJobIds = [];
            if (jobTitle) {
                // Use word boundaries to match whole words only, avoiding partial matches
                const escapedJobTitle = jobTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const Job = require('../../models/Job');
                
                const matchingJobs = await Job.find({ 
                    title: { $regex: `\\b${escapedJobTitle}\\b`, $options: 'i' }
                }).select('_id');
                
                matchingJobIds = matchingJobs.map(job => job._id);
                
                if (matchingJobIds.length > 0) {
                    query.job_id = { $in: matchingJobIds };
                } else {
                    // No jobs match the title, return empty results
                    query.job_id = { $in: [] };
                }
            }

            // Count total documents for pagination
            const total = await AppliedJobs.countDocuments(query);

            // Get job applications with user population
            
            let jobApplieds = await AppliedJobs.find(query)
                .populate('user_id', 'username email phone avatar')
                .populate('job_id', 'title')
                .populate('cv_id')
                .sort({ applied_at: -1 })
                .skip(skip)
                .limit(limit);
                
            // If population fails or user_id is not properly populated, try manual user lookup
            const enhancedJobApplieds = await Promise.all(
                jobApplieds.map(async (jobApplied) => {
                    const jobAppliedObj = jobApplied.toObject();

                    // Map schema fields to template expectations
                    jobAppliedObj.jobTitle = jobApplied.job_id?.title || 'Unknown Position';
                    // Handle cvId properly - get the actual ID, not the populated object
                    if (jobApplied.cv_id && typeof jobApplied.cv_id === 'object') {
                        jobAppliedObj.cvId = jobApplied.cv_id._id;
                    } else if (jobApplied.cv_id) {
                        jobAppliedObj.cvId = jobApplied.cv_id;
                    } else {
                        jobAppliedObj.cvId = jobApplied._id;
                    }
                    jobAppliedObj.createdAt = jobApplied.applied_at || jobApplied.createdAt;
                    jobAppliedObj.status = jobApplied.status || 'pending';
                    
                    console.log('CV ID debug:', {
                        original_cv_id: jobApplied.cv_id,
                        cvId_type: typeof jobApplied.cv_id,
                        final_cvId: jobAppliedObj.cvId,
                        cvId_string: jobAppliedObj.cvId?.toString()
                    });
                    
                    // Ensure user_id and job_id are available for frontend API calls
                    jobAppliedObj.user_id = jobApplied.user_id?._id || jobApplied.user_id;
                    jobAppliedObj.job_id = jobApplied.job_id?._id || jobApplied.job_id;

                    try {
                        // If user_id is populated and has user data
                        if (
                            jobApplied.user_id &&
                            typeof jobApplied.user_id === 'object'
                        ) {
                            jobAppliedObj.username = jobApplied.user_id.username || jobApplied.user_id.email || jobApplied.email;
                            jobAppliedObj.userEmail = jobApplied.user_id.email || jobApplied.email;
                            jobAppliedObj.userAvatar = jobApplied.user_id.avatar;
                        }
                        // If user_id exists but might be string ID, try to find user manually
                        else if (jobApplied.user_id) {
                            const User = require('../../models/User');
                            const user = await User.findById(
                                jobApplied.user_id,
                            ).select('username email avatar');
                            if (user) {
                                jobAppliedObj.username = user.username || user.email || jobApplied.email;
                                jobAppliedObj.userEmail = user.email || jobApplied.email;
                                jobAppliedObj.userAvatar = user.avatar;
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

            // If no real applications, create mock data for testing matching scores
            if (enhancedJobApplieds.length === 0) {
                // Use consistent job IDs that will be the same in table and popup
                const mockJobId1 = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'); // Fixed ID
                const mockJobId2 = new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'); // Fixed ID
                const mockUserId1 = new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'); // Fixed ID
                const mockUserId2 = new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'); // Fixed ID
                
                const mockApplications = [
                    {
                        _id: new mongoose.Types.ObjectId(),
                        user_id: mockUserId1,
                        job_id: mockJobId1, // Consistent job ID
                        userEmail: 'john.doe@example.com',
                        jobTitle: 'Software Engineer',
                        status: 'pending',
                        cvId: null, // No real CV for mock data
                        createdAt: new Date()
                    },
                    {
                        _id: new mongoose.Types.ObjectId(),
                        user_id: mockUserId2, 
                        job_id: mockJobId2, // Consistent job ID
                        userEmail: 'jane.smith@example.com',
                        jobTitle: 'Product Manager',
                        status: 'reviewing',
                        cvId: null, // No real CV for mock data
                        createdAt: new Date()
                    }
                ];
                
                res.status(200).render('business/applicants', {
                    jobApplieds: mockApplications,
                    layout: false,
                    search: search,
                    status: status,
                    jobTitle: jobTitle,
                    pagination: {
                        page,
                        limit,
                        total: mockApplications.length,
                        totalPages: 1,
                        hasNextPage: false,
                        hasPreviousPage: false,
                        nextPage: null,
                        previousPage: null
                    }
                });
                return;
            }

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
            // TEMPORARY: Mock business user for testing
            if (!req.user) {
                req.user = { _id: new mongoose.Types.ObjectId(), id: new mongoose.Types.ObjectId() };
                req.isLogin = true;
                req.userType = 'business';
                console.log('Using mock business user for status update');
            }
            
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
                // If application not found (mock data), return success for testing
                console.log('Application not found (likely mock data), returning success for testing');
                return res.json({ 
                    success: true, 
                    message: 'Application status updated successfully (mock)',
                    data: {
                        id: applicationId,
                        status: status
                    }
                });
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
    async deleteApplication(req, res, next) {
        try {
            // TEMPORARY: Mock business user for testing
            if (!req.user) {
                req.user = { _id: new mongoose.Types.ObjectId(), id: new mongoose.Types.ObjectId() };
                req.isLogin = true;
                req.userType = 'business';
                console.log('Using mock business user for delete');
            }
            
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;
            const applicationId = req.params.id;

            if (!businessId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            // Find application and verify ownership
            const application = await AppliedJobs.findById(applicationId);
            if (!application) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Application not found' 
                });
            }

            if (application.business_id.toString() !== businessId.toString()) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Access denied' 
                });
            }

            // Delete the application
            await AppliedJobs.findByIdAndDelete(applicationId);

            res.json({ 
                success: true, 
                message: 'Application deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting application:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    async viewCv(req, res, next){
        try {
         const cv = await CV.findById(req.params.id).select('cv');
         if(!cv){
            return res.status(404).json({ success: false, message: 'CV not found' });
         }
         if(cv._id != req.user?.id && cv._id != req.user?._id){
            return res.status(403).json({ success: false, message: 'Access denied' });
         }
         res.json({ success: true, data: cv });   
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new DetailApplicantController();

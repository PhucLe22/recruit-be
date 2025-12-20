const User = require('../../../app/models/User');
const CV = require('../../../app/models/CV');
const AppliedJobs = require('../../../app/models/AppliedJobs');
const mongoose = require('mongoose');

class UserProfileController {
    // View user profile and CVs
    async viewUserProfile(req, res, next) {
        try {
            const { userId } = req.params;
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

            if (!businessId) {
                return res.redirect('/business/login-page');
            }

            // Helper function for status badges
            const getStatusBadge = (status) => {
                const statusMap = {
                    'pending': '<span class="badge bg-warning">Pending</span>',
                    'viewed': '<span class="badge bg-info">Viewed</span>',
                    'shortlisted': '<span class="badge bg-primary">Shortlisted</span>',
                    'rejected': '<span class="badge bg-danger">Rejected</span>',
                    'hired': '<span class="badge bg-success">Hired</span>'
                };
                return statusMap[status] || `<span class="badge bg-secondary">${status}</span>`;
            };

            // Find user with complete profile data
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).render('error', {
                    message: 'User not found',
                    error: 'User profile not available'
                });
            }

            // Find all CVs for this user
            const cvs = await CV.find({ user_id: userId })
                .sort({ createdAt: -1 });

            // Find applications from this business to this user
            const applications = await AppliedJobs.find({
                user_id: userId,
                business_id: businessId
            })
                .populate('job_id', 'title field location salary')
                .sort({ applied_at: -1 });

            // Find all applications by this user (for statistics)
            const allApplications = await AppliedJobs.find({ user_id: userId })
                .populate('job_id', 'title field')
                .sort({ applied_at: -1 });

            // Calculate user statistics
            const stats = {
                totalApplications: allApplications.length,
                totalCVs: cvs.length,
                applicationSuccess: allApplications.filter(app => 
                    ['shortlisted', 'hired'].includes(app.status)).length,
                applicationPending: allApplications.filter(app => 
                    app.status === 'pending').length,
                averageApplicationsPerMonth: Math.round(allApplications.length / Math.max(1, 
                    Math.ceil((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24 * 30))))
            };

            // Format CV data
            const formattedCVs = cvs.map(cv => ({
                ...cv.toObject(),
                createdAt: cv.createdAt.toLocaleDateString('vi-VN'),
                fileSize: cv.fileSize ? `${(cv.fileSize / 1024).toFixed(1)} KB` : 'Unknown',
                fileUrl: cv.filePath ? `/uploads/cvs/${cv.filePath.split('/').pop()}` : null
            }));

            // Format application data
            const formattedApplications = applications.map(app => ({
                ...app.toObject(),
                applied_at: app.applied_at.toLocaleDateString('vi-VN'),
                jobTitle: app.job_id?.title || 'Unknown Position',
                jobField: app.job_id?.field || 'Unknown Field',
                jobLocation: app.job_id?.location || 'Remote',
                jobSalary: app.job_id?.salary || 'Negotiable'
            }));

            // Format recent applications for timeline
            const recentApplications = allApplications.slice(0, 5).map(app => ({
                ...app.toObject(),
                applied_at: app.applied_at.toLocaleDateString('vi-VN'),
                jobTitle: app.job_id?.title || 'Unknown Position',
                jobField: app.job_id?.field || 'Unknown Field',
                statusBadge: getStatusBadge(app.status)
            }));

            res.render('business/user-profile', {
                layout: 'business',
                user: {
                    _id: user._id,
                    username: user.username,
                    fullName: user.fullName,
                    email: user.email,
                    phone: user.phone,
                    avatar: user.avatar,
                    birthday: user.birthday?.toLocaleDateString('vi-VN'),
                    gender: user.gender,
                    level: user.level,
                    degree: user.degree,
                    experience: user.experience,
                    major: user.major,
                    role: user.role,
                    status: user.status,
                    slug: user.slug,
                    createdAt: user.createdAt?.toLocaleDateString('vi-VN'),
                    cvPath: user.cvPath
                },
                cvs: formattedCVs,
                applications: formattedApplications,
                recentApplications,
                stats,
                applicationCount: applications.length,
                cvCount: cvs.length,
                title: `${user.fullName} - Complete Profile`,
                description: `View ${user.fullName}'s complete profile information and CV documents`
            });

        } catch (error) {
            console.error('Error viewing user profile:', error);
            next(error);
        }
    }

    // Download CV
    async downloadCV(req, res, next) {
        try {
            const { cvId } = req.params;
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

            if (!businessId) {
                return res.redirect('/business/login-page');
            }

            // Find CV with user verification
            const cv = await CV.findById(cvId).populate('user_id', 'fullName email');
            
            if (!cv) {
                return res.status(404).render('error', {
                    message: 'CV not found',
                    error: 'Document not available'
                });
            }

            // Check file exists
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(__dirname, '../../../uploads/cvs', cv.filePath);
            
            if (!fs.existsSync(filePath)) {
                return res.status(404).render('error', {
                    message: 'CV file not found',
                    error: 'File not available'
                });
            }

            // Set download headers
            res.setHeader('Content-Disposition', `attachment; filename="${cv.originalName || 'CV.pdf'}"`);
            res.setHeader('Content-Type', 'application/pdf');

            // Stream file
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

            console.log(`CV downloaded: ${cv.originalName} by business ${businessId}`);

        } catch (error) {
            console.error('Error downloading CV:', error);
            next(error);
        }
    }

    // View CV details
    async viewCVDetails(req, res, next) {
        try {
            const { cvId } = req.params;
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

            if (!businessId) {
                return res.redirect('/business/login-page');
            }

            // Find CV with user and application details
            const cv = await CV.findById(cvId)
                .populate('user_id', 'fullName email phone')
                .populate({
                    path: 'applications',
                    match: { business_id: businessId },
                    populate: {
                        path: 'job_id',
                        select: 'title field'
                    }
                });

            if (!cv) {
                return res.status(404).render('error', {
                    message: 'CV not found',
                    error: 'Document not available'
                });
            }

            // Format CV data
            const formattedCV = {
                ...cv.toObject(),
                createdAt: cv.createdAt.toLocaleDateString('vi-VN'),
                fileSize: cv.fileSize ? `${(cv.fileSize / 1024).toFixed(1)} KB` : 'Unknown',
                fileUrl: cv.filePath ? `/uploads/cvs/${cv.filePath.split('/').pop()}` : null,
                applications: cv.applications?.map(app => ({
                    ...app.toObject(),
                    applied_at: app.applied_at?.toLocaleDateString('vi-VN'),
                    jobTitle: app.job_id?.title || 'Unknown Position'
                })) || []
            };

            res.render('business/cv-details', {
                layout: 'business',
                cv: formattedCV,
                user: cv.user_id,
                title: `CV - ${cv.originalName || 'Document'}`,
                description: `Detailed view of CV document`
            });

        } catch (error) {
            console.error('Error viewing CV details:', error);
            next(error);
        }
    }
}

module.exports = new UserProfileController();

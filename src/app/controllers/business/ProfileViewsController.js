const AppliedJobs = require('../../../app/models/AppliedJobs');
const User = require('../../../app/models/User');
const CV = require('../../../app/models/CV');

class ProfileViewsController {
    // View profile views statistics
    async viewProfileViews(req, res, next) {
        try {
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

            if (!businessId) {
                return res.redirect('/business/login-page');
            }

            // Get all applications from this business
            const applications = await AppliedJobs.find({ business_id: businessId })
                .populate('user_id', 'fullName email phone avatar')
                .populate('job_id', 'title field')
                .sort({ applied_at: -1 });

            // Calculate profile view statistics
            const profileViews = {};
            const uniqueUsers = new Set();
            let totalViews = 0;

            applications.forEach(app => {
                if (app.user_id) {
                    const userId = app.user_id._id.toString();
                    uniqueUsers.add(userId);
                    
                    if (!profileViews[userId]) {
                        profileViews[userId] = {
                            user: app.user_id,
                            viewCount: 0,
                            applications: [],
                            lastViewed: app.applied_at,
                            jobsApplied: new Set()
                        };
                    }
                    
                    profileViews[userId].viewCount++;
                    profileViews[userId].applications.push({
                        jobTitle: app.job_id?.title || 'Unknown Position',
                        jobField: app.job_id?.field || 'Unknown Field',
                        appliedAt: app.applied_at.toLocaleDateString('vi-VN'),
                        status: app.status
                    });
                    
                    profileViews[userId].jobsApplied.add(app.job_id?.title);
                    totalViews = Math.max(totalViews, profileViews[userId].viewCount);
                }
            });

            // Convert to array and sort by view count
            const profileViewsArray = Object.values(profileViews).sort((a, b) => b.viewCount - a.viewCount);

            // Calculate overall statistics
            const stats = {
                totalUniqueProfiles: uniqueUsers.size,
                totalViews: totalViews,
                averageViewsPerProfile: Math.round(totalViews / Math.max(1, uniqueUsers.size)),
                mostViewedProfile: profileViewsArray.length > 0 ? profileViewsArray[0] : null,
                recentViews: applications.slice(0, 10).map(app => ({
                    userName: app.user_id?.fullName || 'Unknown User',
                    userProfile: app.user_id?._id,
                    jobTitle: app.job_id?.title || 'Unknown Position',
                    viewedAt: app.applied_at.toLocaleDateString('vi-VN')
                }))
            };

            res.render('business/profile-views', {
                layout: 'business',
                profileViews: profileViewsArray,
                stats,
                title: 'Profile Views Analytics',
                description: 'View detailed statistics about profile views and user engagement'
            });

        } catch (error) {
            console.error('Error viewing profile views:', error);
            next(error);
        }
    }
}

module.exports = new ProfileViewsController();

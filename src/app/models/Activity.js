const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
    {
        // Business that owns this activity
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Business',
            required: true,
            index: true,
        },

        // User who performed the action
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // Type of activity
        activityType: {
            type: String,
            enum: [
                'job_view',
                'job_apply',
                'company_profile_view',
                'company_connect',
                'job_save',
            ],
            required: true,
        },

        // Related job (if applicable)
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            required: function () {
                return ['job_view', 'job_apply', 'job_save'].includes(
                    this.activityType,
                );
            },
        },

        // Related business (if company profile view)
        viewedBusinessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Business',
            required: function () {
                return this.activityType === 'company_profile_view';
            },
        },

        // User info at time of activity (for historical reference)
        userInfo: {
            name: String,
            email: String,
            avatar: String,
            cvScore: Number,
        },

        // Job info at time of activity (for historical reference)
        // Job information (stored as string to avoid schema conflicts)
        jobInfo: {
            type: String,
            required: function () {
                return ['job_view', 'job_apply', 'job_save'].includes(
                    this.activityType,
                );
            },
        },

        // Additional details
        details: {
            userAgent: String,
            ipAddress: String,
            source: String, // 'direct', 'search', 'recommendation', 'company_list'
            sessionId: String,
        },

        // Timestamp
        createdAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
    },
);

// Index for efficient queries
activitySchema.index({ businessId: 1, createdAt: -1 });
activitySchema.index({ businessId: 1, activityType: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });

// Static methods for activity tracking
activitySchema.statics = {
    // Track when a user views a job
    async trackJobView(userId, jobId, businessId, options = {}) {
        try {
            const Job = mongoose.model('Job');
            const User = mongoose.model('User');

            const [job, user] = await Promise.all([
                Job.findById(jobId).select('title type city salary'),
                User.findById(userId).select('name email avatar cvScore'),
            ]);

            if (!job || !user) return null;

            const activity = new this({
                businessId,
                userId,
                activityType: 'job_view',
                jobId,
                userInfo: {
                    name: user.name || user.fullName,
                    email: user.email,
                    avatar: user.avatar,
                    cvScore: user.cvScore,
                },
                jobInfo: JSON.stringify({
                    title: job.title,
                    type: job.type,
                    city: job.city,
                    salary: job.salary,
                }),
                details: {
                    ...options,
                    source: options.source || 'direct',
                },
            });

            return await activity.save();
        } catch (error) {
            console.error('Error tracking job view:', error);
            return null;
        }
    },

    // Track when a user applies to a job
    async trackJobApply(userId, jobId, businessId, options = {}) {
        try {
            const Job = mongoose.model('Job');
            const User = mongoose.model('User');

            const [job, user] = await Promise.all([
                Job.findById(jobId).select('title type city salary'),
                User.findById(userId).select('name email avatar cvScore'),
            ]);

            if (!job || !user) return null;

            const activity = new this({
                businessId,
                userId,
                activityType: 'job_apply',
                jobId,
                userInfo: {
                    name: user.name || user.fullName,
                    email: user.email,
                    avatar: user.avatar,
                    cvScore: user.cvScore,
                },
                jobInfo: JSON.stringify({
                    title: job.title,
                    type: job.type,
                    city: job.city,
                    salary: job.salary,
                }),
                details: {
                    ...options,
                    source: options.source || 'direct',
                },
            });

            return await activity.save();
        } catch (error) {
            console.error('Error tracking job apply:', error);
            return null;
        }
    },

    // Track when a user views a company profile
    async trackCompanyProfileView(userId, viewedBusinessId, options = {}) {
        try {
            const User = mongoose.model('User');
            const Business = mongoose.model('Business');

            const [user, business] = await Promise.all([
                User.findById(userId).select('name email avatar cvScore'),
                Business.findById(viewedBusinessId).select('name logoPath'),
            ]);

            if (!user || !business) return null;

            const activity = new this({
                businessId: viewedBusinessId, // The company being viewed
                userId,
                activityType: 'company_profile_view',
                viewedBusinessId,
                userInfo: {
                    name: user.name || user.fullName,
                    email: user.email,
                    avatar: user.avatar,
                    cvScore: user.cvScore,
                },
                details: {
                    ...options,
                    companyName: business.name,
                    source: options.source || 'company_list',
                },
            });

            return await activity.save();
        } catch (error) {
            console.error('Error tracking company profile view:', error);
            return null;
        }
    },

    // Get recent activities for a business
    async getBusinessActivities(businessId, limit = 20) {
        try {
            return await this.find({ businessId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('userId', 'name email avatar')
                .populate('jobId', 'title type city salary')
                .populate('viewedBusinessId', 'name logoPath');
        } catch (error) {
            console.error('Error getting business activities:', error);
            return [];
        }
    },

    // Get activity statistics for a business
    async getBusinessStats(businessId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const stats = await this.aggregate([
                {
                    $match: {
                        businessId: mongoose.Types.ObjectId(businessId),
                        createdAt: { $gte: startDate },
                    },
                },
                {
                    $group: {
                        _id: '$activityType',
                        count: { $sum: 1 },
                        latest: { $max: '$createdAt' },
                    },
                },
            ]);

            return stats.reduce((acc, stat) => {
                acc[stat._id] = {
                    count: stat.count,
                    latest: stat.latest,
                };
                return acc;
            }, {});
        } catch (error) {
            console.error('Error getting business stats:', error);
            return {};
        }
    },
};

// Virtual for formatted time
activitySchema.virtual('timeAgo').get(function () {
    const now = new Date();
    const diff = now - this.createdAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;

    return this.createdAt.toLocaleDateString('vi-VN');
});

// Ensure virtuals are included in JSON
activitySchema.set('toJSON', { virtuals: true });
activitySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Activity', activitySchema);

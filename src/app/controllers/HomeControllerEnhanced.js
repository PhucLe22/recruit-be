const { multipleMongooseToObject } = require('../../util/mongoose');
const Job = require('../models/Job');
const JobField = require('../../app/models/JobField');
const CV = require('../models/CV');
const { formatDate } = require('../../middlewares/formatDate');
const RecommendationEngine = require('../../services/RecommendationEngine');
const UserBehaviorService = require('../../services/UserBehaviorService');

class HomeControllerEnhanced {
    async index(req, res, next) {
        try {
            const jobs = await Job.find({}).populate('businessId');
            const jobFields = await JobField.find({});
            const now = new Date();
            let nowCount = 0;
            let twoDaysCount = 0;
            let validJobs = [];
            let fieldsWithJobs = [];
            
            // Fetch grouped jobs by field
            try {
                const response = await fetch(`${process.env.BASE_URL || 'http://localhost:3000'}/jobs/grouped-by-field`);
                if (!response.ok) {
                    throw new Error(`API returned status ${response.status}`);
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Response is not JSON');
                }
                const result = await response.json();
                if (result.success) {
                    fieldsWithJobs = result.data;
                }
            } catch (error) {
                console.warn('Warning: Could not fetch grouped jobs, using fallback:', error.message);
                // Fallback: use empty array, will be populated from database
                fieldsWithJobs = [];
            }

            // Tính số lượng job thực tế cho từng ngành nghề
            const jobFieldCounters = {};

            // Khởi tạo counters cho tất cả job fields
            jobFields.forEach((field) => {
                jobFieldCounters[field._id.toString()] = 0;
            });

            // Helper function để format relative time cho createdAt
            const formatRelativeTime = (date) => {
                if (!date) return '';
                const past = new Date(date);
                const diffMs = now - past;

                const diffSeconds = Math.floor(diffMs / 1000);
                const diffMinutes = Math.floor(diffSeconds / 60);
                const diffHours = Math.floor(diffMinutes / 60);
                const diffDays = Math.floor(diffHours / 24);
                const diffWeeks = Math.floor(diffDays / 7);

                if (diffHours < 1) return 'now';
                if (diffHours < 24) return `${diffHours}h`;
                if (diffDays < 7) return `${diffDays}d`;
                if (diffWeeks < 2) return `${diffWeeks}w`;

                // Quá 1 tuần → hiển thị ngày đăng
                const day = String(past.getDate()).padStart(2, '0');
                const month = String(past.getMonth() + 1).padStart(2, '0');
                const year = past.getFullYear();
                return `${day}/${month}/${year}`;
            };

            // Đếm số lượng job theo ngành nghề
            for (let job of jobs) {
                const createdAt = new Date(job.createdAt);

                // Tính số ngày chênh lệch cho thống kê
                const diffTime = now - createdAt;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 0) nowCount++;
                if (diffDays === 2) twoDaysCount++;

                // Lọc job còn hợp lệ
                if (job.expiryTime >= now) {
                    const formattedJob = {
                        ...job.toObject(),
                        companyName:
                            job.businessId?.companyName ||
                            job.companyName ||
                            'Công ty',
                        companyLogo:
                            job.logoPath || job.businessId?.logo || null,
                        createdAt: formatRelativeTime(job.createdAt),
                        expiryTime: formatDate(job.expiryTime),
                        updatedAt: job.updatedAt
                            ? formatDate(job.updatedAt)
                            : null,
                    };

                    validJobs.push(formattedJob);

                    // Tăng counter cho ngành nghề tương ứng
                    const jobField = job.field || job.jobField;
                    if (jobField) {
                        const matchedField = jobFields.find(
                            (field) =>
                                field.name
                                    .toLowerCase()
                                    .includes(jobField.toLowerCase()) ||
                                jobField
                                    .toLowerCase()
                                    .includes(field.name.toLowerCase()),
                        );
                        if (matchedField) {
                            jobFieldCounters[matchedField._id.toString()]++;
                        }
                    }
                }
            }

            // Cập nhật jobCount cho mỗi job field và giới hạn 16 categories
            const updatedJobFields = jobFields.map((field) => ({
                ...field.toObject(),
                jobCount: jobFieldCounters[field._id.toString()] || 0,
            })).slice(0, 10); // Giới hạn chỉ lấy 10 categories đầu tiên

            // Nếu có ít hơn 10 categories, thêm categories mặc định
            if (updatedJobFields.length < 10) {
                const defaultCategories = [
                    { name: 'Công nghệ thông tin', icon: 'fa-laptop-code', slug: 'cong-nghe-thong-tin', jobCount: 0 },
                    { name: 'Kinh doanh & Bán hàng', icon: 'fa-chart-line', slug: 'kinh-doanh-ban-hang', jobCount: 0 },
                    { name: 'Marketing & Truyền thông', icon: 'fa-bullhorn', slug: 'marketing-truyen-thong', jobCount: 0 },
                    { name: 'Nhân sự', icon: 'fa-users', slug: 'nhan-su', jobCount: 0 },
                    { name: 'Kế toán & Tài chính', icon: 'fa-calculator', slug: 'ke-toan-tai-chinh', jobCount: 0 },
                    { name: 'Sản xuất & Vận hành', icon: 'fa-industry', slug: 'san-xuat-van-hanh', jobCount: 0 },
                    { name: 'Thiết kế & Sáng tạo', icon: 'fa-palette', slug: 'thiet-ke-sang-tao', jobCount: 0 },
                    { name: 'Giáo dục & Đào tạo', icon: 'fa-graduation-cap', slug: 'giao-duc-dao-tao', jobCount: 0 },
                    { name: 'Y tế & Chăm sóc sức khỏe', icon: 'fa-heartbeat', slug: 'y-te-cham-soc-suc-khoe', jobCount: 0 },
                    { name: 'Luật pháp & Pháp chế', icon: 'fa-balance-scale', slug: 'luat-phap-phap-che', jobCount: 0 },
                    { name: 'Logistics & Chuỗi cung ứng', icon: 'fa-truck', slug: 'logistics-chuoi-cung-ung', jobCount: 0 },
                    { name: 'Bất động sản', icon: 'fa-home', slug: 'bat-dong-san', jobCount: 0 },
                    { name: 'Du lịch & Dịch vụ', icon: 'fa-plane', slug: 'du-lich-dich-vu', jobCount: 0 },
                    { name: 'Nông nghiệp & Nông nghiệp công nghệ cao', icon: 'fa-seedling', slug: 'nong-nghiep-cong-nghe-cao', jobCount: 0 },
                    { name: 'Quản lý dự án', icon: 'fa-tasks', slug: 'quan-ly-du-an', jobCount: 0 },
                    { name: 'Truyền thông & Báo chí', icon: 'fa-newspaper', slug: 'truyen-thong-bao-chi', jobCount: 0 }
                ];

                for (let i = updatedJobFields.length; i < 10; i++) {
                    if (defaultCategories[i - updatedJobFields.length]) {
                        updatedJobFields.push(defaultCategories[i - updatedJobFields.length]);
                    }
                }
            }

            // Enhanced user behavior-based job recommendations
            let recommendedJobs = [];
            let personalized = false;
            let userProfile = null;

            if (req.account) {
                try {
                    // Get user profile from behavior analysis
                    userProfile = await UserBehaviorService.analyzeUserBehavior(
                        req.account.id,
                    );

                    // Get personalized recommendations
                    const recommendations =
                        await RecommendationEngine.getRecommendations(
                            req.account.id,
                            {
                                limit: 12,
                                exclude: validJobs.map((job) =>
                                    job._id.toString(),
                                ),
                            },
                        );

                    if (recommendations && recommendations.length > 0) {
                        recommendedJobs = recommendations;
                        personalized = true;
                    }
                } catch (error) {
                    console.error('Error getting user recommendations:', error);
                    // Fallback to behavior-based job matching
                    recommendedJobs = await this.getBehaviorBasedJobs(
                        userProfile,
                        validJobs,
                    );
                }
            }

            // Fallback to popular jobs if no personalized recommendations
            if (recommendedJobs.length === 0) {
                recommendedJobs = await RecommendationEngine.getPopularJobs(12);
                personalized = false;
            }

            // Format recommended jobs for display
            const formattedRecommendations = recommendedJobs.map((job) => ({
                ...job,
                companyName:
                    job.businessId?.companyName || job.companyName || 'Công ty',
                companyLogo: job.logoPath || job.businessId?.logo || null,
                createdAt: job.createdAt
                    ? HomeControllerEnhanced.formatRelativeTime(job.createdAt)
                    : 'now',
                matchScore:
                    job.recommendationScore ||
                    Math.floor(Math.random() * 30) + 70, // 70-100 for fallback
                matchReason:
                    job.recommendationReasons?.[0] ||
                    'Phù hợp với hồ sơ của bạn',
                isPersonalized: personalized,
            }));

            // Sort all jobs by match score for logged-in users
            let displayJobs = validJobs;
            if (req.account && recommendedJobs.length > 0) {
                // Combine and sort by match score
                displayJobs = [
                    ...formattedRecommendations.map((job) => ({
                        ...job,
                        isRecommended: true,
                    })),
                    ...validJobs.map((job) => ({
                        ...job,
                        matchScore: 50,
                        matchReason: 'Việc làm mới',
                        isRecommended: false,
                    })),
                ].sort(
                    (a, b) =>
                        (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0) ||
                        b.matchScore - a.matchScore,
                );
            }

            // Ensure fieldsWithJobs is defined and has the expected structure
            const safeFieldsWithJobs = Array.isArray(fieldsWithJobs) ? fieldsWithJobs : [];
            
            res.status(200).render('home', {
                validJobs: displayJobs.slice(0, 12), // Show top 12 jobs with recommendations first
                jobFields: multipleMongooseToObject(updatedJobFields).slice(0, 10), // Show top 10 job fields
                fieldsWithJobs: safeFieldsWithJobs, // Add the grouped jobs data
                nowCount,
                twoDaysCount,
                recommendations: formattedRecommendations.slice(0, 6), // Top 6 recommendations
                personalized,
                userProfile,
                user: req.account || null,
                isLogin: !!req.account,
                totalJobs: validJobs.length,
                recommendedCount: formattedRecommendations.length,
            });
        } catch (error) {
            next(error);
        }
    }

    // Helper method to get behavior-based jobs as fallback
    async getBehaviorBasedJobs(userProfile, validJobs) {
        if (!userProfile || !userProfile.interests) {
            return validJobs.slice(0, 12).map((job) => ({
                ...job,
                recommendationScore: 60,
                recommendationReasons: ['Jobs gần đây'],
                recommendationType: 'fallback',
            }));
        }

        // Sort valid jobs based on user interests
        return validJobs
            .map((job) => {
                let score = 60; // base score
                const jobText =
                    `${job.title} ${job.description || ''}`.toLowerCase();

                // Boost score based on interests
                Object.entries(userProfile.interests).forEach(
                    ([interest, weight]) => {
                        if (jobText.includes(interest.toLowerCase())) {
                            score += weight * 5;
                        }
                    },
                );

                return {
                    ...job,
                    recommendationScore: Math.min(score, 100),
                    recommendationReasons: ['Phù hợp với tìm kiếm của bạn'],
                    recommendationType: 'behavior',
                };
            })
            .sort((a, b) => b.recommendationScore - a.recommendationScore)
            .slice(0, 12);
    }

    async cvAssistant(req, res) {
        try {
            let userCV = null;

            // If user is logged in, get their CV from database
            if (req.account) {
                userCV = await CV.findOne({ username: req.account.username });
            }

            // Prepare user data with _id
            const userData = req.account ? {
                ...req.account,  // Spread the account object directly
                _id: req.account._id ? req.account._id.toString() : null  // Safely handle _id
            } : null;

            // Pass user and CV data to the view - use no layout for standalone page
            res.status(200).render('cv-assistant', {
                user: userData,
                isLogin: !!req.account,
                userCV: userCV,
                layout: false, // Use no layout for standalone CV assistant page
            });
            
            console.log('👤 Rendered CV Assistant with user:', {
                hasUser: !!userData,
                userId: userData?._id,
                username: userData?.username
            });
        } catch (error) {
            console.error('Error loading CV Assistant:', error);
            res.status(200).render('cv-assistant', {
                user: req.account || null,
                isLogin: !!req.account,
                userCV: null,
                layout: false,
            });
        }
    }

    static formatRelativeTime(date) {
        if (!date) return '';
        const past = new Date(date);
        const diffMs = new Date() - past;

        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);

        if (diffHours < 1) return 'vừa xong';
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        if (diffWeeks < 4) return `${diffWeeks} tuần trước`;

        const day = String(past.getDate()).padStart(2, '0');
        const month = String(past.getMonth() + 1).padStart(2, '0');
        const year = past.getFullYear();
        return `${day}/${month}/${year}`;
    }

    static formatDateTime(date) {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
}

module.exports = new HomeControllerEnhanced();

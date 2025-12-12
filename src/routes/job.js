const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
const ActivityTracker = require('../middlewares/activityTracker');
const jobController = require('../app/controllers/job/JobController');
const searchController = require('../app/controllers/job/SearchController');
const applyController = require('../app/controllers/job/ApplyController');
const saveJobController = require('../app/controllers/job/SaveJobController');
const jobCategoryController = require('../app/controllers/job/JobCategoryController');
const {isLogin} = require('../middlewares/isLogin');

// Add smart search API endpoint
const SmartSearchService = require('../services/SmartSearchService');
const AIFilteringService = require('../services/AIFilteringService');

// Helper function for relative time formatting
function formatRelativeTime(date) {
    if (!date) return '';
    const past = new Date(date);
    const diffMs = new Date() - past;

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffHours < 1) return 'Vừa xong';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffWeeks < 4) return `${diffWeeks} tuần trước`;

    const day = String(past.getDate()).padStart(2, '0');
    const month = String(past.getMonth() + 1).padStart(2, '0');
    const year = past.getFullYear();
    return `${day}/${month}/${year}`;
}

// Apply routes
router.post('/apply/:slug', isLogin, applyController.apply);
router.post('/save/:jobId', isLogin, saveJobController.saveJob);
router.delete('/save/:jobId', isLogin, saveJobController.unsaveJob);
router.get('/saved/:jobId', isLogin, saveJobController.checkJobSaved);
router.get('/export-jobs', jobController.exportJobsForFaiss);
router.get('/search', searchController.search);

// Enhanced search results page with full filtering
router.get('/search-results', async (req, res, next) => {
    try {
        const SmartSearchService = require('../services/SmartSearchService');
        const { formatDate } = require('../middlewares/formatDate');

        const {
            q = '',                    // search query
            keyWord = '',              // alternative parameter name
            cities = [],               // location filters
            types = [],                // job type filters
            fields = [],               // industry filters
            salaryMin = null,
            salaryMax = null,
            experienceLevel = '',
            page = 1,
            limit = 24,                // Changed from 20 to 24 jobs per page
            sortBy = 'relevance',      // relevance, salary, date
            sortOrder = 'desc',        // desc, asc
        } = req.query;

        // Use either 'q' or 'keyWord' parameter, clean and trim whitespace
        const searchQuery = (q || keyWord || '').trim();

        const filters = {
            cities: Array.isArray(cities)
                ? cities
                : cities
                  ? cities.split(',').map(city => city.trim())
                  : [],
            types: Array.isArray(types)
                ? types
                : types
                  ? types.split(',').map(type => type.trim())
                  : [],
            fields: Array.isArray(fields)
                ? fields
                : fields
                  ? fields.split(',').map(field => field.trim())
                  : [],
            salaryMin: salaryMin ? parseInt(salaryMin) : null,
            salaryMax: salaryMax ? parseInt(salaryMax) : null,
            experienceLevel: experienceLevel || '',
        };

        const searchOptions = {
            filters,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            sortBy: sortBy || 'relevance',
            sortOrder: sortOrder || 'desc',
        };

        // Perform smart search
        const results = await SmartSearchService.searchJobs(
            searchQuery,
            searchOptions,
        );

      
        // SmartSearchService already formats jobs, but we need to ensure formattedDate
        const formattedJobs = results.jobs ? results.jobs.map(job => {
            return {
                ...job,
                formattedDate: formatDate(job.createdAt),
                logoPath: job.logoPath || job.companyLogo || '/images/default-company.png'
            };
        }) : [];

        res.render('jobs/results', {
            sorted: formattedJobs,
            keyword: searchQuery || '', // Ensure empty string if no search query
            totalCount: results.totalResults || results.jobs?.length || 0,
            currentPage: results.pagination?.currentPage || results.currentPage || 1,
            totalPages: results.pagination?.totalPages || results.totalPages || 1,
            hasMore: results.pagination?.hasNextPage || results.hasMore || false,
            filters: filters,
            sortBy: sortBy,
            sortOrder: sortOrder,
            pageTitle: searchQuery ? `Kết quả tìm kiếm: "${searchQuery}"` : 'Tất cả việc làm',
            layout: 'main'
        });

    } catch (error) {
        console.error('Enhanced Search Error:', error);
        next(error);
    }
});

// Infinite scroll API endpoint for home page
router.get('/api/load-more', async (req, res, next) => {
    try {
        const Job = require('../app/models/Job');
        const { formatDate } = require('../middlewares/formatDate');

        const {
            page = 1,
            limit = 24, // 4 rows × 6 columns (updated for better display)
            filter = 'all', // all, remote, featured
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const now = new Date();

        // Build query based on filter
        let query = { expiryTime: { $gte: now } };

        if (filter === 'remote') {
            query.type = { $in: ['Remote', 'remote', 'Hybrid', 'hybrid'] };
        } else if (filter === 'featured') {
            query.isRecommended = true;
        }

        // Fetch jobs from database
        const jobs = await Job.find(query)
            .populate('businessId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Format jobs for response
        const formattedJobs = jobs.map((job) => ({
            id: job._id,
            slug: job.slug,
            title: job.title,
            company:
                job.businessId?.companyName || job.companyName || 'Công ty',
            salary: job.salary || 'Thỏa thuận',
            location: job.city || 'Hà Nội',
            type: job.type || 'Full-time',
            description:
                job.description || 'Cơ hội việc làm tuyệt vời đang chờ bạn...',
            time: job.createdAt ? formatRelativeTime(job.createdAt) : 'Gần đây',
            featured: job.isRecommended || false,
            remote: job.type === 'Remote' || job.type === 'remote',
            companyLogo: job.logoPath || job.businessId?.logo || null,
        }));

        // Get total count for pagination
        const totalCount = await Job.countDocuments(query);
        const hasMore = skip + jobs.length < totalCount;

        res.json({
            jobs: formattedJobs,
            hasMore,
            currentPage: parseInt(page),
            totalCount,
        });
    } catch (error) {
        console.error('Error loading more jobs:', error);
        res.status(500).json({
            error: 'Failed to load more jobs',
            jobs: [],
            hasMore: false,
        });
    }
});

// Helper function for relative time formatting
function formatRelativeTime(date) {
    if (!date) return '';
    const past = new Date(date);
    const diffMs = new Date() - past;

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffHours < 1) return 'Vừa xong';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffWeeks < 4) return `${diffWeeks} tuần trước`;

    const day = String(past.getDate()).padStart(2, '0');
    const month = String(past.getMonth() + 1).padStart(2, '0');
    const year = past.getFullYear();
    return `${day}/${month}/${year}`;
}

// Category page - Show jobs by category
router.get('/category/:slug', async (req, res, next) => {
    const { slug } = req.params;
    console.log(`\n🔄 [${new Date().toISOString()}] Accessing category: /jobs/category/${slug}`);
    
    try {
        const Job = require('../app/models/Job');
        const JobField = require('../app/models/JobField');
        const now = new Date();
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;

        // 1. First, find the job field by slug
        console.log(`🔍 [${slug}] Looking up job field...`);
        const jobField = await JobField.findOne({ slug }).lean();
        
        if (!jobField) {
            console.error(`❌ [${slug}] Job field not found`);
            return res.status(404).render('404', {
                title: 'Không tìm thấy danh mục',
                message: 'Danh mục công việc không tồn tại hoặc đã bị xóa.'
            });
        }

        console.log(`✅ [${slug}] Found job field: ${jobField.name} (ID: ${jobField._id})`);

        // 2. Build the query - try multiple field names
        const query = {
            $or: [
                { field: jobField._id },
                { jobField: jobField._id },
                { 'field._id': jobField._id },
                { 'jobField._id': jobField._id },
                { field: jobField.name },
                { jobField: jobField.name },
                { field: { $regex: jobField.name, $options: 'i' } },
                { jobField: { $regex: jobField.name, $options: 'i' } },
                { 'jobField._id': jobField._id },
                { 'field._id': jobField._id }
            ],
            expiryTime: { $gte: now }
        };

        console.log(`🔍 [${slug}] Running query:`, JSON.stringify(query, null, 2));

        // 3. Get jobs with pagination
        let [jobs, total] = await Promise.all([
            Job.find(query)
                .populate('businessId', 'companyName logo')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Job.countDocuments(query)
        ]);

        console.log(`✅ [${slug}] Found ${jobs.length} jobs (total: ${total})`);

        // 4. If no jobs found, try a more flexible search
        if (jobs.length === 0) {
            console.log(`⚠️ [${slug}] No jobs found with strict matching, trying flexible search...`);
            
            const flexibleQuery = {
                $or: [
                    { field: { $regex: jobField.name.split(' ')[0], $options: 'i' } },
                    { jobField: { $regex: jobField.name.split(' ')[0], $options: 'i' } }
                ],
                expiryTime: { $gte: now }
            };

            console.log(`🔍 [${slug}] Running flexible query:`, JSON.stringify(flexibleQuery, null, 2));
            
            [jobs, total] = await Promise.all([
                Job.find(flexibleQuery)
                    .populate('businessId', 'companyName logo')
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean(),
                Job.countDocuments(flexibleQuery)
            ]);

            if (jobs.length > 0) {
                console.log(`✅ [${slug}] Found ${jobs.length} jobs with flexible search`);
            }
        }

        // 5. Prepare data for the template
        const totalPages = Math.ceil(total / limit);
        const jobFields = await JobField.find({}).sort({ name: 1 }).lean();

        // 6. Log sample job data for debugging
        if (jobs.length > 0) {
            console.log(`📝 [${slug}] Sample job data:`, {
                title: jobs[0].title,
                field: jobs[0].field,
                jobField: jobs[0].jobField,
                company: jobs[0].businessId?.companyName || jobs[0].companyName
            });
        }

        // 7. Prepare user data for the template
        const userData = req.user ? {
            _id: req.user._id,
            name: req.user.name || req.user.username,
            email: req.user.email,
            avatar: req.user.avatar,
            role: req.user.role,
            savedJobsCount: req.user.savedJobs?.length || 0,
            applicationsCount: req.user.applications?.length || 0
        } : null;

        // 8. Render the template with user data
        res.render('jobs/category', {
            title: `${jobField.name} - Tuyển dụng, tìm việc làm mới nhất`,
            jobField: {
                ...jobField,
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
            user: userData,
            isAuthenticated: req.isAuthenticated()
        });

    } catch (error) {
        console.error(`❌ [${slug}] Error in category route:`, error);
        next(error);
    }
});

// Debug route to test routing
router.get('/api/debug', (req, res) => {
    console.log('🔥 DEBUG: /api/debug route called!');
    res.json({ message: 'Debug route working!', query: req.query });
});

// Smart search API endpoint (JSON response)
// AI-Enhanced Search API - Combines traditional search with AI filtering
router.get('/api/search', async (req, res, next) => {
    try {
        console.log(
            '🔥 API DEBUG: /api/search called with query:',
            JSON.stringify(req.query, null, 2),
        );

        const {
            q = '', // search query
            cities = [], // location filters
            jobTypes = [], // job type filters
            salaryMin = null,
            salaryMax = null,
            experience = '',
            limit = 24,                // Changed from 20 to 24 jobs per page
            offset = 0,
            useAI = false, // AI filtering flag
        } = req.query;

        const filters = {
            cities: Array.isArray(cities) ? cities : [cities].filter(Boolean),
            types: Array.isArray(jobTypes)
                ? jobTypes
                : [jobTypes].filter(Boolean), // Map jobTypes to types
            salaryMin: salaryMin ? parseInt(salaryMin) : null,
            salaryMax: salaryMax ? parseInt(salaryMax) : null,
            experience,
        };

        console.log(
            '🔥 API DEBUG: filters object:',
            JSON.stringify(filters, null, 2),
        );
        console.log('🔥 API DEBUG: useAI flag:', useAI);

        let results;

        if (useAI === 'true') {
            // Use AI-enhanced filtering
            console.log('🤖 Using AI-enhanced filtering...');
            const userPreferences = req.account
                ? {
                      skills: req.account.skills || [],
                      experience: req.account.experience || '',
                      preferredCities: req.account.preferredCities || [],
                      salaryRange: req.account.desiredSalaryRange || null,
                  }
                : {};

            // Get jobs with basic filters first
            const basicResults = await SmartSearchService.searchJobs(
                q,
                filters,
            );
            const jobsArray = basicResults.jobs || [];

            // Apply AI filtering
            const aiResults = await AIFilteringService.intelligentFilterJobs(
                jobsArray,
                q,
                userPreferences,
            );

            results = aiResults;
        } else {
            // Use traditional SmartSearchService
            console.log(
                '🔥 API DEBUG: calling SmartSearchService.searchJobs...',
            );
            results = await SmartSearchService.searchJobs(q, filters);
        }

        // Log search behavior nếu user đã login
        if (req.account) {
            try {
                const UserBehaviorService = require('../services/UserBehaviorService');
                await UserBehaviorService.logSearchBehavior(req.account.id, {
                    keywords: q,
                    filters,
                    resultsCount: results.jobs ? results.jobs.length : 0,
                });
            } catch (error) {
                console.error('Error logging search behavior:', error);
            }
        }

        const jobsArray = results.jobs || results.filteredJobs || [];

        // Prepare response object
        const response = {
            success: true,
            data: jobsArray.slice(offset, offset + parseInt(limit)),
            total: jobsArray.length,
            query: {
                keywords: q,
                filters,
                limit: parseInt(limit),
                offset: parseInt(offset),
                useAI: useAI === 'true',
            },
        };

        // Add AI analysis if AI was used
        if (useAI === 'true' && results.aiInsights) {
            response.aiAnalysis = {
                insights: results.aiInsights || [],
                recommendations: results.aiRecommendations || [],
                matchScores: results.matchScores || [],
                totalAnalyzed: results.originalJobs
                    ? results.originalJobs.length
                    : jobsArray.length,
            };
        }

        res.json(response);
    } catch (error) {
        console.error('Smart search API error:', error);
        res.status(500).json({
            success: false,
            message: 'Đã có lỗi xảy ra',
            error: error.message,
        });
    }
});

// Debug route to test if job routes are working
router.get('/api/debug', (req, res) => {
    console.log('🔥 DEBUG: /api/debug route called!');
    res.json({ message: 'Debug route working!', query: req.query });
});

// Get jobs grouped by field
// Group jobs by field for homepage
router.get('/grouped-by-field', async (req, res) => {
    try {
        const Job = require('../app/models/Job');
        const JobField = require('../app/models/JobField');
        const now = new Date();
        
        // Get all active job fields with job count > 0
        const jobFields = await JobField.find({ jobCount: { $gt: 0 } })
            .sort({ jobCount: -1 })
            .limit(8)
            .lean();

        // Get jobs for each field
        const fieldsWithJobs = await Promise.all(
            jobFields.map(async (field) => {
                const jobs = await Job.find({
                    $or: [
                        { field: { $regex: field.name, $options: 'i' } },
                        { jobField: { $regex: field.name, $options: 'i' } }
                    ],
                    expiryTime: { $gte: now }
                })
                .select('title companyName salary city type slug logoPath businessId')
                .populate('businessId', 'logo companyName')
                .limit(5)
                .sort({ createdAt: -1 })
                .lean();

                return {
                    ...field,
                    jobs: jobs.map(job => ({
                        id: job._id,
                        title: job.title,
                        slug: job.slug,
                        company: job.businessId?.companyName || job.companyName || 'Công ty',
                        salary: job.salary || 'Thỏa thuận',
                        location: job.city || 'Hà Nội',
                        type: job.type || 'Full-time',
                        logo: job.businessId?.logo || job.logoPath || null
                    }))
                };
            })
        );

        res.json({
            success: true,
            data: fieldsWithJobs
        });

    } catch (error) {
        console.error('Error fetching jobs by field:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

// Category page - Show jobs by category (REMOVED - duplicate of route above)

// Job Fields API endpoint - Get all job fields with grouped jobs
router.get('/api/job-fields', async (req, res, next) => {
    console.log('🔥 API DEBUG: /api/job-fields route called!');
    try {
        const Job = require('../app/models/Job');
        const JobField = require('../app/models/JobField');
        const { formatDate } = require('../middlewares/formatDate');

        const now = new Date();

        // Get all job fields
        const jobFields = await JobField.find({}).sort({ name: 1 });

        // Get all valid jobs (not expired)
        const jobs = await Job.find({ expiryTime: { $gte: now } })
            .populate('businessId')
            .sort({ createdAt: -1 });

        // Group jobs by field
        const fieldsWithJobs = jobFields.map(field => {
            const fieldJobs = jobs.filter(job => {
                const jobField = job.field || job.jobField;
                if (!jobField) return false;

                return field.name.toLowerCase().includes(jobField.toLowerCase()) ||
                       jobField.toLowerCase().includes(field.name.toLowerCase());
            });

            return {
                ...field.toObject(),
                jobs: fieldJobs.map(job => ({
                    id: job._id,
                    slug: job.slug,
                    title: job.title,
                    company: job.businessId?.companyName || job.companyName || 'Công ty',
                    salary: job.salary || 'Thỏa thuận',
                    location: job.city || 'Hà Nội',
                    type: job.type || 'Full-time',
                    description: job.description ?
                        (job.description.length > 150 ? job.description.substring(0, 150) + '...' : job.description)
                        : 'Cơ hội việc làm tuyệt vời đang chờ bạn...',
                    createdAt: formatDate(job.createdAt),
                    companyLogo: job.logoPath || job.businessId?.logo || null,
                    isRecommended: job.isRecommended || false
                })),
                jobCount: fieldJobs.length
            };
        });

        // Sort by job count (most jobs first)
        fieldsWithJobs.sort((a, b) => b.jobCount - a.jobCount);

        res.json({
            success: true,
            data: fieldsWithJobs,
            totalFields: fieldsWithJobs.length,
            totalJobs: jobs.length
        });

    } catch (error) {
        console.error('Error fetching job fields:', error);
        res.status(500).json({
            success: false,
            message: 'Đã có lỗi xảy ra khi tải danh sách ngành nghề',
            error: error.message
        });
    }
});

// Jobs listing page
// Home page - List all jobs
router.get('/', jobController.index);

// Remote jobs listing
router.get('/remote', jobController.remoteJobs);

// All jobs listing with filters
router.get('/all', jobController.allJobs);

// Job categories listing
router.get('/all-categories', jobCategoryController.getAllCategories);

// Single job view
router.get('/:slug', ActivityTracker.trackJobView, jobController.show);

// Export the router
module.exports = router;

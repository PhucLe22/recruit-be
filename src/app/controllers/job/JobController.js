const Job = require('../../../app/models/Job');
const Business = require('../../../app/models/Business');
const JobField = require('../../../app/models/JobField');
const JobApplied = require('../../../app/models/AppliedJobs');
const SavedJob = require('../../../app/models/SavedJobs');
const { formatRelativeTime } = require('../../../helpers/dateHelper');
const { getCacheKey, getFromCache, setCache } = require('../../../helpers/cacheHelper');

const fs = require('fs');
const {
    mongooseToObject,
    multipleMongooseToObject,
} = require('../../../util/mongoose');

class JobController {
    async index(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const skip = (page - 1) * limit;
            
            const now = new Date();
            const query = { expiryTime: { $gte: now } };
            
            const totalJobs = await Job.countDocuments(query);
            const jobs = await Job.find(query)
                .populate('businessId', 'companyName logo')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
                
            const totalPages = Math.ceil(totalJobs / limit);
            
            // Format jobs for display
            const formattedJobs = jobs.map(job => ({
                ...job.toObject(),
                companyName: job.businessId?.companyName || job.companyName || 'Công ty',
                companyLogo: job.logoPath || job.businessId?.logo || null,
                createdAt: JobController.formatRelativeTime(job.createdAt),
                expiryTime: JobController.formatDate(job.expiryTime)
            }));
            
            // Check if request expects JSON (API request)
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    jobs: formattedJobs,
                    pagination: {
                        currentPage: page,
                        totalPages,
                        totalJobs,
                        hasNext: page < totalPages,
                        hasPrev: page > 1,
                    }
                });
            }
            
            // Return HTML view for regular requests
            res.render('jobs/all', {
                jobs: formattedJobs,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalJobs,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
                user: req.account || null,
                isLogin: !!req.account
            });
            
        } catch (error) {
            console.error('Error in jobs index:', error);
            next(error);
        }
    }
    
    async show(req, res, next) {
        try {
            const job = await Job.findOne({ slug: req.params.slug });
            if (!job) {
                return res.status(404).json({ error: 'Job not found' });
            }

            req.session.slug = req.params.slug;
            const businessId = job.businessId;
            const business = await Business.findById(businessId);
            const jobs = await Job.find({ businessId, _id: { $ne: job._id } }); // delete the current job


            let jobApplied = null;
            let savedJob = null;
            
            // Use session-based authentication like ApplyController
            if (req.session && req.session.user) {
                const userId = req.session.user._id;
                
                jobApplied = await JobApplied.findOne({
                    user_id: userId,
                    job_id: job._id,
                });

                savedJob = await SavedJob.findOne({
                    user_id: userId,
                    job_id: job._id,
                });
            }

            // Check if request expects JSON (API request)
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    job: mongooseToObject(job),
                    business: mongooseToObject(business),
                    isStatus: jobApplied
                        ? jobApplied.status
                        : job.status === 'closed'
                          ? 'closed'
                          : null,
                    isSaved: !!savedJob,
                });
            }

            // Return HTML view for regular requests
            if (job.status === 'closed') {
                return res.render('jobs/detail', {
                    job: mongooseToObject(job),
                    jobs: multipleMongooseToObject(jobs),
                    business: mongooseToObject(business),
                    isStatus: job.status,
                    isSaved: !!savedJob,
                });
            }

            if (!jobApplied) {
                return res.render('jobs/detail', {
                    job: mongooseToObject(job),
                    jobs: multipleMongooseToObject(jobs),
                    business: mongooseToObject(business),
                    isStatus: null,
                    isSaved: !!savedJob,
                });
            }

            res.render('jobs/detail', {
                job: mongooseToObject(job),
                jobs: multipleMongooseToObject(jobs),
                business: mongooseToObject(business),
                isStatus: jobApplied.status,
                isSaved: !!savedJob,
            });
        } catch (error) {
            next(error);
        }
    }

    store(req, res, next) {
        const formData = req.body;

        if (!req.session.businessID) {
            return res
                .status(401)
                .send('Bạn cần đăng nhập doanh nghiệp để đăng tin.');
        }
        formData.businessID = req.session.businessID;

        const job = new Job(formData);

        job.save()
            .then(() => res.redirect('/jobs'))
            .catch((error) => {
                console.error('Error saving job:', error);
                res.status(500).send('Đã có lỗi xảy ra khi lưu công việc.');
            });
    }

    apply(req, res, next) {
        const userId = req.session.userId;
        const jobId = req.session.jobId;
        Job.findById(jobId)
            .then((job) => {
                if (!job) {
                    return res.status(404).send('❌ Công việc không tồn tại.');
                }

                // Kiểm tra nếu user đã apply rồi thì không thêm nữa
                if (job.applicants.includes(userId)) {
                    return res.send('✅ Bạn đã ứng tuyển công việc này rồi.');
                }

                // Thêm userId vào mảng applicants
                job.applicants.push(userId);

                return job.save();
            })
            .then(() => {
                res.send('✅ Ứng tuyển công việc thành công!');
            })
            .catch((error) => {
                console.error('[Apply Job Error]', error);
                next(error);
            });
    }

    async exportJobsForFaiss(req, res) {
        try {
            const jobs = await Job.find({}, { _id: 1, description: 1 }); // hoặc { title: 1 }
            const jobData = jobs.map((job) => ({
                jobId: job._id,
                text: job.description || '',
            }));
            fs.writeFileSync(
                './.vscode/python/job_data.json',
                JSON.stringify(jobData, null, 2),
            );
            res.send({
                message: 'Exported successfully',
                total: jobData.length,
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Export failed');
        }
    }
    async category(req, res, next) {
        try {
            const slug = req.params.slug;
            const jobFields = await JobField.findOne({ slug });
            const jobs = await Job.find({});
            let list = [];
            for (let job of jobs) {
                if (job.field == jobFields.name) {
                    list.push(job);
                }
            }
            // res.json(list);
            res.status(200).render('jobs/category', {
                jobs: multipleMongooseToObject(list),
            });
        } catch (error) {
            next(error);
        }
    }

    async remoteJobs(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            // Find jobs that are remote (city is 'remote' or location contains 'remote'/'wfh')
            const now = new Date();
            const totalJobs = await Job.countDocuments({
                $or: [
                    { city: { $regex: /remote/i } },
                    { city: 'remote' },
                    { location: { $regex: /remote|wfh|work from home/i } },
                    { type: { $regex: /remote|wfh|work from home/i } },
                ],
                expiryTime: { $gte: now },
            });

            const jobs = await Job.find({
                $or: [
                    { city: { $regex: /remote/i } },
                    { city: 'remote' },
                    { location: { $regex: /remote|wfh|work from home/i } },
                    { type: { $regex: /remote|wfh|work from home/i } },
                ],
                expiryTime: { $gte: now },
            })
                .populate('businessId', 'companyName logo')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            // Format jobs for display
            const formattedJobs = jobs.map((job) => ({
                ...job.toObject(),
                companyName:
                    job.businessId?.companyName || job.companyName || 'Công ty',
                companyLogo: job.logoPath || job.businessId?.logo || null,
                createdAt: JobController.formatRelativeTime(job.createdAt),
                expiryTime: JobController.formatDate(job.expiryTime),
                isRemote: true,
            }));

            const totalPages = Math.ceil(totalJobs / limit);

            // Check if request expects JSON (API request)
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    jobs: formattedJobs,
                    pagination: {
                        currentPage: page,
                        totalPages,
                        totalJobs,
                        hasNext: page < totalPages,
                        hasPrev: page > 1,
                    },
                });
            }

            // Return HTML view
            res.status(200).render('jobs/remote', {
                jobs: formattedJobs,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalJobs,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
                user: req.account || null,
                isLogin: !!req.account,
            });
        } catch (error) {
            console.error('Error in remoteJobs:', error);
            next(error);
        }
    }

    async allJobs(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const skip = (page - 1) * limit;

            // Get filter parameters
            const {
                keyWord = '',
                location = '',
                type = '',
                salaryRange = '',
                experience = '',
            } = req.query;

            // Get all active jobs (not expired)
            const now = new Date();

            // Build query with filters
            let query = { expiryTime: { $gte: now } };

            // Keyword search in title, company name, description, and technique
            if (keyWord) {
                query.$or = [
                    { title: { $regex: keyWord, $options: 'i' } },
                    { companyName: { $regex: keyWord, $options: 'i' } },
                    { description: { $regex: keyWord, $options: 'i' } },
                    { technique: { $regex: keyWord, $options: 'i' } },
                ];
            }

            // Location filter
            if (location) {
                query.$and = query.$and || [];
                if (location === 'Remote') {
                    query.$and.push({
                        $or: [
                            { type: { $regex: /remote/i } },
                            { city: { $regex: /remote/i } },
                            { location: { $regex: /remote|wfh|work from home/i } },
                        ],
                    });
                } else {
                    query.$and.push({
                        $or: [
                            { city: { $regex: location, $options: 'i' } },
                            { location: { $regex: location, $options: 'i' } },
                        ],
                    });
                }
            }

            // Job type filter
            if (type) {
                query.$and = query.$and || [];
                query.$and.push({
                    type: { $regex: new RegExp(type, 'i') },
                });
            }

            // Experience filter
            if (experience) {
                query.$and = query.$and || [];
                if (experience === 'Không yêu cầu') {
                    query.$and.push({
                        $or: [
                            { experience: { $regex: /không yêu cầu|no required|not required/i } },
                            { experience: { $exists: false } },
                            { experience: '' },
                        ],
                    });
                } else {
                    query.$and.push({
                        experience: { $regex: new RegExp(experience, 'i') },
                    });
                }
            }

            // Helper function to parse salary string to minimum value
            const parseSalaryToNumber = (salaryStr) => {
                if (!salaryStr) return 0;

                // Extract all numbers from salary string
                const matches = salaryStr.match(/\$([0-9,]+)/g);
                if (!matches) return 0;

                // Convert to numbers and remove commas, dollar signs
                const numbers = matches.map(match =>
                    parseInt(match.replace(/[$,]/g, ''), 10)
                ).filter(n => !isNaN(n));

                return numbers.length > 0 ? Math.min(...numbers) : 0;
            };

            // Helper function to parse experience string to months
            const parseExperienceToMonths = (expStr) => {
                if (!expStr) return 0;

                // Handle various experience formats
                if (expStr.toLowerCase().includes('không yêu cầu') ||
                    expStr.toLowerCase().includes('no required') ||
                    expStr.toLowerCase().includes('not required')) {
                    return 0;
                }

                // Extract years and months
                const yearMatch = expStr.match(/(\d+)\s*năm/);
                const monthMatch = expStr.match(/(\d+)\s*tháng/);

                let totalMonths = 0;
                if (yearMatch) {
                    totalMonths += parseInt(yearMatch[1]) * 12;
                }
                if (monthMatch) {
                    totalMonths += parseInt(monthMatch[1]);
                }

                // Handle range like "2-4 năm"
                const rangeMatch = expStr.match(/(\d+)\s*[-–]\s*(\d+)\s*năm/);
                if (rangeMatch) {
                    const minYears = parseInt(rangeMatch[1]);
                    totalMonths = minYears * 12;
                }

                return totalMonths;
            };

            // Check if we need post-query filtering for salary and experience
            const needsSalaryFilter = !!salaryRange;
            const needsExperienceFilter = !!experience;

            // For accurate filtering with string data, we need to get more data and filter in memory
            const queryLimit = needsSalaryFilter || needsExperienceFilter ? limit * 3 : limit;

            const totalJobs = await Job.countDocuments(query);

            const jobs = await Job.find(query)
                .populate('businessId', 'companyName logo')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(queryLimit);

            // Apply post-query filters for salary and experience
            let filteredJobs = jobs;

            if (needsSalaryFilter) {
                const [min, max] = salaryRange.split('-').map(Number);

                filteredJobs = filteredJobs.filter(job => {
                    const salaryNum = parseSalaryToNumber(job.salary);

                    if (max === 9999) {
                        // $2,000+ case
                        return salaryNum >= min;
                    } else {
                        // Specific range
                        return salaryNum >= min && salaryNum <= max;
                    }
                });
            }

            if (needsExperienceFilter) {
                filteredJobs = filteredJobs.filter(job => {
                    const jobExpMonths = parseExperienceToMonths(job.experience);

                    if (experience.toLowerCase().includes('không yêu cầu')) {
                        return jobExpMonths === 0;
                    }

                    // Handle specific experience ranges
                    if (experience.includes('Dưới 1 năm')) {
                        return jobExpMonths <= 12;
                    }
                    if (experience.includes('1-2 năm')) {
                        return jobExpMonths >= 12 && jobExpMonths <= 24;
                    }
                    if (experience.includes('2-4 năm')) {
                        return jobExpMonths >= 24 && jobExpMonths <= 48;
                    }
                    if (experience.includes('3-5 năm')) {
                        return jobExpMonths >= 36 && jobExpMonths <= 60;
                    }
                    if (experience.includes('5-10 năm')) {
                        return jobExpMonths >= 60 && jobExpMonths <= 120;
                    }
                    if (experience.includes('Trên 10 năm')) {
                        return jobExpMonths > 120;
                    }

                    // Fallback: direct regex match for other cases
                    return job.experience && job.experience.toLowerCase().includes(experience.toLowerCase());
                });
            }

            // Apply pagination after filtering
            const paginatedJobs = filteredJobs.slice(0, limit);

            // Format jobs for display
            const formattedJobs = paginatedJobs.map((job) => ({
                ...job.toObject(),
                companyName:
                    job.businessId?.companyName || job.companyName || 'Công ty',
                companyLogo: job.logoPath || job.businessId?.logo || null,
                createdAt: JobController.formatRelativeTime(job.createdAt),
                expiryTime: JobController.formatDate(job.expiryTime),
            }));

            const totalPages = Math.ceil(totalJobs / limit);

            // Check if request expects JSON (API request)
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    jobs: formattedJobs,
                    pagination: {
                        currentPage: page,
                        totalPages,
                        totalJobs,
                        hasNext: page < totalPages,
                        hasPrev: page > 1,
                    },
                });
            }

            // Return HTML view for regular requests
            res.status(200).render('jobs/all', {
                jobs: formattedJobs,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalJobs,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
                user: req.account || null,
                isLogin: !!req.account,
            });
        } catch (error) {
            console.error('Error in allJobs:', error);
            next(error);
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

        if (diffHours < 1) return 'vừa xong';
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;

        const day = String(past.getDate()).padStart(2, '0');
        const month = String(past.getMonth() + 1).padStart(2, '0');
        const year = past.getFullYear();
        return `${day}/${month}/${year}`;
    }

    static formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Handle loading more jobs for infinite scroll
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware
     */
    async loadMore(req, res, next) {
        try {
            const {
                page = 1,
                limit = 12, // Reduced from 24 for faster initial loading
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

            // Check cache first
            const cacheKey = getCacheKey(query, page, limit, filter);
            const cachedData = getFromCache(cacheKey);
            if (cachedData) {
                console.log('Cache hit for jobs API');
                return res.json(cachedData);
            }

            // Use parallel queries for better performance
            const [jobs, totalCount] = await Promise.all([
                Job.find(query)
                    .select('slug title companyName city type salary description isRecommended logoPath businessId createdAt')
                    .lean()
                    .populate('businessId', 'companyName logo')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit)),
                Job.countDocuments(query)
            ]);

            // Format jobs for response
            const formattedJobs = jobs.map((job) => ({
                id: job._id,
                slug: job.slug,
                title: job.title,
                company: job.businessId?.companyName || job.companyName || 'Công ty',
                salary: job.salary || 'Thỏa thuận',
                location: job.city || 'Hà Nội',
                type: job.type || 'Full-time',
                description: job.description || 'Cơ hội việc làm tuyệt vời đang chờ bạn...',
                time: job.createdAt ? formatRelativeTime(job.createdAt) : 'Gần đây',
                featured: job.isRecommended || false,
                remote: job.type === 'Remote' || job.type === 'remote',
                companyLogo: job.logoPath || job.businessId?.logo || null,
            }));

            const hasMore = skip + jobs.length < totalCount;
            const responseData = {
                jobs: formattedJobs,
                hasMore,
                currentPage: parseInt(page),
                totalCount,
            };

            // Cache the response
            setCache(cacheKey, responseData);

            // Return only the jobs array and hasMore flag to match frontend expectations
            res.json({
                jobs: formattedJobs,
                hasMore
            });
        } catch (error) {
            console.error('Error loading more jobs:', error);
            res.status(500).json({
                error: 'Failed to load more jobs',
                jobs: [],
                hasMore: false,
            });
        }
    }

    /**
     * Get jobs by category slug
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware
     */
    async getJobsByCategory(req, res, next) {
        const { slug } = req.params;
        console.log(`\n🔄 [${new Date().toISOString()}] Accessing category: /jobs/category/${slug}`);
        
        try {
            const now = new Date();
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const skip = (page - 1) * limit;

            // 1. Find the job field by slug
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
    }

    /**
     * Get all job fields with their associated jobs
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware
     */
    async getJobFields(req, res, next) {
        console.log('🔥 API DEBUG: /api/job-fields route called!');
        try {
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
    }

    /**
     * Get jobs grouped by field for homepage
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware
     */
    async getGroupedByField(req, res, next) {
        try {
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
    }
}

module.exports = new JobController();

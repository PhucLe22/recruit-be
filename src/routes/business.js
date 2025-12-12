const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads/logos directory exists
const logoUploadDir = path.join(__dirname, '../uploads/logos');
if (!fs.existsSync(logoUploadDir)) {
    fs.mkdirSync(logoUploadDir, { recursive: true });
}

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, logoUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `logo-${uniqueSuffix}${ext}`);
    }
});

// File filter for images only
const logoFileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
    }
};

const upload = multer({ 
    storage: logoStorage,
    fileFilter: logoFileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    }
});
const Business = require('../app/models/Business');
const { multipleMongooseToObject } = require('../util/mongoose');
const { verifyToken, isBusiness } = require('../middlewares/verifyToken');
const JobField = require('../app/models/JobField');
const Job = require('../app/models/Job');
const registerController = require('../app/controllers/business/RegisterController');
const loginController = require('../app/controllers/business/LoginController');
const businessLoginController = require('../app/controllers/business/LoginController');
const jobCreateController = require('../app/controllers/business/JobCreateController');
const detailApplicantController = require('../app/controllers/business/DetailApplicantController');
const dashboardController = require('../app/controllers/business/DashboardController');
const profileController = require('../app/controllers/business/ProfileController');
const businessController = require('../app/controllers/business/BusinessController');
const AppliedJobs = require('../app/models/AppliedJobs');
const SchelduleController = require('../app/controllers/job/SchelduleController');
const axios = require('axios');
const ActivityTracker = require('../middlewares/activityTracker');
const businessLayout = require('../middlewares/businessLayout');

// Apply business layout middleware to all business routes
router.use(businessLayout);

router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9; // 9 items per page (3 per row)
        const skip = (page - 1) * limit;
        
        // Build query
        const query = { isVerified: true };
        
        // Search by company name
        if (req.query.search) {
            query.companyName = { $regex: req.query.search, $options: 'i' };
        }
        
        // Filter by location
        if (req.query.location) {
            query['address.city'] = { $regex: req.query.location, $options: 'i' };
        }
        
        // Get total count for pagination
        const total = await Business.countDocuments(query);
        const totalPages = Math.ceil(total / limit);
        
        // Get businesses with pagination
        const businesses = await Business.find(query)
            .select('companyName description logoPath address isVerified slug')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
            
        // Transform data for the view
        const list = businesses.map(business => ({
            ...business,
            location: business.address ? business.address.city || '' : '',
            logoPath: business.logoPath || '/images/default-company-logo.png'
        }));
        const list2 = businesses.find({});
        console.log(list2);
        
        res.render('business/list', {
            title: 'Danh sách doanh nghiệp',
            list,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            search: req.query.search || '',
            location: req.query.location || ''
        });
        
    } catch (error) {
        console.error('Error fetching businesses:', error);
        next(error);
    }
});

router.get('/profile-page', verifyToken, profileController.showProfile);
router.post('/profile/edit', verifyToken, profileController.updateProfile);
router.post('/job/create', verifyToken, jobCreateController.createJob);
router.post('/login', loginController.login);
router.get('/logout', businessLoginController.logout);
router.post('/register/step1', registerController.showRegisterPage);
router.post('/register/step2', upload.single('logo'), registerController.register);
router.post('/register/submit', registerController.register);
router.post(
    '/register-direct',
    upload.single('logo'),
    registerController.register,
);
router.post(
    '/upload-logo',
    upload.single('logo'),
    profileController.uploadLogo,
);
router.get('/applicants-list', verifyToken, detailApplicantController.detail);
router.put('/:jobAppliedId/update', businessController.update);
router.get('/jobs-list', verifyToken, businessController.jobList);
router.get('/dashboard', isBusiness, dashboardController.showDashboard);
router.post('/dashboard', isBusiness, dashboardController.showDashboard);
// Route to view scheduled applicants list
router.get('/applicants-scheduled-list', verifyToken, (req, res, next) => {
    // Override layout for this specific route
    const originalRender = res.render;
    res.render = function(view, options, callback) {
        options = options || {};
        options.layout = false;
        originalRender.call(this, view, options, callback);
    };
    next();
}, SchelduleController.show.bind(SchelduleController));

// Route to view CV for an applicant
router.get('/applicant/cv/:id', verifyToken, (req, res, next) => {
    console.log('CV route hit for ID:', req.params.id);
    SchelduleController.viewCV(req, res, next);
});

router.get('/upload-logo-page', verifyToken, (req, res, next) => {
    try {
        res.render('business/uploadLogo');
    } catch (error) {
        next(error);
    }
});
// Public business list route (no authentication required)
router.get('/list', async (req, res, next) => {
    try {
        // Get all businesses with necessary fields
        const businesses = await Business.find({})
            .select('companyName description location logo isVerified')
            .lean();

        // Transform data for the view
        const transformedBusinesses = businesses.map(business => ({
            _id: business._id,
            companyName: business.companyName || 'Chưa có tên công ty',
            description: business.description || 'Chưa có mô tả',
            location: business.location || 'Chưa cập nhật địa chỉ',
            logoUrl: business.logo || '/images/default-company.png',
            verified: business.isVerified || false
        }));

        // Render the view with the transformed data
        res.render('business/list', {
            list: transformedBusinesses,
            layout: 'main', // Use main layout
            title: 'Danh sách doanh nghiệp',
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error in business list:', error);
        next(error);
    }
});

// Protected business list route (for authenticated users)
router.get('/list-protected', verifyToken, async (req, res, next) => {
    try {
        const businesses = await Business.find({});
        const transformedBusinesses = businesses.map((business) => ({
            ...business.toObject(),
            connectedCount: Math.floor(Math.random() * 500) + 50, // Mock data
            isActive: true,
            verified: Math.random() > 0.3,
        }));

        res.render('business/jobs/list', {
            businesses: transformedBusinesses,
            list: transformedBusinesses, // Thêm biến 'list' để tương thích với template
            totalBusinesses: businesses.length,
            activeBusinesses: transformedBusinesses.filter((b) => b.isActive)
                .length,
            verifiedBusinesses: transformedBusinesses.filter((b) => b.verified)
                .length,
            layout: false,
        });
    } catch (error) {
        next(error);
    }
});

// Public business detail route (no authentication required)
router.get(
    '/detail/:id',
    ActivityTracker.activityTracker,
    async (req, res, next) => {
        try {
            console.log(
                `🔍 DEBUG: Looking for business with ID: ${req.params.id}`,
            );
            const business = await Business.findById(req.params.id);
            if (!business) {
                console.log(
                    `❌ DEBUG: Business not found with ID: ${req.params.id}`,
                );
                return res.status(404).send('Business not found');
            }
            console.log(`✅ DEBUG: Found business: ${business.name}`);

            // Fetch job counts
            const jobCount = await Job.countDocuments({
                businessId: req.params.id,
            });
            const applicantCount = await AppliedJobs.countDocuments({
                businessId: req.params.id,
            });
            console.log(
                `📊 DEBUG: Job count: ${jobCount}, Applicant count: ${applicantCount}`,
            );

            // Fetch actual jobs posted by this company
            const companyJobs = await Job.find({
                businessId: req.params.id,
                status: 'active',
                expiryTime: { $gte: new Date() },
            })
                .populate('businessId')
                .sort({ createdAt: -1 })
                .limit(10); // Limit to 10 most recent jobs for the sidebar

            console.log(`💼 DEBUG: Found ${companyJobs.length} company jobs:`);
            companyJobs.forEach((job, index) => {
                console.log(
                    `  ${index + 1}. ${job.title} - ${job.businessId?.name || 'No business name'}`,
                );
            });

            // Transform jobs for template
            const transformedJobs = companyJobs.map((job) => ({
                id: job._id,
                slug: job.slug,
                title: job.title,
                type: job.type,
                city: job.city,
                salary: job.salary,
                expiryTime: job.expiryTime,
                createdAt: job.createdAt,
                formattedDaysLeft: Math.ceil(
                    (job.expiryTime - new Date()) / (1000 * 60 * 60 * 24),
                ),
                businessName: job.businessId?.name || business.name,
            }));

            const businessData = {
                ...business.toObject(),
                jobCount: jobCount,
                applicantCount: applicantCount,
                connectedCount: Math.floor(Math.random() * 500) + 100,
                employeeCount: Math.floor(Math.random() * 5000) + 100,
                foundedYear: 2010 + Math.floor(Math.random() * 15),
                isFollowing: false,
                isVerified: Math.random() > 0.3,
            };

            res.render('business/businessDetail', {
                business: businessData,
                companyJobs: transformedJobs,
                layout: false,
            });
        } catch (error) {
            next(error);
        }
    },
);

// Protected business detail route (for authenticated users)
router.get('/detail-protected/:id', verifyToken, async (req, res, next) => {
    try {
        const business = await Business.findById(req.params.id);
        if (!business) {
            return res.status(404).send('Business not found');
        }

        // Fetch job counts
        const jobCount = await Job.countDocuments({
            businessId: req.params.id,
        });
        const applicantCount = await AppliedJobs.countDocuments({
            businessId: req.params.id,
        });

        // Fetch actual jobs posted by this company
        const companyJobs = await Job.find({
            businessId: req.params.id,
            status: 'active',
            expiryTime: { $gte: new Date() },
        })
            .populate('businessId')
            .sort({ createdAt: -1 })
            .limit(10); // Limit to 10 most recent jobs for the sidebar

        // Transform jobs for template
        const transformedJobs = companyJobs.map((job) => ({
            id: job._id,
            slug: job.slug,
            title: job.title,
            type: job.type,
            city: job.city,
            salary: job.salary,
            expiryTime: job.expiryTime,
            createdAt: job.createdAt,
            formattedDaysLeft: Math.ceil(
                (job.expiryTime - new Date()) / (1000 * 60 * 60 * 24),
            ),
            businessName: job.businessId?.name || business.name,
        }));

        const businessData = {
            ...business.toObject(),
            jobCount: jobCount,
            applicantCount: applicantCount,
            connectedCount: Math.floor(Math.random() * 500) + 100,
            employeeCount: Math.floor(Math.random() * 5000) + 100,
            foundedYear: 2010 + Math.floor(Math.random() * 15),
            isFollowing: false,
            isVerified: Math.random() > 0.3,
        };

        res.render('business/businessDetail', {
            business: businessData,
            companyJobs: transformedJobs,
            layout: false,
        });
    } catch (error) {
        next(error);
    }
});

// Company jobs page - Show all jobs for a specific company
router.get('/jobs/:id', async (req, res, next) => {
    try {
        const business = await Business.findById(req.params.id);
        if (!business) {
            return res.status(404).send('Business not found');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Fetch all active jobs for this company with pagination
        const companyJobs = await Job.find({
            businessId: req.params.id,
            status: 'active',
            expiryTime: { $gte: new Date() },
        })
            .populate('businessId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const totalJobs = await Job.countDocuments({
            businessId: req.params.id,
            status: 'active',
            expiryTime: { $gte: new Date() },
        });

        // Transform jobs for template
        const transformedJobs = companyJobs.map((job) => ({
            id: job._id,
            slug: job.slug,
            title: job.title,
            type: job.type,
            city: job.city,
            salary: job.salary,
            expiryTime: job.expiryTime,
            createdAt: job.createdAt,
            description: job.description?.substring(0, 200) + '...',
            requirements: job.requirements?.substring(0, 200) + '...',
            experience: job.experience,
            formattedDaysLeft: Math.ceil(
                (job.expiryTime - new Date()) / (1000 * 60 * 60 * 24),
            ),
            businessName: job.businessId?.name || business.name,
        }));

        const totalPages = Math.ceil(totalJobs / limit);

        res.render('business/companyJobs', {
            business: business,
            jobs: transformedJobs,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalJobs: totalJobs,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1,
            },
            layout: false,
        });
    } catch (error) {
        next(error);
    }
});

router.post('/connect/:id', verifyToken, async (req, res, next) => {
    try {
        const { message, purpose } = req.body;
        const businessId = req.params.id;
        const userId = req.account.id;

        // TODO: Implement connection logic
        // Save connection request to database

        console.log('Connection request:', {
            from: userId,
            to: businessId,
            message,
            purpose,
            timestamp: new Date(),
        });

        res.json({
            success: true,
            message: 'Connection request sent successfully!',
        });
    } catch (error) {
        console.error('Connection error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send connection request',
        });
    }
});
router.get('/job/create-page', verifyToken, async (req, res, next) => {
    try {
        const jobFields = await JobField.find({});
        res.render('business/jobs/createJob', {
            jobFields: multipleMongooseToObject(jobFields),
            layout: false,
        });
    } catch (error) {
        next(error);
    }
});
router.get('/login-page', (req, res) => {
    res.render('auth/login', { 
        layout: false,
        title: 'Business Login',
        isBusinessLogin: true // Add this flag to customize the login form for business users if needed
    });
});
router.get('/register-page', (req, res) => {
    try {
        res.render('business/register', { layout: false });
    } catch (error) {
        next(error);
    }
});
router.get('/featured-company', verifyToken, async (req, res, next) => {
    try {
        const jobs = await Job.find();
        const appliedJobs = await AppliedJobs.find();
    } catch (error) {
        next(error);
    }
});
router.get('/schedule/meeting-page', verifyToken, async (req, res, next) => {
    try {
        // const id = req.params.id;
        // const jobAplied = await AppliedJobs.findById(id);
        res.render('business/meeting', {
            // jobAplied: mongooseToObject(jobAplied),
            layout: false,
        });
    } catch (error) {
        next(error);
    }
});

router.post('/schedule/meeting', async (req, res) => {
    try {
        const { summary, start_time, end_time, attendees, description } =
            req.body;

        // ✅ attendees chỉ là list string
        let attendeesArray = [];
        if (Array.isArray(attendees)) {
            attendeesArray = attendees.map((email) => email.trim());
        } else if (typeof attendees === 'string' && attendees.trim() !== '') {
            attendeesArray = attendees.split(',').map((email) => email.trim());
        }

        const toISO = (t) => new Date(t).toISOString();

        const payload = {
            summary: summary.trim(),
            start_time: toISO(start_time),
            end_time: toISO(end_time),
            timezone: 'Asia/Ho_Chi_Minh',
            attendees: attendeesArray, // ⚡ chỉ gửi ["a@gmail.com", "b@gmail.com"]
            description: description ? description.trim() : '',
        };

        console.log('📤 Sending payload:', payload);

        const response = await axios.post(
            'http://localhost:8000/api/create-meet',
            payload,
        );
        res.json(response.data);
    } catch (error) {
        console.error(
            '❌ AI backend error:',
            error.response?.data || error.message,
        );
        res.status(500).json({ error: 'Failed to create meeting' });
    }
});

module.exports = router;

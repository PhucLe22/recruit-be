const JobApplied = require('../../models/AppliedJobs');
const AppliedJobs = require('../../models/AppliedJobs');
const Job = require('../../models/Job');
const Business = require('../../models/Business');
const { multipleMongooseToObject } = require('../../../util/mongoose');
const { formatDate } = require('../../../middlewares/formatDate');
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

class BusinessController {
    update(req, res, next) {
        const jobAppliedId = req.params.jobAppliedId;
        const newStatus = req.body.status;

        JobApplied.updateOne({ _id: jobAppliedId }, { status: newStatus })
            .then((result) => {
                console.log('Update result:', result);
                res.json({
                    success: true,
                    message: 'Status updated',
                    status: newStatus,
                });
            })
            .catch((err) => {
                console.error(err);
                res.status(500).json({
                    success: false,
                    message: 'Server error',
                });
            });
    }
    async jobList(req, res, next) {
        try {
            const business = req.user;
            if (!business || (!business.id && !business._id)) {
                return res.status(400).send('Business account not found');
            }

            // Use either id or _id field
            const businessId = business.id || business._id;

            // Pagination settings
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Count total documents for pagination
            const total = await Job.countDocuments({ businessId });

            // Get paginated jobs
            const jobs = await Job.find({ businessId })
                .populate({
                    path: 'businessId',
                    select: 'companyName email',
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            const jobsList = jobs.map((job) => ({
                ...job,
                madeDate: formatDate(job.createdAt),
                expiredDate: formatDate(job.expiryTime),
                businessLink: `/business/profile/${job.businessId._id}`,
                business: {
                    name: job.businessId.companyName,
                    email: job.businessId.email,
                    id: job.businessId._id.toString(),
                },
            }));

            const totalPages = Math.ceil(total / limit);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1;

            res.status(200).render('business/jobs/list', {
                layout: 'business',
                jobsList: jobsList,
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
            console.error('Error in jobList:', error);
            next(error);
        }
    }

    // Show paginated list of businesses with search and filtering
    async showBusinessList(req, res, next) {
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
    }

    // Show protected business list with mock data
    async showProtectedBusinessList(req, res, next) {
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
    }

    // Show business detail page
    async showBusinessDetail(req, res, next) {
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

            const otherBusinesses = await Business.find({
                _id: { $ne: req.params.id }
            })
            .limit(8)
            .sort({ createdAt: -1 });

            const transformedOtherBusinesses = otherBusinesses.map((otherBusiness) => ({
                id: otherBusiness._id,
                name: otherBusiness.name || otherBusiness.companyName || 'Chưa có tên công ty',
                description: otherBusiness.description ? (otherBusiness.description.length > 100 ? otherBusiness.description.substring(0, 100) + '...' : otherBusiness.description) : 'Chưa có mô tả',
                location: (otherBusiness.address?.city || otherBusiness.address?.state) || 'Chưa cập nhật địa chỉ',
                logoUrl: otherBusiness.logo || otherBusiness.logoPath || '/images/default-company.png',
                verified: otherBusiness.isVerified || false,
                employeeCount: otherBusiness.employeeCount || Math.floor(Math.random() * 500) + 50,
                jobCount: Math.floor(Math.random() * 20) + 1 // Mock job count for now
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
                email: business.email,
                phone: business.phone,
                website: business.website,
                industry: business.industry,
                companySize: business.companySize,
            };

            res.render('business/detail', {
                company: businessData,
                jobs: transformedJobs,
                otherBusinesses: transformedOtherBusinesses,
                layout: false,
            });
        } catch (error) {
            next(error);
        }
    }

    // Show protected business detail page
    async showProtectedBusinessDetail(req, res, next) {
        try {
            const business = await Business.findById(req.params.id);
            if (!business) {
                return res.status(404).send('Business not found');
            }

            const jobCount = await Job.countDocuments({
                businessId: req.params.id,
            });
            const applicantCount = await AppliedJobs.countDocuments({
                businessId: req.params.id,
            });

            const companyJobs = await Job.find({
                businessId: req.params.id,
                status: 'active',
                expiryTime: { $gte: new Date() },
            })
                .populate('businessId')
                .sort({ createdAt: -1 })
                .limit(10);

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
                email: business.email,
                phone: business.phone,
                website: business.website,
                industry: business.industry,
                companySize: business.companySize,
            };

            res.render('business/detail', {
                company: businessData,
                jobs: transformedJobs,
                layout: false,
            });
        } catch (error) {
            next(error);
        }
    }

    // Show AI applicant matching page
    showMatchingPage(req, res) {
        res.render('business/jobs/matching', {
            layout: false,
            title: 'AI Applicant Matching',
            description: 'Find the best applicants for your jobs using AI'
        });
    }

    // Show simple matching results for a specific job
    async showJobMatching(req, res, next) {
        try {
            const { jobId } = req.params;
            const { limit = 20, minScore = 30 } = req.query;
            
            // Get job details
            const Job = require('../../models/Job');
            const job = await Job.findById(jobId);
            
            if (!job) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Job not found' 
                });
            }

            // Get matching applicants using the existing service
            const AIApplicantMatchingService = require('../../../services/AIApplicantMatchingService');
            const AppliedJobs = require('../../models/AppliedJobs');
            
            // Get already applied applicants to exclude
            const appliedApplicants = await AppliedJobs.find({ job_id: jobId })
                .distinct('user_id');

            const matchingApplicants = await AIApplicantMatchingService.getMatchingApplicants(
                jobId, 
                { 
                    limit: parseInt(limit),
                    minScore: parseInt(minScore),
                    excludeApplicants: appliedApplicants.map(id => id.toString())
                }
            );

            // Transform data for the simple template
            const transformedApplicants = matchingApplicants.map(applicant => ({
                user: applicant.user,
                cv: applicant.cv,
                score: applicant.matchingScore,
                reasons: applicant.matchingReasons || [],
                matchedSkills: applicant.skills || []
            }));

            res.render('business/jobs/matching-simple', {
                layout: false,
                job: job,
                applicants: transformedApplicants
            });

        } catch (error) {
            console.error('Error getting matching applicants:', error);
            next(error);
        }
    }

    // Show company jobs with pagination
    async showCompanyJobs(req, res, next) {
        try {
            const business = await Business.findById(req.params.id);
            if (!business) {
                return res.status(404).send('Business not found');
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const companyJobs = await Job.find({
                businessId: req.params.id,
                status: 'active',
                expiryTime: { $gte: new Date() },
            })
                .populate('businessId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const totalJobs = await Job.countDocuments({
                businessId: req.params.id,
                status: 'active',
                expiryTime: { $gte: new Date() },
            });

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
    }

    // Handle business connection requests
    async connectBusiness(req, res, next) {
        try {
            const { message, purpose } = req.body;
            const businessId = req.params.id;
            const userId = req.account.id;

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
    }

    // Show job creation page
    async showCreateJobPage(req, res, next) {
        try {
            const JobField = require('../../models/JobField');
            const jobFields = await JobField.find({});
            res.render('business/jobs/createJob', {
                jobFields: multipleMongooseToObject(jobFields),
                layout: false,
            });
        } catch (error) {
            next(error);
        }
    }

    // Show business login page
    showLoginPage(req, res) {
        res.render('auth/login', { 
            layout: false,
            title: 'Business Login',
            isBusinessLogin: true 
        });
    }

    // Show featured company (placeholder)
    async showFeaturedCompany(req, res, next) {
        try {
            const jobs = await Job.find();
            const appliedJobs = await AppliedJobs.find();
            // TODO: Implement featured company logic
        } catch (error) {
            next(error);
        }
    }

    // Schedule a new meeting
    async scheduleMeeting(req, res) {
        try {
            const { summary, start_time, end_time, attendees, description } = req.body;

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
                attendees: attendeesArray,
                description: description ? description.trim() : '',
            };

            console.log('📤 Sending payload:', payload);

            const response = await axios.post(
                `${AI_SERVICE_URL}/api/create-meet`,
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
    }
}

module.exports = new BusinessController();

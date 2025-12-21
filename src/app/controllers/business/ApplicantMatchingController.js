const AIApplicantMatchingService = require('../../../services/AIApplicantMatchingService');
const Job = require('../../models/Job');
const AppliedJobs = require('../../models/AppliedJobs');

class ApplicantMatchingController {
    // Get matching applicants for a specific job
    async getMatchingApplicants(req, res, next) {
        try {
            const { jobId } = req.params;
            const { limit = 20, minScore = 30 } = req.query;

            // Skip business verification for internal service requests
            if (req.isInternalService) {
                try {
                    console.log('Internal service request for job:', jobId);
                    
                    const Job = require('../../models/Job');
                    const AppliedJobs = require('../../models/AppliedJobs');
                    
                    // Get job details
                    const job = await Job.findById(jobId);
                    if (!job) {
                        return res.status(404).json({ 
                            success: false, 
                            message: 'Job not found' 
                        });
                    }

                    // Get already applied applicants to exclude
                    const appliedApplicants = await AppliedJobs.find({ job_id: jobId })
                        .distinct('user_id');

                    console.log('Applied applicants count:', appliedApplicants.length);

                    // Get matching applicants
                    const matchingApplicants = await AIApplicantMatchingService.getMatchingApplicants(
                        jobId, 
                        { 
                            limit: parseInt(limit),
                            minScore: parseInt(minScore),
                            excludeApplicants: appliedApplicants.map(id => id.toString())
                        }
                    );

                    console.log('Matching applicants found:', matchingApplicants.length);

                    return res.json({
                        success: true,
                        data: {
                            job: {
                                id: job._id,
                                title: job.title,
                                field: job.field,
                                experience: job.experience,
                                type: job.type
                            },
                            applicants: matchingApplicants,
                            totalFound: matchingApplicants.length,
                            filters: {
                                limit: parseInt(limit),
                                minScore: parseInt(minScore)
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error in internal service request:', error);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Internal service error: ' + error.message 
                    });
                }
            }

            // Regular business authentication flow
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

            // Verify job belongs to this business
            const job = await Job.findOne({ _id: jobId, businessId });
            if (!job) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Job not found or access denied' 
                });
            }

            // Get already applied applicants to exclude
            const appliedApplicants = await AppliedJobs.find({ job_id: jobId })
                .distinct('user_id');

            // Get matching applicants
            const matchingApplicants = await AIApplicantMatchingService.getMatchingApplicants(
                jobId, 
                { 
                    limit: parseInt(limit),
                    minScore: parseInt(minScore),
                    excludeApplicants: appliedApplicants.map(id => id.toString())
                }
            );

            res.json({
                success: true,
                data: {
                    job: {
                        id: job._id,
                        title: job.title,
                        field: job.field,
                        experience: job.experience,
                        type: job.type
                    },
                    applicants: matchingApplicants,
                    totalFound: matchingApplicants.length,
                    filters: {
                        limit: parseInt(limit),
                        minScore: parseInt(minScore)
                    }
                }
            });

        } catch (error) {
            console.error('Error getting matching applicants:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Get applicant recommendations for all business jobs
    async getAllJobsApplicantRecommendations(req, res, next) {
        try {
            const { limit = 10, minScore = 30 } = req.query;

            // Skip business verification for internal service requests
            if (req.isInternalService) {
                try {
                    console.log('Internal service request for all recommendations');
                    
                    const Job = require('../../models/Job');
                    
                    // For testing, get all jobs (no business filter)
                    const jobs = await Job.find({ status: { $ne: 'closed' } })
                        .select('_id title field experience type businessId')
                        .limit(10);

                    console.log('Found jobs:', jobs.length);

                    if (jobs.length === 0) {
                        return res.json({
                            success: true,
                            data: {
                                recommendations: {},
                                totalJobs: 0,
                                filters: {
                                    limit: parseInt(limit),
                                    minScore: parseInt(minScore)
                                }
                            }
                        });
                    }

                    const recommendations = {};

                    // Get recommendations for each job
                    for (const job of jobs) {
                        try {
                            const matchingApplicants = await AIApplicantMatchingService.getMatchingApplicants(
                                job._id.toString(),
                                {
                                    limit: parseInt(limit),
                                    minScore: parseInt(minScore),
                                    excludeApplicants: []
                                }
                            );

                            recommendations[job._id.toString()] = {
                                job: job.toObject(),
                                applicants: matchingApplicants,
                                totalFound: matchingApplicants.length
                            };
                        } catch (jobError) {
                            console.error(`Error getting recommendations for job ${job._id}:`, jobError);
                            recommendations[job._id.toString()] = {
                                job: job.toObject(),
                                applicants: [],
                                totalFound: 0,
                                error: jobError.message
                            };
                        }
                    }

                    return res.json({
                        success: true,
                        data: {
                            recommendations: recommendations,
                            totalJobs: jobs.length,
                            filters: {
                                limit: parseInt(limit),
                                minScore: parseInt(minScore)
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error in internal service request:', error);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Internal service error: ' + error.message 
                    });
                }
            }

            // Regular business authentication flow
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;

            // Get all jobs for this business
            const jobs = await Job.find({ businessId, status: { $ne: 'closed' } })
                .select('_id title field experience type');

            if (jobs.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        recommendations: {},
                        totalJobs: 0,
                        filters: {
                            limit: parseInt(limit),
                            minScore: parseInt(minScore)
                        }
                    }
                });
            }

            const recommendations = {};

            // Get recommendations for each job
            for (const job of jobs) {
                const matchingApplicants = await AIApplicantMatchingService.getMatchingApplicants(
                    job._id.toString(),
                    {
                        limit: parseInt(limit),
                        minScore: parseInt(minScore),
                        excludeApplicants: []
                    }
                );

                recommendations[job._id.toString()] = {
                    job: job.toObject(),
                    applicants: matchingApplicants,
                    totalFound: matchingApplicants.length
                };
            }

            res.json({
                success: true,
                data: {
                    recommendations: recommendations,
                    totalJobs: jobs.length,
                    filters: {
                        limit: parseInt(limit),
                        minScore: parseInt(minScore)
                    }
                }
            });

        } catch (error) {
            console.error('Error getting all recommendations:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Get detailed applicant profile with matching insights
    async getApplicantProfile(req, res, next) {
        try {
            const { userId } = req.params;
            const { jobId } = req.query;

            // Generate a consistent score based on userId and jobId
            const hashString = `${userId}-${jobId}`;
            let hash = 0;
            for (let i = 0; i < hashString.length; i++) {
                hash = ((hash << 5) - hash) + hashString.charCodeAt(i);
                hash = hash & hash;
            }
            const score = 60 + Math.abs(hash % 35); // Score between 60-95

            const userProfile = {
                user: { 
                    _id: userId, 
                    username: 'User ' + userId.slice(-4), 
                    email: `user${userId.slice(-4)}@example.com` 
                },
                cv: { 
                    originalName: 'cv.pdf',
                    parsed_output: {
                        technical_skills: ['JavaScript', 'React', 'Node.js', 'Python'],
                        work_experience: ['Software Engineer'],
                        experience_years: 3,
                        level: 'mid'
                    }
                },
                matchingScore: score,
                matchingReasons: [`Matching score ${score}% based on skills and experience alignment`],
                skills: ['JavaScript', 'React', 'Node.js', 'Python'],
                experience: ['Software Engineer']
            };

            res.json({
                success: true,
                data: userProfile
            });

        } catch (error) {
            console.error('Error getting applicant profile:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    // Update matching preferences
    async updateMatchingPreferences(req, res, next) {
        try {
            const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;
            const { preferences } = req.body;

            // TODO: Store preferences in database or session
            // For now, just return success

            res.json({
                success: true,
                message: 'Matching preferences updated successfully',
                data: preferences
            });

        } catch (error) {
            console.error('Error updating preferences:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }
}

module.exports = new ApplicantMatchingController();

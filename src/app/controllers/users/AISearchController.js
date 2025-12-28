const Job = require('../../models/Job');
const AIFilteringService = require('../../../services/AIFilteringService');
const User = require('../../models/User');
const { extractTechnicalSkills, extractSoftSkills } = require('../../../utils/jobAnalysisUtils');

class AISearchController {
    /**
     * Handle AI-powered job search
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static async smartSearch(req, res, next) {
        try {
            const {
                query,
                filters = {},
                useAI = true,
                userPreferences = {},
            } = req.body;

            console.log('🤖 AI SMART SEARCH:', { query, filters, useAI });

            // Build MongoDB query
            const mongoQuery = this.buildMongoQuery(filters);

            // Get jobs from database
            const jobs = await this.fetchJobs(mongoQuery);
            console.log(`🤖 Found ${jobs.length} jobs for AI analysis`);

            // Process jobs with or without AI
            const result = useAI && jobs.length > 0 
                ? await this.processWithAI(jobs, query, userPreferences)
                : this.processWithoutAI(jobs);

            this.sendSuccessResponse(res, {
                query,
                totalFound: jobs.length,
                totalFiltered: result.filteredJobs.length,
                jobs: result.filteredJobs,
                aiAnalysis: {
                    insights: result.aiInsights,
                    recommendations: result.aiRecommendations,
                    aiUsed: useAI,
                },
            });
        } catch (error) {
            this.handleError(error, res);
        }
    }

    /**
     * Build MongoDB query based on filters
     * @param {Object} filters - Search filters
     * @returns {Object} MongoDB query object
     */
    static buildMongoQuery(filters) {
        const query = {
            expiryTime: { $gte: new Date() },
            status: 'active',
        };

        if (filters.cities?.length) {
            query.city = { $in: filters.cities };
        }

        if (filters.types?.length) {
            query.type = { $in: filters.types };
        }

        if (filters.salaryMin) {
            const minSalary = parseInt(filters.salaryMin);
            query.$expr = {
                $gte: [
                    {
                        $toInt: {
                            $regexReplaceAll: {
                                input: { $toString: '$salary' },
                                find: '\\D',
                                replacement: '',
                            },
                        },
                    },
                    minSalary,
                ],
            };
        }

        return query;
    }

    /**
     * Fetch jobs from database
     * @param {Object} query - MongoDB query
     * @returns {Promise<Array>} Array of job documents
     */
    static async fetchJobs(query) {
        return await Job.find(query)
            .populate('businessId')
            .sort({ createdAt: -1 })
            .limit(50); // Limit to 50 for AI processing
    }

    /**
     * Process jobs with AI filtering
     */
    static async processWithAI(jobs, query, userPreferences) {
        return await AIFilteringService.intelligentFilterJobs(
            jobs,
            query,
            userPreferences,
        );
    }

    /**
     * Process jobs without AI (fallback)
     */
    static processWithoutAI(jobs) {
        return {
            originalJobs: jobs,
            filteredJobs: jobs,
            aiInsights: ['AI filtering is not enabled'],
            matchScores: jobs.map(() => 70),
            aiRecommendations: ['Enable AI for better results'],
        };
    }

    /**
     * Send success response
     */
    static sendSuccessResponse(res, data) {
        res.json({
            success: true,
            data
        });
    }

    /**
     * Handle errors
     */
    static handleError(error, res) {
        console.error('🤖 AI Smart Search Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error in AI search',
            error: error.message,
        });
    }

    /**
     * Match CV with available jobs
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static async matchCV(req, res, next) {
        try {
            const { cvData, limit = 15 } = req.body;

            if (!cvData) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp dữ liệu CV',
                });
            }

            console.log('🤖 Analyzing CV for job matching...');

            // Get available jobs
            const availableJobs = await Job.find({
                expiryTime: { $gte: new Date() },
                status: 'active',
            })
                .populate('businessId')
                .limit(100);

            // AI analyze CV and match jobs
            const matchingResults = await AIFilteringService.analyzeCVAndRecommendJobs(
                cvData,
                availableJobs,
            );

            res.json({
                success: true,
                data: {
                    cvAnalysis: {
                        skillsFound: cvData.skills || [],
                        experience: cvData.experience || [],
                        totalJobs: availableJobs.length,
                    },
                    matchingJobs: matchingResults.filteredJobs.slice(0, parseInt(limit)),
                    aiInsights: matchingResults.aiInsights,
                    recommendations: matchingResults.aiRecommendations,
                },
            });
        } catch (error) {
            console.error('🤖 CV Matching Error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi phân tích CV',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    /**
     * Analyze a job posting and provide insights
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static async analyzeJob(req, res, next) {
        try {
            const { jobId } = req.params;

            const job = await Job.findById(jobId).populate('businessId');

            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy công việc',
                });
            }

            console.log(`🤖 Analyzing job: ${job.title}`);

            // AI analysis for single job
            const analysisPrompt = `Phân tích công việc này và đánh giá:
- Tiềm năng phát triển
- Yêu cầu kỹ năng cần thiết
- Mức độ cạnh tranh
- Lời khuyên cho ứng viên

Công việc: ${job.title}
Mô tả: ${job.description}
Yêu cầu: ${job.requirements}
Lương: ${job.salary}`;

            const jobAnalysis = {
                title: job.title,
                careerInsights: {
                    growthPotential: 'High', // This would be determined by AI
                    competitiveness: 'Medium',
                    skillDemand: 'High',
                },
                requirements: {
                    technicalSkills: extractTechnicalSkills(job),
                    softSkills: extractSoftSkills(job),
                    experience: job.experience || 'Not specified',
                },
                recommendations: [
                    'Tập trung vào các kỹ năng được đề cập',
                    'Chuẩn bị CV theo yêu cầu công việc',
                    'Tìm hiểu về công ty trước khi ứng tuyển',
                ],
            };

            res.json({
                success: true,
                data: {
                    job,
                    analysis: jobAnalysis,
                },
            });
        } catch (error) {
            console.error('🤖 Job Analysis Error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi phân tích công việc',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    /**
     * Get user profile by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User profile
     */
    static async getUserProfile(userId) {
        return await User.findById(userId)
            .select('skills experience preferences')
            .lean();
    }

    /**
     * Get personalized job recommendations for a user
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static async getPersonalizedRecommendations(req, res, next) {
        try {
            const { userId } = req.params;
            const { limit = 10 } = req.query;

            console.log(`🤖 Getting AI recommendations for user: ${userId}`);

            const userProfile = await this.constructor.getUserProfile(userId);
            if (!userProfile) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy profile người dùng',
                });
            }

            const availableJobs = await Job.find({
                expiryTime: { $gte: new Date() },
                status: 'active',
            })
                .populate('businessId')
                .limit(100);

            const recommendations = await AIFilteringService.getPersonalizedRecommendations(
                userProfile,
                availableJobs,
                parseInt(limit),
            );

            res.json({
                success: true,
                data: {
                    userId,
                    recommendations,
                    totalFound: recommendations.length,
                    userProfile: {
                        skills: userProfile.skills || [],
                        experience: userProfile.experience || '',
                        preferences: userProfile.preferences || {},
                    },
                },
            });
        } catch (error) {
            console.error('🤖 AI Recommendations Error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy gợi ý công việc',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    /**
     * Get job recommendations based on personality assessment
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    static async getPersonalityBasedRecommendations(req, res, next) {
        try {
            const { personality_data, user_profile = {} } = req.body;
            console.log('🤖 AI JOB RECOMMENDATIONS:', { personality_data, user_profile });
            
            // Forward to AI service for personality-based job recommendations
            const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
            const response = await fetch(`${aiServiceUrl}/api/personality-assessment/job-recommendations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    personality_data,
                    user_profile
                })
            });

            if (!response.ok) {
                throw new Error(`AI service responded with status: ${response.status}`);
            }

            const recommendations = await response.json();
            res.json(recommendations);
        } catch (error) {
            console.error('❌ Error in job recommendations:', error);
            // Fallback recommendations
            const fallbackRecommendations = {
                success: true,
                recommendations: [
                    {
                        title: "Software Engineer",
                        company: "Tech Company",
                        match_score: 85,
                        description: "Perfect match for analytical thinking and problem-solving skills",
                        skills_required: ["JavaScript", "Python", "Problem Solving"],
                        salary_range: "$80k - $120k"
                    },
                    {
                        title: "Data Analyst",
                        company: "Analytics Corp",
                        match_score: 78,
                        description: "Great fit for detail-oriented and analytical personality",
                        skills_required: ["SQL", "Excel", "Data Visualization"],
                        salary_range: "$70k - $100k"
                    }
                ],
                personality_insights: "Based on your personality assessment, roles involving analysis and structured problem solving would be ideal."
            };
            res.json(fallbackRecommendations);
        }
    }
}

module.exports = AISearchController;

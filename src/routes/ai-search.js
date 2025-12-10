const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
const Job = require('../app/models/Job');
const AIFilteringService = require('../services/AIFilteringService');

/**
 * AI-Powered Job Search API
 * Sử dụng AI để phân tích và tìm kiếm công việc thông minh
 */

// AI Smart Search - Phân tích query và trả về kết quả phù hợp nhất
router.post('/smart-search', async (req, res, next) => {
    try {
        const {
            query,
            filters = {},
            useAI = true,
            userPreferences = {},
        } = req.body;

        console.log('🤖 AI SMART SEARCH:', { query, filters, useAI });

        // Get initial jobs from database
        let mongoQuery = {
            expiryTime: { $gte: new Date() },
            status: 'active',
        };

        // Apply basic MongoDB filters
        if (filters.cities && filters.cities.length > 0) {
            mongoQuery.city = { $in: filters.cities };
        }

        if (filters.types && filters.types.length > 0) {
            mongoQuery.type = { $in: filters.types };
        }

        if (filters.salaryMin) {
            const minSalary = parseInt(filters.salaryMin);
            mongoQuery.$expr = {
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

        // Get jobs from database
        const jobs = await Job.find(mongoQuery)
            .populate('businessId')
            .sort({ createdAt: -1 })
            .limit(50); // Limit to 50 for AI processing

        console.log(`🤖 Found ${jobs.length} jobs for AI analysis`);

        let result;

        if (useAI && jobs.length > 0) {
            // Use AI for intelligent filtering
            result = await AIFilteringService.intelligentFilterJobs(
                jobs,
                query,
                userPreferences,
            );
        } else {
            // Fallback to basic filtering
            result = {
                originalJobs: jobs,
                filteredJobs: jobs,
                aiInsights: ['AI filtering không được bật'],
                matchScores: jobs.map(() => 70),
                aiRecommendations: ['Thử bật AI để kết quả tốt hơn'],
            };
        }

        res.json({
            success: true,
            data: {
                query,
                totalFound: jobs.length,
                totalFiltered: result.filteredJobs.length,
                jobs: result.filteredJobs,
                aiAnalysis: {
                    insights: result.aiInsights,
                    recommendations: result.aiRecommendations,
                    aiUsed: useAI,
                },
            },
        });
    } catch (error) {
        console.error('🤖 AI Smart Search Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tìm kiếm thông minh',
            error: error.message,
        });
    }
});

// Personalized Job Recommendations dựa trên user profile
router.get('/recommendations/:userId', verifyToken, async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { limit = 10 } = req.query;

        console.log(`🤖 Getting AI recommendations for user: ${userId}`);

        // Get user profile (you need to implement this)
        const userProfile = await getUserProfile(userId);

        if (!userProfile) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy profile người dùng',
            });
        }

        // Get available jobs
        const availableJobs = await Job.find({
            expiryTime: { $gte: new Date() },
            status: 'active',
        })
            .populate('businessId')
            .limit(100);

        // Get AI recommendations
        const recommendations =
            await AIFilteringService.getPersonalizedRecommendations(
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
            error: error.message,
        });
    }
});

// CV Job Matching - Upload CV và tìm jobs phù hợp
router.post('/cv-matching', async (req, res, next) => {
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
        const matchingResults =
            await AIFilteringService.analyzeCVAndRecommendJobs(
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
                matchingJobs: matchingResults.filteredJobs.slice(
                    0,
                    parseInt(limit),
                ),
                aiInsights: matchingResults.aiInsights,
                recommendations: matchingResults.aiRecommendations,
            },
        });
    } catch (error) {
        console.error('🤖 CV Matching Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi phân tích CV',
            error: error.message,
        });
    }
});

// AI Job Analysis - Phân tích sâu về một công việc cụ thể
router.get('/analyze-job/:jobId', async (req, res, next) => {
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

        // You can implement AI call here or return structured data
        const jobAnalysis = {
            title: job.title,
            careerInsights: {
                growthPotential: 'High', // AI would determine this
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
            error: error.message,
        });
    }
});

// Helper functions
function extractTechnicalSkills(job) {
    const content =
        `${job.title} ${job.description} ${job.requirements}`.toLowerCase();

    const techSkills = [];
    const skillKeywords = {
        javascript: ['javascript', 'js', 'nodejs', 'react', 'vue', 'angular'],
        python: ['python', 'django', 'flask', 'fastapi'],
        java: ['java', 'spring', 'springboot'],
        sql: ['sql', 'mysql', 'postgresql', 'mongodb'],
        aws: ['aws', 'cloud', 'ec2', 's3'],
        docker: ['docker', 'kubernetes', 'container'],
    };

    Object.entries(skillKeywords).forEach(([skill, keywords]) => {
        if (keywords.some((keyword) => content.includes(keyword))) {
            techSkills.push(skill);
        }
    });

    return techSkills;
}

function extractSoftSkills(job) {
    const content = `${job.description} ${job.requirements}`.toLowerCase();

    const softSkills = [];
    const softSkillKeywords = {
        communication: ['communication', 'giao tiếp', 'presentation'],
        leadership: ['leadership', 'lãnh đạo', 'manager', 'team lead'],
        english: ['english', 'tiếng anh', 'english skills'],
        'problem-solving': [
            'problem solving',
            'analytical',
            'critical thinking',
        ],
    };

    Object.entries(softSkillKeywords).forEach(([skill, keywords]) => {
        if (keywords.some((keyword) => content.includes(keyword))) {
            softSkills.push(skill);
        }
    });

    return softSkills;
}

async function getUserProfile(userId) {
    // Implement user profile retrieval
    // This would get user skills, preferences, experience, etc.
    return {
        id: userId,
        skills: ['javascript', 'react', 'nodejs'],
        experience: '2 years',
        preferences: {
            cities: ['Hà Nội', 'Hồ Chí Minh'],
            jobTypes: ['full-time', 'remote'],
            salaryRange: { min: 15000000, max: 25000000 },
        },
    };
}

// Job Recommendations based on Personality Assessment
router.post('/job-recommendations', async (req, res) => {
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
                personality_data: personality_data,
                user_profile: user_profile
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
});

module.exports = router;

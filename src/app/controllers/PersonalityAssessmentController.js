const mongoose = require('mongoose');
const { formatDate } = require('../../middlewares/formatDate');

// Import Assessment Models
const MBTIAssessment = require('../models/MBTIAssessment');
const BigFiveAssessment = require('../models/BigFiveAssessment');
const DISCAssessment = require('../models/DISCAssessment');

// AI Service Configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

class PersonalityAssessmentController {
    // ===== MBTI ASSESSMENT =====

    async getMBTIAssessment(req, res) {
        try {
            const mbtiQuestions = this.generateMBTIQuestions();

            res.render('personality-assessments/mbti-assessment', {
                layout: false,
                questions: mbtiQuestions,
                user: req.account || null,
                isLogin: !!req.account,
                assessmentType: 'MBTI',
                title: 'Bài kiểm tra tính cách MBTI'
            });
        } catch (error) {
            console.error('Error loading MBTI assessment:', error);
            res.status(500).json({ error: 'Failed to load MBTI assessment' });
        }
    }

    async submitMBTIAssessment(req, res) {
        try {
            const { answers, mbtiType, scores } = req.body;

            if (!answers || !Array.isArray(answers)) {
                return res.status(400).json({ error: 'Invalid answers format' });
            }

            // Use client-calculated MBTI type or calculate on server
            let finalMBTIType = mbtiType;
            let finalScores = scores;

            if (!finalMBTIType) {
                // Fallback: calculate on server if not provided by client
                const mbtiResult = this.calculateMBTIFromAnswers(answers);
                finalMBTIType = mbtiResult.type;
                finalScores = mbtiResult.scores;
            }

            // Create result object
            const result = {
                type: finalMBTIType,
                scores: finalScores,
                answers: answers
            };

            // Save result to cache
            const savedResult = await this.saveMBTIResult(req.account?.id, result);

            res.json({
                success: true,
                result: result,
                redirectTo: `/personality-assessments/mbti/results/${savedResult._id}`
            });
        } catch (error) {
            console.error('Error submitting MBTI assessment:', error);
            res.status(500).json({ error: 'Failed to submit MBTI assessment' });
        }
    }

    async getMBTIResults(req, res) {
        try {
            const { resultId } = req.params;
            
            let mbtiType = 'INTJ'; // Default type
            let resultData = null;
            
            // Try to get result from cache first
            const cachedResult = await this.getMBTIResultById(resultId);
            if (cachedResult && cachedResult.type) {
                mbtiType = cachedResult.type;
                resultData = cachedResult;
                console.log(`Found MBTI result in cache: ${mbtiType}`);
            } else {
                // Fallback: try to get from AI service
                const userId = resultId.includes('user') ? resultId : '692f840f28a9b73f73b61550';
                try {
                    const aiResponse = await fetch(`http://localhost:8000/api/personality-assessment/user/${userId}/latest/mbti`);
                    const aiData = await aiResponse.json();
                    if (aiData.success && aiData.result && aiData.result.type) {
                        mbtiType = aiData.result.type;
                        resultData = aiData.result;
                        console.log(`Found MBTI result from AI service: ${mbtiType}`);
                    }
                } catch (e) {
                    console.log('AI service not available, using default MBTI type');
                }
            }

            const personalityProfile = this.getMBTIProfile(mbtiType);

            // Prepare template data
            const templateData = {
                layout: false,
                result: {
                    type: mbtiType,
                    description: personalityProfile.description,
                    scores: resultData && resultData.scores ? resultData.scores : this.getDefaultMBTIScores(mbtiType)
                },
                profile: {
                    name: personalityProfile.name,
                    description: personalityProfile.description,
                    strengths: personalityProfile.strengths,
                    careers: personalityProfile.careers,
                    challenges: personalityProfile.weaknesses || [],
                    quote: personalityProfile.quote || "Hãy là phiên bản tốt nhất của chính mình.",
                    workplaceInsights: [
                        {
                            icon: "fa-briefcase",
                            title: "Phong cách làm việc",
                            description: personalityProfile.workStyle || "Bạn có phong cách làm việc độc đáo và hiệu quả."
                        },
                        {
                            icon: "fa-users",
                            title: "Giao tiếp",
                            description: "Bạn giao tiếp một cách " + (mbtiType.includes('E') ? "hướng ngoại và năng động" : "hướng nội và sâu sắc")
                        }
                    ]
                },
                user: req.account || null,
                isLogin: !!req.account
            };

            res.render('personality-assessments/mbti-results', templateData);
        } catch (error) {
            console.error('Error loading MBTI results:', error);
            res.status(500).json({ error: 'Failed to load MBTI results' });
        }
    }

    async getUserMBTIResults(req, res) {
        try {
            const results = await this.getUserMBTIResults(req.account.id);
            res.json({ results });
        } catch (error) {
            console.error('Error loading user MBTI results:', error);
            res.status(500).json({ error: 'Failed to load user MBTI results' });
        }
    }

    // ===== BIG FIVE ASSESSMENT =====

    async getBigFiveAssessment(req, res) {
        try {
            const bigFiveQuestions = this.generateBigFiveQuestions();

            res.render('personality-assessments/big-five-assessment', {
                layout: false,
                questions: bigFiveQuestions,
                user: req.account || null,
                isLogin: !!req.account,
                assessmentType: 'Big Five',
                title: 'Bài kiểm tra tính cách Big Five (OCEAN)'
            });
        } catch (error) {
            console.error('Error loading Big Five assessment:', error);
            res.status(500).json({ error: 'Failed to load Big Five assessment' });
        }
    }

    async submitBigFiveAssessment(req, res) {
        try {
            const { answers } = req.body;

            if (!answers || !Array.isArray(answers)) {
                return res.status(400).json({ error: 'Invalid answers format' });
            }

            // Prepare data for AI service
            const assessmentData = {
                assessment_type: 'big_five',
                responses: answers.map((answer, index) => ({
                    question_id: index + 1,
                    answer: answer
                })),
                questions: this.generateBigFiveQuestions(),
                user_info: req.account ? {
                    id: req.account.id,
                    username: req.account.username
                } : null,
                completed_at: new Date().toISOString()
            };

            // Call AI service for personality analysis
            const aiResponse = await this.callAIService(assessmentData);

            // Save result to database (you'll need to create the model)
            const savedResult = await this.saveBigFiveResult(req.account?.id, aiResponse.result);

            res.json({
                success: true,
                result: aiResponse.result,
                redirectTo: `/personality-assessments/big-five/results/${savedResult._id}`
            });
        } catch (error) {
            console.error('Error submitting Big Five assessment:', error);
            res.status(500).json({ error: 'Failed to submit Big Five assessment' });
        }
    }

    async getBigFiveResults(req, res) {
        try {
            const { resultId } = req.params;

            console.log(`Getting Big Five results for resultId: ${resultId}`);

            let scores, analysis, recommendations;

            // Try to get result from cache first
            const cachedResult = await this.getBigFiveResultById(resultId);
            if (cachedResult && cachedResult.scores) {
                scores = cachedResult.scores;
                console.log(`Found Big Five result in cache`);
                analysis = "Kết quả dựa trên câu trả lời của bạn trong bài kiểm tra.";
                recommendations = this.getBigFiveRecommendations(scores);
            } else {
                // Fallback: try to get from AI service
                const userId = resultId.includes('user') ? resultId : '692f840f28a9b73f73b61550';
                try {
                    const aiResponse = await fetch(`http://localhost:8000/api/personality-assessment/user/${userId}/latest/big_five`);
                    const aiData = await aiResponse.json();

                    console.log('AI Service Response:', { status: aiResponse.ok, data: aiData });

                    if (aiResponse.ok && aiData.success) {
                        scores = aiData.result.scores;
                        analysis = aiData.result.analysis;
                        recommendations = aiData.result.recommendations;
                    } else {
                        throw new Error('AI service failed');
                    }
                } catch (e) {
                    console.log('AI service failed, using fallback data');
                    // Fallback to sample data if AI service fails
                    scores = {
                        openness: 75,
                        conscientiousness: 80,
                        extraversion: 50,
                        agreeableness: 65,
                        neuroticism: 30
                    };
                    analysis = "You demonstrate balanced personality traits with high openness to experience and conscientiousness. You are creative, organized, and emotionally stable.";
                    recommendations = ["Project Manager", "Research Analyst", "Product Designer"];
                }
            }

            // Transform Big Five scores to match template structure
            const traitData = [
                {
                    name: "Mở điểm (Openness)",
                    score: scores.openness,
                    description: "Khả năng tiếp thu cái mới, sự sáng tạo và tò mò.",
                    level: scores.openness >= 70 ? "Cao" : scores.openness >= 40 ? "Trung bình" : "Thấp",
                    levelClass: scores.openness >= 70 ? "high" : scores.openness >= 40 ? "medium" : "low",
                    recommendation: "Bạn nên tìm kiếm công việc đòi hỏi sự sáng tạo và đổi mới."
                },
                {
                    name: "Tận tâm (Conscientiousness)",
                    score: scores.conscientiousness,
                    description: "Mức độ có tổ chức, trách nhiệm và kỷ luật.",
                    level: scores.conscientiousness >= 70 ? "Cao" : scores.conscientiousness >= 40 ? "Trung bình" : "Thấp",
                    levelClass: scores.conscientiousness >= 70 ? "high" : scores.conscientiousness >= 40 ? "medium" : "low",
                    recommendation: "Bạn phù hợp với các vai trò đòi hỏi sự chính xác và trách nhiệm cao."
                },
                {
                    name: "Hướng ngoại (Extraversion)",
                    score: scores.extraversion,
                    description: "Mức độ năng động, hòa đồng và thích tương tác xã hội.",
                    level: scores.extraversion >= 70 ? "Cao" : scores.extraversion >= 40 ? "Trung bình" : "Thấp",
                    levelClass: scores.extraversion >= 70 ? "high" : scores.extraversion >= 40 ? "medium" : "low",
                    recommendation: scores.extraversion >= 50 ?
                        "Bạn sẽ phát triển tốt trong môi trường làm việc nhóm." :
                        "Bạn phù hợp với công việc đòi hỏi sự tập trung và độc lập."
                },
                {
                    name: "Hòa đồng (Agreeableness)",
                    score: scores.agreeableness,
                    description: "Khả năng hợp tác, sự đồng cảm và tử tế.",
                    level: scores.agreeableness >= 70 ? "Cao" : scores.agreeableness >= 40 ? "Trung bình" : "Thấp",
                    levelClass: scores.agreeableness >= 70 ? "high" : scores.agreeableness >= 40 ? "medium" : "low",
                    recommendation: "Bạn giỏi trong việc xây dựng mối quan hệ và làm việc nhóm."
                },
                {
                    name: "Bất ổn cảm xúc (Neuroticism)",
                    score: 100 - scores.neuroticism, // Invert for stability display
                    description: "Mức độ ổn định cảm xúc và khả năng đối mặt với căng thẳng.",
                    level: scores.neuroticism <= 30 ? "Ổn định cao" : scores.neuroticism <= 50 ? "Ổn định" : "Nhạy cảm",
                    levelClass: scores.neuroticism <= 30 ? "high" : scores.neuroticism <= 50 ? "medium" : "low",
                    recommendation: scores.neuroticism <= 50 ?
                        "Bạn có khả năng chịu áp lực tốt." :
                        "Bạn cần môi trường làm việc ít căng thẳng hơn."
                }
            ];

            // Determine dominant traits
            const sortedTraits = Object.entries(scores)
                .map(([key, value]) => ({ key, value }))
                .sort((a, b) => b.value - a.value);
            
            const dominantTrait = sortedTraits[0].key;
            const dominantTraitName = {
                openness: "Mở điểm (Openness)",
                conscientiousness: "Tận tâm (Conscientiousness)",
                extraversion: "Hướng ngoại (Extraversion)",
                agreeableness: "Hòa đồng (Agreeableness)",
                neuroticism: "Bất ổn cảm xúc (Neuroticism)"
            }[dominantTrait];

            // Get Big Five profile
            const bigFiveProfile = this.getBigFiveProfile(scores);

            // Prepare data for template
            const templateData = {
                layout: false,
                profile: {
                    name: dominantTraitName,
                    description: analysis,
                    strengths: bigFiveProfile.strengths || [],
                    careers: recommendations,
                    challenges: [],
                    quote: "Mỗi người đều có những điểm mạnh và điểm yếu riêng.",
                    workplaceInsights: [
                        {
                            icon: "fa-briefcase",
                            title: "Phong cách làm việc",
                            description: "Bạn có phong cách làm việc độc đáo dựa trên các đặc điểm tính cách của mình."
                        },
                        {
                            icon: "fa-users",
                            title: "Giao tiếp",
                            description: "Bạn giao tiếp một cách " + (scores.extraversion >= 50 ? "hướng ngoại và năng động" : "hướng nội và sâu sắc")
                        }
                    ]
                },
                result: {
                    type: dominantTrait.toUpperCase(),
                    traits: traitData,
                    scores: [
                        { letter: 'O', percentage: Math.round(scores.openness) },
                        { letter: 'C', percentage: Math.round(scores.conscientiousness) },
                        { letter: 'E', percentage: Math.round(scores.extraversion) },
                        { letter: 'A', percentage: Math.round(scores.agreeableness) },
                        { letter: 'N', percentage: Math.round(100 - scores.neuroticism) }
                    ]
                },
                recommendations: recommendations,
                analysis: analysis
            };

            console.log('Rendering Big Five results with template data');
            res.render('personality-assessments/big-five-results', templateData);
        } catch (error) {
            console.error('Error loading Big Five results:', error);
            res.status(500).json({ error: 'Failed to load Big Five results' });
        }
    }

    async getUserBigFiveResults(req, res) {
        try {
            const results = await this.getUserBigFiveResults(req.account.id);
            res.json({ results });
        } catch (error) {
            console.error('Error loading user Big Five results:', error);
            res.status(500).json({ error: 'Failed to load user Big Five results' });
        }
    }

    // ===== DISC ASSESSMENT =====

    async getDISCAssessment(req, res) {
        try {
            const discQuestions = this.generateDISCQuestions();

            res.render('personality-assessments/disc-assessment', {
                layout: false,
                questions: discQuestions,
                user: req.account || null,
                isLogin: !!req.account,
                assessmentType: 'DISC',
                title: 'Bài kiểm tra hành vi DISC'
            });
        } catch (error) {
            console.error('Error loading DISC assessment:', error);
            res.status(500).json({ error: 'Failed to load DISC assessment' });
        }
    }

    async submitDISCAssessment(req, res) {
        try {
            const { answers } = req.body;

            if (!answers || !Array.isArray(answers)) {
                return res.status(400).json({ error: 'Invalid answers format' });
            }

            // Prepare data for AI service
            const assessmentData = {
                assessment_type: 'disc',
                responses: answers.map((answer, index) => ({
                    question_id: index + 1,
                    answer: answer
                })),
                questions: this.generateDISCQuestions(),
                user_info: req.account ? {
                    id: req.account.id,
                    username: req.account.username
                } : null,
                completed_at: new Date().toISOString()
            };

            // Call AI service for personality analysis
            const aiResponse = await this.callAIService(assessmentData);

            // Save result to database (you'll need to create the model)
            const savedResult = await this.saveDISCResult(req.account?.id, aiResponse.result);

            res.json({
                success: true,
                result: aiResponse.result,
                redirectTo: `/personality-assessments/disc/results/${savedResult._id}`
            });
        } catch (error) {
            console.error('Error submitting DISC assessment:', error);
            res.status(500).json({ error: 'Failed to submit DISC assessment' });
        }
    }

    async getDISCResults(req, res) {
        try {
            const { resultId } = req.params;

            console.log(`Getting DISC results for resultId: ${resultId}`);

            let scores, analysis, recommendations, primaryTrait;

            // Try to get result from cache first
            const cachedResult = await this.getDISCResultById(resultId);
            if (cachedResult && cachedResult.scores) {
                scores = cachedResult.scores;
                primaryTrait = cachedResult.primaryTrait;
                console.log(`Found DISC result in cache: ${primaryTrait}`);
                analysis = "Kết quả dựa trên câu trả lời của bạn trong bài kiểm tra.";
                recommendations = this.getDISCJobRecommendations(primaryTrait);
            } else {
                // Fallback: try to get from AI service
                const userId = resultId.includes('user') ? resultId : '692f840f28a9b73f73b61550';
                try {
                    const aiResponse = await fetch(`http://localhost:8000/api/personality-assessment/user/${userId}/latest/disc`);
                    const aiData = await aiResponse.json();

                    console.log('AI Service Response for DISC:', { status: aiResponse.ok, data: aiData });

                    if (aiResponse.ok && aiData.success) {
                        scores = aiData.result.scores;
                        primaryTrait = aiData.result.primaryTrait;
                        analysis = aiData.result.analysis;
                        recommendations = aiData.result.recommendations;
                    } else {
                        throw new Error('AI service failed');
                    }
                } catch (e) {
                    console.log('AI service failed for DISC, using fallback data');
                    // Fallback to sample data if AI service fails
                    scores = { "D": 35, "I": 45, "S": 70, "C": 80 };
                    primaryTrait = "C";
                    analysis = "You excel at analyzing data and maintaining quality standards. You prioritize accuracy and systematic approaches.";
                    recommendations = ["Quality Assurance", "Data Analyst", "Financial Controller"];
                }
            }

            // Transform DISC scores to match template structure
            const traitData = [
                {
                    name: "Thống trị (Dominance)",
                    score: scores.D,
                    description: "Mức độ quyết đoán, trực tiếp và tập trung vào kết quả.",
                    level: scores.D >= 70 ? "Cao" : scores.D >= 40 ? "Trung bình" : "Thấp",
                    levelClass: scores.D >= 70 ? "high" : scores.D >= 40 ? "medium" : "low",
                    recommendation: "Bạn phù hợp với các vai trò lãnh đạo và quản lý."
                },
                {
                    name: "Ảnh hưởng (Influence)",
                    score: scores.I,
                    description: "Khả năng truyền cảm hứng, lạc quan và giao tiếp tốt.",
                    level: scores.I >= 70 ? "Cao" : scores.I >= 40 ? "Trung bình" : "Thấp",
                    levelClass: scores.I >= 70 ? "high" : scores.I >= 40 ? "medium" : "low",
                    recommendation: "Bạn phù hợp với các công việc trong lĩnh vực truyền thông, bán hàng."
                },
                {
                    name: "Kiên định (Steadiness)",
                    score: scores.S,
                    description: "Sự ổn định, đáng tin cậy và ủng hộ đội nhóm.",
                    level: scores.S >= 70 ? "Cao" : scores.S >= 40 ? "Trung bình" : "Thấp",
                    levelClass: scores.S >= 70 ? "high" : scores.S >= 40 ? "medium" : "low",
                    recommendation: "Bạn phù hợp với các vai trò hỗ trợ, huấn luyện."
                },
                {
                    name: "Tuân thủ (Conscientiousness)",
                    score: scores.C,
                    description: "Sự cẩn thận, chính xác và tuân thủ quy trình.",
                    level: scores.C >= 70 ? "Cao" : scores.C >= 40 ? "Trung bình" : "Thấp",
                    levelClass: scores.C >= 70 ? "high" : scores.C >= 40 ? "medium" : "low",
                    recommendation: "Bạn phù hợp với các công việc đòi hỏi sự chính xác và phân tích."
                }
            ];

            // Get DISC profile information
            const discProfile = this.getDISCProfile({ primaryTrait });

            // Transform scores to array format for template
            const scoresArray = [
                { letter: 'D', percentage: scores.D || 0 },
                { letter: 'I', percentage: scores.I || 0 },
                { letter: 'S', percentage: scores.S || 0 },
                { letter: 'C', percentage: scores.C || 0 }
            ];

            // Prepare data for template
            const templateData = {
                layout: false,
                profile: {
                    name: discProfile.name,
                    description: discProfile.description,
                    strengths: discProfile.strengths,
                    careers: discProfile.careers,
                    challenges: discProfile.weaknesses,
                    quote: discProfile.quote || "Hãy là phiên bản tốt nhất của chính mình.",
                    workplaceInsights: [
                        {
                            icon: "fa-briefcase",
                            title: "Phong cách làm việc",
                            description: discProfile.workStyle
                        },
                        {
                            icon: "fa-users",
                            title: "Giao tiếp",
                            description: "Bạn " + (primaryTrait === 'D' ? "thẳng thắn và trực tiếp" : primaryTrait === 'I' ? "thân thiện và truyền cảm hứng" : primaryTrait === 'S' ? "hỗ trợ và đồng cảm" : "chính xác và logic")
                        }
                    ]
                },
                result: {
                    type: primaryTrait,
                    scores: scoresArray
                },
                recommendations: recommendations,
                analysis: analysis,
                scores: scores,
                primaryTrait: primaryTrait
            };

            console.log('Rendering DISC results with template data:', templateData);
            res.render('personality-assessments/disc-results', templateData);
        } catch (error) {
            console.error('Error loading DISC results:', error);
            res.status(500).json({ error: 'Failed to load DISC results' });
        }
    }

    async getUserDISCResults(req, res) {
        try {
            const results = await this.getUserDISCResults(req.account.id);
            res.json({ results });
        } catch (error) {
            console.error('Error loading user DISC results:', error);
            res.status(500).json({ error: 'Failed to load user DISC results' });
        }
    }

    // ===== ASSESSMENT HOME PAGE =====

    async getAssessmentHome(req, res) {
        try {
            res.render('personality-assessments/assessment-home', {
                layout: false,
                user: req.session.users || null,
                isLogin: !!req.session.users,
                title: 'Bài kiểm tra tính cách chuyên nghiệp - JobLife Career Platform',
                currentPath: req.path,
                currentUrl: req.originalUrl,
                csrfToken: req.csrfToken ? req.csrfToken() : null,
                account: req.account || null
            });
        } catch (error) {
            console.error('Error loading assessment home:', error);
            res.status(500).json({ error: 'Failed to load assessment home' });
        }
    }

    // ===== MBTI HELPER METHODS =====

    generateMBTIQuestions() {
        return [
            {
                id: 1,
                question: "Bạn thích dành thời gian ở:",
                options: [
                    { value: 'E', text: "Một mình hoặc với nhóm nhỏ bạn thân" },
                    { value: 'I', text: "Cùng nhiều người và tham gia các hoạt động xã hội" }
                ]
            },
            {
                id: 2,
                question: "Bạn thường tập trung vào:",
                options: [
                    { value: 'S', text: "Thông tin cụ thể, thực tế và chi tiết" },
                    { value: 'N', text: "Các khả năng, ý tưởng và bức tranh tổng thể" }
                ]
            },
            {
                id: 3,
                question: "Khi ra quyết định, bạn dựa vào:",
                options: [
                    { value: 'T', text: "Lý trí, logic và các nguyên tắc khách quan" },
                    { value: 'F', text: "Cảm xúc, giá trị và ảnh hưởng đến người khác" }
                ]
            },
            {
                id: 4,
                question: "Bạn thích sống một cách:",
                options: [
                    { value: 'J', text: "Có kế hoạch, có tổ chức và có quyết định" },
                    { value: 'P', text: "Linh hoạt, tự nhiên và để mở các lựa chọn" }
                ]
            },
            {
                id: 5,
                question: "Bạn cảm thấy thoải mái hơn khi:",
                options: [
                    { value: 'E', text: "Nói và suy nghĩ đồng thời" },
                    { value: 'I', text: "Nghĩ kỹ rồi mới nói" }
                ]
            },
            {
                id: 6,
                question: "Bạn tin tưởng hơn vào:",
                options: [
                    { value: 'S', text: "Kinh nghiệm trong quá khứ" },
                    { value: 'N', text: "Trực cảm và cảm hứng" }
                ]
            },
            {
                id: 7,
                question: "Bạn đánh giá cao hơn:",
                options: [
                    { value: 'T', text: "Sự công bằng và thống nhất" },
                    { value: 'F', text: "Sự đồng cảm và thấu hiểu" }
                ]
            },
            {
                id: 8,
                question: "Bạn thích làm việc:",
                options: [
                    { value: 'J', text: "Theo lịch trình và hoàn thành đúng hạn" },
                    { value: 'P', text: "Linh hoạt và thích nghi với thay đổi" }
                ]
            }
        ];
    }

    calculateMBTI(answers) {
        const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

        answers.forEach(answer => {
            if (scores.hasOwnProperty(answer)) {
                scores[answer]++;
            }
        });

        const type =
            (scores.E >= scores.I ? 'E' : 'I') +
            (scores.S >= scores.N ? 'S' : 'N') +
            (scores.T >= scores.F ? 'T' : 'F') +
            (scores.J >= scores.P ? 'J' : 'P');

        return {
            type,
            scores,
            timestamp: new Date()
        };
    }

    getMBTIProfile(type) {
        const profiles = {
            'INTJ': {
                name: 'Kiến trúc sư',
                description: 'Những nhà tư duy chiến lược với kế hoạch cho mọi thứ.',
                strengths: ['Chiến lược', 'Lập kế hoạch', 'Độc lập', 'Lý trí'],
                weaknesses: ['Thiếu kiên nhẫn', 'Quá phê bình', 'Khó tương tác'],
                careers: ['Kỹ sư phần mềm', 'Nhà khoa học', 'Kiến trúc sư', 'Nhà phân tích'],
                workStyle: 'Độc lập, chiến lược, tập trung vào hiệu quả',
                quote: 'Logic là sự khởi đầu của sự khôn ngoan, không phải sự kết thúc.'
            },
            'INFJ': {
                name: 'Người ủng hộ',
                description: 'Những người im lặng và bí ẩn có khả năng thấu cảm mạnh mẽ.',
                strengths: ['Thấu cảm', 'Sáng tạo', 'Lý tưởng', 'Tổ chức'],
                weaknesses: ['Quá nhạy cảm', 'Khó nói không', 'Hoàn hảo'],
                careers: ['Cố vấn', 'Nhà văn', 'Nhà tâm lý', 'Nhà hoạt động xã hội'],
                workStyle: 'Hợp tác, có mục đích, tập trung vào con người',
                quote: 'Hãy trở thành sự thay đổi mà bạn muốn thấy trên thế giới.'
            },
            'ISTJ': {
                name: 'Người quản lý',
                description: 'Những người thực tế và có trách nhiệm.',
                strengths: ['Chính xác', 'Trách nhiệm', 'Thực tế', 'Kỷ luật'],
                weaknesses: ['Quá cứng nhắc', 'Khó thích ứng', 'Thiếu sáng tạo'],
                careers: ['Kế toán', 'Luật sư', 'Quản lý', 'Ngân hàng'],
                workStyle: 'Có cấu trúc, có trách nhiệm, tập trung vào chi tiết',
                quote: 'Hành động nói lên to hơn lời nói.'
            },
            'ISFJ': {
                name: 'Người bảo vệ',
                description: 'Những người ấm áp và cẩn trọng sẵn sàng bảo vệ người thân yêu.',
                strengths: ['Hỗ trợ', 'Lòng trung thành', 'Cẩn trọng', 'Thực tế'],
                weaknesses: ['Quá khiêm tốn', 'Khó nói không', 'Nhạy cảm với chỉ trích'],
                careers: ['Y tá', 'Giáo viên', 'Nhà xã hội', 'Nhân sự'],
                workStyle: 'Hỗ trợ, trách nhiệm, tập trung vào hòa hợp',
                quote: 'Cách tốt nhất để tìm thấy chính mình là đánh mất mình trong việc phục vụ người khác.'
            },
            'ISTP': {
                name: 'Thợ thủ công',
                description: 'Những người dũng cảm và thực tế khám phá mọi thứ qua tay.',
                strengths: ['Thực tế', 'Linh hoạt', 'Giải quyết vấn đề', 'Bình tĩnh'],
                weaknesses: ['Khó tương tác', 'Thiếu cảm xúc', 'Tránh cam kết'],
                careers: ['Cơ khí', 'Kỹ sư', 'Thợ mộc', 'Vận động viên'],
                workStyle: 'Độc lập, thực tế, tập trung vào kỹ năng',
                quote: 'Trải nghiệm là thầy giáo vĩ đại nhất.'
            },
            'ISFP': {
                name: 'Người phiêu lưu',
                description: 'Những người nghệ sĩ và linh hoạt tôn trọng thời gian.',
                strengths: ['Sáng tạo', 'Thực tế', 'Thích nghi', 'Nhạy cảm'],
                weaknesses: ['Tránh xung đột', 'Khó lập kế hoạch', 'Quá nhạy cảm'],
                careers: ['Nghệ sĩ', 'Thiết kế', 'Nhà tâm lý', 'Vận động viên'],
                workStyle: 'Sáng tạo, linh hoạt, tập trung vào hiện tại',
                quote: 'Cuộc sống là một hành trình, không phải đích đến.'
            },
            'INFP': {
                name: 'Người trung gian',
                description: 'Những người trung thành, lý tưởng và có khả năng thấu cảm.',
                strengths: ['Lý tưởng', 'Thấu cảm', 'Sáng tạo', 'Trung thành'],
                weaknesses: ['Quá lý tưởng', 'Tránh xung đột', 'Quá nhạy cảm'],
                careers: ['Nhà văn', 'Nghệ sĩ', 'Nhà tâm lý', 'Nhà hoạt động xã hội'],
                workStyle: 'Sáng tạo, có mục đích, tập trung vào giá trị',
                quote: 'Hãy sống cuộc đời mà bạn mong mơ.'
            },
            'INTP': {
                name: 'Nhà logic học',
                description: 'Những nhà đổi mới sáng tạo có lòng đam mê tri thức.',
                strengths: ['Logic', 'Sáng tạo', 'Phân tích', 'Độc lập'],
                weaknesses: ['Khó tương tác', 'Thiếu tổ chức', 'Quá lý thuyết'],
                careers: ['Khoa học', 'Kỹ thuật', 'Triết học', 'Viết lách'],
                workStyle: 'Độc lập, phân tích, tập trung vào ý tưởng',
                quote: 'Sự thật quan trọng hơn chính xác.'
            },
            'ESTP': {
                name: 'Người doanh nhân',
                description: 'Những người thông minh, năng lượng thích ở trung tâm sự kiện.',
                strengths: ['Năng động', 'Thực tế', 'Linh hoạt', 'Thích nghi'],
                weaknesses: ['Thiếu kiên nhẫn', 'Quá mạo hiểm', 'Khó tập trung'],
                careers: ['Kinh doanh', 'Bán hàng', 'Giải trí', 'Thể thao'],
                workStyle: 'Năng động, hành động, tập trung vào kết quả',
                quote: 'Hành động là chất xúc tác cơ bản.'
            },
            'ESFP': {
                name: 'Người giải trí',
                description: 'Những người vui vẻ, hào phóng thích náo nhiệt.',
                strengths: ['Thân thiện', 'Năng động', 'Thực tế', 'Tinh tế'],
                weaknesses: ['Thiếu kiên nhẫn', 'Khó tập trung', 'Quá vội vàng'],
                careers: ['Giải trí', 'Bán hàng', 'Du lịch', 'Giáo dục'],
                workStyle: 'Xã hội, năng động, tập trung vào hiện tại',
                quote: 'Cuộc sống là một bữa tiệc, hãy tham gia!'
            },
            'ENFP': {
                name: 'Người tranh cãi',
                description: 'Những người đam mê, sáng tạo và có tính xã hội cao.',
                strengths: ['Sáng tạo', 'Thân thiện', 'Lý tưởng', 'Năng động'],
                weaknesses: ['Thiếu kiên nhẫn', 'Khó tập trung', 'Quá lý tưởng'],
                careers: ['Marketing', 'Giáo dục', 'Tư vấn', 'Viết lách'],
                workStyle: 'Sáng tạo, xã hội, tập trung vào khả năng',
                quote: 'Hãy theo đuổi sự xuất sắc, thành công sẽ theo đuổi bạn.'
            },
            'ENTP': {
                name: 'Người tìm kiếm tri thức',
                description: 'Những người thông minh, tò mò không thích các quy tắc.',
                strengths: ['Sáng tạo', 'Thích nghi', 'Logic', 'Độc lập'],
                weaknesses: ['Quá tranh cãi', 'Khó cam kết', 'Thiếu tổ chức'],
                careers: ['Kinh doanh', 'Phát triển sản phẩm', 'Tư vấn', 'Báo chí'],
                workStyle: 'Sáng tạo, tranh luận, tập trung vào ý tưởng',
                quote: 'Sự tò mò là chìa khóa của sự sáng tạo.'
            },
            'ESTJ': {
                name: 'Người giám đốc',
                description: 'Những người xuất sắc quản lý mọi thứ.',
                strengths: ['Lãnh đạo', 'Tổ chức', 'Thực tế', 'Trách nhiệm'],
                weaknesses: ['Quá cứng nhắc', 'Khó thích ứng', 'Thiếu sáng tạo'],
                careers: ['Quản lý', 'Luật', 'Quân đội', 'Giáo dục'],
                workStyle: 'Lãnh đạo, có cấu trúc, tập trung vào hiệu quả',
                quote: 'Làm điều đúng, làm điều đúng ngay từ đầu.'
            },
            'ESFJ': {
                name: 'Người tham quan',
                description: 'Những người quan tâm, tận tâm và hợp tác.',
                strengths: ['Hỗ trợ', 'Trách nhiệm', 'Tổ chức', 'Thực tế'],
                weaknesses: ['Quá nhạy cảm', 'Khó nói không', 'Cần sự công nhận'],
                careers: ['Y tế', 'Giáo dục', 'Nhân sự', 'Dịch vụ khách hàng'],
                workStyle: 'Hợp tác, có tổ chức, tập trung vào con người',
                quote: 'Sự phục vụ là hình thức cao nhất của lòng vị tha.'
            },
            'ENFJ': {
                name: 'Người giáo dục',
                description: 'Những người truyền cảm hứng và khao khát giúp đỡ người khác.',
                strengths: ['Truyền cảm hứng', 'Thấu cảm', 'Lãnh đạo', 'Tổ chức'],
                weaknesses: ['Quá nhạy cảm', 'Khó nói không', 'Hoàn hảo'],
                careers: ['Giáo dục', 'Cố vấn', 'Đào tạo', 'Nhà hoạt động xã hội'],
                workStyle: 'Lãnh đạo, hợp tác, tập trung vào con người',
                quote: 'Sự lãnh đạo là trao quyền cho người khác.'
            },
            'ENTJ': {
                name: 'Người chỉ huy',
                description: 'Những người dũng cảm, táo bạo và có ý tưởng mạnh mẽ.',
                strengths: ['Lãnh đạo', 'Chiến lược', 'Tự tin', 'Quyết đoán'],
                weaknesses: ['Quá kiểm soát', 'Thiếu kiên nhẫn', 'Khó tương tác'],
                careers: ['Kinh doanh', 'Quản lý', 'Luật', 'Tư vấn'],
                workStyle: 'Lãnh đạo, chiến lược, tập trung vào mục tiêu',
                quote: 'Hãy dẫn đầu, theo sau, hoặc ra khỏi đường.'
            }
        };

        return profiles[type] || {
            name: 'Loại tính cách',
            description: 'Mô tả chi tiết về tính cách.',
            strengths: ['Điểm mạnh 1', 'Điểm mạnh 2'],
            careers: ['Nghề nghiệp 1', 'Nghề nghiệp 2'],
            quote: 'Trích dẫn truyền cảm hứng.'
        };
    }

    // ===== BIG FIVE HELPER METHODS =====

    generateBigFiveQuestions() {
        return [
            {
                id: 1,
                question: "Tôi nói chuyện với nhiều người khác nhau tại các bữa tiệc.",
                dimension: 'Extraversion'
            },
            {
                id: 2,
                question: "Tôi cảm thấy thoải mái khi ở gần người khác.",
                dimension: 'Extraversion'
            },
            {
                id: 3,
                question: "Tôi bắt đầu các cuộc trò chuyện.",
                dimension: 'Extraversion'
            },
            {
                id: 4,
                question: "Tôi có nhiều ý tưởng.",
                dimension: 'Openness'
            },
            {
                id: 5,
                question: "Tôi có trí tưởng tượng phong phú.",
                dimension: 'Openness'
            },
            {
                id: 6,
                question: "Tôi quan tâm đến những điều trừu tượng.",
                dimension: 'Openness'
            },
            {
                id: 7,
                question: "Tôi am hiểu một cách sâu sắc.",
                dimension: 'Conscientiousness'
            },
            {
                id: 8,
                question: "Tôi đi làm đúng giờ.",
                dimension: 'Conscientiousness'
            },
            {
                id: 9,
                question: "Tôi tuân theo lịch trình.",
                dimension: 'Conscientiousness'
            },
            {
                id: 10,
                question: "Tôi quan tâm đến người khác.",
                dimension: 'Agreeableness'
            },
            {
                id: 11,
                question: "Tôi dễ dàng thông cảm với người khác.",
                dimension: 'Agreeableness'
            },
            {
                id: 12,
                question: "Tôi dành thời gian cho người khác.",
                dimension: 'Agreeableness'
            },
            {
                id: 13,
                question: "Tôi dễ dàng căng thẳng.",
                dimension: 'Neuroticism'
            },
            {
                id: 14,
                question: "Tôi dễ dàng lo lắng.",
                dimension: 'Neuroticism'
            },
            {
                id: 15,
                question: "Tôi dễ cáu kỉnh.",
                dimension: 'Neuroticism'
            }
        ];
    }

    calculateBigFive(answers) {
        const dimensions = {
            Extraversion: 0,
            Openness: 0,
            Conscientiousness: 0,
            Agreeableness: 0,
            Neuroticism: 0
        };

        answers.forEach(answer => {
            if (dimensions.hasOwnProperty(answer.dimension)) {
                dimensions[answer.dimension] += answer.score;
            }
        });

        // Normalize scores to 0-100 scale
        const questionsPerDimension = 3;
        const scores = {};
        Object.keys(dimensions).forEach(dim => {
            scores[dim.toLowerCase()] = Math.round((dimensions[dim] / (questionsPerDimension * 5)) * 100);
        });

        return {
            scores,
            timestamp: new Date()
        };
    }

    getBigFiveProfile(scores) {
        const interpretations = {
            extraversion: scores.extraversion >= 60 ? 'Hướng ngoại' : 'Hướng nội',
            openness: scores.openness >= 60 ? 'Cởi mở với trải nghiệm' : 'Thực tế',
            conscientiousness: scores.conscientiousness >= 60 ? 'Cẩn thận, có tổ chức' : 'Linh hoạt, tự nhiên',
            agreeableness: scores.agreeableness >= 60 ? 'Hợp tác, thân thiện' : 'Phân tích, quyết đoán',
            neuroticism: scores.neuroticism >= 60 ? 'Nhạy cảm với căng thẳng' : 'Ổn định, bình tĩnh'
        };

        return {
            interpretations,
            overallTrait: this.getDominantBigFiveTrait(scores),
            recommendations: this.getBigFiveRecommendations(scores)
        };
    }

    // ===== DISC HELPER METHODS =====

    generateDISCQuestions() {
        return [
            {
                id: 1,
                question: "Khi đối mặt với thử thách, tôi thường:",
                options: [
                    { value: 'D', text: "Hành động nhanh chóng và quyết đoán" },
                    { value: 'I', text: "Truyền cảm hứng và động viên người khác" },
                    { value: 'S', text: "Hỗ trợ và hợp tác với đội nhóm" },
                    { value: 'C', text: "Phân tích kỹ lưỡng và lập kế hoạch" }
                ]
            },
            {
                id: 2,
                question: "Môi trường làm việc lý tưởng của tôi là:",
                options: [
                    { value: 'D', text: "Năng động và đầy thử thách" },
                    { value: 'I', text: "Sáng tạo và có tương tác xã hội" },
                    { value: 'S', text: "Ổn định và hỗ trợ" },
                    { value: 'C', text: "Có cấu trúc và tiêu chuẩn cao" }
                ]
            },
            {
                id: 3,
                question: "Khi giao tiếp với người khác, tôi:",
                options: [
                    { value: 'D', text: "Thẳng thắn và trực tiếp" },
                    { value: 'I', text: "Thân thiện và cởi mở" },
                    { value: 'S', text: "Lắng nghe và đồng cảm" },
                    { value: 'C', text: "Chính xác và logic" }
                ]
            },
            {
                id: 4,
                question: "Điểm mạnh lớn nhất của tôi là:",
                options: [
                    { value: 'D', text: "Khả năng lãnh đạo và quyết định" },
                    { value: 'I', text: "Sáng tạo và truyền cảm hứng" },
                    { value: 'S', text: "Loyalty và sự ổn định" },
                    { value: 'C', text: "Sự chính xác và chất lượng" }
                ]
            }
        ];
    }

    calculateDISC(answers) {
        const scores = { D: 0, I: 0, S: 0, C: 0 };

        answers.forEach(answer => {
            if (scores.hasOwnProperty(answer.value)) {
                scores[answer.value]++;
            }
        });

        const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
        const percentages = {};
        Object.keys(scores).forEach(key => {
            percentages[key] = Math.round((scores[key] / total) * 100);
        });

        return {
            scores: percentages,
            primaryTrait: Object.keys(percentages).reduce((a, b) =>
                percentages[a] > percentages[b] ? a : b
            ),
            timestamp: new Date()
        };
    }

    getBigFiveProfile(scores) {
        const strengths = [];
        
        if (scores.openness >= 70) {
            strengths.push('Sáng tạo', 'Tò mò', 'Cởi mở với ý tưởng mới');
        }
        if (scores.conscientiousness >= 70) {
            strengths.push('Có tổ chức', 'Trách nhiệm', 'Kỷ luật');
        }
        if (scores.extraversion >= 70) {
            strengths.push('Xã hội', 'Năng động', 'Lạc quan');
        }
        if (scores.agreeableness >= 70) {
            strengths.push('Hợp tác', 'Đồng cảm', 'Tử tế');
        }
        if (scores.neuroticism <= 30) {
            strengths.push('Ổn định cảm xúc', 'Bình tĩnh', 'Chịu áp lực tốt');
        }

        return {
            strengths: strengths.length > 0 ? strengths : ['Cân bằng', 'Linh hoạt', 'Thích ứng tốt']
        };
    }

    getDISCProfile(scores) {
        const profiles = {
            'D': {
                name: 'Dominance (Thống trị)',
                description: 'Người quyết đoán, tập trung vào kết quả và thách thức.',
                strengths: ['Lãnh đạo', 'Quyết đoán', 'Hướng đến kết quả', 'Dũng cảm'],
                weaknesses: ['Thiếu kiên nhẫn', 'Ícôan nhất quan', 'Kiểm soát cao'],
                careers: ['CEO', 'Sales Director', 'Entrepreneur', 'Operations Manager'],
                workStyle: 'Nhanh, quyết đoán, tập trung vào mục tiêu',
                quote: 'Hành động nói lên to hơn lời nói.'
            },
            'I': {
                name: 'Influence (Ảnh hưởng)',
                description: 'Người thân thiện, truyền cảm hứng và tập trung vào mối quan hệ.',
                strengths: ['Giao tiếp', 'Truyền cảm hứng', 'Tối ưu', 'Xã hội'],
                weaknesses: ['Thiếu chú ý chi tiết', 'Quá cảm xúc', 'Nguy cơ cao'],
                careers: ['Marketing Manager', 'Sales Representative', 'Event Planner', 'Journalist'],
                workStyle: 'Sáng tạo, xã hội, tập trung vào con người',
                quote: 'Mọi người muốn làm việc với những người họ thích.'
            },
            'S': {
                name: 'Steadiness (Ổn định)',
                description: 'Người kiên nhẫn, hỗ trợ và tập trung vào sự ổn định.',
                strengths: ['Lòng trung thành', 'Kiên nhẫn', 'Hỗ trợ', 'Đáng tin cậy'],
                weaknesses: ['Chống lại thay đổi', 'Quá thụ động', 'Tránh xung đột'],
                careers: ['HR Manager', 'Teacher', 'Customer Service Manager', 'Counselor'],
                workStyle: 'Ổn định, hỗ trợ, làm việc nhóm',
                quote: 'Sự kiên nhẫn là chìa khóa của thành công.'
            },
            'C': {
                name: 'Conscientiousness (Tận tâm)',
                description: 'Người cẩn thận, chính xác và tập trung vào chất lượng.',
                strengths: ['Chính xác', 'Phân tích', 'Chất lượng', 'Có tổ chức'],
                weaknesses: ['Quá phân tích', 'Khách quan quá mức', 'Sợ sai sót'],
                careers: ['Financial Analyst', 'Quality Assurance Manager', 'Software Developer', 'Data Analyst'],
                workStyle: 'Cẩn thận, có cấu trúc, tập trung vào quy trình',
                quote: 'Chi tiết là sự khác biệt giữa tốt và tuyệt vời.'
            }
        };

        return profiles[scores.primaryTrait] || profiles['C'];
    }

    // ===== AI SERVICE INTEGRATION =====

    async callAIService(assessmentData) {
        try {
            const axios = require('axios');

            const response = await axios.post(`${AI_SERVICE_URL}/api/personality-assessment/score`, assessmentData, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 30000, // 30 second timeout
            });

            if (response.data && response.data.status === 'success') {
                return response.data;
            } else {
                throw new Error('AI service returned unexpected response format');
            }
        } catch (error) {
            console.error('Error calling AI service:', error.message);

            // Fallback to local calculation if AI service fails
            console.log('Falling back to local calculation...');
            return this.fallbackToLocalCalculation(assessmentData);
        }
    }

    async callJobRecommendationsService(personalityData, userProfile = null) {
        try {
            const axios = require('axios');

            const requestData = {
                personality_data: personalityData,
                user_profile: userProfile
            };

            const response = await axios.post(`${AI_SERVICE_URL}/api/personality-assessment/job-recommendations`, requestData, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 30000, // 30 second timeout
            });

            if (response.data && response.data.status === 'success') {
                return response.data.recommendations;
            } else {
                throw new Error('Job recommendations service returned unexpected response format');
            }
        } catch (error) {
            console.error('Error calling job recommendations service:', error.message);

            // Fallback to basic recommendations if service fails
            console.log('Falling back to basic job recommendations...');
            return this.fallbackJobRecommendations(personalityData);
        }
    }

    fallbackJobRecommendations(personalityData) {
        const { assessment_type, result } = personalityData;

        // Basic recommendations based on assessment type and results
        const recommendations = {
            mbti: this.getMBTIJobRecommendations(result),
            big_five: this.getBigFiveJobRecommendations(result),
            disc: this.getDISCJobRecommendations(result)
        };

        return {
            recommended_careers: recommendations[assessment_type] || [],
            skills_to_develop: ['Communication', 'Problem Solving', 'Leadership'],
            work_environment_preferences: ['Collaborative team environment', 'Growth opportunities'],
            entrepreneurial_assessment: {
                suited: false,
                reasoning: 'Complete full assessment for detailed analysis'
            },
            next_steps: [
                'Research the recommended career paths',
                'Connect with professionals in these fields',
                'Develop relevant skills through courses or projects'
            ]
        };
    }

    // ===== FALLBACK JOB RECOMMENDATION METHODS =====

    getMBTIJobRecommendations(result) {
        const careerMap = {
            'INTJ': ['Software Architect', 'Data Scientist', 'Management Consultant', 'Systems Analyst'],
            'INTP': ['Software Developer', 'Research Scientist', 'Technical Writer', 'Data Analyst'],
            'ENTJ': ['Management Consultant', 'Project Manager', 'Investment Banker', 'CEO'],
            'ENTP': ['Product Manager', 'Marketing Strategist', 'Entrepreneur', 'Business Development'],
            'INFJ': ['Counselor', 'Psychologist', 'Writer', 'HR Specialist'],
            'INFP': ['Writer', 'Graphic Designer', 'Counselor', 'Teacher'],
            'ENFJ': ['Teacher', 'HR Manager', 'Public Relations Specialist', 'Social Worker'],
            'ENFP': ['Marketing Specialist', 'Journalist', 'Event Planner', 'Public Relations'],
            'ISTJ': ['Accountant', 'Financial Analyst', 'Quality Assurance', 'Project Manager'],
            'ISFJ': ['Nurse', 'Teacher', 'Administrative Assistant', 'Social Worker'],
            'ESTJ': ['Operations Manager', 'Sales Manager', 'Military Officer', 'Hotel Manager'],
            'ESFJ': ['Nurse', 'Teacher', 'Customer Service Manager', 'Event Planner'],
            'ISTP': ['Mechanic', 'Software Developer', 'Pilot', 'Chef'],
            'ISFP': ['Artist', 'Designer', 'Counselor', 'Veterinarian'],
            'ESTP': ['Sales Representative', 'Entrepreneur', 'Marketing Manager', 'Athletic Coach'],
            'ESFP': ['Actor', 'Teacher', 'Event Planner', 'Customer Service Representative']
        };

        return careerMap[result.type] || ['Software Developer', 'Project Manager', 'Analyst', 'Consultant'];
    }

    getBigFiveJobRecommendations(result) {
        const careers = [];
        const { scores } = result;

        if (scores.extraversion >= 70) {
            careers.push('Sales Manager', 'Public Relations Specialist', 'Marketing Manager', 'Team Leader');
        } else if (scores.extraversion <= 30) {
            careers.push('Software Developer', 'Data Analyst', 'Research Scientist', 'Technical Writer');
        }

        if (scores.openness >= 70) {
            careers.push('Creative Director', 'Research Scientist', 'Product Designer', 'Strategist');
        }

        if (scores.conscientiousness >= 70) {
            careers.push('Project Manager', 'Financial Analyst', 'Quality Assurance', 'Operations Manager');
        }

        if (scores.agreeableness >= 70) {
            careers.push('HR Manager', 'Counselor', 'Teacher', 'Social Worker');
        }

        return careers.length > 0 ? careers.slice(0, 5) : ['Software Developer', 'Project Manager', 'Business Analyst'];
    }

    getDISCJobRecommendations(result) {
        const careerMap = {
            'D': ['CEO', 'Sales Director', 'Entrepreneur', 'Operations Manager', 'Military Officer'],
            'I': ['Marketing Manager', 'Public Relations Specialist', 'Sales Representative', 'Event Planner', 'Journalist'],
            'S': ['HR Manager', 'Teacher', 'Customer Service Manager', 'Administrative Assistant', 'Counselor'],
            'C': ['Financial Analyst', 'Quality Assurance Manager', 'Software Developer', 'Data Analyst', 'Accountant']
        };

        const primaryTrait = result.primaryTrait || 'C';
        return careerMap[primaryTrait] || ['Software Developer', 'Project Manager', 'Business Analyst'];
    }

    fallbackToLocalCalculation(assessmentData) {
        const { assessment_type, responses } = assessmentData;

        switch (assessment_type) {
            case 'mbti':
                return this.fallbackMBTICalculation(responses);
            case 'big_five':
                return this.fallbackBigFiveCalculation(responses);
            case 'disc':
                return this.fallbackDISCCalculation(responses);
            default:
                throw new Error(`Unknown assessment type: ${assessment_type}`);
        }
    }

    fallbackMBTICalculation(responses) {
        const answers = responses.map(r => r.answer);
        const result = this.calculateMBTI(answers);

        return {
            status: 'success',
            result: {
                personality_type: result.type,
                scores: result.scores,
                profile: this.getMBTIProfile(result.type),
                insights: {
                    description: `Phân tích MBTI cho loại ${result.type}`,
                    strengths: this.getMBTIProfile(result.type).strengths,
                    career_recommendations: this.getMBTIProfile(result.type).careers,
                    development_areas: ['Cải thiện điểm yếu', 'Phát triển điểm mạnh']
                },
                confidence_score: 0.85,
                assessment_metadata: {
                    completed_at: new Date().toISOString(),
                    question_count: responses.length,
                    assessment_version: '1.0'
                }
            }
        };
    }

    fallbackBigFiveCalculation(responses) {
        // Convert responses to the expected format for calculateBigFive
        const formattedResponses = responses.map(r => ({
            dimension: this.getDimensionFromQuestionId(r.question_id),
            score: this.convertAnswerToScore(r.answer)
        }));

        const result = this.calculateBigFive(formattedResponses);
        const profile = this.getBigFiveProfile(result.scores);

        return {
            status: 'success',
            result: {
                personality_type: 'big_five',
                scores: result.scores,
                profile: profile,
                insights: {
                    description: 'Phân tích tính cách theo mô hình Big Five (OCEAN)',
                    dominant_traits: profile.interpretations,
                    career_recommendations: profile.recommendations,
                    development_areas: []
                },
                confidence_score: 0.85,
                assessment_metadata: {
                    completed_at: new Date().toISOString(),
                    question_count: responses.length,
                    assessment_version: '1.0'
                }
            }
        };
    }

    fallbackDISCCalculation(responses) {
        const answers = responses.map(r => ({
            value: r.answer // Assuming answer contains D, I, S, or C
        }));

        const result = this.calculateDISC(answers);
        const profile = this.getDISCProfile(result.scores);

        return {
            status: 'success',
            result: {
                personality_type: result.primaryTrait,
                scores: result.scores,
                profile: profile,
                insights: {
                    description: `Phân tích hành vi nơi làm việc theo mô hình DISC - loại ${result.primaryTrait}`,
                    strengths: profile.strengths,
                    career_recommendations: ['Vai trò lãnh đạo', 'Quản lý dự án'],
                    development_areas: profile.weaknesses
                },
                confidence_score: 0.85,
                assessment_metadata: {
                    completed_at: new Date().toISOString(),
                    question_count: responses.length,
                    assessment_version: '1.0'
                }
            }
        };
    }

    getDimensionFromQuestionId(questionId) {
        // Map question IDs to Big Five dimensions based on the question generation
        const dimensionMap = {
            1: 'Extraversion', 2: 'Extraversion', 3: 'Extraversion',
            4: 'Openness', 5: 'Openness', 6: 'Openness',
            7: 'Conscientiousness', 8: 'Conscientiousness', 9: 'Conscientiousness',
            10: 'Agreeableness', 11: 'Agreeableness', 12: 'Agreeableness',
            13: 'Neuroticism', 14: 'Neuroticism', 15: 'Neuroticism'
        };
        return dimensionMap[questionId] || 'Extraversion';
    }

    convertAnswerToScore(answer) {
        // Convert Likert scale answers to numeric scores
        if (typeof answer === 'number') {
            return answer;
        }
        // Handle string answers like "strongly_agree", "agree", etc.
        const scoreMap = {
            'strongly_disagree': 1,
            'disagree': 2,
            'neutral': 3,
            'agree': 4,
            'strongly_agree': 5
        };
        return scoreMap[answer] || 3;
    }

    // ===== DATABASE HELPERS (These would need to be implemented with actual models) =====

    async saveMBTIResult(userId, result) {
        try {
            // Get profile data
            const profile = this.getMBTIProfile(result.type);
            
            // Create and save to database
            const mbtiAssessment = new MBTIAssessment({
                userId,
                type: result.type,
                scores: result.scores,
                answers: result.answers || [],
                description: profile.description,
                strengths: profile.strengths,
                weaknesses: profile.weaknesses,
                careers: profile.careers,
                quote: profile.quote,
                workStyle: profile.workStyle,
                completedAt: new Date()
            });
            
            const savedResult = await mbtiAssessment.save();
            
            // Also cache for immediate access
            if (!global.mbtiResultsCache) {
                global.mbtiResultsCache = {};
            }
            global.mbtiResultsCache[savedResult._id.toString()] = savedResult.toObject();
            
            return savedResult;
        } catch (error) {
            console.error('Error saving MBTI result:', error);
            throw error;
        }
    }

    async getMBTIResultById(resultId) {
        try {
            // Try to get from database first
            const result = await MBTIAssessment.findById(resultId);
            if (result) {
                return result.toObject();
            }
            
            // Fallback to cache
            if (global.mbtiResultsCache && global.mbtiResultsCache[resultId]) {
                return global.mbtiResultsCache[resultId];
            }
            
            return null;
        } catch (error) {
            console.error('Error getting MBTI result:', error);
            return null;
        }
    }

    async getUserMBTIResults(userId) {
        try {
            const results = await MBTIAssessment.find({ userId })
                .sort({ completedAt: -1 })
                .limit(10);
            return results.map(r => r.toObject());
        } catch (error) {
            console.error('Error getting user MBTI results:', error);
            return [];
        }
    }

    async saveBigFiveResult(userId, result) {
        try {
            // Get profile data
            const dominantTrait = this.getDominantBigFiveTrait(result.scores);
            const profile = this.getBigFiveProfile(result.scores);
            
            // Create and save to database
            const bigFiveAssessment = new BigFiveAssessment({
                userId,
                scores: result.scores,
                dominantTrait,
                answers: result.answers || [],
                description: profile.description,
                strengths: profile.strengths,
                weaknesses: profile.weaknesses,
                careers: profile.careers,
                quote: profile.quote,
                analysis: result.analysis || '',
                completedAt: new Date()
            });
            
            const savedResult = await bigFiveAssessment.save();
            
            // Also cache for immediate access
            if (!global.bigFiveResultsCache) {
                global.bigFiveResultsCache = {};
            }
            global.bigFiveResultsCache[savedResult._id.toString()] = savedResult.toObject();
            
            return savedResult;
        } catch (error) {
            console.error('Error saving Big Five result:', error);
            throw error;
        }
    }

    async getBigFiveResultById(resultId) {
        try {
            // Try to get from database first
            const result = await BigFiveAssessment.findById(resultId);
            if (result) {
                return result.toObject();
            }
            
            // Fallback to cache
            if (global.bigFiveResultsCache && global.bigFiveResultsCache[resultId]) {
                return global.bigFiveResultsCache[resultId];
            }
            
            return null;
        } catch (error) {
            console.error('Error getting Big Five result:', error);
            return null;
        }
    }

    async getUserBigFiveResults(userId) {
        try {
            const results = await BigFiveAssessment.find({ userId })
                .sort({ completedAt: -1 })
                .limit(10);
            return results.map(r => r.toObject());
        } catch (error) {
            console.error('Error getting user Big Five results:', error);
            return [];
        }
    }

    async saveDISCResult(userId, result) {
        try {
            // Get profile data
            const profile = this.getDISCProfile(result.primaryTrait);
            
            // Create and save to database
            const discAssessment = new DISCAssessment({
                userId,
                primaryTrait: result.primaryTrait,
                scores: result.scores,
                answers: result.answers || [],
                description: profile.description,
                strengths: profile.strengths,
                weaknesses: profile.weaknesses,
                careers: profile.careers,
                quote: profile.quote,
                workStyle: profile.workStyle,
                analysis: result.analysis || '',
                completedAt: new Date()
            });
            
            const savedResult = await discAssessment.save();
            
            // Also cache for immediate access
            if (!global.discResultsCache) {
                global.discResultsCache = {};
            }
            global.discResultsCache[savedResult._id.toString()] = savedResult.toObject();
            
            return savedResult;
        } catch (error) {
            console.error('Error saving DISC result:', error);
            throw error;
        }
    }

    async getDISCResultById(resultId) {
        try {
            // Try to get from database first
            const result = await DISCAssessment.findById(resultId);
            if (result) {
                return result.toObject();
            }
            
            // Fallback to cache
            if (global.discResultsCache && global.discResultsCache[resultId]) {
                return global.discResultsCache[resultId];
            }
            
            return null;
        } catch (error) {
            console.error('Error getting DISC result:', error);
            return null;
        }
    }

    async getUserDISCResults(userId) {
        try {
            const results = await DISCAssessment.find({ userId })
                .sort({ completedAt: -1 })
                .limit(10);
            return results.map(r => r.toObject());
        } catch (error) {
            console.error('Error getting user DISC results:', error);
            return [];
        }
    }

    // API Methods for Profile Page
    async getLatestMBTIResult(req, res) {
        try {
            const { userId } = req.params;
            const results = await this.getUserMBTIResults(userId);
            
            if (results && results.length > 0) {
                return res.json({
                    success: true,
                    result: results[0]
                });
            }
            
            return res.json({
                success: false,
                result: null
            });
        } catch (error) {
            console.error('Error getting latest MBTI result:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getLatestBigFiveResult(req, res) {
        try {
            const { userId } = req.params;
            const results = await this.getUserBigFiveResults(userId);
            
            if (results && results.length > 0) {
                return res.json({
                    success: true,
                    result: results[0]
                });
            }
            
            return res.json({
                success: false,
                result: null
            });
        } catch (error) {
            console.error('Error getting latest Big Five result:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getLatestDISCResult(req, res) {
        try {
            const { userId } = req.params;
            const results = await this.getUserDISCResults(userId);
            
            if (results && results.length > 0) {
                return res.json({
                    success: true,
                    result: results[0]
                });
            }
            
            return res.json({
                success: false,
                result: null
            });
        } catch (error) {
            console.error('Error getting latest DISC result:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // API Methods for Profile Page
    async getLatestMBTIResult(req, res) {
        try {
            const { userId } = req.params;
            const results = await this.getUserMBTIResults(userId);
            
            if (results && results.length > 0) {
                return res.json({
                    success: true,
                    result: results[0]
                });
            }
            
            return res.json({
                success: false,
                result: null
            });
        } catch (error) {
            console.error('Error getting latest MBTI result:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getLatestBigFiveResult(req, res) {
        try {
            const { userId } = req.params;
            const results = await this.getUserBigFiveResults(userId);
            
            if (results && results.length > 0) {
                return res.json({
                    success: true,
                    result: results[0]
                });
            }
            
            return res.json({
                success: false,
                result: null
            });
        } catch (error) {
            console.error('Error getting latest Big Five result:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getLatestDISCResult(req, res) {
        try {
            const { userId } = req.params;
            const results = await this.getUserDISCResults(userId);
            
            if (results && results.length > 0) {
                return res.json({
                    success: true,
                    result: results[0]
                });
            }
            
            return res.json({
                success: false,
                result: null
            });
        } catch (error) {
            console.error('Error getting latest DISC result:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    calculateMBTIFromAnswers(answers) {
        const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
        const questions = this.generateMBTIQuestions();

        answers.forEach((answer, index) => {
            if (answer && questions[index]) {
                const option = questions[index].options.find(opt => opt.value === answer);
                if (option && option.value) {
                    scores[option.value]++;
                }
            }
        });

        // Determine type based on highest scores in each dimension
        const type = 
            (scores.E >= scores.I ? 'E' : 'I') +
            (scores.N >= scores.S ? 'N' : 'S') +
            (scores.T >= scores.F ? 'T' : 'F') +
            (scores.J >= scores.P ? 'J' : 'P');

        return {
            type: type,
            scores: scores
        };
    }

    getDefaultMBTIScores(mbtiType) {
        // Generate default scores based on MBTI type
        // Each dimension gets a score from 1-4 based on the type
        const scores = {};
        
        // E/I dimension
        scores.E = mbtiType.includes('E') ? 3 : 1;
        scores.I = mbtiType.includes('I') ? 3 : 1;
        
        // S/N dimension
        scores.S = mbtiType.includes('S') ? 3 : 1;
        scores.N = mbtiType.includes('N') ? 3 : 1;
        
        // T/F dimension
        scores.T = mbtiType.includes('T') ? 3 : 1;
        scores.F = mbtiType.includes('F') ? 3 : 1;
        
        // J/P dimension
        scores.J = mbtiType.includes('J') ? 3 : 1;
        scores.P = mbtiType.includes('P') ? 3 : 1;
        
        return scores;
    }

    getDominantBigFiveTrait(scores) {
        const traits = Object.keys(scores);
        const maxScore = Math.max(...Object.values(scores));
        const dominantTraits = traits.filter(trait => scores[trait] === maxScore);
        return dominantTraits[0] || 'balanced';
    }

    getBigFiveRecommendations(scores) {
        const recommendations = [];

        if (scores.extraversion > 70) {
            recommendations.push('Hãy xem xét các công việc đòi hỏi tương tác xã hội cao');
        }
        if (scores.openness > 70) {
            recommendations.push('Tìm kiếm các cơ hội sáng tạo và đổi mới');
        }
        if (scores.conscientiousness > 70) {
            recommendations.push('Phát triển vai trò lãnh đạo và quản lý');
        }
        if (scores.agreeableness > 70) {
            recommendations.push('Hợp tác tốt trong môi trường làm việc nhóm');
        }
        if (scores.neuroticism > 70) {
            recommendations.push('Học các kỹ năng quản lý căng thẳng');
        }

        return recommendations;
    }

    getDISCJobRecommendations(primaryTrait) {
        const recommendations = {
            'D': ['CEO', 'Sales Director', 'Entrepreneur', 'Operations Manager'],
            'I': ['Marketing Manager', 'Sales Representative', 'Event Planner', 'Journalist'],
            'S': ['HR Manager', 'Teacher', 'Customer Service Manager', 'Counselor'],
            'C': ['Financial Analyst', 'Quality Assurance Manager', 'Software Developer', 'Data Analyst']
        };
        return recommendations[primaryTrait] || recommendations['C'];
    }
}

module.exports = new PersonalityAssessmentController();
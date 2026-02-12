const Job = require('../app/models/Job');
const Business = require('../app/models/Business');

class SmartSearchService {
    constructor() {
        // Stop words tiếng Việt để loại bỏ khi tìm kiếm
        this.stopWords = new Set([
            'và',
            'của',
            'cho',
            'với',
            'là',
            'một',
            'có',
            'nhưng',
            'nếu',
            'bởi',
            'từ',
            'tại',
            'trong',
            'để',
            'trên',
            'dưới',
            'khi',
            'các',
            'những',
            'cùng',
            'nhiều',
            'ít',
            'rất',
            'đã',
            'sẽ',
            'còn',
            'đây',
            'đó',
            'chúng',
            'tôi',
            'bạn',
            'họ',
            'nó',
            'mình',
        ]);
    }

    /**
     * Xử lý text trước khi tìm kiếm
     */
    preprocessText(text) {
        if (!text) return '';

        return text
            .toLowerCase()
            .replace(/[^\w\s\u0100-\uFFFF]/g, ' ') // Giữ unicode và bỏ ký tự đặc biệt
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .filter((word) => word && !this.stopWords.has(word))
            .join(' ');
    }

    /**
     * Remove accents from Vietnamese text
     */
    removeAccents(text) {
        if (!text) return '';

        return text
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase();
    }

    /**
     * Tính điểm relevance cho job so với query
     */
    calculateRelevanceScore(job, searchTerms, filters = {}) {
        let score = 0;

        // Process job content
        const title = this.preprocessText(job.title || '');
        const description = this.preprocessText(job.description || '');
        const requirements = this.preprocessText(job.requirements || '');
        const city = this.preprocessText(job.city || '');
        const type = this.preprocessText(job.type || '');
        const field = this.preprocessText(job.field || '');
        const salary = this.preprocessText(job.salary || '');

        // Also process with no accents for fallback matching
        const titleNoAccent = this.removeAccents(job.title || '');
        const descriptionNoAccent = this.removeAccents(job.description || '');
        const requirementsNoAccent = this.removeAccents(job.requirements || '');

        const jobContent = `${title} ${description} ${requirements} ${city} ${type} ${field} ${salary}`;

        // 1. Exact phrase match (cao nhất)
        searchTerms.forEach((term) => {
            const termNoAccent = this.removeAccents(term);

            // Match with accents
            if (title.includes(term)) score += 50;
            if (description.includes(term)) score += 30;
            if (requirements.includes(term)) score += 40;

            // Fallback match without accents
            if (titleNoAccent.includes(termNoAccent)) score += 45;
            if (descriptionNoAccent.includes(termNoAccent)) score += 25;
            if (requirementsNoAccent.includes(termNoAccent)) score += 35;

            if (city.includes(term)) score += 20;
            if (type.includes(term)) score += 15;
            if (field.includes(term)) score += 25;
            if (salary.includes(term)) score += 10;
        });

        // 2. Word matching
        searchTerms.forEach((term) => {
            const termNoAccent = this.removeAccents(term);
            if (
                jobContent.includes(term) ||
                this.removeAccents(jobContent).includes(termNoAccent)
            )
                score += 10;
        });

        // 3. Recency bonus (jobs mới hơn điểm cao hơn)
        const daysSinceCreated =
            (Date.now() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24);
        if (daysSinceCreated < 7) score += 20;
        else if (daysSinceCreated < 30) score += 10;
        else if (daysSinceCreated < 90) score += 5;

        // 4. Salary bonus (jobs có mức lương rõ ràng)
        if (job.salary && !job.salary.includes('Thỏa thuận')) {
            score += 5;
        }

        // 5. Complete profile bonus
        if (job.title && job.description && job.requirements) {
            score += 10;
        }

        return score;
    }

    /**
     * Extract skills from job content (description, requirements)
     */
    extractSkills(job) {
        const content =
            `${job.title || ''} ${job.description || ''} ${job.requirements || ''}`.toLowerCase();

        // Common tech skills
        const techSkills = {
            javascript: [
                'javascript',
                'js',
                'nodejs',
                'node.js',
                'react',
                'vue',
                'angular',
            ],
            python: ['python', 'django', 'flask', 'fastapi', 'pandas'],
            java: ['java', 'spring', 'springboot', 'maven', 'gradle'],
            csharp: ['c#', 'csharp', '.net', 'asp.net', 'csharp'],
            php: ['php', 'laravel', 'symfony', 'wordpress'],
            sql: ['sql', 'mysql', 'postgresql', 'mongodb', 'database'],
            aws: ['aws', 'amazon web services', 'ec2', 's3', 'lambda'],
            docker: ['docker', 'kubernetes', 'k8s', 'container'],
            git: ['git', 'github', 'gitlab', 'version control'],
        };

        // Soft skills
        const softSkills = {
            communication: ['communication', 'giao tiếp', 'biểu hiện'],
            leadership: ['leadership', 'lãnh đạo', 'quản lý', 'đội nhóm'],
            english: ['english', 'tiếng anh', 'communication skills'],
            'problem-solving': [
                'problem solving',
                'giải quyết vấn đề',
                'analytical',
            ],
        };

        const foundSkills = new Set();

        // Check tech skills
        Object.entries(techSkills).forEach(([skill, keywords]) => {
            if (keywords.some((keyword) => content.includes(keyword))) {
                foundSkills.add(skill);
            }
        });

        // Check soft skills
        Object.entries(softSkills).forEach(([skill, keywords]) => {
            if (keywords.some((keyword) => content.includes(keyword))) {
                foundSkills.add(skill);
            }
        });

        return Array.from(foundSkills);
    }

    /**
     * Detect experience level from job content
     */
    detectExperienceLevel(job) {
        const content =
            `${job.title || ''} ${job.description || ''} ${job.requirements || ''}`.toLowerCase();

        const levelPatterns = {
            fresher: [
                'fresher',
                'new graduate',
                'sinh viên mới ra trường',
                'mới ra trường',
                '0-1 năm',
                '<1 năm',
            ],
            junior: [
                'junior',
                'nhân viên',
                '1-3 năm',
                '1 năm',
                '2 năm',
                '3 năm',
            ],
            'mid-level': [
                'mid',
                'middle',
                'senior',
                '3-5 năm',
                '4 năm',
                '5 năm',
                'experienced',
            ],
            senior: ['senior', 'chuyên viên', '5+ năm', '5 năm', '6+', '7+'],
            lead: ['lead', 'trưởng nhóm', 'team lead', 'technical lead'],
            manager: ['manager', 'quản lý', 'head', 'director', 'giám đốc'],
        };

        for (const [level, patterns] of Object.entries(levelPatterns)) {
            if (patterns.some((pattern) => content.includes(pattern))) {
                return level;
            }
        }

        return 'not-specified';
    }

    /**
     * Detect remote work options
     */
    detectRemoteWork(job) {
        const content =
            `${job.title || ''} ${job.description || ''} ${job.requirements || ''} ${job.type || ''}`.toLowerCase();

        const remotePatterns = [
            'remote',
            'work from home',
            'wfh',
            'làm việc tại nhà',
            'online',
            'địa điểm linh hoạt',
            'hybrid',
            'linh hoạt',
            'flexible',
        ];

        const onsitePatterns = ['onsite', 'tại văn phòng', 'có mặt', 'office'];

        if (remotePatterns.some((pattern) => content.includes(pattern))) {
            if (onsitePatterns.some((pattern) => content.includes(pattern))) {
                return 'hybrid';
            }
            return 'remote';
        }

        return 'onsite';
    }

    /**
     * Deep content analysis for filtering
     */
    analyzeJobContent(job) {
        return {
            skills: this.extractSkills(job),
            experienceLevel: this.detectExperienceLevel(job),
            remoteWorkType: this.detectRemoteWork(job),
            contentText:
                `${job.title || ''} ${job.description || ''} ${job.requirements || ''}`.toLowerCase(),
        };
    }

    /**
     * Áp dụng filters nâng cao với deep content analysis
     */
    applyFilters(jobs, filters = {}) {
        console.log(
            '🔍 DEBUG: applyFilters called with:',
            JSON.stringify(filters, null, 2),
        );
        console.log('🔍 DEBUG: Total jobs before filtering:', jobs.length);

        const filteredJobs = jobs.filter((job, index) => {
            const analysis = this.analyzeJobContent(job);
            const content = analysis.contentText;

            console.log(
                `🔍 DEBUG: Job ${index + 1}: "${job.title}" - City: "${job.city}" - Type: "${job.type}"`,
            );

            // Location filter (enhanced with fuzzy matching)
            if (filters.cities && filters.cities.length > 0) {
                const jobCity = job.city ? job.city.toLowerCase() : '';
                const cityMatch = filters.cities.some((city) => {
                    const cityLower = city.toLowerCase();
                    // Direct match
                    if (
                        jobCity.includes(cityLower) ||
                        cityLower.includes(jobCity)
                    )
                        return true;

                    // Fuzzy matching for Vietnamese cities
                    const cityAliases = {
                        'hà nội': ['hanoi', 'ha noi', 'hn'],
                        hanoi: ['hà nội', 'ha noi', 'hn'],
                        'hồ chí minh': ['hcm', 'ho chi minh', 'tp.hcm'],
                        hcm: ['hồ chí minh', 'ho chi minh', 'tp.hcm'],
                        'đà nẵng': ['danang', 'da nang', 'dn'],
                        danang: ['đà nẵng', 'da nang', 'dn'],
                    };

                    const aliases = cityAliases[cityLower] || [];
                    return aliases.some(
                        (alias) =>
                            jobCity.includes(alias) || alias.includes(jobCity),
                    );
                });
                console.log(
                    `🔍 DEBUG: City filter for job "${job.title}": ${cityMatch} (job city: "${jobCity}", filters: [${JSON.stringify(filters.cities)}])`,
                );
                if (!cityMatch) return false;
            }

            // Job type filter (enhanced with remote work detection)
            if (filters.types && filters.types.length > 0) {
                let jobType = job.type ? job.type.toLowerCase() : '';

                // Add detected remote work type
                if (analysis.remoteWorkType === 'remote') jobType += ' remote';
                if (analysis.remoteWorkType === 'hybrid') jobType += ' hybrid';

                const typeMatch = filters.types.some(
                    (type) =>
                        jobType.includes(type.toLowerCase()) ||
                        type.toLowerCase().includes(jobType),
                );
                console.log(
                    `🔍 DEBUG: Type filter for job "${job.title}": ${typeMatch} (job type: "${jobType}", filters: [${JSON.stringify(filters.types)}])`,
                );
                if (!typeMatch) return false;
            }

            // Salary range filter
            if (filters.salaryMin || filters.salaryMax) {
                const jobSalary = this.extractSalaryNumber(job.salary);
                if (filters.salaryMin && jobSalary < filters.salaryMin)
                    return false;
                if (filters.salaryMax && jobSalary > filters.salaryMax)
                    return false;
            }

            // Field/Industry filter (enhanced with content analysis)
            if (filters.fields && filters.fields.length > 0) {
                const jobField = job.field ? job.field.toLowerCase() : '';
                const fieldMatch = filters.fields.some((field) => {
                    const fieldLower = field.toLowerCase();
                    return (
                        jobField.includes(fieldLower) ||
                        fieldLower.includes(jobField) ||
                        content.includes(fieldLower)
                    ); // Check in description/requirements
                });
                if (!fieldMatch) return false;
            }

            // Experience level filter (enhanced with detection)
            if (filters.experience && filters.experience.length > 0) {
                const jobExpLevel = analysis.experienceLevel;
                const expMatch = filters.experience.some(
                    (exp) =>
                        jobExpLevel.includes(exp.toLowerCase()) ||
                        exp.toLowerCase().includes(jobExpLevel) ||
                        content.includes(exp.toLowerCase()),
                );
                if (!expMatch) return false;
            }

            // Skills-based filtering (new feature)
            if (filters.skills && filters.skills.length > 0) {
                const skillMatch = filters.skills.some((skill) => {
                    const skillLower = skill.toLowerCase();
                    return analysis.skills.some(
                        (jobSkill) =>
                            jobSkill.toLowerCase().includes(skillLower) ||
                            skillLower.includes(jobSkill.toLowerCase()),
                    );
                });
                if (!skillMatch) return false;
            }

            // Remote work preference filter
            if (filters.remoteWork) {
                const remoteMatch =
                    analysis.remoteWorkType === filters.remoteWork;
                if (!remoteMatch) return false;
            }

            return true;
        });

        console.log(
            '🔍 DEBUG: Total jobs after filtering:',
            filteredJobs.length,
        );
        return filteredJobs;
    }

    /**
     * Trích xuất số từ salary string
     */
    extractSalaryNumber(salaryString) {
        if (!salaryString) return 0;

        const salary = salaryString.toLowerCase();

        // Tìm số trong salary
        const numbers = salary.match(/[\d,]+/g);
        if (!numbers) return 0;

        const cleanNumbers = numbers.map((num) =>
            parseInt(num.replace(/,/g, ''), 10),
        );
        const maxSalary = Math.max(...cleanNumbers);

        // Nếu có "triệu" thì nhân với 1,000,000
        if (salary.includes('triệu') || salary.includes('tr')) {
            return maxSalary * 1000000;
        }

        return maxSalary;
    }

    /**
     * Main search function with priority-based approach
     * 1. First: Exact keyword matching (highest priority)
     * 2. Second: AI-powered related word matching (fallback)
     */
    async searchJobs(query = '', options = {}) {
        try {
            const {
                filters = {},
                page = 1,
                limit = 20,
                sortBy = 'relevance',
                sortOrder = 'desc',
            } = options;

            // Preprocess search query
            const searchTerms = this.preprocessText(query)
                .split(' ')
                .filter(Boolean);

            // Tier 1: Exact keyword matching (highest priority)
            const exactMatches = await this.performExactMatchSearch(searchTerms, filters, limit);

            // If we have enough exact matches, return them
            if (exactMatches.length >= limit) {
                return this.formatSearchResults(exactMatches, page, limit, filters, searchTerms, 'exact');
            }

            // Tier 2: AI-powered related word matching (fallback)
            const aiMatches = await this.performAISearch(searchTerms, filters, limit, exactMatches);

            // Combine exact matches and AI matches
            const allJobs = [...exactMatches, ...aiMatches];

            return this.formatSearchResults(allJobs, page, limit, filters, searchTerms, 'hybrid');
        } catch (error) {
            console.error('Smart Search Error:', error);
            throw new Error('Search failed. Please try again.');
        }
    }

    /**
     * Perform exact keyword matching search
     */
    async performExactMatchSearch(searchTerms, filters, limit) {
        try {
            // Build MongoDB query for exact matching
            let mongoQuery = {
                expiryTime: { $gte: new Date() },
                status: 'active',
            };

            // Add basic filters
            if (filters.cities && filters.cities.length > 0) {
                mongoQuery.city = { $in: filters.cities };
            }
            if (filters.types && filters.types.length > 0) {
                mongoQuery.type = { $in: filters.types };
            }
            if (filters.fields && filters.fields.length > 0) {
                mongoQuery.field = { $in: filters.fields };
            }

            // If no search terms, return filtered jobs
            if (searchTerms.length === 0) {
                const jobs = await Job.find(mongoQuery)
                    .populate('businessId')
                    .sort({ createdAt: -1 })
                    .limit(limit * 2);
                return this.applyFilters(jobs, filters);
            }

            // Build exact match conditions - simpler approach
            const searchConditions = [];
            
            searchTerms.forEach(term => {
                const termRegex = new RegExp(term, 'i');

                // Title matching (highest weight)
                searchConditions.push({ title: termRegex });
                // Description matching
                searchConditions.push({ description: termRegex });
                // Requirements matching
                searchConditions.push({ requirements: termRegex });
                // Field matching
                searchConditions.push({ field: termRegex });
            });

            // Add exact match conditions to query
            if (searchConditions.length > 0) {
                mongoQuery.$or = searchConditions;
            }

            // Get exact matches
            let jobs = await Job.find(mongoQuery)
                .populate('businessId')
                .sort({ createdAt: -1 })
                .limit(limit * 3);

            // Apply additional filters
            jobs = this.applyFilters(jobs, filters);

            // Calculate relevance scores for exact matches (with bonus for exact matching)
            jobs = jobs.map((job) => ({
                ...job.toObject(),
                relevanceScore: this.calculateRelevanceScore(job, searchTerms, filters) + 100, // Bonus for exact matches
                matchType: 'exact'
            }));

            // Sort by relevance
            jobs.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

            return jobs;
        } catch (error) {
            console.error('Exact match search error:', error);
            return [];
        }
    }

    /**
     * Perform AI-powered search for related words
     */
    async performAISearch(searchTerms, filters, limit, excludeJobs = []) {
        try {
            // Get excluded job IDs
            const excludedIds = excludeJobs.map(job => job._id);

            // Build broader query for AI search
            let mongoQuery = {
                expiryTime: { $gte: new Date() },
                status: 'active',
                _id: { $nin: excludedIds }
            };

            // Add basic filters
            if (filters.cities && filters.cities.length > 0) {
                mongoQuery.city = { $in: filters.cities };
            }
            if (filters.types && filters.types.length > 0) {
                mongoQuery.type = { $in: filters.types };
            }
            if (filters.fields && filters.fields.length > 0) {
                mongoQuery.field = { $in: filters.fields };
            }

            // Get broader set of jobs for AI analysis
            let jobs = await Job.find(mongoQuery)
                .populate('businessId')
                .sort({ createdAt: -1 })
                .limit(limit * 4);

            // Apply filters
            jobs = this.applyFilters(jobs, filters);

            // Calculate AI relevance scores
            jobs = jobs.map((job) => ({
                ...job.toObject(),
                relevanceScore: this.calculateAIRelevanceScore(job, searchTerms, filters),
                matchType: 'ai'
            }));

            // Filter by AI relevance threshold (lower threshold for AI matches)
            jobs = jobs.filter(job => job.relevanceScore >= 20);

            // Sort by AI relevance
            jobs.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

            return jobs.slice(0, limit * 2);
        } catch (error) {
            console.error('AI search error:', error);
            return [];
        }
    }

    /**
     * Calculate AI relevance score for related word matching
     */
    calculateAIRelevanceScore(job, searchTerms, filters = {}) {
        let score = 0;

        // Process job content
        const title = this.preprocessText(job.title || '');
        const description = this.preprocessText(job.description || '');
        const requirements = this.preprocessText(job.requirements || '');
        const city = this.preprocessText(job.city || '');
        const type = this.preprocessText(job.type || '');
        const field = this.preprocessText(job.field || '');

        const jobContent = `${title} ${description} ${requirements} ${city} ${type} ${field}`;

        // AI-powered semantic matching
        searchTerms.forEach((term) => {
            const termNoAccent = this.removeAccents(term);

            // Partial word matching (lower weight)
            if (jobContent.includes(term)) score += 5;
            if (this.removeAccents(jobContent).includes(termNoAccent)) score += 4;

            // Skill/technology matching
            const jobSkills = this.extractSkills(job);
            jobSkills.forEach(skill => {
                if (skill.toLowerCase().includes(term.toLowerCase()) || 
                    term.toLowerCase().includes(skill.toLowerCase())) {
                    score += 8;
                }
            });

            // Experience level matching
            const expLevel = this.detectExperienceLevel(job);
            if (expLevel.toLowerCase().includes(term.toLowerCase())) {
                score += 6;
            }

            // Remote work matching
            const remoteType = this.detectRemoteWork(job);
            if (term.toLowerCase().includes('remote') && remoteType === 'remote') {
                score += 10;
            }
            if (term.toLowerCase().includes('hybrid') && remoteType === 'hybrid') {
                score += 10;
            }
        });

        // Content quality bonus
        if (job.description && job.description.length > 200) score += 5;
        if (job.requirements && job.requirements.length > 50) score += 3;

        // Recency bonus (smaller for AI matches)
        const daysSinceCreated = (Date.now() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24);
        if (daysSinceCreated < 7) score += 10;
        else if (daysSinceCreated < 30) score += 5;

        return score;
    }

    /**
     * Format search results
     */
    formatSearchResults(jobs, page, limit, filters, searchTerms, searchType) {
        // Sort results - exact matches first, then by relevance
        jobs.sort((a, b) => {
            // Exact matches first
            if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
            if (b.matchType === 'exact' && a.matchType !== 'exact') return 1;
            
            // Then by relevance score
            const relevanceDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
            if (relevanceDiff !== 0) return relevanceDiff;

            // Finally by creation date
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Pagination
        const startIndex = (page - 1) * limit;
        const paginatedJobs = jobs.slice(startIndex, startIndex + limit);

        // Transform results
        const transformedJobs = paginatedJobs.map((job) => ({
            _id: job._id,
            title: job.title,
            slug: job.slug,
            status: job.status || 'active',
            description: job.description
                ? job.description.length > 200
                    ? job.description.substring(0, 200) + '...'
                    : job.description
                : 'Không có mô tả',
            salary: job.salary || 'Thỏa thuận',
            city: job.city || 'Không xác định',
            type: job.type || 'Full-time',
            workTime: job.workTime || '',
            field: job.field || 'Công nghệ thông tin',
            companyName: job.businessId?.companyName || 'Công ty',
            companyLogo: job.businessId?.logo || null,
            relevanceScore: job.relevanceScore || 0,
            matchType: job.matchType || 'unknown',
            createdAt: job.createdAt,
            expiryTime: job.expiryTime,
        }));

        return {
            jobs: transformedJobs,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(jobs.length / limit),
                totalJobs: jobs.length,
                hasNextPage: startIndex + limit < jobs.length,
                hasPrevPage: page > 1,
            },
            filters: filters,
            searchTerms: searchTerms,
            totalResults: jobs.length,
            searchType: searchType,
            exactMatchesCount: jobs.filter(job => job.matchType === 'exact').length,
            aiMatchesCount: jobs.filter(job => job.matchType === 'ai').length,
        };
    }

    /**
     * Get popular search suggestions
     */
    async getSearchSuggestions(query = '', limit = 10) {
        try {
            const searchTerms = this.preprocessText(query)
                .split(' ')
                .filter(Boolean);

            if (searchTerms.length === 0) {
                // Return trending jobs/keywords
                return [
                    'Lập trình viên JavaScript',
                    'Developer Java',
                    'Data Scientist',
                    'Marketing Digital',
                    'Quản lý dự án',
                    'Thiết kế UX/UI',
                    'Remote working',
                    'Intern IT',
                ];
            }

            // Get job titles that match the query
            const jobs = await Job.find({
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { field: { $regex: query, $options: 'i' } },
                ],
                status: 'active',
                expiryTime: { $gte: new Date() },
            })
                .distinct('title')
                .limit(limit);

            // Add city suggestions
            const cities = await Job.distinct('city').limit(
                Math.floor(limit / 3),
            );

            return [...jobs, ...cities].slice(0, limit);
        } catch (error) {
            console.error('Suggestions Error:', error);
            return [];
        }
    }

    /**
     * Get available filter options
     */
    async getFilterOptions() {
        try {
            const [cities, types, fields] = await Promise.all([
                Job.distinct('city'),
                Job.distinct('type'),
                Job.distinct('field'),
            ]);

            return {
                cities: cities.filter(Boolean).sort(),
                types: types.filter(Boolean).sort(),
                fields: fields.filter(Boolean).sort(),
                salaryRanges: [
                    { min: 0, max: 5000000, label: 'Dưới 5 triệu' },
                    { min: 5000000, max: 10000000, label: '5-10 triệu' },
                    { min: 10000000, max: 15000000, label: '10-15 triệu' },
                    { min: 15000000, max: 20000000, label: '15-20 triệu' },
                    { min: 20000000, max: null, label: 'Trên 20 triệu' },
                ],
                experienceLevels: [
                    'Fresher',
                    'Junior',
                    'Mid-level',
                    'Senior',
                    'Lead',
                    'Manager',
                ],
            };
        } catch (error) {
            console.error('Filter Options Error:', error);
            return {
                cities: [],
                types: [],
                fields: [],
                salaryRanges: [],
                experienceLevels: [],
            };
        }
    }
}

module.exports = new SmartSearchService();

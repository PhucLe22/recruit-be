const Job = require('../../../app/models/Job');
const JobField = require('../../../app/models/JobField');
const Business = require('../../../app/models/Business');
const SmartSearchService = require('../../../services/SmartSearchService');
const AIFilteringService = require('../../../services/AIFilteringService');
const { formatDate } = require('../../../middlewares/formatDate');

class SearchController {
  // Search jobs with filters
  async search(req, res) {
    try {
      const {
        q: query,
        cities,
        types,
        fields,
        salaryMin,
        salaryMax,
        experienceLevel,
        page = 1,
        limit = 10
      } = req.query;

      const filters = {
        q: query,
        cities: cities ? (Array.isArray(cities) ? cities : [cities]) : null,
        types: types ? (Array.isArray(types) ? types : [types]) : null,
        fields: fields ? (Array.isArray(fields) ? fields : [fields]) : null,
        salaryMin: salaryMin ? parseInt(salaryMin) : null,
        salaryMax: salaryMax ? parseInt(salaryMax) : null,
        experienceLevel
      };

      const jobs = await AIFilteringService.filterJobs(filters, req.user?._id);

      const total = jobs.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedJobs = jobs.slice(startIndex, endIndex);

      res.json({
        success: true,
        jobs: paginatedJobs,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total,
          limit: parseInt(limit)
        },
        filters
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching jobs',
        error: error.message
      });
    }
  }

  // Get search suggestions
  async suggestions(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.json({
          success: true,
          suggestions: []
        });
      }

      const suggestions = await AIFilteringService.getSmartSuggestions(q, req.user?._id);

      res.json({
        success: true,
        suggestions
      });
    } catch (error) {
      console.error('Suggestions error:', error);
      res.json({
        success: true,
        suggestions: []
      });
    }
  }

  // Get available filters
  async filters(req, res) {
    try {
      const cities = await Job.distinct('city');
      const types = await Job.distinct('type');
      const fields = await Job.distinct('field');
      
      res.json({
        success: true,
        cities: cities.filter(Boolean),
        types: types.filter(Boolean),
        fields: fields.filter(Boolean)
      });
    } catch (error) {
      console.error('Filters error:', error);
      res.json({
        cities: [],
        types: [],
        fields: []
      });
    }
  }

  // Advanced search
  async advancedSearch(req, res) {
    try {
      const filters = req.body;
      const userId = req.user?._id;

      const jobs = await AIFilteringService.filterJobs(filters, userId);

      res.json({
        success: true,
        jobs,
        filters
      });
    } catch (error) {
      console.error('Advanced search error:', error);
      res.status(500).json({
        success: false,
        message: 'Error in advanced search',
        error: error.message
      });
    }
  }

  // Get recommended filters for user
  async recommendedFilters(req, res) {
    try {
      const userId = req.user?._id;
      
      if (!userId) {
        return res.json({
          success: true,
          recommendations: {
            jobTypes: [],
            locations: [],
            industries: [],
            keywords: []
          }
        });
      }

      const recommendations = await AIFilteringService.getRecommendedFilters(userId);

      res.json({
        success: true,
        recommendations
      });
    } catch (error) {
      console.error('Recommended filters error:', error);
      res.json({
        success: true,
        recommendations: {
          jobTypes: [],
          locations: [],
          industries: [],
          keywords: []
        }
      });
    }
  }

  // Smart search with AI
  async smartSearch(req, res) {
    try {
      const { query, options = {} } = req.body;
      const userId = req.user?._id;

      const results = await SmartSearchService.search(query, {
        ...options,
        userId
      });

      res.json({
        success: true,
        results
      });
    } catch (error) {
      console.error('Smart search error:', error);
      res.status(500).json({
        success: false,
        message: 'Error in smart search',
        error: error.message
      });
    }
  }

  /**
   * Handle search results page with filters and sorting
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware
   */
  async searchResults(req, res, next) {
    try {
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
        limit = 24,                // 24 jobs per page
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
        limit: parseInt(limit) || 24,
        sortBy: sortBy || 'relevance',
        sortOrder: sortOrder || 'desc',
      };

      // Perform smart search with priority-based approach
      const results = await SmartSearchService.searchJobs(
        searchQuery,
        searchOptions,
      );

      // Format jobs with additional properties
      const formattedJobs = results.jobs ? results.jobs.map(job => ({
        ...job,
        formattedDate: formatDate(job.createdAt),
        logoPath: job.logoPath || job.companyLogo || '/images/default-company.png'
      })) : [];

      res.render('jobs/results', {
        sorted: formattedJobs,
        keyword: searchQuery || '',
        totalCount: results.totalResults || results.jobs?.length || 0,
        currentPage: parseInt(results.pagination?.currentPage || results.currentPage || 1),
        totalPages: parseInt(results.pagination?.totalPages || results.totalPages || 1),
        hasMore: results.pagination?.hasNextPage || results.hasMore || false,
        filters,
        sortBy,
        sortOrder,
        pageTitle: searchQuery ? `Kết quả tìm kiếm: "${searchQuery}"` : 'Tất cả việc làm',
        layout: 'main'
      });

    } catch (error) {
      console.error('Search Results Error:', error);
      next(error);
    }
  }

  /**
   * Handle API search requests
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware
   */
  async apiSearch(req, res, next) {
        try {
            const {
                q = '', // search query
                cities = [], // location filters
                jobTypes = [], // job type filters
                salaryMin = null,
                salaryMax = null,
                experience = '',
                limit = 24, // Changed from 20 to 24 jobs per page
                offset = 0,
                useAI = false, // AI filtering flag
            } = req.query;

            const filters = {
                cities: Array.isArray(cities) ? cities : [cities].filter(Boolean),
                types: Array.isArray(jobTypes) ? jobTypes : [jobTypes].filter(Boolean),
                salaryMin: salaryMin ? parseInt(salaryMin) : null,
                salaryMax: salaryMax ? parseInt(salaryMax) : null,
                experience,
            };

            let results;

            if (useAI === 'true') {
                // Use AI-enhanced filtering
                const userPreferences = req.account
                    ? {
                          skills: req.account.skills || [],
                          experience: req.account.experience || '',
                          preferredCities: req.account.preferredCities || [],
                          salaryRange: req.account.desiredSalaryRange || null,
                      }
                    : {};

                // Get jobs with basic filters first
                const basicResults = await SmartSearchService.searchJobs(q, filters);
                const jobsArray = basicResults.jobs || [];

                // Apply AI filtering
                const aiResults = await AIFilteringService.intelligentFilterJobs(
                    jobsArray,
                    q,
                    userPreferences,
                );

                results = aiResults;
            } else {
                // Use traditional SmartSearchService with priority-based search
                results = await SmartSearchService.searchJobs(q, {
                    filters,
                    page: Math.floor(offset / parseInt(limit)) + 1,
                    limit: parseInt(limit),
                    sortBy: 'relevance',
                    sortOrder: 'desc'
                });
            }

            // Log search behavior if user is logged in
            if (req.account) {
                try {
                    const UserBehaviorService = require('../../../services/UserBehaviorService');
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

            // Add search metadata from SmartSearchService
            response.searchType = results.searchType || 'hybrid';
            response.exactMatchesCount = results.exactMatchesCount || 0;
            response.aiMatchesCount = results.aiMatchesCount || 0;

            // Add AI analysis if AI was used
            if (useAI === 'true' && results.aiInsights) {
                response.aiAnalysis = {
                    insights: results.aiInsights || [],
                    recommendations: results.aiRecommendations || [],
                    matchScores: results.matchScores || [],
                    totalAnalyzed: results.originalJobs ? results.originalJobs.length : jobsArray.length,
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
    }
}

module.exports = new SearchController();

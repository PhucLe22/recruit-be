const Job = require('../../../app/models/Job');
const JobField = require('../../../app/models/JobField');
const Business = require('../../../app/models/Business');
const SmartSearchService = require('../../../services/SmartSearchService');
const AIFilteringService = require('../../../services/AIFilteringService');

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
}

module.exports = new SearchController();

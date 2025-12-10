const Job = require('../../models/Job');
const JobField = require('../../models/JobField');

class SearchController {
  // Search results
  async search(req, res) {
    try {
      const { q, cities, types, fields, salaryMin, salaryMax, page = 1 } = req.query;
      
      let query = {};
      
      // Text search
      if (q) {
        query.$or = [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { requirements: { $regex: q, $options: 'i' } }
        ];
      }
      
      // Location filter
      if (cities) {
        const cityArray = Array.isArray(cities) ? cities : [cities];
        query.city = { $in: cityArray };
      }
      
      // Job type filter
      if (types) {
        const typeArray = Array.isArray(types) ? types : [types];
        query.type = { $in: typeArray };
      }
      
      // Field filter
      if (fields) {
        const fieldArray = Array.isArray(fields) ? fields : [fields];
        query.field = { $in: fieldArray };
      }
      
      // Salary filter
      if (salaryMin || salaryMax) {
        query.salary = {};
        if (salaryMin) query.salary.$gte = salaryMin;
        if (salaryMax) query.salary.$lte = salaryMax;
      }
      
      // Only show active jobs
      query.expiryTime = { $gte: new Date() };
      
      const limit = 20;
      const skip = (page - 1) * limit;
      
      const jobs = await Job.find(query)
        .populate('businessId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
        
      const total = await Job.countDocuments(query);
      const jobFields = await JobField.find({});
      
      res.render('search/results', {
        title: 'Tìm kiếm việc làm',
        jobs,
        jobFields,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        query: req.query,
        user: req.session.users || null
      });
    } catch (error) {
      console.error('Search error:', error);
      res.render('search/results', {
        title: 'Tìm kiếm việc làm',
        jobs: [],
        jobFields: [],
        currentPage: 1,
        totalPages: 1,
        total: 0,
        query: {},
        user: req.session.users || null
      });
    }
  }

  // Advanced search
  async advancedSearch(req, res) {
    try {
      const jobFields = await JobField.find({});
      
      res.render('search/advanced', {
        title: 'Tìm kiếm nâng cao',
        jobFields,
        user: req.session.users || null
      });
    } catch (error) {
      console.error('Advanced search error:', error);
      res.render('search/advanced', {
        title: 'Tìm kiếm nâng cao',
        jobFields: [],
        user: req.session.users || null
      });
    }
  }

  // Get search suggestions
  async getSuggestions(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.json({ suggestions: [] });
      }
      
      const suggestions = await Job.find({
        title: { $regex: q, $options: 'i' },
        expiryTime: { $gte: new Date() }
      })
      .select('title')
      .limit(10);
      
      res.json({
        suggestions: suggestions.map(job => job.title)
      });
    } catch (error) {
      console.error('Suggestions error:', error);
      res.json({ suggestions: [] });
    }
  }

  // Get search filters
  async getFilters(req, res) {
    try {
      const cities = await Job.distinct('city');
      const types = await Job.distinct('type');
      const fields = await Job.distinct('field');
      
      res.json({
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
}

module.exports = new SearchController();

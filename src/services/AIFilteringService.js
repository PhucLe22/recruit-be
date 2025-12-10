const Job = require('../app/models/Job');
const UserBehavior = require('../app/models/UserBehavior');

class AIFilteringService {
  // Smart job filtering based on AI
  static async filterJobs(filters, userId = null) {
    try {
      let query = {
        expiryTime: { $gte: new Date() }
      };

      // Apply filters with AI enhancement
      if (filters.q) {
        query = this.applySmartSearch(query, filters.q);
      }

      if (filters.cities) {
        query.city = Array.isArray(filters.cities) ? { $in: filters.cities } : filters.cities;
      }

      if (filters.types) {
        query.type = Array.isArray(filters.types) ? { $in: filters.types } : filters.types;
      }

      if (filters.fields) {
        query.field = Array.isArray(filters.fields) ? { $in: filters.fields } : filters.fields;
      }

      if (filters.salaryMin || filters.salaryMax) {
        query.salary = {};
        if (filters.salaryMin) query.salary.$gte = filters.salaryMin;
        if (filters.salaryMax) query.salary.$lte = filters.salaryMax;
      }

      if (filters.experienceLevel) {
        query.experienceLevel = filters.experienceLevel;
      }

      // Get base results
      let jobs = await Job.find(query)
        .populate('businessId')
        .sort({ createdAt: -1 });

      // Apply AI filtering if user is provided
      if (userId) {
        jobs = await this.applyPersonalizedFiltering(jobs, userId, filters);
      }

      // Apply AI sorting
      jobs = this.applyAISorting(jobs, filters);

      return jobs;
    } catch (error) {
      console.error('Error filtering jobs:', error);
      return [];
    }
  }

  // Apply smart search with AI
  static applySmartSearch(query, searchTerm) {
    const keywords = this.extractSearchKeywords(searchTerm);
    
    if (keywords.length === 0) return query;

    const searchConditions = [];

    // Title matching (highest priority)
    searchConditions.push({
      title: { $regex: keywords.join('|'), $options: 'i' }
    });

    // Description matching
    searchConditions.push({
      description: { $regex: keywords.join('|'), $options: 'i' }
    });

    // Requirements matching
    searchConditions.push({
      requirements: { $regex: keywords.join('|'), $options: 'i' }
    });

    // Field/industry matching
    searchConditions.push({
      field: { $regex: keywords.join('|'), $options: 'i' }
    });

    // Skills matching
    searchConditions.push({
      skills: { $in: keywords.map(k => new RegExp(k, 'i')) }
    });

    query.$or = searchConditions;
    return query;
  }

  // Apply personalized filtering
  static async applyPersonalizedFiltering(jobs, userId, filters) {
    try {
      // Get user behavior data
      const behaviors = await UserBehavior.find({ user_id: userId })
        .sort({ timestamp: -1 })
        .limit(50);

      const userProfile = this.buildQuickProfile(behaviors);

      // Score each job
      const scoredJobs = jobs.map(job => {
        const score = this.calculatePersonalizationScore(job, userProfile, filters);
        return {
          ...job.toObject(),
          personalizationScore: score
        };
      });

      // Filter and sort by personalization score
      return scoredJobs
        .filter(job => job.personalizationScore > 30) // Minimum relevance threshold
        .sort((a, b) => b.personalizationScore - a.personalizationScore);

    } catch (error) {
      console.error('Error applying personalized filtering:', error);
      return jobs;
    }
  }

  // Apply AI sorting
  static applyAISorting(jobs, filters) {
    return jobs.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Recency factor
      const daysA = Math.floor((new Date() - a.createdAt) / (1000 * 60 * 60 * 24));
      const daysB = Math.floor((new Date() - b.createdAt) / (1000 * 60 * 60 * 24));
      
      scoreA += Math.max(0, 30 - daysA);
      scoreB += Math.max(0, 30 - daysB);

      // Personalization factor (if available)
      if (a.personalizationScore) scoreA += a.personalizationScore * 0.5;
      if (b.personalizationScore) scoreB += b.personalizationScore * 0.5;

      // Quality factors
      if (a.description && a.description.length > 200) scoreA += 10;
      if (b.description && b.description.length > 200) scoreB += 10;

      if (a.requirements && a.requirements.length > 50) scoreA += 5;
      if (b.requirements && b.requirements.length > 50) scoreB += 5;

      // Business verification
      if (a.businessId && a.businessId.isVerified) scoreA += 15;
      if (b.businessId && b.businessId.isVerified) scoreB += 15;

      return scoreB - scoreA;
    });
  }

  // Build quick user profile
  static buildQuickProfile(behaviors) {
    const profile = {
      interests: {},
      preferences: {
        jobTypes: {},
        locations: {},
        industries: {}
      },
      recentSearches: []
    };

    behaviors.forEach(behavior => {
      // Extract interests
      if (behavior.data && behavior.data.keywords) {
        behavior.data.keywords.forEach(keyword => {
          profile.interests[keyword] = (profile.interests[keyword] || 0) + 1;
        });
      }

      // Extract preferences
      if (behavior.data) {
        if (behavior.data.jobType) {
          profile.preferences.jobTypes[behavior.data.jobType] = 
            (profile.preferences.jobTypes[behavior.data.jobType] || 0) + 1;
        }
        if (behavior.data.location || behavior.data.city) {
          const location = behavior.data.location || behavior.data.city;
          profile.preferences.locations[location] = 
            (profile.preferences.locations[location] || 0) + 1;
        }
        if (behavior.data.industry || behavior.data.field) {
          const industry = behavior.data.industry || behavior.data.field;
          profile.preferences.industries[industry] = 
            (profile.preferences.industries[industry] || 0) + 1;
        }
      }

      // Track recent searches
      if (behavior.action === 'search' && behavior.data && behavior.data.query) {
        profile.recentSearches.push({
          query: behavior.data.query,
          timestamp: behavior.timestamp
        });
      }
    });

    return profile;
  }

  // Calculate personalization score
  static calculatePersonalizationScore(job, userProfile, filters) {
    let score = 50; // Base score

    const jobText = `${job.title} ${job.description} ${job.requirements || ''}`.toLowerCase();

    // Interest matching
    Object.entries(userProfile.interests).forEach(([interest, count]) => {
      if (jobText.includes(interest.toLowerCase())) {
        score += Math.min(count * 2, 20);
      }
    });

    // Job type preference
    if (userProfile.preferences.jobTypes[job.type]) {
      score += 15;
    }

    // Location preference
    if (userProfile.preferences.locations[job.city]) {
      score += 10;
    }

    // Industry preference
    if (userProfile.preferences.industries[job.field]) {
      score += 10;
    }

    // Recent search matching
    userProfile.recentSearches.forEach(search => {
      if (search.query && jobText.includes(search.query.toLowerCase())) {
        score += 8;
      }
    });

    return Math.min(score, 100);
  }

  // Extract search keywords
  static extractSearchKeywords(searchTerm) {
    if (!searchTerm || typeof searchTerm !== 'string') return [];

    return searchTerm.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !this.isStopWord(word)
      )
      .slice(0, 10); // Limit to top 10 keywords
  }

  // Check if word is a stop word
  static isStopWord(word) {
    const stopWords = [
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was',
      'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
      'for', 'of', 'with', 'by', 'to', 'in', 'from', 'up', 'down', 'out',
      'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
      'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
      'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
      'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now'
    ];

    return stopWords.includes(word.toLowerCase());
  }

  // Get smart suggestions
  static async getSmartSuggestions(query, userId = null) {
    try {
      const keywords = this.extractSearchKeywords(query);
      
      if (keywords.length === 0) return [];

      let suggestions = [];

      // Job title suggestions
      const titleSuggestions = await Job.find({
        title: { $regex: keywords.join('|'), $options: 'i' },
        expiryTime: { $gte: new Date() }
      })
      .distinct('title')
      .then(titles => titles.slice(0, 5));

      suggestions.push(...titleSuggestions);

      // Field/industry suggestions
      const fieldSuggestions = await Job.find({
        field: { $regex: keywords.join('|'), $options: 'i' },
        expiryTime: { $gte: new Date() }
      })
      .distinct('field')
      .then(fields => fields.slice(0, 3));

      suggestions.push(...fieldSuggestions);

      // Location suggestions
      const locationSuggestions = await Job.find({
        city: { $regex: keywords.join('|'), $options: 'i' },
        expiryTime: { $gte: new Date() }
      })
      .distinct('city')
      .then(cities => cities.slice(0, 3));

      suggestions.push(...locationSuggestions);

      // Remove duplicates and limit
      return [...new Set(suggestions)].slice(0, 10);
    } catch (error) {
      console.error('Error getting smart suggestions:', error);
      return [];
    }
  }

  // Get recommended filters
  static async getRecommendedFilters(userId) {
    try {
      const behaviors = await UserBehavior.find({ user_id: userId })
        .sort({ timestamp: -1 })
        .limit(50);

      const userProfile = this.buildQuickProfile(behaviors);

      const recommendations = {
        jobTypes: Object.entries(userProfile.preferences.jobTypes)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([type]) => type),

        locations: Object.entries(userProfile.preferences.locations)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([location]) => location),

        industries: Object.entries(userProfile.preferences.industries)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([industry]) => industry),

        keywords: Object.entries(userProfile.interests)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([interest]) => interest)
      };

      return recommendations;
    } catch (error) {
      console.error('Error getting recommended filters:', error);
      return {
        jobTypes: [],
        locations: [],
        industries: [],
        keywords: []
      };
    }
  }
}

module.exports = AIFilteringService;

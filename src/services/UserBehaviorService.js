const UserBehavior = require('../app/models/UserBehavior');
const Activity = require('../app/models/Activity');

class UserBehaviorService {
  // Analyze user behavior patterns
  static async analyzeUserBehavior(userId) {
    try {
      // Get recent behaviors
      const behaviors = await UserBehavior.find({ user_id: userId })
        .sort({ timestamp: -1 })
        .limit(100);

      // Get activity data
      const activities = await Activity.find({ user_id: userId })
        .sort({ timestamp: -1 })
        .limit(100);

      // Build user profile
      const profile = {
        interests: await this.extractInterests(behaviors),
        preferences: await this.extractPreferences(behaviors),
        activityPatterns: this.analyzeActivityPatterns(activities),
        jobPreferences: this.analyzeJobPreferences(behaviors),
        searchPatterns: this.analyzeSearchPatterns(behaviors)
      };

      return profile;
    } catch (error) {
      console.error('Error analyzing user behavior:', error);
      return null;
    }
  }

  // Extract interests from behaviors
  static async extractInterests(behaviors) {
    const interests = {};

    behaviors.forEach(behavior => {
      if (behavior.data && behavior.data.keywords) {
        behavior.data.keywords.forEach(keyword => {
          interests[keyword] = (interests[keyword] || 0) + 1;
        });
      }

      // Extract keywords from job titles and descriptions
      if (behavior.action === 'job_view' && behavior.data && behavior.data.jobTitle) {
        const words = this.extractKeywords(behavior.data.jobTitle);
        words.forEach(word => {
          if (word.length > 2) { // Only meaningful words
            interests[word] = (interests[word] || 0) + 2; // Higher weight for viewed jobs
          }
        });
      }
    });

    // Sort by frequency and return top interests
    return Object.entries(interests)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([interest, count]) => ({
        interest,
        count,
        weight: Math.min(count / 10, 1) // Normalize weight to 0-1
      }));
  }

  // Extract preferences from behaviors
  static async extractPreferences(behaviors) {
    const preferences = {
      jobTypes: {},
      locations: {},
      industries: {},
      salaryRanges: {}
    };

    behaviors.forEach(behavior => {
      if (behavior.data) {
        // Job type preferences
        if (behavior.data.jobType) {
          preferences.jobTypes[behavior.data.jobType] = 
            (preferences.jobTypes[behavior.data.jobType] || 0) + 1;
        }

        // Location preferences
        if (behavior.data.location || behavior.data.city) {
          const location = behavior.data.location || behavior.data.city;
          preferences.locations[location] = 
            (preferences.locations[location] || 0) + 1;
        }

        // Industry preferences
        if (behavior.data.industry || behavior.data.field) {
          const industry = behavior.data.industry || behavior.data.field;
          preferences.industries[industry] = 
            (preferences.industries[industry] || 0) + 1;
        }

        // Salary range preferences
        if (behavior.data.salaryMin || behavior.data.salaryMax) {
          const range = `${behavior.data.salaryMin || 0}-${behavior.data.salaryMax || 'unlimited'}`;
          preferences.salaryRanges[range] = 
            (preferences.salaryRanges[range] || 0) + 1;
        }
      }
    });

    // Convert to arrays and sort by preference
    Object.keys(preferences).forEach(key => {
      preferences[key] = Object.entries(preferences[key])
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([value, count]) => ({ value, count }));
    });

    return preferences;
  }

  // Analyze activity patterns
  static analyzeActivityPatterns(activities) {
    const patterns = {
      mostActiveHour: null,
      mostActiveDay: null,
      averageSessionsPerDay: 0,
      sessionDuration: 0,
      preferredActions: []
    };

    if (activities.length === 0) return patterns;

    // Analyze time patterns
    const hourCounts = {};
    const dayCounts = {};

    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const hour = date.getHours();
      const day = date.getDay();

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    // Find most active hour and day
    patterns.mostActiveHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
    
    patterns.mostActiveDay = Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    // Analyze action preferences
    const actionCounts = {};
    activities.forEach(activity => {
      actionCounts[activity.action] = (actionCounts[activity.action] || 0) + 1;
    });

    patterns.preferredActions = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    return patterns;
  }

  // Analyze job preferences
  static analyzeJobPreferences(behaviors) {
    const preferences = {
      viewedJobs: [],
      appliedJobs: [],
      savedJobs: [],
      ignoredJobs: [],
      preferredJobTypes: [],
      preferredLocations: []
    };

    behaviors.forEach(behavior => {
      if (behavior.data && behavior.data.jobId) {
        const jobData = {
          jobId: behavior.data.jobId,
          jobTitle: behavior.data.jobTitle,
          timestamp: behavior.timestamp
        };

        switch (behavior.action) {
          case 'job_view':
            preferences.viewedJobs.push(jobData);
            break;
          case 'job_apply':
            preferences.appliedJobs.push(jobData);
            break;
          case 'job_save':
            preferences.savedJobs.push(jobData);
            break;
          case 'job_dismiss':
            preferences.ignoredJobs.push(jobData);
            break;
        }
      }
    });

    // Sort by timestamp (most recent first)
    Object.keys(preferences).forEach(key => {
      if (Array.isArray(preferences[key])) {
        preferences[key].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
    });

    return preferences;
  }

  // Analyze search patterns
  static analyzeSearchPatterns(behaviors) {
    const patterns = {
      commonKeywords: [],
      searchFrequency: 0,
      filterUsage: {},
      searchResults: []
    };

    const searchBehaviors = behaviors.filter(b => b.action === 'search');
    patterns.searchFrequency = searchBehaviors.length;

    // Extract common keywords
    const keywordCounts = {};
    searchBehaviors.forEach(behavior => {
      if (behavior.data && behavior.data.keywords) {
        behavior.data.keywords.forEach(keyword => {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
      }
    });

    patterns.commonKeywords = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));

    // Analyze filter usage
    const filterCounts = {};
    searchBehaviors.forEach(behavior => {
      if (behavior.data && behavior.data.filters) {
        Object.keys(behavior.data.filters).forEach(filter => {
          filterCounts[filter] = (filterCounts[filter] || 0) + 1;
        });
      }
    });

    patterns.filterUsage = Object.entries(filterCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([filter, count]) => ({ filter, count }));

    return patterns;
  }

  // Extract keywords from text
  static extractKeywords(text) {
    if (!text || typeof text !== 'string') return [];

    // Simple keyword extraction - split by spaces and clean up
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !this.isStopWord(word)
      );
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
      'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now', 'job',
      'jobs', 'work', 'working', 'employee', 'employer', 'company', 'team'
    ];

    return stopWords.includes(word.toLowerCase());
  }

  // Track user behavior
  static async trackBehavior(userId, action, data, req) {
    try {
      const behavior = new UserBehavior({
        user_id: userId,
        action,
        data,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        session_id: req.sessionID
      });

      await behavior.save();
      return behavior;
    } catch (error) {
      console.error('Error tracking behavior:', error);
      return null;
    }
  }

  // Get user insights
  static async getUserInsights(userId) {
    try {
      const profile = await this.analyzeUserBehavior(userId);
      
      if (!profile) {
        return null;
      }

      const insights = {
        topInterests: profile.interests.slice(0, 5),
        preferredJobTypes: profile.preferences.jobTypes.slice(0, 3),
        preferredLocations: profile.preferences.locations.slice(0, 3),
        activityLevel: this.calculateActivityLevel(profile.activityPatterns),
        searchEngagement: profile.searchPatterns.searchFrequency,
        recommendations: this.generateInsights(profile)
      };

      return insights;
    } catch (error) {
      console.error('Error getting user insights:', error);
      return null;
    }
  }

  // Calculate activity level
  static calculateActivityLevel(activityPatterns) {
    const totalActions = activityPatterns.preferredActions.reduce((sum, action) => sum + action.count, 0);
    
    if (totalActions < 10) return 'low';
    if (totalActions < 50) return 'medium';
    return 'high';
  }

  // Generate insights
  static generateInsights(profile) {
    const insights = [];

    // Interest insights
    if (profile.interests.length > 0) {
      const topInterest = profile.interests[0];
      insights.push(`Bạn quan tâm nhiều nhất đến "${topInterest.interest}"`);
    }

    // Job type insights
    if (profile.preferences.jobTypes.length > 0) {
      const topJobType = profile.preferences.jobTypes[0];
      insights.push(`Bạn thường tìm kiếm việc làm ${topJobType.value}`);
    }

    // Location insights
    if (profile.preferences.locations.length > 0) {
      const topLocation = profile.preferences.locations[0];
      insights.push(`Bạn ưu tiên làm việc tại ${topLocation.value}`);
    }

    // Activity insights
    if (profile.activityPatterns.mostActiveHour) {
      const hour = profile.activityPatterns.mostActiveHour;
      insights.push(`Bạn thường hoạt động nhất vào lúc ${hour}h`);
    }

    return insights;
  }
}

module.exports = UserBehaviorService;

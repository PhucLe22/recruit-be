const Job = require('../app/models/Job');
const UserBehavior = require('../app/models/UserBehavior');
const MBTIAssessment = require('../app/models/MBTIAssessment');
const BigFiveAssessment = require('../app/models/BigFiveAssessment');
const DISCAssessment = require('../app/models/DISCAssessment');

class RecommendationEngine {
  // Get recommendations for a user
  static async getRecommendations(userId, options = {}) {
    try {
      const { limit = 10, exclude = [] } = options;
      
      // Get user behavior data
      const behaviors = await UserBehavior.find({ user_id: userId })
        .sort({ timestamp: -1 })
        .limit(50);

      // Get user assessment results
      const [mbtiResult, bigFiveResult, discResult] = await Promise.all([
        MBTIAssessment.findOne({ user_id: userId }).sort({ completed_at: -1 }),
        BigFiveAssessment.findOne({ user_id: userId }).sort({ completed_at: -1 }),
        DISCAssessment.findOne({ user_id: userId }).sort({ completed_at: -1 })
      ]);

      // Build user profile
      const userProfile = this.buildUserProfile(behaviors, mbtiResult, bigFiveResult, discResult);
      
      // Get personalized recommendations
      const recommendations = await this.getPersonalizedJobs(userProfile, {
        limit,
        exclude
      });

      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  // Get personalized recommendations
  static async getPersonalizedRecommendations(userId, behaviors, options = {}) {
    try {
      const { limit = 10, exclude = [] } = options;
      
      // Build user profile from behaviors
      const userProfile = this.buildUserProfileFromBehaviors(behaviors);
      
      // Get recommendations
      const recommendations = await this.getPersonalizedJobs(userProfile, {
        limit,
        exclude
      });

      return recommendations;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  // Get popular jobs (fallback)
  static async getPopularJobs(limit = 10) {
    try {
      const popularJobs = await Job.find({
        expiryTime: { $gte: new Date() }
      })
      .sort({ views: -1, createdAt: -1 })
      .limit(limit)
      .populate('businessId');

      return popularJobs.map(job => ({
        ...job.toObject(),
        recommendationScore: 85 + Math.floor(Math.random() * 15), // 85-100
        recommendationReasons: ['Phổ biến', 'Nhiều người xem'],
        recommendationType: 'popular'
      }));
    } catch (error) {
      console.error('Error getting popular jobs:', error);
      return [];
    }
  }

  // Build user profile
  static buildUserProfile(behaviors, mbtiResult, bigFiveResult, discResult) {
    const profile = {
      interests: {},
      preferences: {
        jobTypes: [],
        locations: [],
        industries: [],
        salaryRange: { min: null, max: null }
      },
      personality: {},
      skills: []
    };

    // Analyze behaviors for interests
    behaviors.forEach(behavior => {
      if (behavior.data && behavior.data.keywords) {
        behavior.data.keywords.forEach(keyword => {
          profile.interests[keyword] = (profile.interests[keyword] || 0) + 1;
        });
      }

      // Extract preferences from behavior data
      if (behavior.data) {
        if (behavior.data.jobType) {
          profile.preferences.jobTypes.push(behavior.data.jobType);
        }
        if (behavior.data.location) {
          profile.preferences.locations.push(behavior.data.location);
        }
        if (behavior.data.industry) {
          profile.preferences.industries.push(behavior.data.industry);
        }
      }
    });

    // Add personality insights
    if (mbtiResult) {
      profile.personality.mbti = {
        type: mbtiResult.type,
        traits: mbtiResult.traits || [],
        recommendations: mbtiResult.recommendations || []
      };
    }

    if (bigFiveResult) {
      profile.personality.bigFive = bigFiveResult.scores || {};
    }

    if (discResult) {
      profile.personality.disc = {
        primaryTrait: discResult.primaryTrait,
        scores: discResult.scores || {}
      };
    }

    return profile;
  }

  // Build user profile from behaviors only
  static buildUserProfileFromBehaviors(behaviors) {
    const profile = {
      interests: {},
      preferences: {
        jobTypes: [],
        locations: [],
        industries: []
      }
    };

    behaviors.forEach(behavior => {
      if (behavior.data && behavior.data.keywords) {
        behavior.data.keywords.forEach(keyword => {
          profile.interests[keyword] = (profile.interests[keyword] || 0) + 1;
        });
      }
    });

    return profile;
  }

  // Get personalized jobs based on profile
  static async getPersonalizedJobs(userProfile, options = {}) {
    try {
      const { limit = 10, exclude = [] } = options;
      
      let query = {
        expiryTime: { $gte: new Date() }
      };

      // Exclude specific jobs
      if (exclude.length > 0) {
        query._id = { $nin: exclude.map(id => mongoose.Types.ObjectId(id)) };
      }

      // Build search criteria based on user profile
      const searchCriteria = [];

      // Keywords from interests
      const topInterests = Object.entries(userProfile.interests)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([interest]) => interest);

      if (topInterests.length > 0) {
        searchCriteria.push({
          $or: [
            { title: { $in: topInterests.map(k => new RegExp(k, 'i')) } },
            { description: { $in: topInterests.map(k => new RegExp(k, 'i')) } },
            { requirements: { $in: topInterests.map(k => new RegExp(k, 'i')) } }
          ]
        });
      }

      // Job types preferences
      if (userProfile.preferences.jobTypes.length > 0) {
        searchCriteria.push({
          type: { $in: userProfile.preferences.jobTypes }
        });
      }

      // Location preferences
      if (userProfile.preferences.locations.length > 0) {
        searchCriteria.push({
          city: { $in: userProfile.preferences.locations }
        });
      }

      // Industry preferences
      if (userProfile.preferences.industries.length > 0) {
        searchCriteria.push({
          field: { $in: userProfile.preferences.industries }
        });
      }

      // Combine search criteria
      if (searchCriteria.length > 0) {
        query.$and = searchCriteria;
      }

      const jobs = await Job.find(query)
        .populate('businessId')
        .sort({ createdAt: -1 })
        .limit(limit * 2); // Get more to calculate scores

      // Calculate recommendation scores
      const scoredJobs = jobs.map(job => {
        const score = this.calculateRecommendationScore(job, userProfile);
        return {
          ...job.toObject(),
          recommendationScore: score,
          recommendationReasons: this.getRecommendationReasons(job, userProfile),
          recommendationType: 'personalized'
        };
      });

      // Sort by score and return top results
      return scoredJobs
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting personalized jobs:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  // Calculate recommendation score
  static calculateRecommendationScore(job, userProfile) {
    let score = 50; // Base score

    // Interest matching
    const jobText = `${job.title} ${job.description} ${job.requirements || ''}`.toLowerCase();
    
    Object.entries(userProfile.interests).forEach(([interest, weight]) => {
      if (jobText.includes(interest.toLowerCase())) {
        score += weight * 2;
      }
    });

    // Personality matching
    if (userProfile.personality.mbti && userProfile.personality.mbti.recommendations) {
      userProfile.personality.mbti.recommendations.forEach(rec => {
        if (jobText.includes(rec.toLowerCase())) {
          score += 10;
        }
      });
    }

    // Job type preference
    if (userProfile.preferences.jobTypes.includes(job.type)) {
      score += 15;
    }

    // Location preference
    if (userProfile.preferences.locations.includes(job.city)) {
      score += 10;
    }

    // Industry preference
    if (userProfile.preferences.industries.includes(job.field)) {
      score += 10;
    }

    // Recency bonus
    const daysSincePosted = Math.floor((new Date() - job.createdAt) / (1000 * 60 * 60 * 24));
    if (daysSincePosted <= 7) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  // Get recommendation reasons
  static getRecommendationReasons(job, userProfile) {
    const reasons = [];

    const jobText = `${job.title} ${job.description}`.toLowerCase();
    
    // Interest matching
    Object.entries(userProfile.interests).forEach(([interest]) => {
      if (jobText.includes(interest.toLowerCase())) {
        reasons.push(`Phù hợp với quan tâm "${interest}"`);
      }
    });

    // Job type preference
    if (userProfile.preferences.jobTypes.includes(job.type)) {
      reasons.push(`Phù hợp với loại hình ${job.type}`);
    }

    // Location preference
    if (userProfile.preferences.locations.includes(job.city)) {
      reasons.push(`Tại ${job.city}`);
    }

    // Recency
    const daysSincePosted = Math.floor((new Date() - job.createdAt) / (1000 * 60 * 60 * 24));
    if (daysSincePosted <= 3) {
      reasons.push('Việc làm mới');
    }

    return reasons.length > 0 ? reasons : ['Gợi ý cho bạn'];
  }

  // Fallback recommendations
  static async getFallbackRecommendations(limit = 10) {
    try {
      const jobs = await Job.find({
        expiryTime: { $gte: new Date() }
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('businessId');

      return jobs.map(job => ({
        ...job.toObject(),
        recommendationScore: 60 + Math.floor(Math.random() * 20), // 60-80
        recommendationReasons: ['Việc làm mới'],
        recommendationType: 'fallback'
      }));
    } catch (error) {
      console.error('Error getting fallback recommendations:', error);
      return [];
    }
  }
}

module.exports = RecommendationEngine;

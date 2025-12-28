const UserBehavior = require('../../../models/UserBehavior');
const Activity = require('../../../models/Activity');

class UserBehaviorController {
  // Track user behavior
  async trackBehavior(req, res) {
    try {
      const { userId } = req.user;
      const { action, data } = req.body;

      const behavior = new UserBehavior({
        user_id: userId,
        action,
        data,
        timestamp: new Date(),
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      await behavior.save();

      res.json({
        success: true,
        message: 'Behavior tracked successfully'
      });
    } catch (error) {
      console.error('Track behavior error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track behavior'
      });
    }
  }

  // Get user behavior data
  async getUserBehavior(req, res) {
    try {
      const { userId } = req.params;

      const behaviors = await UserBehavior.find({ user_id: userId })
        .sort({ timestamp: -1 })
        .limit(100);

      res.json({
        success: true,
        data: behaviors
      });
    } catch (error) {
      console.error('Get user behavior error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user behavior'
      });
    }
  }

  // Get user recommendations
  async getRecommendations(req, res) {
    try {
      const { userId } = req.params;

      // Get user behavior patterns
      const behaviors = await UserBehavior.find({ user_id: userId })
        .sort({ timestamp: -1 })
        .limit(50);

      // Analyze interests from behavior
      const interests = this.analyzeInterests(behaviors);

      // Get job recommendations based on interests
      const recommendations = await this.getJobRecommendations(interests);

      res.json({
        success: true,
        data: {
          interests,
          recommendations
        }
      });
    } catch (error) {
      console.error('Get recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recommendations'
      });
    }
  }

  // Update user preferences
  async updatePreferences(req, res) {
    try {
      const { userId } = req.user;
      const { preferences } = req.body;

      await UserBehavior.findOneAndUpdate(
        { user_id: userId, action: 'preferences' },
        {
          user_id: userId,
          action: 'preferences',
          data: preferences,
          timestamp: new Date()
        },
        { upsert: true }
      );

      res.json({
        success: true,
        message: 'Preferences updated successfully'
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update preferences'
      });
    }
  }

  // Get user analytics
  async getUserAnalytics(req, res) {
    try {
      const { userId } = req.params;

      const analytics = await Activity.aggregate([
        { $match: { user_id: userId } },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            latest: { $max: '$timestamp' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Get user analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user analytics'
      });
    }
  }

  // Helper methods
  analyzeInterests(behaviors) {
    const interests = {};
    
    behaviors.forEach(behavior => {
      if (behavior.data && behavior.data.keywords) {
        behavior.data.keywords.forEach(keyword => {
          interests[keyword] = (interests[keyword] || 0) + 1;
        });
      }
    });

    // Sort by frequency and return top interests
    return Object.entries(interests)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([interest, count]) => ({ interest, count }));
  }

  async getJobRecommendations(interests) {
    const Job = require('../../models/Job');
    
    if (interests.length === 0) {
      return await Job.find({ expiryTime: { $gte: new Date() } })
        .sort({ createdAt: -1 })
        .limit(10);
    }

    const interestKeywords = interests.map(i => i.interest);
    
    const jobs = await Job.find({
      $or: [
        { title: { $in: interestKeywords.map(k => new RegExp(k, 'i')) } },
        { description: { $in: interestKeywords.map(k => new RegExp(k, 'i')) } },
        { requirements: { $in: interestKeywords.map(k => new RegExp(k, 'i')) } }
      ],
      expiryTime: { $gte: new Date() }
    })
    .sort({ createdAt: -1 })
    .limit(10);

    return jobs;
  }
}

module.exports = new UserBehaviorController();

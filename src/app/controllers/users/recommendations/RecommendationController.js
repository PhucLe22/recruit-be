const Job = require('../../../models/Job');
const UserBehavior = require('../../../models/UserBehavior');
const RecommendationEngine = require('../../../../services/RecommendationEngine');

class RecommendationController {
  // Get job recommendations for user
  async getJobRecommendations(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 10 } = req.query;

      // Get recommendations from engine
      const recommendations = await RecommendationEngine.getRecommendations(userId, {
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Get job recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get job recommendations'
      });
    }
  }

  // Get personalized recommendations
  async getPersonalizedRecommendations(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 10, exclude = [] } = req.query;

      // Get user behavior data
      const behaviors = await UserBehavior.find({ user_id: userId })
        .sort({ timestamp: -1 })
        .limit(50);

      // Get personalized recommendations
      const recommendations = await RecommendationEngine.getPersonalizedRecommendations(
        userId,
        behaviors,
        {
          limit: parseInt(limit),
          exclude: Array.isArray(exclude) ? exclude : [exclude]
        }
      );

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Get personalized recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get personalized recommendations'
      });
    }
  }

  // Get popular jobs
  async getPopularJobs(req, res) {
    try {
      const { limit = 10, timeframe = '7d' } = req.query;

      const timeAgo = new Date();
      if (timeframe === '7d') {
        timeAgo.setDate(timeAgo.getDate() - 7);
      } else if (timeframe === '30d') {
        timeAgo.setDate(timeAgo.getDate() - 30);
      } else if (timeframe === '1d') {
        timeAgo.setDate(timeAgo.getDate() - 1);
      }

      const popularJobs = await Job.find({
        expiryTime: { $gte: new Date() },
        createdAt: { $gte: timeAgo }
      })
      .sort({ views: -1, applications: -1 })
      .limit(parseInt(limit));

      res.json({
        success: true,
        data: popularJobs
      });
    } catch (error) {
      console.error('Get popular jobs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get popular jobs'
      });
    }
  }

  // Get similar jobs
  async getSimilarJobs(req, res) {
    try {
      const { jobId } = req.params;
      const { limit = 5 } = req.query;

      // Get the reference job
      const referenceJob = await Job.findById(jobId);
      
      if (!referenceJob) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Find similar jobs based on title, field, and type
      const similarJobs = await Job.find({
        _id: { $ne: jobId },
        $or: [
          { title: { $regex: referenceJob.title.split(' ')[0], $options: 'i' } },
          { field: referenceJob.field },
          { type: referenceJob.type }
        ],
        expiryTime: { $gte: new Date() }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

      res.json({
        success: true,
        data: similarJobs
      });
    } catch (error) {
      console.error('Get similar jobs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get similar jobs'
      });
    }
  }

  // Update recommendation feedback
  async updateFeedback(req, res) {
    try {
      const { userId } = req.user;
      const { jobId, feedback, type } = req.body;

      // Save feedback for learning
      const feedbackData = {
        user_id: userId,
        job_id: jobId,
        feedback,
        type, // 'click', 'apply', 'save', 'dismiss'
        timestamp: new Date()
      };

      // TODO: Save to feedback collection
      // await Feedback.create(feedbackData);

      res.json({
        success: true,
        message: 'Feedback updated successfully'
      });
    } catch (error) {
      console.error('Update feedback error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update feedback'
      });
    }
  }

  // Get recommendation analytics
  async getRecommendationAnalytics(req, res) {
    try {
      const { userId } = req.params;

      // Get recommendation performance metrics
      const analytics = {
        total_recommendations: 0,
        click_rate: 0,
        apply_rate: 0,
        save_rate: 0,
        popular_categories: [],
        recommendation_trends: []
      };

      // TODO: Calculate actual analytics from feedback data

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Get recommendation analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recommendation analytics'
      });
    }
  }
}

module.exports = new RecommendationController();

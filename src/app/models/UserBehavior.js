const mongoose = require('mongoose');

const userBehaviorSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'job_view',
      'job_apply',
      'job_save',
      'job_unsave',
      'search',
      'profile_view',
      'login',
      'logout',
      'preferences',
      'click',
      'dismiss'
    ]
  },
  data: {
    keywords: [String],
    job_id: mongoose.Schema.Types.ObjectId,
    search_query: String,
    filters: Object,
    preferences: Object,
    metadata: Object
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ip_address: String,
  user_agent: String,
  session_id: String
}, {
  timestamps: true
});

// Indexes for performance
userBehaviorSchema.index({ user_id: 1, timestamp: -1 });
userBehaviorSchema.index({ action: 1, timestamp: -1 });
userBehaviorSchema.index({ 'data.job_id': 1 });
userBehaviorSchema.index({ 'data.keywords': 1 });

// Static methods
userBehaviorSchema.statics.getUserInterests = async function(userId, limit = 10) {
  const behaviors = await this.find({
    user_id: userId,
    'data.keywords': { $exists: true }
  })
  .sort({ timestamp: -1 })
  .limit(100);

  const interests = {};
  
  behaviors.forEach(behavior => {
    if (behavior.data.keywords) {
      behavior.data.keywords.forEach(keyword => {
        interests[keyword] = (interests[keyword] || 0) + 1;
      });
    }
  });

  return Object.entries(interests)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([interest, count]) => ({ interest, count }));
};

userBehaviorSchema.statics.getUserActivitySummary = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const summary = await this.aggregate([
    {
      $match: {
        user_id: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        latest: { $max: '$timestamp' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return summary;
};

userBehaviorSchema.statics.getPopularKeywords = async function(limit = 20) {
  const result = await this.aggregate([
    {
      $match: {
        'data.keywords': { $exists: true, $ne: [] },
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }
    },
    { $unwind: '$data.keywords' },
    {
      $group: {
        _id: '$data.keywords',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);

  return result.map(item => ({ keyword: item._id, count: item.count }));
};

userBehaviorSchema.statics.trackBehavior = async function(userId, action, data, req) {
  return await this.create({
    user_id: userId,
    action,
    data,
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
    session_id: req.sessionID
  });
};

const UserBehavior = mongoose.model('UserBehavior', userBehaviorSchema);

module.exports = UserBehavior;

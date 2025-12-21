const mongoose = require('mongoose');

const appliedJobsSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  job_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  business_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'interviewing', 'hired', 'rejected'],
    default: 'pending'
  },
  applied_at: {
    type: Date,
    default: Date.now
  },
  cv_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CV'
  },
  cover_letter: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  viewed_by_business: {
    type: Boolean,
    default: false
  },
  viewed_at: {
    type: Date,
    default: null
  },
  business_notes: {
    type: String,
    default: null
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
appliedJobsSchema.index({ user_id: 1, applied_at: -1 });
appliedJobsSchema.index({ job_id: 1 });
appliedJobsSchema.index({ business_id: 1 });
appliedJobsSchema.index({ status: 1 });

// Static methods
appliedJobsSchema.statics.getUserApplications = function(userId, options = {}) {
  const { page = 1, limit = 10, status = null } = options;
  
  let query = { user_id: userId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('job_id')
    .populate('business_id', 'companyName logo')
    .sort({ applied_at: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

appliedJobsSchema.statics.getBusinessApplications = function(businessId, options = {}) {
  const { page = 1, limit = 10, status = null } = options;
  
  let query = { business_id: businessId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('user_id', 'fullName email phone')
    .populate('job_id')
    .populate('cv_id')
    .sort({ applied_at: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

appliedJobsSchema.statics.getApplicationStats = function(userId) {
  return this.aggregate([
    { $match: { user_id: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

appliedJobsSchema.statics.getBusinessApplicationStats = function(businessId) {
  return this.aggregate([
    { $match: { business_id: mongoose.Types.ObjectId(businessId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Instance methods
appliedJobsSchema.methods.updateStatus = function(newStatus, notes = null) {
  this.status = newStatus;
  this.updated_at = new Date();
  
  if (notes) {
    this.business_notes = notes;
  }
  
  if (newStatus !== 'pending' && !this.viewed_by_business) {
    this.viewed_by_business = true;
    this.viewed_at = new Date();
  }
  
  return this.save();
};

appliedJobsSchema.methods.markAsViewed = function() {
  if (!this.viewed_by_business) {
    this.viewed_by_business = true;
    this.viewed_at = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Virtual for application age
appliedJobsSchema.virtual('daysSinceApplied').get(function() {
  return Math.floor((new Date() - this.applied_at) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
appliedJobsSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.updated_at = new Date();
  }
  next();
});

const AppliedJobs = mongoose.model('AppliedJobs', appliedJobsSchema);

module.exports = AppliedJobs;

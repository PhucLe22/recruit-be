const mongoose = require('mongoose');

const savedJobsSchema = new mongoose.Schema({
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
  saved_at: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  reminder_set: {
    type: Boolean,
    default: false
  },
  reminder_date: {
    type: Date,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for performance
savedJobsSchema.index({ user_id: 1, saved_at: -1 });
savedJobsSchema.index({ job_id: 1 });
savedJobsSchema.index({ business_id: 1 });
savedJobsSchema.index({ user_id: 1, job_id: 1 }, { unique: true }); // Prevent duplicates

// Static methods
savedJobsSchema.statics.getUserSavedJobs = function(userId, options = {}) {
  const { page = 1, limit = 10, tags = null } = options;
  
  let query = { user_id: userId, is_active: true };
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  return this.find(query)
    .populate('job_id')
    .populate('business_id', 'companyName logo')
    .sort({ saved_at: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

savedJobsSchema.statics.checkIfSaved = function(userId, jobId) {
  return this.findOne({
    user_id: userId,
    job_id: jobId,
    is_active: true
  });
};

savedJobsSchema.statics.getSavedJobsStats = function(userId) {
  return this.aggregate([
    { $match: { user_id: mongoose.Types.ObjectId(userId), is_active: true } },
    {
      $group: {
        _id: null,
        totalSaved: { $sum: 1 },
        withReminder: {
          $sum: {
            $cond: [{ $eq: ['$reminder_set', true] }, 1, 0]
          }
        },
        withNotes: {
          $sum: {
            $cond: [{ $ne: ['$notes', null] }, 1, 0]
          }
        },
        withTags: {
          $sum: {
            $cond: [{ $gt: [{ $size: '$tags' }, 0] }, 1, 0]
          }
        }
      }
    }
  ]);
};

savedJobsSchema.statics.getPopularTags = function(userId, limit = 10) {
  return this.aggregate([
    { $match: { user_id: mongoose.Types.ObjectId(userId), is_active: true } },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

savedJobsSchema.statics.getJobsWithReminders = function(userId, daysAhead = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return this.find({
    user_id: userId,
    reminder_set: true,
    reminder_date: { $lte: futureDate },
    is_active: true
  })
  .populate('job_id')
  .populate('business_id', 'companyName logo')
  .sort({ reminder_date: 1 });
};

// Instance methods
savedJobsSchema.methods.toggleSave = function() {
  this.is_active = !this.is_active;
  if (!this.is_active) {
    this.reminder_set = false;
    this.reminder_date = null;
  }
  return this.save();
};

savedJobsSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

savedJobsSchema.methods.removeTag = function(tag) {
  const index = this.tags.indexOf(tag);
  if (index > -1) {
    this.tags.splice(index, 1);
    return this.save();
  }
  return Promise.resolve(this);
};

savedJobsSchema.methods.setReminder = function(date) {
  this.reminder_set = true;
  this.reminder_date = date;
  return this.save();
};

savedJobsSchema.methods.removeReminder = function() {
  this.reminder_set = false;
  this.reminder_date = null;
  return this.save();
};

savedJobsSchema.methods.updateNotes = function(notes) {
  this.notes = notes;
  return this.save();
};

// Virtual for days since saved
savedJobsSchema.virtual('daysSinceSaved').get(function() {
  return Math.floor((new Date() - this.saved_at) / (1000 * 60 * 60 * 24));
});

// Virtual for reminder status
savedJobsSchema.virtual('isReminderDue').get(function() {
  if (!this.reminder_set || !this.reminder_date) {
    return false;
  }
  return new Date() >= this.reminder_date;
});

// Pre-save middleware
savedJobsSchema.pre('save', function(next) {
  // Clean up tags
  if (this.tags) {
    this.tags = this.tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);
  }
  next();
});

const SavedJobs = mongoose.model('SavedJobs', savedJobsSchema);

module.exports = SavedJobs;

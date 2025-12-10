const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const businessSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  website: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '500+']
  },
  foundedYear: {
    type: Number
  },
  logo: {
    type: String,
    default: null
  },
  logoPath: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null
    },
    features: [{
      type: String
    }]
  },
  jobPostings: {
    total: {
      type: Number,
      default: 0
    },
    active: {
      type: Number,
      default: 0
    },
    limit: {
      type: Number,
      default: 5 // Free plan limit
    }
  }
}, {
  timestamps: true
});

// Indexes
businessSchema.index({ email: 1 });
businessSchema.index({ companyName: 1 });
businessSchema.index({ 'address.city': 1 });
businessSchema.index({ industry: 1 });

// Hash password before saving
businessSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
businessSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update job posting stats
businessSchema.methods.updateJobStats = async function() {
  const Job = require('./Job');
  
  const stats = await Job.aggregate([
    { $match: { businessId: this._id } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: {
            $cond: [
              { $gte: ['$expiryTime', new Date()] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  if (stats.length > 0) {
    this.jobPostings.total = stats[0].total;
    this.jobPostings.active = stats[0].active;
  } else {
    this.jobPostings.total = 0;
    this.jobPostings.active = 0;
  }

  return await this.save();
};

// Check if can post more jobs
businessSchema.methods.canPostJob = function() {
  return this.jobPostings.active < this.jobPostings.limit;
};

// Static methods
businessSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

businessSchema.statics.findByCompanyName = function(companyName) {
  return this.findOne({ companyName: new RegExp(companyName, 'i') });
};

businessSchema.statics.getVerifiedBusinesses = function() {
  return this.find({ isVerified: true, isActive: true });
};

businessSchema.statics.getBusinessesByCity = function(city) {
  return this.find({ 'address.city': city, isActive: true });
};

// Virtual for full address
businessSchema.virtual('fullAddress').get(function() {
  const parts = [];
  if (this.address.street) parts.push(this.address.street);
  if (this.address.city) parts.push(this.address.city);
  if (this.address.state) parts.push(this.address.state);
  if (this.address.zipCode) parts.push(this.address.zipCode);
  if (this.address.country) parts.push(this.address.country);
  
  return parts.join(', ');
});

// Virtual for subscription status
businessSchema.virtual('isSubscriptionActive').get(function() {
  if (!this.subscription.endDate) return true; // No expiry means active
  
  return new Date() <= this.subscription.endDate;
});

// Transform method to remove sensitive data
businessSchema.methods.toJSON = function() {
  const business = this.toObject();
  delete business.password;
  delete business.verificationToken;
  delete business.resetPasswordToken;
  delete business.resetPasswordExpires;
  return business;
};

const Business = mongoose.model('Business', businessSchema);

module.exports = Business;

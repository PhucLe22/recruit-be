const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BigFiveAssessmentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    scores: {
      openness: { type: Number, min: 0, max: 100 },
      conscientiousness: { type: Number, min: 0, max: 100 },
      extraversion: { type: Number, min: 0, max: 100 },
      agreeableness: { type: Number, min: 0, max: 100 },
      neuroticism: { type: Number, min: 0, max: 100 }
    },
    dominantTrait: {
      type: String,
      enum: ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']
    },
    answers: [Number],
    description: String,
    strengths: [String],
    weaknesses: [String],
    careers: [String],
    quote: String,
    analysis: String,
    completedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
BigFiveAssessmentSchema.index({ userId: 1, completedAt: -1 });

module.exports = mongoose.model('BigFiveAssessment', BigFiveAssessmentSchema);

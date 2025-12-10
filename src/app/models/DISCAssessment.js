const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DISCAssessmentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    primaryTrait: {
      type: String,
      enum: ['D', 'I', 'S', 'C'],
      required: true
    },
    scores: {
      D: { type: Number, min: 0, max: 100 },
      I: { type: Number, min: 0, max: 100 },
      S: { type: Number, min: 0, max: 100 },
      C: { type: Number, min: 0, max: 100 }
    },
    answers: [String],
    description: String,
    strengths: [String],
    weaknesses: [String],
    careers: [String],
    quote: String,
    workStyle: String,
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
DISCAssessmentSchema.index({ userId: 1, completedAt: -1 });

module.exports = mongoose.model('DISCAssessment', DISCAssessmentSchema);

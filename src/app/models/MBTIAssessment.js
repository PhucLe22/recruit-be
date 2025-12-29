const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MBTIAssessmentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 
             'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'],
      required: true
    },
    scores: {
      E: { type: Number, min: 0, max: 10 },
      I: { type: Number, min: 0, max: 10 },
      S: { type: Number, min: 0, max: 10 },
      N: { type: Number, min: 0, max: 10 },
      T: { type: Number, min: 0, max: 10 },
      F: { type: Number, min: 0, max: 10 },
      J: { type: Number, min: 0, max: 10 },
      P: { type: Number, min: 0, max: 10 }
    },
    answers: [String],
    description: String,
    strengths: [String],
    weaknesses: [String],
    careers: [String],
    quote: String,
    workStyle: String,
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
MBTIAssessmentSchema.index({ userId: 1, completedAt: -1 });

module.exports = mongoose.model('MBTIAssessment', MBTIAssessmentSchema);

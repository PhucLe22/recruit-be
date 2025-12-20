// /Users/mac/Documents/ExpressJS/TieuLuanCNTT/cv-server/blog/src/app/models/CV.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const cvSchema = new Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        username: {
            type: String,
            required: [true, 'Username is required'],
            trim: true,
            index: true
        },
        saved: {
            type: Boolean,
            default: false,
        },
        inserted_id: {
            type: String,
            default: null,
        },
        message: {
            type: String,
            default: '',
        },
        processed_text: {
            type: String,
            default: '',
        },
        parsed_output: {
            type: mongoose.Schema.Types.Mixed,
            default: {
                technical_skills: [],
                job_titles: [],
                industries: [],
                personal_info: {},
                education: [],
                work_experience: [],
                skills: {
                    technical: [],
                    soft: [],
                    languages: [],
                },
                certifications: [],
                projects: [],
                summary: '',
            },
        },
        uploaded_at: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    },
);

// Create index on username for better query performance
cvSchema.index(
    { username: 1 }, 
    { 
        unique: true,
        name: 'username_index',
        background: true
    }
);

// Add a static method to find CV by username
cvSchema.statics.findByUsername = function(username) {
    return this.findOne({ username: username });
};

// Add a static method to find or create CV by username
cvSchema.statics.findOrCreate = async function(username) {
    const cv = await this.findOne({ username: username });
    if (cv) return cv;
    
    return this.create({
        username: username,
        saved: false
    });
};

const CV = mongoose.model('CV', cvSchema);

module.exports = CV;

const mongoose = require('mongoose');
const slugify = require('slugify');
const Schema = mongoose.Schema;

const JobField = new Schema(
    {
        name: { type: String, required: true },
        slug: { type: String, unique: true },
        icon: { type: String, default: 'fa-briefcase' },
        jobCount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        collection: 'jobfields' // Explicitly set the collection name
    },
);
JobField.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

module.exports = mongoose.model('JobField', JobField);

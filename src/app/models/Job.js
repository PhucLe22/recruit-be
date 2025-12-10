const mongoose = require('mongoose');
const slugify = require('slugify');
const Schema = mongoose.Schema;
const { createEmbedding } = require('../../util/createEmbedding');
const { v4: uuidv4 } = require('uuid');

const Job = new Schema(
    {
        title: { type: String, required: true },
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Business',
            required: true,
        },
        companyName: { type: String, required: true },
        email: { type: String, required: true },
        experience: { type: String, default: 'no required' },
        type: { type: String, required: true },
        field: { type: String, required: true },
        description: { type: String },
        degree: { type: String },
        workTime: { type: String, required: true },
        technique: { type: String, required: true },
        logoPath: { type: String, required: true },
        embedding: {
            type: [Number],
            default: [],
        },
        status: {
            type: String,
            enum: ['urgent', 'active', 'closed'],
            default: 'active',
        },
        city: { type: String, required: true },
        location: { type: String, required: true },
        salary: { type: String, required: true },
        contact: { type: String },
        expiryTime: { type: Date, required: true },
        slug: { type: String, unique: true },
        unique_id: { type: String, unique: true },
    },
    {
        timestamps: true,
    },
);

// Hook tạo slug + embedding
Job.pre('save', async function (next) {
    try {
        if (this.isModified('title') || this.isModified('companyName')) {
            const combined = `${this.companyName} ${this.title}`;
            const timestamp = Date.now().toString(36);
            this.slug = slugify(combined, { lower: true, strict: true }) + '-' + timestamp;
        }

        if (this.isModified('title') || this.isModified('description')) {
            const combinedText = `${this.title} ${this.description || ''}`;
            this.embedding = await createEmbedding(combinedText);
        }

        this.unique_id = uuidv4();
        next();
    } catch (err) {
        console.error('Error in Job.pre("save"):', err);
        next(err);
    }
});
// Tự động chuyển status = 'closed' nếu expiryTime đã hết hạn
Job.pre('save', function (next) {
    if (this.expiryTime && this.expiryTime < new Date()) {
        this.status = 'closed';
    }
    next();
});

// Trường hợp update qua findOneAndUpdate hoặc updateOne
Job.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();

    // Lấy expiryTime từ update hoặc từ DB
    if (update.expiryTime) {
        const expiryDate = new Date(update.expiryTime);
        if (expiryDate < new Date()) {
            update.status = 'closed';
        }
    }
    next();
});

module.exports = mongoose.model('Job', Job);

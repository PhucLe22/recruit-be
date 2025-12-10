const mongoose = require('mongoose');
const { defaultMaxListeners } = require('nodemailer/lib/xoauth2');
const slugify = require('slugify');
const Schema = mongoose.Schema;

const User = new Schema(
    {
        username: {
            type: String,
            minLength: 1,
            maxLength: 255,
            required: true,
        },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },

        // Từ Step 2
        avatar: { type: String }, // ảnh đại diện
        birthday: { type: Date },
        phone: { type: String },
        gender: { type: String },

        // Từ Step 3
        level: { type: String }, // Intern, Fresher, Junior...
        degree: { type: String }, // High School, Bachelor...
        experience: { type: String }, // 0-1 year...

        // Từ Step 4
        major: { type: String },

        // Mặc định
        role: { type: Number, default: 1 },
        cvPath: { type: String },
        slug: { type: String, unique: true },
        status: { type: String, default: 'active' },
    },
    {
        timestamps: true,
    },
);

//Tạo slug tự động từ username
User.pre('save', function (next) {
    if (this.isModified('username')) {
        this.slug = slugify(this.username, { lower: true, strict: true });
    }
    next();
});

module.exports = mongoose.model('User', User);

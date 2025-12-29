const User = require('../../models/User');
const MBTIAssessment = require('../../models/MBTIAssessment');
const BigFiveAssessment = require('../../models/BigFiveAssessment');
const DISCAssessment = require('../../models/DISCAssessment');

class ProfileController {
    // [GET] /profile/:userId
    async showProfile(req, res, next) {
        try {
            // If the route is /me, use the logged-in user's ID
            // Otherwise, use the userId from the URL parameter
            const userId = req.user._id;
                
            if (!userId) {
                req.flash('error', 'User ID is required');
                return res.redirect('/');
            }
            
            // Get user information
            const user = await User.findById(userId)
                .select('-password -__v')
                .lean();

            if (!user) {
                req.flash('error', 'Không tìm thấy người dùng');
                return res.redirect('/');
            }

            // Get latest assessment results
            const [mbtiResult, bigFiveResult, discResult] = await Promise.all([
                MBTIAssessment.findOne({ userId })
                    .sort({ createdAt: -1 })
                    .lean(),
                BigFiveAssessment.findOne({ userId })
                    .sort({ createdAt: -1 })
                    .lean(),
                DISCAssessment.findOne({ userId })
                    .sort({ createdAt: -1 })
                    .lean()
            ]);

            // Format user data for the view
            const userData = {
                ...user,
                profileComplete: this.calculateProfileCompleteness(user),
                assessmentResults: {
                    mbti: mbtiResult ? this.formatMBTIResult(mbtiResult) : null,
                    bigFive: bigFiveResult ? this.formatBigFiveResult(bigFiveResult) : null,
                    disc: discResult ? this.formatDISResult(discResult) : null
                },
                hasAssessments: !!(mbtiResult || bigFiveResult || discResult)
            };

            res.render('users/profile', {
                title: 'Hồ sơ cá nhân',
                user: userData,
                isOwnProfile: req.user && req.user._id.toString() === userId,
                currentUser: req.user || null
            });

        } catch (error) {
            console.error('Error loading profile:', error);
            req.flash('error', 'Đã xảy ra lỗi khi tải hồ sơ');
            res.redirect('/');
        }
    }

    // Calculate profile completeness percentage
    calculateProfileCompleteness(user) {
        const requiredFields = [
            'username', 'email', 'phone', 'gender', 
            'birthday', 'level', 'degree', 'experience', 'major'
        ];
        
        const completedFields = requiredFields.filter(field => {
            const value = user[field];
            return value !== undefined && value !== null && value !== '';
        });

        return Math.round((completedFields.length / requiredFields.length) * 100);
    }

    // Format MBTI result for display
    formatMBTIResult(result) {
        return {
            type: result.type,
            scores: result.scores,
            description: result.description,
            strengths: result.strengths,
            weaknesses: result.weaknesses,
            careers: result.careers,
            lastUpdated: result.completedAt
        };
    }

    // Format Big Five result for display
    formatBigFiveResult(result) {
        return {
            scores: result.scores,
            dominantTrait: result.dominantTrait,
            description: result.description,
            strengths: result.strengths,
            weaknesses: result.weaknesses,
            careers: result.careers,
            lastUpdated: result.completedAt
        };
    }

    // Format DISC result for display
    formatDISResult(result) {
        return {
            type: result.primaryTrait,
            scores: result.scores,
            description: result.description,
            strengths: result.strengths,
            weaknesses: result.weaknesses,
            careers: result.careers,
            lastUpdated: result.completedAt
        };
    }

    // [GET] /profile/:userId/edit
    showEditProfile(req, res) {
        res.render('users/edit-profile', {
            title: 'Chỉnh sửa hồ sơ',
            user: req.user
        });
    }

    // [PUT] /profile/:userId
    async updateProfile(req, res) {
        try {
            const { userId } = req.params;
            const updateData = req.body;

            // Handle file upload if avatar is being updated
            if (req.file) {
                updateData.avatar = `/uploads/avatars/${req.file.filename}`;
            }

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('-password -__v');

            // Update session if user is updating their own profile
            if (req.user && req.user._id.toString() === userId) {
                req.session.user = {
                    ...req.session.user,
                    ...updateData,
                    avatar: updateData.avatar || req.session.user.avatar
                };
            }

            req.flash('success', 'Cập nhật hồ sơ thành công');
            res.redirect(`/profile/${userId}`);

        } catch (error) {
            console.error('Error updating profile:', error);
            req.flash('error', 'Có lỗi xảy ra khi cập nhật hồ sơ');
            res.redirect('back');
        }
    }
}

module.exports = new ProfileController();
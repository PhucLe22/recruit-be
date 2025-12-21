


const fs = require('fs');
const User = require('../../models/User');
const MBTIAssessment = require('../../models/MBTIAssessment');
const BigFiveAssessment = require('../../models/BigFiveAssessment');
const DISCAssessment = require('../../models/DISCAssessment');
const CV = require('../../models/CV');

class UserController{
    // PUT /user/profile
    async updateProfile(req, res) {
        try {
        const userId = req.session.user._id;
        const { username, email, phone, gender, degree, experience } = req.body;

        await User.findByIdAndUpdate(userId, {
            username,
            email,
            phone,
            gender,
            degree,
            experience
        });

        // Update session
        const updatedUser = await User.findById(userId);
        req.session.user = updatedUser;

        req.flash('success', 'Cập nhật hồ sơ thành công');
        res.redirect('/users/profile');
        } catch (error) {
        console.error('Update profile error:', error);
        req.flash('error', 'Cập nhật hồ sơ thất bại');
        res.redirect('/users/profile');
        }
    }

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

            // Get latest assessment results and CV data
            const [mbtiResult, bigFiveResult, discResult, cvData] = await Promise.all([
                MBTIAssessment.findOne({ userId })
                    .sort({ createdAt: -1 })
                    .lean(),
                BigFiveAssessment.findOne({ userId })
                    .sort({ createdAt: -1 })
                    .lean(),
                DISCAssessment.findOne({ userId })
                    .sort({ createdAt: -1 })
                    .lean(),
                require('../../models/CV').findOne({ user_id: userId })
                    .sort({ uploaded_at: -1 })
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
                hasAssessments: !!(mbtiResult || bigFiveResult || discResult),
                cvData: cvData ? {
                    hasCV: true,
                    uploadedAt: cvData.uploaded_at,
                    filename: cvData.filename || 'CV Document',
                    message: cvData.message
                } : {
                    hasCV: false
                }
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
            type: result.personalityType,
            scores: result.scores,
            description: result.analysis,
            lastUpdated: result.updatedAt || result.createdAt
        };
    }

    // Format Big Five result for display
    formatBigFiveResult(result) {
        return {
            scores: result.scores,
            description: result.analysis,
            lastUpdated: result.updatedAt || result.createdAt
        };
    }

    // Format DISC result for display
    formatDISResult(result) {
        return {
            type: result.dominantTrait,
            scores: result.scores,
            description: result.analysis,
            lastUpdated: result.updatedAt || result.createdAt
        };
    }

    // [GET] /profile/:userId/edit
    showEditProfile(req, res) {
        res.render('users/edit-profile', {
            title: 'Chỉnh sửa hồ sơ',
            user: req.user
        });
    }

    // [POST] /users/profile
    async updateProfile(req, res) {
        try {
            const userId = req.session.user._id; // Get userId from session
            const updateData = req.body;
            
            console.log('=== DEBUG: Profile Update ===');
            console.log('User ID:', userId);
            console.log('Update Data:', updateData);
            console.log('Has file:', !!req.file);

            // Handle file upload if avatar is being updated
            if (req.file) {
                updateData.avatar = `/uploads/avatars/${req.file.filename}`;
                console.log('Avatar updated:', updateData.avatar);
            }

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('-password -__v');

            console.log('Updated User:', updatedUser);

            // Update session if user is updating their own profile
            if (req.user && req.user._id.toString() === userId) {
                req.session.user = {
                    ...req.session.user,
                    ...updateData,
                    avatar: updateData.avatar || req.session.user.avatar
                };
            }

            req.flash('success', 'Cập nhật hồ sơ thành công');
            res.redirect('/users/profile');

        } catch (error) {
            console.error('Error updating profile:', error);
            req.flash('error', 'Có lỗi xảy ra khi cập nhật hồ sơ');
            res.redirect('back');
        }
    }

    // [POST] /users/upload-avatar
    async uploadAvatar(req, res) {
        try {
            // Check if user is authenticated
            if (!req.session.user || !req.session.user._id) {
                return res.status(401).json({
                    success: false,
                    message: 'Bạn cần đăng nhập để thực hiện thao tác này'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng chọn file ảnh'
                });
            }

            // Additional file validation
            const file = req.file;
            const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            
            if (!allowedMimes.includes(file.mimetype)) {
                // Delete the uploaded file if it's not a valid image
                const fs = require('fs');
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'
                });
            }

            // Check file size (additional validation)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                const fs = require('fs');
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                
                return res.status(400).json({
                    success: false,
                    message: 'File ảnh không được vượt quá 5MB'
                });
            }

            const userId = req.session.user._id;
            const avatarPath = `/uploads/avatars/${file.filename}`;

            try {
                // Get old avatar to delete it later
                const oldUser = await User.findById(userId).select('avatar');
                
                // Update user's avatar in database
                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { $set: { avatar: avatarPath } },
                    { new: true, runValidators: true }
                ).select('-password -__v');

                // Delete old avatar file if it exists and is not the default
                if (oldUser && oldUser.avatar && 
                    !oldUser.avatar.includes('default-avatar') && 
                    fs.existsSync(`public${oldUser.avatar}`)) {
                    fs.unlinkSync(`public${oldUser.avatar}`);
                }

                // Update session
                req.session.user = {
                    ...req.session.user,
                    avatar: avatarPath
                };

                // Also update req.user for the current request
                req.user.avatar = avatarPath;

                res.json({
                    success: true,
                    message: 'Cập nhật avatar thành công',
                    avatar: avatarPath
                });

            } catch (dbError) {
                // If database update fails, delete the uploaded file
                console.error('Database error during avatar upload:', dbError);
                const fs = require('fs');
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                
                throw dbError;
            }

        } catch (error) {
            console.error('Error uploading avatar:', error);
            
            // Handle multer errors specifically
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File ảnh không được vượt quá 5MB'
                });
            }
            
            if (error.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ được tải lên một file ảnh'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật avatar. Vui lòng thử lại.'
            });
        }
    }
    async viewCV(req, res, next) {
        try {
            const user = req.user
            if (!user) {
                return res.redirect('/login')
            }
            const cv = await CV.findOne({username: user.username})
            // return res.json(cv);
            return res.render('users/cv-review', {
                title: 'Xem CV',
                cv: cv
            }) 
        } catch (error) {
            next(error)
        }
    }
}

module.exports = UserController;



const fs = require('fs');
const User = require('../../models/User');
const MBTIAssessment = require('../../models/MBTIAssessment');
const BigFiveAssessment = require('../../models/BigFiveAssessment');
const DISCAssessment = require('../../models/DISCAssessment');
const CV = require('../../models/CV');

class UserController{

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

    // Format date to Vietnamese locale
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const options = { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh'
        };
        return d.toLocaleString('vi-VN', options);
    }

    // Format MBTI result for display
    formatMBTIResult(result) {
        if (!result) return null;
        return {
            type: result.personalityType,
            scores: result.scores,
            description: result.analysis,
            lastUpdated: this.formatDate(result.updatedAt || result.createdAt),
            rawDate: result.updatedAt || result.createdAt
        };
    }

    // Format Big Five result for display
    formatBigFiveResult(result) {
        if (!result) return null;
        return {
            scores: result.scores,
            description: result.analysis,
            lastUpdated: this.formatDate(result.updatedAt || result.createdAt),
            rawDate: result.updatedAt || result.createdAt
        };
    }

    // Format DISC result for display
    formatDISResult(result) {
        if (!result) return null;
        return {
            type: result.dominantTrait,
            scores: result.scores,
            description: result.analysis,
            lastUpdated: this.formatDate(result.updatedAt || result.createdAt),
            rawDate: result.updatedAt || result.createdAt
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
            if (req.user && req.user._id === userId) {
                req.session.user = {
                    ...req.session.user,
                    ...updateData,
                    avatar: updateData.avatar || req.session.user.avatar
                };
            }
            if (updatedUser.birthday) {
                updatedUser.birthday = new Date(updatedUser.birthday)
                    .toISOString()
                    .split('T')[0]; // YYYY-MM-DD
            }
            // Check if this is an AJAX request
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: 'Cập nhật hồ sơ thành công',
                    user: updatedUser
                });
            }

            req.flash('success', 'Cập nhật hồ sơ thành công');
            res.redirect('/users/profile');

        } catch (error) {
            console.error('Error updating profile:', error);
            
            // Check if this is an AJAX request
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Có lỗi xảy ra khi cập nhật hồ sơ'
                });
            }
            
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
    // View CV in browser
    async viewCV(req, res, next) {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const CV = require('../../../models/CV');
            const User = require('../../../models/User');
            
            let userId = req.params.userId || (req.user && req.user._id);
            
            if (!userId) {
                req.flash('error', 'Vui lòng đăng nhập để xem CV');
                return res.redirect('/login');
            }

            // If we're coming from a redirect with 'back' as userId, redirect to profile
            if (userId === 'back') {
                return res.redirect('/profile');
            }

            console.log(`Attempting to find CV for user: ${userId}`);
            
            // First try to find CV in CV collection
            let cvData = await CV.findOne({ user_id: userId });
            
            // If no CV found in CV collection, check user's cvPath
            if (!cvData || !cvData.file_path) {
                console.log('No CV found in CV collection, checking user.cvPath');
                const user = await User.findById(userId);
                
                if (!user) {
                    console.log('User not found');
                    req.flash('error', 'Người dùng không tồn tại');
                    return res.redirect('/profile');
                }
                
                if (!user.cvPath) {
                    console.log('No CV path found for user');
                    req.flash('error', 'Không tìm thấy CV. Vui lòng tải lên CV của bạn.');
                    return res.redirect('/profile');
                }
                
                // Create a CV record if it doesn't exist
                console.log('Creating new CV record from user.cvPath');
                cvData = await CV.create({
                    user_id: userId,
                    file_path: user.cvPath,
                    filename: path.basename(user.cvPath),
                    uploaded_at: new Date()
                });
            }

            // Handle different path formats
            let filePath;
            if (cvData.file_path.startsWith('http') || cvData.file_path.startsWith('/')) {
                // If it's a full URL or absolute path, use as is
                filePath = cvData.file_path.startsWith('/') 
                    ? path.join(__dirname, '../../../public', cvData.file_path)
                    : cvData.file_path;
            } else {
                // Otherwise, assume it's relative to public/uploads
                filePath = path.join(__dirname, '../../../public/uploads', cvData.file_path);
            }
            
            console.log(`Looking for CV file at: ${filePath}`);
            
            try {
                // If it's a URL, redirect to it
                if (filePath.startsWith('http')) {
                    console.log(`Redirecting to external CV URL: ${filePath}`);
                    return res.redirect(filePath);
                }
                
                // Check if file exists and is accessible
                await fs.access(filePath);
                const stats = await fs.stat(filePath);
                
                if (!stats.isFile()) {
                    throw new Error('Đường dẫn CV không hợp lệ');
                }

                console.log(`Serving CV file: ${filePath}`);
                
                // Set the appropriate content type for PDF
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${cvData.filename || 'CV.pdf'}"`);
                
                // Stream the file to the response
                const fileStream = require('fs').createReadStream(filePath);
                
                fileStream.on('error', (error) => {
                    console.error('Error streaming CV file:', error);
                    if (!res.headersSent) {
                        req.flash('error', 'Lỗi khi đọc tệp CV');
                        res.redirect('/profile');
                    }
                });
                
                fileStream.pipe(res);
                
            } catch (error) {
                console.error('Error accessing CV file:', error);
                
                // If file doesn't exist, try alternative locations
                if (error.code === 'ENOENT') {
                    console.log(`CV file not found at primary location: ${filePath}`);
                    
                    // Try alternative locations
                    const possiblePaths = [
                        path.join(__dirname, '../../../public', cvData.file_path),
                        path.join(__dirname, '../../../public/uploads', cvData.filename),
                        path.join(__dirname, '../../../public/uploads', path.basename(cvData.file_path)),
                        path.join(__dirname, '../../../public', 'ai-uploads', path.basename(cvData.file_path)),
                        path.join(__dirname, '../../../public', 'ai-uploads', cvData.filename)
                    ];
                    
                    let found = false;
                    
                    for (const altPath of possiblePaths) {
                        try {
                            await fs.access(altPath);
                            const stats = await fs.stat(altPath);
                            
                            if (stats.isFile()) {
                                console.log(`Found CV at alternative location: ${altPath}`);
                                
                                // Update the CV record with the correct path
                                await CV.updateOne(
                                    { _id: cvData._id },
                                    { 
                                        $set: { 
                                            file_path: altPath.replace(/^.*?public\//, '/'),
                                            filename: path.basename(altPath)
                                        } 
                                    }
                                );
                                
                                // Stream the file
                                res.setHeader('Content-Type', 'application/pdf');
                                res.setHeader('Content-Disposition', `inline; filename="${path.basename(altPath) || 'CV.pdf'}"`);
                                require('fs').createReadStream(altPath).pipe(res);
                                
                                found = true;
                                break;
                            }
                        } catch (e) {
                            // Ignore and try next path
                            console.log(`Not found at alternative location: ${altPath}`);
                        }
                    }
                    
                    if (!found) {
                        console.log(`CV file not found in any location, removing CV record: ${cvData._id}`);
                        await CV.deleteOne({ _id: cvData._id });
                        req.flash('error', 'Không tìm thấy tệp CV. Vui lòng tải lên lại CV của bạn.');
                        return res.redirect('/profile');
                    }
                } else {
                    req.flash('error', `Lỗi khi tải CV: ${error.message}`);
                    return res.redirect('/profile');
                }
            }
            
        } catch (error) {
            console.error('Error in viewCV:', error);
            req.flash('error', `Đã xảy ra lỗi: ${error.message}`);
            res.redirect('/profile');
        }
    }

    // Download CV
    async downloadCV(req, res, next) {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const CV = require('../../../models/CV');
            
            let userId = req.params.userId || (req.user && req.user._id);
            
            if (!userId) {
                req.flash('error', 'Vui lòng đăng nhập để tải CV');
                return res.redirect('/login');
            }

            console.log(`Attempting to download CV for user: ${userId}`);
            
            // First try to find CV in CV collection
            let cvData = await CV.findOne({ user_id: userId });
            
            // If no CV found in CV collection, check user's cvPath
            if (!cvData || !cvData.file_path) {
                console.log('No CV found in CV collection, checking user.cvPath');
                const user = await User.findById(userId);
                
                if (!user || !user.cvPath) {
                    console.log('No CV path found for user');
                    req.flash('error', 'Không tìm thấy CV. Vui lòng tải lên CV của bạn.');
                    return res.redirect('/profile');
                }
                
                // Create a CV record if it doesn't exist
                console.log('Creating new CV record from user.cvPath');
                cvData = await CV.create({
                    user_id: userId,
                    file_path: user.cvPath,
                    filename: path.basename(user.cvPath),
                    uploaded_at: new Date()
                });
            }

            // Construct the file path
            const filePath = path.join(__dirname, '../../../public', cvData.file_path);
            console.log(`Looking for CV file at: ${filePath}`);
            
            try {
                // Check if file exists and is accessible
                await fs.access(filePath);
                const stats = await fs.stat(filePath);
                
                if (!stats.isFile()) {
                    throw new Error('Đường dẫn CV không hợp lệ');
                }
                
                console.log(`Downloading CV file: ${filePath}`);
                
                // Set the appropriate content type for PDF download
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${cvData.filename || 'CV.pdf'}"`);

                // Stream the file to the response for download
                const fileStream = require('fs').createReadStream(filePath);
                
                fileStream.on('error', (error) => {
                    console.error('Error streaming CV file for download:', error);
                    if (!res.headersSent) {
                        req.flash('error', 'Lỗi khi đọc tệp CV để tải xuống');
                        res.redirect('/profile');
                    }
                });
                
                fileStream.pipe(res);
                
            } catch (error) {
                console.error('Error accessing CV file for download:', error);
                // If file doesn't exist, remove the CV record
                if (error.code === 'ENOENT') {
                    console.log(`CV file not found for download, removing CV record: ${cvData._id}`);
                    await CV.deleteOne({ _id: cvData._id });
                    req.flash('error', 'Tệp CV không tồn tại. Vui lòng tải lên lại CV của bạn.');
                } else {
                    req.flash('error', `Lỗi khi tải xuống CV: ${error.message}`);
                }
                return res.redirect('/profile');
            }
        } catch (error) {
            console.error('Error in downloadCV:', error);
            req.flash('error', `Đã xảy ra lỗi: ${error.message}`);
            res.redirect('/profile');
        }
    }
}

module.exports = UserController;
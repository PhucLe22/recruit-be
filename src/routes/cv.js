const express = require('express');
const router = express.Router();
const { upload, cleanupFile } = require('../config/multer');
const { verifyToken } = require('../middlewares/verifyToken');
const cvUploadController = require('../app/controllers/job/CVUploadController');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');

// Error handling middleware for file uploads
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        return res.status(400).json({
            success: false,
            message: err.code === 'LIMIT_FILE_SIZE' 
                ? 'Kích thước file quá lớn. Tối đa 5MB được phép.'
                : 'Có lỗi xảy ra khi tải lên file.'
        });
    } else if (err) {
        // Handle other errors
        return res.status(400).json({
            success: false,
            message: err.message || 'Có lỗi xảy ra khi xử lý file.'
        });
    }
    next();
};

router.get('/', (req, res) => {
    res.json({ message: 'CV Upload API is running' });
});

router.get('/uploadCV-page', verifyToken, (req, res) => {
    res.render('users/uploadCv', {
        success: false,
        message: '',
        user: req.account?.username || '',
        resumeData: req.session.resumeData || {}, // lấy từ session
    });
});
router.post(
    '/upload',
    verifyToken,
    upload.single('file'),
    cvUploadController.upload,
);

router.get(
    '/jobs/suggestions/:username',
    verifyToken,
    cvUploadController.getJobSuggestions,
);

// CV Assistant Upload Endpoint
router.post('/assistant-upload', 
    verifyToken, 
    (req, res, next) => {
        // Single file upload with error handling
        upload.single('resume')(req, res, (err) => {
            if (err) {
                return handleUploadError(err, req, res, next);
            }
            next();
        });
    },
    async (req, res, next) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn file CV để tải lên.'
            });
        }

        const tempFilePath = req.file.path;
        
        try {
            console.log('📥 File upload received:', {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: tempFilePath
            });

            // Validate user session
            if (!req.account?.id) {
                throw new Error('Vui lòng đăng nhập để tải lên CV');
            }

            const { id: userId, username } = req.account;

            console.log('📝 Processing CV upload for:', {
                userId,
                username,
                file: {
                    name: req.file.originalname,
                    size: req.file.size,
                    type: req.file.mimetype
                }
            });

            // Prepare form data for AI service
            const formData = new FormData();
            
            // Verify file exists and is readable
            try {
                await fs.access(tempFilePath);
                formData.append('resume', fs.createReadStream(tempFilePath));
            formData.append('username', username);
            formData.append('user_id', userId);
            
            console.log('📝 Form data prepared with file:', {
                username,
                userId,
                fileSize: req.file.size,
                fileType: req.file.mimetype
            });
        } catch (fileError) {
            console.error('❌ Error preparing file for upload:', {
                error: fileError.message,
                path: req.file.path
            });
            throw new Error('Không thể đọc file CV. Vui lòng thử lại với file khác.');
        }

        const aiAgentUrl = 'http://localhost:8000/upload_resume';
        console.log('🚀 Sending to AI agent...', {
            url: aiAgentUrl,
            file: req.file.originalname,
            size: req.file.size,
            model: 'gemini-2.0-flash'
        });

        try {
            // Get the content length for better progress tracking
            const contentLength = await new Promise((resolve, reject) => {
                formData.getLength((err, length) => {
                    if (err) {
                        console.warn('⚠️ Could not determine form data length, using default headers');
                        resolve(null);
                    } else {
                        resolve(length);
                    }
                });
            });
            
            // Prepare headers
            const headers = {
                ...formData.getHeaders(),
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            };
            
            if (contentLength) {
                headers['Content-Length'] = contentLength;
            }
            
            // Make the request to AI service
            const response = await axios.post(aiAgentUrl, formData, {
                headers,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 300000, // 5 minutes timeout
                responseType: 'json', // Expect JSON response
                params: {
                    model_name: 'gemini-2.0-flash'
                },
                // Handle upload progress
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.lengthComputable) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        console.log(`📤 Upload progress: ${percentCompleted}%`);
                    }
                }
            });
            
            console.log('✅ AI service response:', {
                status: response.status,
                data: response.data ? 'Received response data' : 'No data in response'
            });
            
            // Process the response
            const aiData = response.data;
            
            if (!aiData) {
                console.error('❌ Empty response from AI service');
                throw new Error('Không nhận được dữ liệu từ hệ thống AI. Vui lòng thử lại.');
            }
            
            console.log('📋 Processed AI response:', {
                hasData: !!aiData,
                dataKeys: aiData ? Object.keys(aiData) : []
            });
        } catch (error) {
            console.error('❌ AI service error:', {
                message: error.message,
                code: error.code,
                response: error.response?.data,
                status: error.response?.status,
                stack: error.stack
            });
            
            // Clean up temp file on error
            if (tempFilePath) {
                try {
                    await fs.promises.unlink(tempFilePath);
                    console.log('🗑️  Deleted temp file after error');
                } catch (cleanupError) {
                    if (cleanupError.code !== 'ENOENT') {
                        console.error('❌ Error cleaning up temp file:', cleanupError);
                    }
                }
            }
            
            // Prepare user-friendly error message
            let errorMessage = 'Lỗi khi xử lý CV. Vui lòng thử lại sau.';
            
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                errorMessage = error.response.data?.message || 
                              error.response.data?.detail ||
                              `Lỗi từ hệ thống AI (${error.response.status})`;
            } else if (error.request) {
                // The request was made but no response was received
                errorMessage = 'Không nhận được phản hồi từ hệ thống AI. Vui lòng kiểm tra kết nối và thử lại.';
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Hệ thống xử lý quá lâu. Vui lòng thử lại với file nhỏ hơn.';
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = 'Không thể kết nối đến hệ thống AI. Vui lòng thử lại sau.';
            }
            
            return res.status(500).json({
                success: false,
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

        // 4. Save to database
        const CV = require('../app/models/CV');
        const mongoose = require('mongoose');

        const updateData = {
            user_id: userId,
            username: username,
            saved: true,
            message: aiData.message || 'CV processed successfully',
            uploaded_at: new Date(),
            ...(aiData.parsed_output && { parsed_output: aiData.parsed_output }),
            ...(aiData.processed_text && { processed_text: aiData.processed_text })
        };

        console.log('💾 Saving CV to database...');
        
        // Find and update or create new CV
        const cv = await CV.findOneAndUpdate(
            { user_id: userId },
            { $set: updateData },
            { 
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        console.log('✅ CV saved successfully:', {
            cvId: cv._id,
            userId: cv.user_id
        });

        // 5. Clean up and respond
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting temp file:', err);
        });

        return res.json({
            success: true,
            message: 'CV đã được tải lên và xử lý thành công!',
            data: {
                cvId: cv._id,
                ...aiData
            }
        });
    } catch (error) {
        console.error('❌ CV upload error:', {
            message: error.message,
            stack: error.stack,
            filePath: tempFilePath
        });
        
        // Clean up the temp file if it exists
        if (tempFilePath) {
            await safeDeleteFile(tempFilePath);
        }

        // Clean up temp file on error
        if (tempFilePath) {
            try {
                await fs.promises.unlink(tempFilePath);
                console.log('🗑️  Deleted temp file after error');
            } catch (cleanupError) {
                if (cleanupError.code !== 'ENOENT') {
                    console.error('❌ Error cleaning up temp file:', cleanupError);
                }
            }
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Đã xảy ra lỗi khi xử lý CV',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
module.exports = router;

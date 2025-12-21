const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const CV = require('../../models/CV');
const mongoose = require('mongoose');

class CVUploadController {
    async upload(req, res) {
        try {
            if (!req.file) {
                return res.status(400).render('users/uploadCv', {
                    success: false,
                    message: 'Không có file được upload',
                });
            }

            // 🔹 Lấy username từ token đăng nhập
            const username = req.account?.username;
            if (!username) {
                return res.status(401).render('users/uploadCv', {
                    success: false,
                    message: 'Thiếu thông tin đăng nhập (username).',
                });
            }

            console.log('📤 Starting CV upload process...', {
                username,
                userId: req.account._id,
                file: {
                    path: req.file.path,
                    size: req.file.size,
                    mimetype: req.file.mimetype
                }
            });

            const formData = new FormData();
            formData.append('username', username);
            formData.append('user_id', req.account._id);
            
            try {
                // Check if file exists and is readable
                await fs.promises.access(req.file.path, fs.constants.R_OK);
                formData.append('file', fs.createReadStream(req.file.path));
            } catch (err) {
                console.error('❌ Error reading file:', err);
                throw new Error('Không thể đọc file CV. Vui lòng thử lại.');
            }

            // 🔹 Call Python API
            let response;
            try {
                const aiServiceUrl = 'http://localhost:8000/upload_resume';
                console.log('🔗 Calling AI service at:', aiServiceUrl);
                
                response = await axios.post(
                    aiServiceUrl,
                    formData,
                    {
                        headers: {
                            ...formData.getHeaders(),
                            'Content-Length': (await getFormDataLength(formData)).toString(),
                        },
                        maxBodyLength: Infinity,
                        maxContentLength: Infinity,
                        timeout: 60000, // 60 seconds timeout
                    },
                );
                
                console.log('✅ AI service response:', {
                    status: response.status,
                    data: response.data
                });
                
            } catch (error) {
                console.error('❌ Error calling AI service:', {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                    headers: error.response?.headers,
                    stack: error.stack
                });
                
                // Clean up temp file
                await safeDeleteFile(req.file?.path);
                
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    const errorMessage = error.response.data?.detail || 
                                      error.response.data?.message || 
                                      'Lỗi khi xử lý CV. Vui lòng thử lại sau.';
                    throw new Error(`Lỗi từ hệ thống AI: ${errorMessage}`);
                } else if (error.request) {
                    // The request was made but no response was received
                    throw new Error('Không nhận được phản hồi từ hệ thống AI. Vui lòng kiểm tra kết nối và thử lại.');
                } else {
                    // Something happened in setting up the request
                    throw new Error(`Lỗi khi gửi yêu cầu: ${error.message}`);
                }
            }

            // 🔹 Get processed data from Python API
            let fetchData;
            try {
                const resumeUrl = `http://localhost:8000/api/resume/${username}`;
                console.log('🔍 Fetching processed resume data from:', resumeUrl);
                
                fetchData = await axios.get(resumeUrl, {
                    timeout: 30000,
                });
                
                console.log('✅ Fetched resume data:', {
                    status: fetchData.status,
                    data: Object.keys(fetchData.data || {})
                });
                
            } catch (error) {
                console.error('❌ Error fetching processed resume data:', {
                    message: error.message,
                    status: error.response?.status,
                    data: error.response?.data
                });
                // Continue even if we can't fetch the resume data
                fetchData = { data: {} };
            } finally {
                // Ensure temp file is cleaned up
                await safeDeleteFile(req.file?.path);
            }

            req.session.resumeData = fetchData.data || {};

            // 🔹 Lưu thông tin CV vào database
            const CV = require('../../models/CV');
            const mongoose = require('mongoose');
            
            // Tạo dữ liệu CV mới
            const userId = mongoose.Types.ObjectId(req.account._id);
            const cvData = {
                user_id: userId,
                username: username,
                saved: true,
                message: 'CV uploaded successfully',
                uploaded_at: new Date(),
                // Sao chép dữ liệu từ API nếu có
                ...(fetchData.data.parsed_output && { parsed_output: fetchData.data.parsed_output }),
                ...(fetchData.data.message && { message: fetchData.data.message }),
                ...(fetchData.data.processed_text && { processed_text: fetchData.data.processed_text }),
                ...(response.data.filename && { filename: response.data.filename }),
                ...(response.data.file_path && { file_path: `/ai-uploads/${response.data.filename}` })
            };

            console.log('📝 CV Data to save:', {
                userId: userId.toString(),
                username: username,
                hasParsedOutput: !!fetchData.data.parsed_output,
                hasProcessedText: !!fetchData.data.processed_text
            });

            try {
                // Check if CV exists for this user
                let cv = await CV.findOne({ user_id: userId });
                
                if (cv) {
                    // Update existing CV
                    Object.assign(cv, cvData);
                    await cv.save();
                    console.log('✅ CV updated successfully:', {
                        userId: cv.user_id,
                        username: cv.username,
                        updatedAt: cv.updatedAt,
                        documentId: cv._id
                    });
                } else {
                    // Check if username already exists
                    const existingCV = await CV.findOne({ username });
                    if (existingCV) {
                        console.error(`❌ Username ${username} already exists in another CV`);
                        return res.status(400).render('users/uploadCv', {
                            success: false,
                            message: 'This username is already associated with another CV. Please use a different username.',
                        });
                    }
                    // Create new CV
                    cv = await CV.create(cvData);
                    console.log('✅ New CV created successfully:', {
                        userId: cv.user_id,
                        username: cv.username,
                        createdAt: cv.createdAt,
                        documentId: cv._id
                    });
                }
                
                // Set result for response
                const result = cv;
            } catch (error) {
                console.error('❌ Error saving CV to database:', error);
                // Handle duplicate key error specifically
                if (error.code === 11000) {
                    return res.status(400).render('users/uploadCv', {
                        success: false,
                        message: 'This username is already taken. Please try a different username.',
                    });
                }
                throw error; // Ném lỗi để bắt ở catch bên ngoài
            }

            // 🔹 Render ra view uploadCv.hbs với dữ liệu từ DB
            return res.render('users/uploadCv', {
                success: true,
                message: response.data?.message || 'Upload thành công',
                user: username,
                resumeData: fetchData.data || {},
            });
        } catch (error) {
            console.error('❌ Lỗi khi xử lý upload:', error.message);

            return res.status(500).render('users/uploadCv', {
                success: false,
                message: 'Lỗi khi gọi Python service',
                error: error.response?.data || error.message,
            });
        }
    }

    async getJobSuggestions(req, res) {
        try {
            const username = req.account?.username;
            if (!username) {
                return res.status(400).render('users/uploadCv', {
                    success: false,
                    message: 'Thiếu username để gợi ý việc làm',
                });
            }

            const jobSuggestionUrl = `http://localhost:8000/api/jobs-suggestion/${username}`;
            console.log(`🔍 Gọi job suggestion API: ${jobSuggestionUrl}`);

            const response = await axios.get(jobSuggestionUrl, {
                timeout: 20000,
            });

            req.session.resumeData = response.data || {};

            return res.render('users/uploadCv', {
                success: true,
                user: username,
                jobSuggestions: response.data || [],
            });
        } catch (error) {
            console.error('❌ Lỗi gọi job suggestion:', error.message);
            return res.status(500).render('users/uploadCv', {
                success: false,
                message: 'Gọi Python service thất bại',
                error: error.response?.data || error.message,
            });
        }
    }
}

// Helper function to safely delete files
async function safeDeleteFile(filePath) {
    if (!filePath) return;
    
    try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        await fs.promises.unlink(filePath);
        console.log('🗑️  Deleted temp file:', filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('❌ Error deleting temp file:', err);
        }
    }
}

// Helper function to get FormData length
async function getFormDataLength(formData) {
    return new Promise((resolve, reject) => {
        formData.getLength((err, length) => {
            if (err) {
                console.warn('⚠️ Could not determine FormData length:', err);
                resolve(null);
            } else {
                resolve(length);
            }
        });
    });
}

module.exports = new CVUploadController();

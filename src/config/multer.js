const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create 'uploads/' directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage with unique filenames and file type validation
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `cv-${uniqueSuffix}${ext}`);
    },
});

// File filter to accept only PDF and DOCX files
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file PDF hoặc DOCX'), false);
    }
};

// Configure multer with file size limit and filter
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    // Handle file size limit errors
    onError: (err, next) => {
        if (err.code === 'LIMIT_FILE_SIZE') {
            next(new Error('Kích thước file quá lớn. Tối đa 5MB được phép.'));
        } else {
            next(err);
        }
    }
});

// Clean up function for uploaded files
const cleanupFile = async (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        try {
            await fs.promises.unlink(filePath);
            console.log(`✅ Đã xóa file tạm: ${filePath}`);
        } catch (error) {
            console.error('❌ Lỗi khi xóa file tạm:', error);
        }
    }
};

module.exports = { upload, cleanupFile, uploadDir };

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads/logos directory exists
const logoUploadDir = path.join(__dirname, '../../public/uploads/logos');
if (!fs.existsSync(logoUploadDir)) {
    fs.mkdirSync(logoUploadDir, { recursive: true });
}

// Multer storage configuration for logo uploads
const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, logoUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `logo-${uniqueSuffix}${ext}`);
    }
});

// File filter for logo uploads (images only)
const logoFileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
    }
};

// Configured multer instance for logo uploads
const logoUpload = multer({ 
    storage: logoStorage,
    fileFilter: logoFileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    }
});

module.exports = {
    logoUpload,
    logoStorage,
    logoFileFilter,
    logoUploadDir
};

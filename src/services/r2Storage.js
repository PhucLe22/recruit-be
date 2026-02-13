const mongoose = require('mongoose');
const { Readable } = require('stream');
const { GridFSBucket } = mongoose.mongo;

const BUCKET_NAME = 'uploads';
const BASE_URL = process.env.BASE_URL || '';

let bucket;

function getBucket() {
    if (!bucket) {
        const db = mongoose.connection.db;
        if (!db) throw new Error('MongoDB not connected');
        bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
    }
    return bucket;
}

// Reset bucket reference when connection changes (e.g. reconnect)
mongoose.connection.on('connected', () => {
    bucket = null;
});

async function uploadFile(buffer, key, contentType) {
    const gfs = getBucket();

    // Delete existing file with same key if exists
    try {
        const existing = await gfs.find({ filename: key }).toArray();
        for (const file of existing) {
            await gfs.delete(file._id);
        }
    } catch (err) {
        // ignore - file may not exist
    }

    return new Promise((resolve, reject) => {
        const readStream = Readable.from(buffer);
        const uploadStream = gfs.openUploadStream(key, {
            contentType: contentType,
            metadata: { originalKey: key },
        });

        readStream.pipe(uploadStream)
            .on('error', reject)
            .on('finish', () => {
                resolve(getPublicUrl(key));
            });
    });
}

async function deleteFile(key) {
    try {
        const gfs = getBucket();
        const files = await gfs.find({ filename: key }).toArray();
        for (const file of files) {
            await gfs.delete(file._id);
        }
    } catch (err) {
        console.error('Storage delete error:', err.message);
    }
}

async function getFileBuffer(key) {
    const gfs = getBucket();
    const files = await gfs.find({ filename: key }).toArray();
    if (!files.length) throw new Error(`File not found: ${key}`);

    return new Promise((resolve, reject) => {
        const chunks = [];
        const downloadStream = gfs.openDownloadStreamByName(key);
        downloadStream
            .on('data', (chunk) => chunks.push(chunk))
            .on('error', reject)
            .on('end', () => resolve(Buffer.concat(chunks)));
    });
}

async function fileExists(key) {
    try {
        const gfs = getBucket();
        const files = await gfs.find({ filename: key }).toArray();
        return files.length > 0;
    } catch {
        return false;
    }
}

function getPublicUrl(key) {
    return `${BASE_URL}/api/files/${encodeURIComponent(key)}`;
}

/**
 * Resolves a DB path (legacy or new) to a full public URL.
 * - Full URLs (http/https) are returned as-is
 * - Relative paths like /uploads/avatars/file.jpg -> BASE_URL/api/files/uploads/avatars/file.jpg
 * - Plain keys like ai-uploads/file.pdf -> BASE_URL/api/files/ai-uploads/file.pdf
 */
function resolveFileUrl(dbPath) {
    if (!dbPath) return null;
    if (dbPath.startsWith('http://') || dbPath.startsWith('https://')) return dbPath;
    const key = dbPath.startsWith('/') ? dbPath.substring(1) : dbPath;
    return getPublicUrl(key);
}

/**
 * Extracts the storage key from a full URL or DB path.
 * - Full URL with /api/files/ -> strips the prefix
 * - /uploads/avatars/file.jpg -> uploads/avatars/file.jpg
 * - uploads/avatars/file.jpg -> uploads/avatars/file.jpg
 */
function extractKey(dbPath) {
    if (!dbPath) return null;
    // Handle full URLs with /api/files/ prefix
    const apiFilesMatch = dbPath.match(/\/api\/files\/(.+)$/);
    if (apiFilesMatch) return decodeURIComponent(apiFilesMatch[1]);
    return dbPath.startsWith('/') ? dbPath.substring(1) : dbPath;
}

/**
 * Express route handler to serve files from GridFS.
 * Mount this at /api/files/*key in your router.
 */
async function serveFile(req, res) {
    try {
        // Express 5: *key param may be an array or string
        const rawKey = req.params.key;
        const key = decodeURIComponent(Array.isArray(rawKey) ? rawKey.join('/') : rawKey);
        const gfs = getBucket();
        const files = await gfs.find({ filename: key }).toArray();

        if (!files.length) {
            return res.status(404).json({ error: 'File not found' });
        }

        const file = files[0];
        res.set('Content-Type', file.contentType || 'application/octet-stream');
        res.set('Content-Length', file.length);
        res.set('Cache-Control', 'public, max-age=31536000');

        const downloadStream = gfs.openDownloadStreamByName(key);
        downloadStream.pipe(res);
    } catch (err) {
        console.error('File serve error:', err.message);
        res.status(500).json({ error: 'Failed to serve file' });
    }
}

module.exports = {
    getBucket,
    uploadFile,
    deleteFile,
    getFileBuffer,
    fileExists,
    getPublicUrl,
    resolveFileUrl,
    extractKey,
    serveFile,
    BUCKET: BUCKET_NAME,
};

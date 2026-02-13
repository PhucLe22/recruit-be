const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

async function uploadFile(buffer, key, contentType) {
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));
    return getPublicUrl(key);
}

async function deleteFile(key) {
    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
        }));
    } catch (err) {
        console.error('R2 delete error:', err.message);
    }
}

async function getFileBuffer(key) {
    const response = await s3Client.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
    }));
    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function fileExists(key) {
    try {
        await s3Client.send(new HeadObjectCommand({
            Bucket: BUCKET,
            Key: key,
        }));
        return true;
    } catch {
        return false;
    }
}

function getPublicUrl(key) {
    return `${PUBLIC_URL}/${key}`;
}

/**
 * Resolves a DB path (legacy or new) to a full public URL.
 * - Full URLs (http/https) are returned as-is
 * - Relative paths like /uploads/avatars/file.jpg -> R2_PUBLIC_URL/uploads/avatars/file.jpg
 * - Plain keys like ai-uploads/file.pdf -> R2_PUBLIC_URL/ai-uploads/file.pdf
 */
function resolveFileUrl(dbPath) {
    if (!dbPath) return null;
    if (dbPath.startsWith('http://') || dbPath.startsWith('https://')) return dbPath;
    const key = dbPath.startsWith('/') ? dbPath.substring(1) : dbPath;
    return getPublicUrl(key);
}

/**
 * Extracts the R2 key from a full URL or DB path.
 * - Full R2 URL -> strips the public URL prefix
 * - /uploads/avatars/file.jpg -> uploads/avatars/file.jpg
 * - uploads/avatars/file.jpg -> uploads/avatars/file.jpg
 */
function extractKey(dbPath) {
    if (!dbPath) return null;
    if (dbPath.startsWith(PUBLIC_URL)) {
        return dbPath.substring(PUBLIC_URL.length + 1);
    }
    return dbPath.startsWith('/') ? dbPath.substring(1) : dbPath;
}

module.exports = {
    s3Client,
    uploadFile,
    deleteFile,
    getFileBuffer,
    fileExists,
    getPublicUrl,
    resolveFileUrl,
    extractKey,
    BUCKET,
};

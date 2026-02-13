const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET;
const PUBLIC_URL = (process.env.SUPABASE_STORAGE_PUBLIC_URL || '').replace(/\/$/, '');

async function uploadFile(buffer, key, contentType) {
    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(key, buffer, {
            contentType,
            upsert: true,
        });

    if (error) throw new Error(`Storage upload error: ${error.message}`);
    return getPublicUrl(key);
}

async function deleteFile(key) {
    try {
        const { error } = await supabase.storage
            .from(BUCKET)
            .remove([key]);
        if (error) console.error('Storage delete error:', error.message);
    } catch (err) {
        console.error('Storage delete error:', err.message);
    }
}

async function getFileBuffer(key) {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(key);

    if (error) throw new Error(`Storage download error: ${error.message}`);
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

async function fileExists(key) {
    try {
        const dir = key.substring(0, key.lastIndexOf('/'));
        const filename = key.substring(key.lastIndexOf('/') + 1);
        const { data, error } = await supabase.storage
            .from(BUCKET)
            .list(dir, { search: filename, limit: 1 });
        if (error) return false;
        return data.some(f => f.name === filename);
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
 * - Relative paths like /uploads/avatars/file.jpg -> PUBLIC_URL/uploads/avatars/file.jpg
 * - Plain keys like ai-uploads/file.pdf -> PUBLIC_URL/ai-uploads/file.pdf
 */
function resolveFileUrl(dbPath) {
    if (!dbPath) return null;
    if (dbPath.startsWith('http://') || dbPath.startsWith('https://')) return dbPath;
    const key = dbPath.startsWith('/') ? dbPath.substring(1) : dbPath;
    return getPublicUrl(key);
}

/**
 * Extracts the storage key from a full URL or DB path.
 * - Full storage URL -> strips the public URL prefix
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
    supabase,
    uploadFile,
    deleteFile,
    getFileBuffer,
    fileExists,
    getPublicUrl,
    resolveFileUrl,
    extractKey,
    BUCKET,
};

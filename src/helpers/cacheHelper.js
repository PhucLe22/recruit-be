/**
 * Simple in-memory cache implementation
 */

// Cache storage with TTL (Time To Live) support
const cache = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default TTL

/**
 * Generates a cache key from the given parameters
 * @param {string|object} query - The query or parameters to generate key from
 * @param {number} [page] - Page number for pagination
 * @param {number} [limit] - Number of items per page
 * @param {string} [filter] - Additional filter string
 * @returns {string} Generated cache key
 */
function getCacheKey(query, page, limit, filter) {
    return `${JSON.stringify(query)}_${page}_${limit}_${filter}`;
}

/**
 * Retrieves data from cache if it exists and is not expired
 * @param {string} key - The cache key
 * @returns {any|null} Cached data or null if not found/expired
 */
function getFromCache(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < (cached.ttl || DEFAULT_TTL)) {
        return cached.data;
    }
    // Remove expired cache entry
    if (cached) {
        cache.delete(key);
    }
    return null;
}

/**
 * Stores data in cache
 * @param {string} key - The cache key
 * @param {any} data - Data to be cached
 * @param {number} [ttl] - Optional custom TTL in milliseconds
 */
function setCache(key, data, ttl) {
    cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttl || DEFAULT_TTL
    });
}

/**
 * Clears the entire cache or a specific key
 * @param {string} [key] - Optional key to clear. If not provided, clears all cache.
 */
function clearCache(key) {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
}

module.exports = {
    getCacheKey,
    getFromCache,
    setCache,
    clearCache,
    DEFAULT_TTL
};

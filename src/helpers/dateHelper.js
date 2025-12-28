/**
 * Formats a date as a relative time string in Vietnamese
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted relative time string
 */
function formatRelativeTime(date) {
    if (!date) return '';
    const past = new Date(date);
    const diffMs = new Date() - past;

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffHours < 1) return 'Vừa xong';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffWeeks < 4) return `${diffWeeks} tuần trước`;

    const day = String(past.getDate()).padStart(2, '0');
    const month = String(past.getMonth() + 1).padStart(2, '0');
    const year = past.getFullYear();
    return `${day}/${month}/${year}`;
}

module.exports = {
    formatRelativeTime
};

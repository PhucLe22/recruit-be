// Middleware to format dates consistently across the application
const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  
  // Check if date is valid
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Format date with time
const formatDateTime = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Format relative time (e.g., "2 days ago", "1 hour ago")
const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const past = new Date(date);
  
  if (isNaN(past.getTime())) return '';
  
  const diffMs = now - past;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSeconds < 60) {
    return 'vừa xong';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  } else if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  } else if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} tuần trước`;
  } else if (diffMonths < 12) {
    return `${diffMonths} tháng trước`;
  } else {
    return `${diffYears} năm trước`;
  }
};

// Format date for input fields (YYYY-MM-DD)
const formatDateForInput = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Check if date is recent (within last N days)
const isRecent = (date, days = 7) => {
  if (!date) return false;
  
  const past = new Date(date);
  if (isNaN(past.getTime())) return false;
  
  const now = new Date();
  const diffDays = Math.floor((now - past) / (1000 * 60 * 60 * 24));
  
  return diffDays <= days;
};

// Check if date is expiring soon (within next N days)
const isExpiringSoon = (date, days = 7) => {
  if (!date) return false;
  
  const expiry = new Date(date);
  if (isNaN(expiry.getTime())) return false;
  
  const now = new Date();
  const diffDays = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
  
  return diffDays <= days && diffDays >= 0;
};

// Check if date is expired
const isExpired = (date) => {
  if (!date) return true;
  
  const expiry = new Date(date);
  if (isNaN(expiry.getTime())) return true;
  
  return expiry < new Date();
};

// Get date range for filtering
const getDateRange = (range) => {
  const now = new Date();
  const start = new Date();
  
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setDate(now.getDate() - 7); // Default to last week
  }
  
  return {
    start: start,
    end: now
  };
};

// Middleware to add date formatting functions to locals
const formatDateMiddleware = (req, res, next) => {
  // Add date formatting functions to response locals
  res.locals.formatDate = formatDate;
  res.locals.formatDateTime = formatDateTime;
  res.locals.formatRelativeTime = formatRelativeTime;
  res.locals.formatDateForInput = formatDateForInput;
  res.locals.isRecent = isRecent;
  res.locals.isExpiringSoon = isExpiringSoon;
  res.locals.isExpired = isExpired;
  res.locals.getDateRange = getDateRange;
  
  next();
};

module.exports = {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatDateForInput,
  isRecent,
  isExpiringSoon,
  isExpired,
  getDateRange,
  formatDateMiddleware
};

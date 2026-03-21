/**
 * Date Formatting Utilities
 * =========================
 * Centralized date formatting with time display.
 */

/**
 * Format a date string to include both date and time
 * @param {string|Date} dateStr - The date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export function formatDateTime(dateStr, options = {}) {
  if (!dateStr) return '-';
  
  const {
    includeTime = true,
    includeSeconds = false,
    locale = 'en-US',
    shortDate = false
  } = options;
  
  try {
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) return '-';
    
    const dateOptions = shortDate 
      ? { day: '2-digit', month: 'short' }
      : { day: '2-digit', month: 'short', year: 'numeric' };
    
    const timeOptions = includeSeconds
      ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
      : { hour: '2-digit', minute: '2-digit', hour12: false };
    
    const formattedDate = date.toLocaleDateString(locale, dateOptions);
    
    if (!includeTime) {
      return formattedDate;
    }
    
    const formattedTime = date.toLocaleTimeString(locale, timeOptions);
    
    return `${formattedDate} ${formattedTime}`;
  } catch (error) {
    console.error('Date formatting error:', error);
    return '-';
  }
}

/**
 * Format date for transaction history (short format with time)
 * Example: "21 Mar 14:35"
 */
export function formatTransactionDate(dateStr) {
  return formatDateTime(dateStr, { shortDate: true, includeTime: true });
}

/**
 * Format date for full display
 * Example: "21 Mar 2026 14:35"
 */
export function formatFullDateTime(dateStr) {
  return formatDateTime(dateStr, { shortDate: false, includeTime: true });
}

/**
 * Format date only (no time)
 * Example: "21 Mar 2026"
 */
export function formatDateOnly(dateStr) {
  return formatDateTime(dateStr, { includeTime: false });
}

/**
 * Format time only
 * Example: "14:35"
 */
export function formatTimeOnly(dateStr) {
  if (!dateStr) return '-';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  } catch (error) {
    return '-';
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '-';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return formatDateTime(dateStr, { shortDate: true, includeTime: true });
  } catch (error) {
    return '-';
  }
}

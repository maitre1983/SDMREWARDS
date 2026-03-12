/**
 * API Configuration
 * Centralized API URL configuration with fallback for production
 */

// Get API URL with fallback to current origin for production
// This ensures the app works even if REACT_APP_BACKEND_URL is not set
export const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

export default API_URL;

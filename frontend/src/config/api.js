/**
 * API Configuration
 * Centralized API URL configuration - reads from environment variables
 */

// Get API URL from environment or use current origin
const getApiUrl = () => {
  // Use environment variable if set (injected during build/deployment)
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // Fallback to current origin for same-origin deployments
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  return '';
};

export const API_URL = getApiUrl();

export default API_URL;

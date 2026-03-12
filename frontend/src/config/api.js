/**
 * API Configuration
 * Centralized API URL configuration with smart detection for production
 */

// Determine the correct API URL based on the current hostname
const getApiUrl = () => {
  // If environment variable is set, use it
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // Smart detection based on hostname
  const hostname = window.location.hostname;
  
  // Production domain - point to Emergent backend
  if (hostname === 'sdmrewards.com' || hostname === 'www.sdmrewards.com') {
    return 'https://web-boost-seo.preview.emergentagent.com';
  }
  
  // Preview/staging environment
  if (hostname.includes('preview.emergentagent.com')) {
    return window.location.origin;
  }
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8001';
  }
  
  // Fallback to current origin
  return window.location.origin;
};

export const API_URL = getApiUrl();

export default API_URL;

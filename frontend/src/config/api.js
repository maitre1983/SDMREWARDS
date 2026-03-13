/**
 * API Configuration
 * Centralized API URL configuration for SDM Rewards
 */

// Get API URL based on deployment environment
const getApiUrl = () => {
  // 1. Use environment variable if set (injected during build)
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // 2. Smart detection based on hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Production domain - use Emergent backend
    if (hostname === 'sdmrewards.com' || hostname === 'www.sdmrewards.com') {
      return 'https://web-boost-seo.preview.emergentagent.com';
    }
    
    // Emergent preview/deployed - use same origin
    if (hostname.includes('emergentagent.com') || hostname.includes('emergent.host')) {
      return window.location.origin;
    }
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8001';
    }
    
    // Fallback to same origin
    return window.location.origin;
  }
  
  return '';
};

export const API_URL = getApiUrl();

export default API_URL;

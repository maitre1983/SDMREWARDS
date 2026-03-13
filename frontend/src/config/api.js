/**
 * API Configuration
 * Centralized API URL configuration with smart detection for production
 * 
 * IMPORTANT: For production deployment on sdmrewards.com:
 * The backend URL is hardcoded to ensure it works correctly
 * regardless of build-time environment variables.
 */

// Production backend URL - DO NOT CHANGE without updating the deployment
const PRODUCTION_BACKEND_URL = 'https://web-boost-seo.preview.emergentagent.com';

// Determine the correct API URL based on the current hostname
const getApiUrl = () => {
  // Get current hostname safely
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  
  // Production domains - ALWAYS use hardcoded production backend
  // This is the definitive fix for sdmrewards.com deployment
  if (hostname === 'sdmrewards.com' || hostname === 'www.sdmrewards.com') {
    console.log('[API Config] Production mode - using:', PRODUCTION_BACKEND_URL);
    return PRODUCTION_BACKEND_URL;
  }
  
  // Preview/staging environment on Emergent
  if (hostname.includes('preview.emergentagent.com')) {
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    console.log('[API Config] Preview mode - using:', url);
    return url;
  }
  
  // Emergent host (deployed backend)
  if (hostname.includes('emergent.host')) {
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    console.log('[API Config] Emergent host mode - using:', url);
    return url;
  }
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('[API Config] Local dev mode - using: http://localhost:8001');
    return 'http://localhost:8001';
  }
  
  // Environment variable fallback (for other environments)
  if (process.env.REACT_APP_BACKEND_URL) {
    console.log('[API Config] Using env variable:', process.env.REACT_APP_BACKEND_URL);
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // Final fallback - use production URL to be safe
  console.log('[API Config] Fallback mode - using:', PRODUCTION_BACKEND_URL);
  return PRODUCTION_BACKEND_URL;
};

export const API_URL = getApiUrl();

// Log the resolved API URL for debugging
if (typeof window !== 'undefined') {
  console.log('[SDM Rewards] API URL resolved to:', API_URL);
}

export default API_URL;

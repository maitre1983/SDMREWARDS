/**
 * API Configuration for SDM Rewards
 * 
 * Dynamically determines the API URL based on the current environment.
 * For custom domains, the backend URL should be configured via REACT_APP_BACKEND_URL
 */

const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  
  // First check for explicitly configured backend URL (used in production with custom domains)
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  const hostname = window.location.hostname;
  
  // LOCAL development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8001';
  }
  
  // For all deployed environments (Emergent preview, production, custom domains),
  // use same origin - the deployment platform handles routing
  return window.location.origin;
};

export const API_URL = getApiUrl();

export default API_URL;

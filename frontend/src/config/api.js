/**
 * API Configuration for SDM Rewards
 * 
 * PRODUCTION: sdmrewards.com -> web-boost-seo.emergent.host
 * PREVIEW: *.emergentagent.com -> same origin
 */

const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  
  const hostname = window.location.hostname;
  
  // PRODUCTION: sdmrewards.com uses the deployed backend
  if (hostname === 'sdmrewards.com' || hostname === 'www.sdmrewards.com') {
    return 'https://web-boost-seo.emergent.host';
  }
  
  // DEPLOYED on Emergent: use same origin
  if (hostname.includes('emergent.host')) {
    return window.location.origin;
  }
  
  // PREVIEW: use same origin
  if (hostname.includes('emergentagent.com')) {
    return window.location.origin;
  }
  
  // LOCAL development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8001';
  }
  
  // Fallback
  return window.location.origin;
};

export const API_URL = getApiUrl();

export default API_URL;

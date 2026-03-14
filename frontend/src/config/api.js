/**
 * API Configuration
 * Centralized API URL configuration for SDM Rewards
 * 
 * IMPORTANT: This file determines which backend the frontend talks to.
 * The production backend is on preview.emergentagent.com
 */

// Production backend URL - HARDCODED for reliability
const PRODUCTION_BACKEND = 'https://web-boost-seo.preview.emergentagent.com';

// Get API URL based on deployment environment
const getApiUrl = () => {
  // Safety check for SSR
  if (typeof window === 'undefined') {
    return PRODUCTION_BACKEND;
  }
  
  const hostname = window.location.hostname;
  
  // ============================================
  // PRODUCTION: sdmrewards.com -> preview backend
  // This is the definitive fix for the CORS issue
  // ============================================
  if (hostname === 'sdmrewards.com' || hostname === 'www.sdmrewards.com') {
    console.log('[API] Production mode -> using:', PRODUCTION_BACKEND);
    return PRODUCTION_BACKEND;
  }
  
  // ============================================
  // EMERGENT DEPLOYED: .emergent.host domains
  // These should ALSO use the preview backend
  // because .emergent.host has issues
  // ============================================
  if (hostname.includes('emergent.host')) {
    console.log('[API] Emergent host detected -> redirecting to:', PRODUCTION_BACKEND);
    return PRODUCTION_BACKEND;
  }
  
  // ============================================
  // PREVIEW: .preview.emergentagent.com
  // Use same origin (works correctly)
  // ============================================
  if (hostname.includes('preview.emergentagent.com')) {
    const origin = window.location.origin;
    console.log('[API] Preview mode -> using:', origin);
    return origin;
  }
  
  // ============================================
  // LOCAL DEVELOPMENT
  // ============================================
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('[API] Local dev mode');
    return 'http://localhost:8001';
  }
  
  // ============================================
  // FALLBACK: Use production backend
  // ============================================
  console.log('[API] Fallback -> using:', PRODUCTION_BACKEND);
  return PRODUCTION_BACKEND;
};

export const API_URL = getApiUrl();

export default API_URL;

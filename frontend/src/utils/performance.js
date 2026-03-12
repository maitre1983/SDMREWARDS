/**
 * Performance optimization utilities for SDM REWARDS
 * Designed for low-bandwidth connections and older devices
 */

// Lazy load images with IntersectionObserver
export const lazyLoadImage = (imageElement) => {
  if (!imageElement) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '50px' });
  
  observer.observe(imageElement);
};

// Debounce function for API calls
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function for scroll events
export const throttle = (func, limit = 100) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Cache API responses in sessionStorage
export const cachedFetch = async (url, options = {}, ttl = 300000) => {
  const cacheKey = `cache_${url}`;
  const cached = sessionStorage.getItem(cacheKey);
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < ttl) {
      return data;
    }
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  sessionStorage.setItem(cacheKey, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
  
  return data;
};

// Check network connection quality
export const getNetworkQuality = () => {
  if (!navigator.connection) return 'unknown';
  
  const { effectiveType, downlink, rtt } = navigator.connection;
  
  if (effectiveType === '4g' && downlink > 5) return 'high';
  if (effectiveType === '4g' || effectiveType === '3g') return 'medium';
  return 'low';
};

// Reduce image quality based on network
export const getOptimalImageSize = () => {
  const quality = getNetworkQuality();
  switch (quality) {
    case 'high': return { width: 800, quality: 80 };
    case 'medium': return { width: 400, quality: 60 };
    default: return { width: 200, quality: 40 };
  }
};

// Compress data before sending
export const compressData = (data) => {
  // Simple compression: remove null/undefined values
  if (typeof data !== 'object') return data;
  
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined) {
      acc[key] = typeof value === 'object' ? compressData(value) : value;
    }
    return acc;
  }, Array.isArray(data) ? [] : {});
};

// Format numbers for display (reduces string size)
export const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined) return '0';
  return Number(num).toFixed(decimals);
};

// Format currency for Ghana
export const formatGHS = (amount) => {
  if (amount === null || amount === undefined) return 'GHS 0.00';
  return `GHS ${formatNumber(amount)}`;
};

// Truncate text for mobile
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Check if device is mobile
export const isMobile = () => {
  return window.innerWidth < 768;
};

// Get optimal list page size based on device
export const getPageSize = () => {
  if (isMobile()) return 10;
  return 20;
};

// Request idle callback polyfill
export const requestIdleCallback = window.requestIdleCallback || 
  ((cb) => setTimeout(cb, 1));

// Cancel idle callback polyfill
export const cancelIdleCallback = window.cancelIdleCallback || clearTimeout;

// Preload critical resources
export const preloadResource = (url, type = 'fetch') => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = type;
  document.head.appendChild(link);
};

// Service worker registration for offline support
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration.scope);
    } catch (error) {
      console.log('SW registration failed:', error);
    }
  }
};

export default {
  lazyLoadImage,
  debounce,
  throttle,
  cachedFetch,
  getNetworkQuality,
  getOptimalImageSize,
  compressData,
  formatNumber,
  formatGHS,
  truncateText,
  isMobile,
  getPageSize,
  requestIdleCallback,
  cancelIdleCallback,
  preloadResource,
  registerServiceWorker
};

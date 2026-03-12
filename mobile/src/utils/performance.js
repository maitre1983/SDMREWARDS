/**
 * Performance utilities for SDM REWARDS Mobile App
 * Optimized for low-bandwidth connections and older devices
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Cache API responses
export const cachedApiCall = async (key, fetchFn, ttlMs = 300000) => {
  try {
    const cached = await AsyncStorage.getItem(`cache_${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ttlMs) {
        return { data, fromCache: true };
      }
    }
    
    const data = await fetchFn();
    await AsyncStorage.setItem(`cache_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    
    return { data, fromCache: false };
  } catch (error) {
    // On error, try to return cached data even if expired
    const cached = await AsyncStorage.getItem(`cache_${key}`);
    if (cached) {
      return { data: JSON.parse(cached).data, fromCache: true, error };
    }
    throw error;
  }
};

// Clear old cache entries
export const clearOldCache = async (maxAgeMs = 86400000) => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith('cache_'));
    
    for (const key of cacheKeys) {
      const item = await AsyncStorage.getItem(key);
      if (item) {
        const { timestamp } = JSON.parse(item);
        if (Date.now() - timestamp > maxAgeMs) {
          await AsyncStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.log('Cache cleanup error:', error);
  }
};

// Check network quality
export const getNetworkQuality = async () => {
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return 'offline';
    
    const { type, isConnectionExpensive } = state;
    
    if (type === 'wifi' && !isConnectionExpensive) return 'high';
    if (type === 'cellular') {
      const details = state.details;
      if (details?.cellularGeneration === '4g') return 'medium';
      if (details?.cellularGeneration === '3g') return 'low';
      return 'low';
    }
    return 'medium';
  } catch {
    return 'unknown';
  }
};

// Get optimal page size based on network
export const getOptimalPageSize = async () => {
  const quality = await getNetworkQuality();
  switch (quality) {
    case 'high': return 20;
    case 'medium': return 10;
    case 'low': return 5;
    default: return 10;
  }
};

// Debounce for API calls
export const debounce = (func, wait = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle for frequent events
export const throttle = (func, limit = 100) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Format currency
export const formatGHS = (amount) => {
  if (amount === null || amount === undefined) return 'GHS 0.00';
  return `GHS ${Number(amount).toFixed(2)}`;
};

// Truncate text
export const truncateText = (text, maxLength = 30) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Format date relative
export const formatRelativeDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
};

// Compress API payload
export const compressPayload = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = typeof value === 'object' ? compressPayload(value) : value;
    }
    return acc;
  }, Array.isArray(data) ? [] : {});
};

// Retry failed API calls
export const retryApiCall = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
};

export default {
  cachedApiCall,
  clearOldCache,
  getNetworkQuality,
  getOptimalPageSize,
  debounce,
  throttle,
  formatGHS,
  truncateText,
  formatRelativeDate,
  compressPayload,
  retryApiCall
};

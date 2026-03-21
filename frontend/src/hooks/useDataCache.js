// Data Caching Hook for instant dashboard loading
// Provides stale-while-revalidate pattern for API data

import { useState, useEffect, useCallback, useRef } from 'react';

// In-memory cache with TTL
const dataCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function getCacheKey(url, params = {}) {
  return `${url}?${new URLSearchParams(params).toString()}`;
}

function isExpired(timestamp) {
  return Date.now() - timestamp > CACHE_TTL;
}

export function useDataCache(fetchFn, cacheKey, dependencies = []) {
  const [data, setData] = useState(() => {
    const cached = dataCache.get(cacheKey);
    return cached ? cached.data : null;
  });
  const [isLoading, setIsLoading] = useState(!dataCache.has(cacheKey));
  const [isValidating, setIsValidating] = useState(false);
  const isMountedRef = useRef(true);

  const revalidate = useCallback(async (force = false) => {
    const cached = dataCache.get(cacheKey);
    
    // If we have fresh cached data and not forcing, skip fetch
    if (cached && !isExpired(cached.timestamp) && !force) {
      return cached.data;
    }

    // If we have stale data, show it while revalidating
    if (cached && !force) {
      setIsValidating(true);
    } else {
      setIsLoading(true);
    }

    try {
      const freshData = await fetchFn();
      
      if (isMountedRef.current) {
        setData(freshData);
        dataCache.set(cacheKey, {
          data: freshData,
          timestamp: Date.now()
        });
      }
      
      return freshData;
    } catch (error) {
      console.error(`[Cache] Fetch failed for ${cacheKey}:`, error);
      // Return cached data on error if available
      if (cached) return cached.data;
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsValidating(false);
      }
    }
  }, [cacheKey, fetchFn]);

  useEffect(() => {
    isMountedRef.current = true;
    revalidate();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [revalidate, ...dependencies]);

  return { 
    data, 
    isLoading, 
    isValidating,
    revalidate: () => revalidate(true),
    isStale: () => {
      const cached = dataCache.get(cacheKey);
      return cached ? isExpired(cached.timestamp) : true;
    }
  };
}

// Utility to prefetch data
export function prefetchData(fetchFn, cacheKey) {
  if (dataCache.has(cacheKey)) {
    const cached = dataCache.get(cacheKey);
    if (!isExpired(cached.timestamp)) return;
  }

  fetchFn()
    .then(data => {
      dataCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    })
    .catch(() => {});
}

// Clear specific cache entry
export function clearCache(cacheKey) {
  if (cacheKey) {
    dataCache.delete(cacheKey);
  } else {
    dataCache.clear();
  }
}

// Set cache directly (useful for optimistic updates)
export function setCache(cacheKey, data) {
  dataCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}

export default useDataCache;

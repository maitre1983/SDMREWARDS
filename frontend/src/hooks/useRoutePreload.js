// Route Preloading Hook for ultra-fast navigation
// Preloads components based on user behavior patterns

import { useEffect, useCallback, useRef } from 'react';

// Map of routes to their lazy component imports
const routeComponentMap = {
  '/': () => import('../pages/HomePage'),
  '/client': () => import('../pages/ClientAuthPage'),
  '/client/dashboard': () => import('../pages/ClientDashboard'),
  '/client/profile': () => import('../pages/ClientProfilePage'),
  '/client/partners': () => import('../pages/PartnersPage'),
  '/merchant': () => import('../pages/MerchantAuthPage'),
  '/merchant/dashboard': () => import('../pages/MerchantDashboard'),
  '/merchant/history': () => import('../pages/MerchantHistoryPage'),
};

// Predicted navigation patterns - preload likely next pages
const navigationPatterns = {
  '/': ['/client', '/merchant'],
  '/client': ['/client/dashboard'],
  '/merchant': ['/merchant/dashboard'],
  '/client/dashboard': ['/client/partners', '/client/profile'],
  '/merchant/dashboard': ['/merchant/history'],
};

// Cache for preloaded components
const preloadedRoutes = new Set();

export function useRoutePreload(currentPath) {
  const preloadTimeoutRef = useRef(null);

  const preloadRoute = useCallback((route) => {
    if (preloadedRoutes.has(route) || !routeComponentMap[route]) return;
    
    // Mark as preloaded to prevent duplicate loads
    preloadedRoutes.add(route);
    
    // Dynamically import the component
    routeComponentMap[route]()
      .then(() => {
        console.log(`[Preload] Loaded: ${route}`);
      })
      .catch(() => {
        // Remove from preloaded set if failed
        preloadedRoutes.delete(route);
      });
  }, []);

  const preloadPredictedRoutes = useCallback(() => {
    const predictedRoutes = navigationPatterns[currentPath] || [];
    
    // Preload predicted routes with staggered timing
    predictedRoutes.forEach((route, index) => {
      setTimeout(() => preloadRoute(route), index * 100);
    });
  }, [currentPath, preloadRoute]);

  useEffect(() => {
    // Clear any pending preload
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    // Wait a short moment after navigation before preloading
    // This ensures the current page loads first
    preloadTimeoutRef.current = setTimeout(() => {
      preloadPredictedRoutes();
    }, 300);

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [currentPath, preloadPredictedRoutes]);

  // Function to preload on hover/focus
  const preloadOnInteraction = useCallback((route) => {
    if (!preloadedRoutes.has(route)) {
      preloadRoute(route);
    }
  }, [preloadRoute]);

  return { preloadOnInteraction, preloadedRoutes };
}

// Utility to preload specific merchant components
export function preloadMerchantComponents() {
  const components = [
    () => import('../components/merchant/AdvancedDashboard'),
    () => import('../components/merchant/PayoutHistory'),
    () => import('../components/merchant/MerchantWithdrawal'),
    () => import('../components/merchant/CashierManager'),
  ];

  components.forEach((load, index) => {
    setTimeout(load, index * 50);
  });
}

// Utility to preload specific client components
export function preloadClientComponents() {
  const components = [
    () => import('../components/client/WithdrawalModal'),
    () => import('../components/client/MerchantPayModal'),
    () => import('../pages/ServicesPage'),
  ];

  components.forEach((load, index) => {
    setTimeout(load, index * 50);
  });
}

export default useRoutePreload;

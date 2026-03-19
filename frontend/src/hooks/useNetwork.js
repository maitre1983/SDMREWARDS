/**
 * useNetwork Hook - Provides network quality info and optimized settings
 */
import { useState, useEffect } from 'react';
import networkService from '../services/networkService';

export function useNetwork() {
  const [networkStatus, setNetworkStatus] = useState(() => networkService.getStatus());

  useEffect(() => {
    // Subscribe to network changes
    const unsubscribe = networkService.subscribe((status) => {
      setNetworkStatus(status);
    });

    // Initial check
    networkService.refresh();

    return unsubscribe;
  }, []);

  return {
    quality: networkStatus.quality,
    pingTime: networkStatus.pingTime,
    settings: networkStatus.settings,
    isOnline: networkStatus.quality !== 'offline',
    isSlow: ['slow', 'very_slow'].includes(networkStatus.quality),
    refresh: () => networkService.refresh()
  };
}

export default useNetwork;

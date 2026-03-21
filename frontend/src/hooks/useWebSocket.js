/**
 * SDM REWARDS - useWebSocket Hook
 * ================================
 * React hook for WebSocket real-time updates in dashboards.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import wsService from '../services/webSocketService';

/**
 * Hook for WebSocket real-time communication
 * @param {string} userType - 'merchant', 'client', or 'admin'
 * @param {string} token - JWT authentication token
 * @param {object} options - Configuration options
 * @returns {object} WebSocket state and methods
 */
export function useWebSocket(userType, token, options = {}) {
  const {
    autoConnect = true,
    onPaymentReceived = null,
    onBalanceUpdate = null,
    onDashboardRefresh = null,
    onError = null,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
  // Store callbacks in refs to avoid stale closures
  const callbacksRef = useRef({
    onPaymentReceived,
    onBalanceUpdate,
    onDashboardRefresh,
    onError,
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onPaymentReceived,
      onBalanceUpdate,
      onDashboardRefresh,
      onError,
    };
  }, [onPaymentReceived, onBalanceUpdate, onDashboardRefresh, onError]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!userType || !token) {
      console.warn('[useWebSocket] Missing userType or token');
      return;
    }
    wsService.connect(userType, token);
  }, [userType, token]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsService.disconnect();
  }, []);

  // Send a message
  const send = useCallback((message) => {
    return wsService.send(message);
  }, []);

  // Request dashboard refresh
  const requestRefresh = useCallback(() => {
    return wsService.send({ type: 'refresh_request' });
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!userType || !token) return;

    // Connection state handler
    const handleConnection = (data) => {
      setConnectionState(data.status);
      setIsConnected(data.status === 'connected');
      
      if (data.status === 'reconnecting') {
        setReconnectAttempt(data.attempt || 0);
      } else {
        setReconnectAttempt(0);
      }
    };

    // Generic message handler
    const handleMessage = (message) => {
      setLastMessage(message);
    };

    // Payment received handler (for merchants)
    const handlePaymentReceived = (data) => {
      console.log('[useWebSocket] Payment received:', data);
      callbacksRef.current.onPaymentReceived?.(data);
    };

    // Balance update handler (for clients)
    const handleBalanceUpdate = (data) => {
      console.log('[useWebSocket] Balance update:', data);
      callbacksRef.current.onBalanceUpdate?.(data);
    };

    // Dashboard refresh handler
    const handleDashboardRefresh = (data) => {
      console.log('[useWebSocket] Dashboard refresh requested');
      callbacksRef.current.onDashboardRefresh?.(data);
    };

    // Payout update handler (for merchants)
    const handlePayoutUpdate = (data) => {
      console.log('[useWebSocket] Payout update:', data);
      // Trigger dashboard refresh for payout updates
      callbacksRef.current.onDashboardRefresh?.(data);
    };

    // Error handler
    const handleError = (error) => {
      console.error('[useWebSocket] Error:', error);
      callbacksRef.current.onError?.(error);
    };

    // Subscribe to events
    const unsubscribers = [
      wsService.on('connection', handleConnection),
      wsService.on('message', handleMessage),
      wsService.on('payment_received', handlePaymentReceived),
      wsService.on('balance_update', handleBalanceUpdate),
      wsService.on('dashboard_refresh', handleDashboardRefresh),
      wsService.on('payout_update', handlePayoutUpdate),
      wsService.on('error', handleError),
    ];

    // Auto-connect if enabled
    if (autoConnect) {
      connect();
    }

    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [userType, token, autoConnect, connect]);

  // Disconnect on unmount
  useEffect(() => {
    return () => {
      // Only disconnect if this is the last component using the connection
      // The service handles this internally
    };
  }, []);

  return {
    isConnected,
    connectionState,
    lastMessage,
    reconnectAttempt,
    connect,
    disconnect,
    send,
    requestRefresh,
  };
}

/**
 * Hook specifically for merchant dashboard WebSocket
 * @param {string} token - Merchant JWT token
 * @param {object} handlers - Event handlers
 */
export function useMerchantWebSocket(token, handlers = {}) {
  return useWebSocket('merchant', token, {
    onPaymentReceived: handlers.onPaymentReceived,
    onDashboardRefresh: handlers.onDashboardRefresh,
    onError: handlers.onError,
  });
}

/**
 * Hook specifically for client dashboard WebSocket
 * @param {string} token - Client JWT token
 * @param {object} handlers - Event handlers
 */
export function useClientWebSocket(token, handlers = {}) {
  return useWebSocket('client', token, {
    onBalanceUpdate: handlers.onBalanceUpdate,
    onDashboardRefresh: handlers.onDashboardRefresh,
    onError: handlers.onError,
  });
}

/**
 * Hook specifically for admin dashboard WebSocket
 * @param {string} token - Admin JWT token
 * @param {object} handlers - Event handlers
 */
export function useAdminWebSocket(token, handlers = {}) {
  return useWebSocket('admin', token, {
    onDashboardRefresh: handlers.onDashboardRefresh,
    onError: handlers.onError,
  });
}

export default useWebSocket;

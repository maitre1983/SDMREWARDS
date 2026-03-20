/**
 * useSSENotifications Hook
 * ========================
 * React hook for subscribing to real-time SSE notifications.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import sseNotificationService from '../services/sseNotificationService';

/**
 * Hook for subscribing to SSE notifications
 * @param {Object} options
 * @param {string} options.token - JWT token for authentication
 * @param {boolean} options.enabled - Whether to enable the connection (default: true)
 * @param {function} options.onPaymentReceived - Callback for payment notifications
 * @param {function} options.onConnected - Callback when connected
 * @param {function} options.onError - Callback on error
 */
export function useSSENotifications({
  token,
  enabled = true,
  onPaymentReceived,
  onConnected,
  onError
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastNotification, setLastNotification] = useState(null);
  
  // Use refs to keep callback references stable
  const onPaymentReceivedRef = useRef(onPaymentReceived);
  const onConnectedRef = useRef(onConnected);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  useEffect(() => {
    onPaymentReceivedRef.current = onPaymentReceived;
    onConnectedRef.current = onConnected;
    onErrorRef.current = onError;
  }, [onPaymentReceived, onConnected, onError]);

  useEffect(() => {
    if (!enabled || !token) {
      setIsConnected(false);
      setConnectionState('disconnected');
      return;
    }

    // Connect to SSE
    sseNotificationService.connect(token);

    // Subscribe to events
    const unsubConnected = sseNotificationService.on('connected', (data) => {
      setIsConnected(true);
      setConnectionState('connected');
      onConnectedRef.current?.(data);
    });

    const unsubPayment = sseNotificationService.on('payment_received', (data) => {
      setLastNotification(data);
      onPaymentReceivedRef.current?.(data);
    });

    const unsubError = sseNotificationService.on('error', (data) => {
      setIsConnected(false);
      setConnectionState('error');
      onErrorRef.current?.(data);
    });

    const unsubMaxReconnect = sseNotificationService.on('max_reconnect', () => {
      setConnectionState('failed');
    });

    // Update state periodically
    const stateInterval = setInterval(() => {
      const state = sseNotificationService.getState();
      setConnectionState(state);
      setIsConnected(state === 'connected');
    }, 5000);

    // Cleanup
    return () => {
      unsubConnected();
      unsubPayment();
      unsubError();
      unsubMaxReconnect();
      clearInterval(stateInterval);
      sseNotificationService.disconnect();
    };
  }, [token, enabled]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (token) {
      sseNotificationService.disconnect();
      sseNotificationService.connect(token);
    }
  }, [token]);

  return {
    isConnected,
    connectionState,
    lastNotification,
    reconnect
  };
}

export default useSSENotifications;

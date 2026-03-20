/**
 * SSE Notification Service
 * ========================
 * Handles Server-Sent Events for real-time merchant notifications.
 */

import { API_URL } from '@/config/api';

class SSENotificationService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 3000; // Start with 3 seconds
  }

  /**
   * Connect to SSE endpoint for merchant notifications
   * @param {string} token - Merchant JWT token
   */
  connect(token) {
    if (this.eventSource) {
      this.disconnect();
    }

    if (!token) {
      console.error('[SSE] No token provided');
      return;
    }

    const url = `${API_URL}/api/notifications/sse/merchant?token=${encodeURIComponent(token)}`;
    console.log('[SSE] Connecting to:', url.substring(0, 80) + '...');

    try {
      this.eventSource = new EventSource(url);

      // Connection opened
      this.eventSource.addEventListener('connected', (event) => {
        console.log('[SSE] Connected successfully');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 3000;
        this._notifyListeners('connected', JSON.parse(event.data));
      });

      // Payment received event
      this.eventSource.addEventListener('payment_received', (event) => {
        console.log('[SSE] Payment received event:', event.data);
        const data = JSON.parse(event.data);
        this._notifyListeners('payment_received', data);
      });

      // Heartbeat (keep-alive)
      this.eventSource.addEventListener('heartbeat', (event) => {
        // Silent heartbeat - just for keep-alive
        console.debug('[SSE] Heartbeat received');
      });

      // Generic message event (fallback)
      this.eventSource.onmessage = (event) => {
        console.log('[SSE] Generic message:', event.data);
        try {
          const data = JSON.parse(event.data);
          this._notifyListeners('message', data);
        } catch (e) {
          console.warn('[SSE] Failed to parse message:', e);
        }
      };

      // Error handling
      this.eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        this._notifyListeners('error', { error });

        // EventSource will auto-reconnect, but we track attempts
        if (this.eventSource.readyState === EventSource.CLOSED) {
          this._handleReconnect(token);
        }
      };

    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      this._handleReconnect(token);
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  _handleReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSE] Max reconnect attempts reached');
      this._notifyListeners('max_reconnect', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);

    console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect(token);
    }, delay);
  }

  /**
   * Disconnect from SSE
   */
  disconnect() {
    if (this.eventSource) {
      console.log('[SSE] Disconnecting...');
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event type ('payment_received', 'connected', 'error', etc.)
   * @param {function} callback - Callback function
   * @returns {function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Notify all listeners for an event
   */
  _notifyListeners(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[SSE] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.eventSource && this.eventSource.readyState === EventSource.OPEN;
  }

  /**
   * Get connection state
   */
  getState() {
    if (!this.eventSource) return 'disconnected';
    switch (this.eventSource.readyState) {
      case EventSource.CONNECTING: return 'connecting';
      case EventSource.OPEN: return 'connected';
      case EventSource.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }
}

// Singleton instance
const sseNotificationService = new SSENotificationService();

export default sseNotificationService;

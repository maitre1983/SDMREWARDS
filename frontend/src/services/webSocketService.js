/**
 * SDM REWARDS - WebSocket Service
 * ================================
 * Manages WebSocket connections for real-time dashboard updates.
 * Supports automatic reconnection and event handling.
 */

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnecting = false;
    this.userType = null;
    this.token = null;
    this.pingInterval = null;
  }

  /**
   * Connect to WebSocket server
   * @param {string} userType - 'merchant', 'client', or 'admin'
   * @param {string} token - JWT authentication token
   */
  connect(userType, token) {
    if (this.isConnecting || (this.socket && this.socket.readyState === WebSocket.OPEN)) {
      console.log('[WS] Already connected or connecting');
      return;
    }

    this.userType = userType;
    this.token = token;
    this.isConnecting = true;

    // Build WebSocket URL
    const baseUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = baseUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsHost}/api/ws/${userType}?token=${encodeURIComponent(token)}`;

    console.log(`[WS] Connecting to ${userType} WebSocket...`);

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log(`[WS] Connected as ${userType}`);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connection', { status: 'connected', userType });
        
        // Start ping interval to keep connection alive
        this.startPingInterval();
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log(`[WS] Received: ${message.type}`);
          
          // Emit to specific event listeners
          this.emit(message.type, message.data || message);
          
          // Also emit to 'message' for generic handlers
          this.emit('message', message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log(`[WS] Disconnected: ${event.code} - ${event.reason}`);
        this.isConnecting = false;
        this.stopPingInterval();
        this.emit('connection', { status: 'disconnected', code: event.code });
        
        // Attempt reconnection for unexpected disconnections
        if (event.code !== 1000 && event.code !== 4001) {
          this.attemptReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('[WS] Error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      };

    } catch (error) {
      console.error('[WS] Connection error:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.stopPingInterval();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    
    if (this.socket) {
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
    }
    
    this.userType = null;
    this.token = null;
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WS] Max reconnect attempts reached');
      this.emit('connection', { status: 'failed', reason: 'max_attempts' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.emit('connection', { status: 'reconnecting', attempt: this.reconnectAttempts });

    setTimeout(() => {
      if (this.userType && this.token) {
        this.connect(this.userType, this.token);
      }
    }, delay);
  }

  /**
   * Start ping interval to keep connection alive
   */
  startPingInterval() {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Send a message to the server
   * @param {object} message - Message to send
   */
  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return true;
    }
    console.warn('[WS] Cannot send - not connected');
    return false;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
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
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {function} callback - Callback function to remove
   */
  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit an event to all listeners
   * @param {string} event - Event name
   * @param {any} data - Data to pass to listeners
   */
  emit(event, data) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[WS] Error in ${event} listener:`, error);
      }
    });
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  get isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   * @returns {string} 'connecting', 'connected', 'disconnected', or 'closed'
   */
  get state() {
    if (!this.socket) return 'disconnected';
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

// Export singleton instance
const wsService = new WebSocketService();
export default wsService;

// Also export class for testing
export { WebSocketService };

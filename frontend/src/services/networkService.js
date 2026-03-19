/**
 * Network Quality Detection & Adaptive Service
 * Optimizes app behavior based on connection quality
 */

class NetworkService {
  constructor() {
    this.connectionQuality = 'good'; // 'excellent', 'good', 'slow', 'offline'
    this.listeners = new Set();
    this.lastPingTime = null;
    this.pingHistory = [];
    this.init();
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.updateConnectionStatus());
    window.addEventListener('offline', () => {
      this.connectionQuality = 'offline';
      this.notifyListeners();
    });

    // Check connection quality periodically
    this.checkConnectionQuality();
    setInterval(() => this.checkConnectionQuality(), 30000); // Every 30 seconds
  }

  async checkConnectionQuality() {
    if (!navigator.onLine) {
      this.connectionQuality = 'offline';
      this.notifyListeners();
      return;
    }

    const startTime = performance.now();
    
    try {
      // Ping our own API (smallest endpoint)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      const pingTime = performance.now() - startTime;
      this.lastPingTime = pingTime;
      
      // Keep last 5 pings for averaging
      this.pingHistory.push(pingTime);
      if (this.pingHistory.length > 5) this.pingHistory.shift();
      
      const avgPing = this.pingHistory.reduce((a, b) => a + b, 0) / this.pingHistory.length;
      
      // Determine quality based on response time
      if (avgPing < 300) {
        this.connectionQuality = 'excellent';
      } else if (avgPing < 800) {
        this.connectionQuality = 'good';
      } else if (avgPing < 2000) {
        this.connectionQuality = 'slow';
      } else {
        this.connectionQuality = 'very_slow';
      }
      
      this.notifyListeners();
    } catch (error) {
      if (error.name === 'AbortError') {
        this.connectionQuality = 'very_slow';
      } else {
        this.connectionQuality = navigator.onLine ? 'slow' : 'offline';
      }
      this.notifyListeners();
    }
  }

  updateConnectionStatus() {
    this.checkConnectionQuality();
  }

  // Get optimized settings based on connection quality
  getOptimizedSettings() {
    switch (this.connectionQuality) {
      case 'excellent':
        return {
          pollingInterval: 2000,      // Fast polling
          requestTimeout: 15000,      // Normal timeout
          retryCount: 3,
          enableAnimations: true,
          preloadData: true,
          imageQuality: 'high'
        };
      case 'good':
        return {
          pollingInterval: 3000,
          requestTimeout: 20000,
          retryCount: 3,
          enableAnimations: true,
          preloadData: true,
          imageQuality: 'medium'
        };
      case 'slow':
        return {
          pollingInterval: 5000,      // Slower polling
          requestTimeout: 30000,      // Longer timeout
          retryCount: 5,              // More retries
          enableAnimations: false,    // Disable animations
          preloadData: false,
          imageQuality: 'low'
        };
      case 'very_slow':
        return {
          pollingInterval: 8000,
          requestTimeout: 60000,
          retryCount: 7,
          enableAnimations: false,
          preloadData: false,
          imageQuality: 'minimal'
        };
      case 'offline':
        return {
          pollingInterval: 10000,
          requestTimeout: 60000,
          retryCount: 10,
          enableAnimations: false,
          preloadData: false,
          imageQuality: 'minimal'
        };
      default:
        return {
          pollingInterval: 3000,
          requestTimeout: 20000,
          retryCount: 3,
          enableAnimations: true,
          preloadData: true,
          imageQuality: 'medium'
        };
    }
  }

  // Subscribe to connection quality changes
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    const settings = this.getOptimizedSettings();
    this.listeners.forEach(callback => {
      callback({
        quality: this.connectionQuality,
        pingTime: this.lastPingTime,
        settings
      });
    });
  }

  // Get current status
  getStatus() {
    return {
      quality: this.connectionQuality,
      pingTime: this.lastPingTime,
      avgPingTime: this.pingHistory.length > 0 
        ? Math.round(this.pingHistory.reduce((a, b) => a + b, 0) / this.pingHistory.length)
        : null,
      settings: this.getOptimizedSettings()
    };
  }

  // Force refresh connection quality
  async refresh() {
    await this.checkConnectionQuality();
    return this.getStatus();
  }
}

// Singleton instance
const networkService = new NetworkService();
export default networkService;

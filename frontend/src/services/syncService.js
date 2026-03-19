/**
 * Real-time Sync Service
 * Keeps dashboards synchronized across admin, client, and merchant
 */

class SyncService {
  constructor() {
    this.listeners = new Map(); // eventType -> Set of callbacks
    this.lastSync = {};
    this.pollingIntervals = new Map();
    this.API_URL = process.env.REACT_APP_BACKEND_URL;
  }

  // Subscribe to specific events
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  // Notify all listeners of an event
  emit(eventType, data) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Start polling for payment status
  startPaymentPolling(paymentId, onUpdate, interval = 2000) {
    const pollKey = `payment_${paymentId}`;
    
    // Clear existing polling for this payment
    this.stopPolling(pollKey);
    
    const poll = async () => {
      try {
        const response = await fetch(`${this.API_URL}/api/payments/poll-status/${paymentId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          onUpdate(data);
          
          // Stop polling if payment is complete or failed
          if (data.completed || data.failed || !data.should_poll) {
            this.stopPolling(pollKey);
            this.emit('payment_completed', { paymentId, ...data });
          }
        }
      } catch (error) {
        console.warn('Payment polling error:', error);
      }
    };

    // Initial poll immediately
    poll();
    
    // Then poll at interval
    const intervalId = setInterval(poll, interval);
    this.pollingIntervals.set(pollKey, intervalId);
    
    return () => this.stopPolling(pollKey);
  }

  // Start polling for dashboard data
  startDashboardPolling(dashboardType, token, onUpdate, interval = 5000) {
    const pollKey = `dashboard_${dashboardType}`;
    
    this.stopPolling(pollKey);
    
    const endpoints = {
      client: '/api/clients/me',
      merchant: '/api/merchants/me',
      admin: '/api/admin/dashboard'
    };
    
    const endpoint = endpoints[dashboardType];
    if (!endpoint) return;
    
    const poll = async () => {
      try {
        const response = await fetch(`${this.API_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          onUpdate(data);
          this.lastSync[dashboardType] = Date.now();
        }
      } catch (error) {
        console.warn(`${dashboardType} dashboard polling error:`, error);
      }
    };

    poll();
    const intervalId = setInterval(poll, interval);
    this.pollingIntervals.set(pollKey, intervalId);
    
    return () => this.stopPolling(pollKey);
  }

  // Start activity feed polling
  startActivityPolling(token, userType, userId, onUpdate, interval = 3000) {
    const pollKey = `activity_${userType}_${userId}`;
    
    this.stopPolling(pollKey);
    
    const endpoints = {
      client: `/api/clients/${userId}/transactions`,
      merchant: `/api/merchants/${userId}/transactions`,
    };
    
    const endpoint = endpoints[userType];
    if (!endpoint) return;
    
    const poll = async () => {
      try {
        const response = await fetch(`${this.API_URL}${endpoint}?limit=10`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          onUpdate(data);
        }
      } catch (error) {
        console.warn('Activity polling error:', error);
      }
    };

    poll();
    const intervalId = setInterval(poll, interval);
    this.pollingIntervals.set(pollKey, intervalId);
    
    return () => this.stopPolling(pollKey);
  }

  stopPolling(pollKey) {
    const intervalId = this.pollingIntervals.get(pollKey);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(pollKey);
    }
  }

  stopAllPolling() {
    this.pollingIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();
  }

  // Manually trigger a sync
  async triggerSync(dashboardType, token) {
    const endpoints = {
      client: '/api/clients/me',
      merchant: '/api/merchants/me',
      admin: '/api/admin/dashboard'
    };
    
    const endpoint = endpoints[dashboardType];
    if (!endpoint) return null;
    
    try {
      const response = await fetch(`${this.API_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.lastSync[dashboardType] = Date.now();
        this.emit(`${dashboardType}_updated`, data);
        return data;
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
    return null;
  }
}

// Singleton instance
const syncService = new SyncService();
export default syncService;

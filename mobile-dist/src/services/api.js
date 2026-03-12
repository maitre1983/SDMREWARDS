/**
 * SDM REWARDS Mobile - API Service
 * Handles all API calls to the backend
 * Optimized for low-bandwidth connections
 */

import axios from 'axios';
import { Platform } from 'react-native';

// API Base URL - Change this to your production URL
const API_BASE_URL = 'https://web-boost-seo.preview.emergentagent.com/api';

// Create optimized axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Reduced timeout for faster failure detection
  headers: {
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip, deflate', // Request compressed responses
  },
});

// Response cache for offline support
const responseCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

// Request interceptor - add retry logic and compression
api.interceptors.request.use(
  (config) => {
    // Add timestamp for cache busting when needed
    if (config.skipCache) {
      config.params = { ...config.params, _t: Date.now() };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - cache responses and handle errors
api.interceptors.response.use(
  (response) => {
    // Cache GET responses
    if (response.config.method === 'get') {
      const cacheKey = response.config.url;
      responseCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
    }
    return response;
  },
  async (error) => {
    // If offline, try to return cached data
    if (!error.response && error.config?.method === 'get') {
      const cacheKey = error.config.url;
      const cached = responseCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL * 2) {
        return { data: cached.data, fromCache: true };
      }
    }
    return Promise.reject(error);
  }
);

// Storage helper for web/native compatibility
const storage = {
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      const SecureStore = require('expo-secure-store');
      await SecureStore.setItemAsync(key, value);
    }
  },
  async getItem(key) {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.getItemAsync(key);
    }
  },
  async removeItem(key) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      const SecureStore = require('expo-secure-store');
      await SecureStore.deleteItemAsync(key);
    }
  },
};

// Token management
export const setAuthToken = async (token) => {
  if (token) {
    await storage.setItem('auth_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const getAuthToken = async () => {
  const token = await storage.getItem('auth_token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  return token;
};

export const clearAuthToken = async () => {
  await storage.removeItem('auth_token');
  await storage.removeItem('user_type');
  await storage.removeItem('user_data');
  delete api.defaults.headers.common['Authorization'];
};

// User type management (client or merchant)
export const setUserType = async (type) => {
  await storage.setItem('user_type', type);
};

export const getUserType = async () => {
  return await storage.getItem('user_type');
};

export const setUserData = async (data) => {
  await storage.setItem('user_data', JSON.stringify(data));
};

export const getUserData = async () => {
  const data = await storage.getItem('user_data');
  return data ? JSON.parse(data) : null;
};

// ============== AUTH API ==============

export const authAPI = {
  // Send OTP
  sendOTP: async (phone, purpose = 'registration') => {
    const response = await api.post('/auth/otp/send', { phone, purpose });
    return response.data;
  },

  // Verify OTP
  verifyOTP: async (phone, code) => {
    const response = await api.post('/auth/otp/verify', { phone, code });
    return response.data;
  },

  // Client Registration
  registerClient: async (data) => {
    const response = await api.post('/auth/client/register', data);
    return response.data;
  },

  // Client Login
  loginClient: async (phone, password) => {
    const response = await api.post('/auth/client/login', { phone, password });
    return response.data;
  },

  // Client Login V2 with device trust support
  loginClientV2: async (loginPayload) => {
    const response = await api.post('/auth/client/login/v2', loginPayload);
    return response.data;
  },

  // Merchant Registration
  registerMerchant: async (data) => {
    const response = await api.post('/auth/merchant/register', data);
    return response.data;
  },

  // Merchant Login
  loginMerchant: async (phone, password) => {
    const response = await api.post('/auth/merchant/login', { phone, password });
    return response.data;
  },

  // Merchant Login V2 with device trust support
  loginMerchantV2: async (loginPayload) => {
    const response = await api.post('/auth/merchant/login/v2', loginPayload);
    return response.data;
  },

  // Get current user
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // List trusted devices
  listDevices: async () => {
    const response = await api.get('/auth/devices/list');
    return response.data;
  },

  // Revoke a single device
  revokeDevice: async (deviceCreatedAt) => {
    const response = await api.post('/auth/devices/revoke', {
      device_created_at: deviceCreatedAt
    });
    return response.data;
  },

  // Revoke all devices
  revokeAllDevices: async () => {
    const response = await api.post('/auth/devices/revoke-all');
    return response.data;
  },
};

// ============== CLIENT API ==============

export const clientAPI = {
  // Get dashboard data
  getDashboard: async () => {
    const response = await api.get('/clients/me');
    return response.data;
  },

  // Get transactions
  getTransactions: async (limit = 50) => {
    const response = await api.get(`/clients/transactions?limit=${limit}`);
    return response.data;
  },

  // Get referrals
  getReferrals: async () => {
    const response = await api.get('/clients/referrals');
    return response.data;
  },

  // Get available cards
  getAvailableCards: async () => {
    const response = await api.get('/clients/cards/available');
    return response.data;
  },

  // Purchase card
  purchaseCard: async (data) => {
    const response = await api.post('/clients/cards/purchase', data);
    return response.data;
  },

  // Upgrade card
  upgradeCard: async (data) => {
    const response = await api.post('/clients/cards/upgrade', data);
    return response.data;
  },

  // Get card details
  getCardDetails: async () => {
    const response = await api.get('/clients/cards/details');
    return response.data;
  },

  // Get card validity
  getCardValidity: async () => {
    const response = await api.get('/clients/cards/my-card');
    return response.data;
  },

  // Get payment settings
  getPaymentSettings: async () => {
    const response = await api.get('/clients/payment-settings');
    return response.data;
  },

  // Update payment settings
  updatePaymentSettings: async (settings) => {
    const response = await api.put('/clients/payment-settings', settings);
    return response.data;
  },

  // Get withdrawals history
  getWithdrawals: async () => {
    const response = await api.get('/clients/withdrawals');
    return response.data;
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await api.put('/clients/profile', data);
    return response.data;
  },

  // Get payment settings
  getPaymentSettings: async () => {
    const response = await api.get('/clients/payment-settings');
    return response.data;
  },

  // Update payment settings
  updatePaymentSettings: async (settings) => {
    const response = await api.put('/clients/payment-settings', settings);
    return response.data;
  },
};

// ============== MERCHANT API ==============

export const merchantAPI = {
  // Get dashboard data
  getDashboard: async () => {
    const response = await api.get('/merchants/me');
    return response.data;
  },

  // Get transactions
  getTransactions: async (params = {}) => {
    const response = await api.get('/merchants/transactions/history', { params });
    return response.data;
  },

  // Get payouts
  getPayouts: async () => {
    const response = await api.get('/merchants/payouts');
    return response.data;
  },

  // Get merchant by QR code
  getByQRCode: async (code) => {
    const response = await api.get(`/merchants/by-qr/${code}`);
    return response.data;
  },

  // Update business info
  updateBusinessInfo: async (data) => {
    const response = await api.put('/merchants/settings/business', data);
    return response.data;
  },

  // Get settings
  getSettings: async () => {
    const response = await api.get('/merchants/settings');
    return response.data;
  },

  // Update cashback rate
  updateCashbackRate: async (rate) => {
    const response = await api.put('/merchants/settings/cashback', { cashback_rate: rate });
    return response.data;
  },

  // ============== CASH PAYMENT / DEBIT ACCOUNT ==============
  
  // Get debit account info
  getDebitAccount: async () => {
    const response = await api.get('/merchants/debit-account');
    return response.data;
  },

  // Get debit history
  getDebitHistory: async (params = {}) => {
    const response = await api.get('/merchants/debit-history', { params });
    return response.data;
  },

  // Search customer by phone or ID
  searchCustomer: async (query) => {
    const response = await api.get(`/merchants/search-customer?query=${encodeURIComponent(query)}`);
    return response.data;
  },

  // Record a cash transaction
  recordCashTransaction: async (data) => {
    const response = await api.post('/merchants/cash-transaction', data);
    return response.data;
  },

  // Top up debit account via MoMo
  topUpDebitAccount: async (data) => {
    const response = await api.post('/merchants/topup-debit-account', data);
    return response.data;
  },

  // ============== PENDING CONFIRMATIONS ==============
  
  // Get pending cash payment confirmations
  getPendingConfirmations: async () => {
    const response = await api.get('/merchants/pending-confirmations');
    return response.data;
  },

  // Confirm a cash payment
  confirmCashPayment: async (transactionId) => {
    const response = await api.post(`/merchants/confirm-cash-payment/${transactionId}`);
    return response.data;
  },

  // Reject a cash payment
  rejectCashPayment: async (transactionId, reason = '') => {
    const response = await api.post(`/merchants/reject-cash-payment/${transactionId}`, { reason });
    return response.data;
  },
};

// ============== PAYMENTS API ==============

export const paymentsAPI = {
  // Initiate merchant payment
  initiateMerchantPayment: async (merchantId, amount, phone, network, useCashback = false, cashbackAmount = 0) => {
    const response = await api.post('/payments/merchant/initiate', {
      merchant_id: merchantId,
      amount,
      phone,
      network,
      use_cashback: useCashback,
      cashback_amount: cashbackAmount,
    });
    return response.data;
  },

  // Check payment status
  checkPaymentStatus: async (paymentId) => {
    const response = await api.get(`/payments/merchant/status/${paymentId}`);
    return response.data;
  },

  // Confirm test payment
  confirmTestPayment: async (paymentId) => {
    const response = await api.post(`/payments/merchant/test/confirm/${paymentId}`);
    return response.data;
  },

  // Get withdrawal fee
  getWithdrawalFee: async () => {
    const response = await api.get('/payments/withdrawal/fee');
    return response.data;
  },

  // Initiate withdrawal
  initiateWithdrawal: async (data) => {
    const response = await api.post('/payments/withdrawal/initiate', data);
    return response.data;
  },

  // Confirm test withdrawal
  confirmTestWithdrawal: async (withdrawalId) => {
    const response = await api.post(`/payments/withdrawal/test/confirm/${withdrawalId}`);
    return response.data;
  },
};

// ============== PUBLIC API ==============

export const publicAPI = {
  // Get partner merchants
  getMerchants: async (params = {}) => {
    const response = await api.get('/public/merchants', { params });
    return response.data;
  },

  // Get merchant detail
  getMerchantDetail: async (merchantId) => {
    const response = await api.get(`/public/merchants/${merchantId}`);
    return response.data;
  },
};

// ============== SERVICES API ==============

export const servicesAPI = {
  // Get service fees info
  getFeeInfo: async () => {
    const response = await api.get('/services/fees');
    return response.data;
  },

  // Get data services/networks
  getDataServices: async () => {
    const response = await api.get('/services/data/services');
    return response.data;
  },

  // Get data bundles for a service and phone
  getDataBundles: async (serviceId, phone) => {
    const response = await api.get(`/services/data/bundles/${serviceId}/${phone}`);
    return response.data;
  },

  // Purchase airtime
  purchaseAirtime: async (data) => {
    const response = await api.post('/services/airtime/purchase', data);
    return response.data;
  },

  // Purchase data bundle
  purchaseDataBundle: async (data) => {
    const response = await api.post('/services/data/purchase', data);
    return response.data;
  },
};

export default api;

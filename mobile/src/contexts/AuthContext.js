/**
 * SDM REWARDS Mobile - Auth Context
 * Global authentication state management
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  getUserType,
  setUserType,
  getUserData,
  setUserData,
  authAPI,
  clientAPI,
  merchantAPI,
} from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserTypeState] = useState(null); // 'client' or 'merchant'
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  // Check for existing session on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getAuthToken();
      const type = await getUserType();
      const savedUser = await getUserData();

      if (token && type) {
        setUserTypeState(type);
        setUser(savedUser);
        setIsAuthenticated(true);
        
        // Fetch fresh dashboard data
        await refreshDashboard(type);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDashboard = async (type = userType) => {
    try {
      if (type === 'client') {
        const data = await clientAPI.getDashboard();
        setDashboardData(data);
        setUser(data.client);
        await setUserData(data.client);
      } else if (type === 'merchant') {
        const data = await merchantAPI.getDashboard();
        setDashboardData(data);
        setUser(data.merchant);
        await setUserData(data.merchant);
      }
    } catch (error) {
      console.error('Dashboard refresh error:', error);
      if (error.response?.status === 401) {
        await logout();
      }
    }
  };

  const loginClient = async (phone, password) => {
    try {
      const response = await authAPI.loginClient(phone, password);
      if (response.access_token || response.token) {
        await setAuthToken(response.access_token || response.token);
        await setUserType('client');
        setUserTypeState('client');
        setUser(response.client);
        await setUserData(response.client);
        setIsAuthenticated(true);
        await refreshDashboard('client');
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  };

  const loginMerchant = async (phone, password) => {
    try {
      const response = await authAPI.loginMerchant(phone, password);
      if (response.access_token || response.token) {
        await setAuthToken(response.access_token || response.token);
        await setUserType('merchant');
        setUserTypeState('merchant');
        setUser(response.merchant);
        await setUserData(response.merchant);
        setIsAuthenticated(true);
        await refreshDashboard('merchant');
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  };

  const registerClient = async (data) => {
    try {
      const response = await authAPI.registerClient(data);
      if (response.token) {
        await setAuthToken(response.token);
        await setUserType('client');
        setUserTypeState('client');
        setUser(response.client);
        await setUserData(response.client);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed',
      };
    }
  };

  const registerMerchant = async (data) => {
    try {
      const response = await authAPI.registerMerchant(data);
      if (response.token) {
        await setAuthToken(response.token);
        await setUserType('merchant');
        setUserTypeState('merchant');
        setUser(response.merchant);
        await setUserData(response.merchant);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed',
      };
    }
  };

  const switchUserType = async (newType) => {
    // This allows switching between client and merchant views
    // User needs to login again for the new type
    await logout();
    setUserTypeState(newType);
  };

  const logout = async () => {
    await clearAuthToken();
    setIsAuthenticated(false);
    setUser(null);
    setUserTypeState(null);
    setDashboardData(null);
  };

  const value = {
    isLoading,
    isAuthenticated,
    userType,
    user,
    dashboardData,
    loginClient,
    loginMerchant,
    registerClient,
    registerMerchant,
    switchUserType,
    logout,
    refreshDashboard,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

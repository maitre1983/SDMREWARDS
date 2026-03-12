/**
 * Device Trust Utility for React Native
 * Manages trusted device tokens for passwordless/OTP-less login
 * Uses AsyncStorage for secure storage on mobile
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

const DEVICE_TOKEN_KEY_PREFIX = '@sdm_device_token_';
const DEVICE_INFO_KEY = '@sdm_device_info';

/**
 * Get device information for registration
 */
export const getDeviceInfo = async () => {
  try {
    const deviceId = await DeviceInfo.getUniqueId();
    const deviceName = await DeviceInfo.getDeviceName();
    const brand = DeviceInfo.getBrand();
    const model = DeviceInfo.getModel();
    const systemName = DeviceInfo.getSystemName();
    const systemVersion = DeviceInfo.getSystemVersion();
    
    const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';
    
    return {
      device_name: `${brand} ${model}`,
      device_type: deviceType,
      user_agent: `SDM-Mobile/${Platform.OS}/${systemVersion}`,
      platform: `${systemName} ${systemVersion}`,
      browser: 'SDM Mobile App',
      device_id: deviceId  // Unique device identifier
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    return {
      device_name: 'Mobile Device',
      device_type: Platform.OS === 'ios' ? 'ios' : 'android',
      user_agent: `SDM-Mobile/${Platform.OS}`,
      platform: Platform.OS,
      browser: 'SDM Mobile App'
    };
  }
};

/**
 * Store device token after successful login with "remember device"
 */
export const storeDeviceToken = async (userType, token) => {
  try {
    const key = `${DEVICE_TOKEN_KEY_PREFIX}${userType}`;
    await AsyncStorage.setItem(key, token);
    
    const deviceInfo = await getDeviceInfo();
    await AsyncStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(deviceInfo));
    
    return true;
  } catch (error) {
    console.error('Failed to store device token:', error);
    return false;
  }
};

/**
 * Get stored device token for a user type
 */
export const getDeviceToken = async (userType) => {
  try {
    const key = `${DEVICE_TOKEN_KEY_PREFIX}${userType}`;
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error('Failed to get device token:', error);
    return null;
  }
};

/**
 * Remove device token (logout from trusted device)
 */
export const removeDeviceToken = async (userType) => {
  try {
    const key = `${DEVICE_TOKEN_KEY_PREFIX}${userType}`;
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to remove device token:', error);
    return false;
  }
};

/**
 * Clear all device tokens (complete logout)
 */
export const clearAllDeviceTokens = async () => {
  try {
    const types = ['client', 'merchant', 'admin'];
    for (const type of types) {
      await AsyncStorage.removeItem(`${DEVICE_TOKEN_KEY_PREFIX}${type}`);
    }
    await AsyncStorage.removeItem(DEVICE_INFO_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear device tokens:', error);
    return false;
  }
};

/**
 * Check if device has a stored trusted token
 */
export const hasDeviceToken = async (userType) => {
  const token = await getDeviceToken(userType);
  return !!token;
};

/**
 * Build login request with device trust info
 */
export const buildLoginRequest = async (credentials, userType, rememberDevice = false) => {
  const deviceToken = await getDeviceToken(userType);
  const deviceInfo = await getDeviceInfo();
  
  return {
    ...credentials,
    device_token: deviceToken,
    remember_device: rememberDevice,
    device_info: deviceInfo
  };
};

export default {
  getDeviceInfo,
  storeDeviceToken,
  getDeviceToken,
  removeDeviceToken,
  clearAllDeviceTokens,
  hasDeviceToken,
  buildLoginRequest
};

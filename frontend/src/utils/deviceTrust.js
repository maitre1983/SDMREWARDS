/**
 * Device Trust Utility
 * Manages trusted device tokens for passwordless/OTP-less login
 */

const DEVICE_TOKEN_KEY_PREFIX = 'sdm_device_token_';
const DEVICE_INFO_KEY = 'sdm_device_info';

/**
 * Get device information for registration
 */
export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  
  // Detect browser
  let browser = 'Unknown';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browser = 'Opera';
  }
  
  // Detect device type
  let deviceType = 'web';
  if (/Android/i.test(userAgent)) {
    deviceType = 'android';
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    deviceType = 'ios';
  }
  
  // Generate a friendly device name
  let deviceName = `${browser} on ${platform}`;
  if (deviceType === 'android') {
    deviceName = 'Android Browser';
  } else if (deviceType === 'ios') {
    deviceName = 'iOS Browser';
  }
  
  return {
    device_name: deviceName,
    device_type: deviceType,
    user_agent: userAgent.substring(0, 500),
    platform: platform,
    browser: browser
  };
};

/**
 * Store device token after successful login with "remember device"
 */
export const storeDeviceToken = (userType, token) => {
  try {
    const key = `${DEVICE_TOKEN_KEY_PREFIX}${userType}`;
    localStorage.setItem(key, token);
    localStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(getDeviceInfo()));
    return true;
  } catch (e) {
    console.error('Failed to store device token:', e);
    return false;
  }
};

/**
 * Get stored device token for a user type
 */
export const getDeviceToken = (userType) => {
  try {
    const key = `${DEVICE_TOKEN_KEY_PREFIX}${userType}`;
    return localStorage.getItem(key);
  } catch (e) {
    console.error('Failed to get device token:', e);
    return null;
  }
};

/**
 * Remove device token (logout from trusted device)
 */
export const removeDeviceToken = (userType) => {
  try {
    const key = `${DEVICE_TOKEN_KEY_PREFIX}${userType}`;
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('Failed to remove device token:', e);
    return false;
  }
};

/**
 * Clear all device tokens (complete logout)
 */
export const clearAllDeviceTokens = () => {
  try {
    ['client', 'merchant', 'admin'].forEach(type => {
      localStorage.removeItem(`${DEVICE_TOKEN_KEY_PREFIX}${type}`);
    });
    localStorage.removeItem(DEVICE_INFO_KEY);
    return true;
  } catch (e) {
    console.error('Failed to clear device tokens:', e);
    return false;
  }
};

/**
 * Check if device has a stored trusted token
 */
export const hasDeviceToken = (userType) => {
  return !!getDeviceToken(userType);
};

/**
 * Build login request with device trust info
 */
export const buildLoginRequest = (credentials, userType, rememberDevice = false) => {
  const deviceToken = getDeviceToken(userType);
  const deviceInfo = getDeviceInfo();
  
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

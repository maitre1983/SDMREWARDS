/**
 * SDM REWARDS - Push Notifications Service
 * =========================================
 * Handles push notifications using expo-notifications and OneSignal
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '5c95e6f8-d2e8-4c22-b070-dfd556d746a0';
const PUSH_TOKEN_KEY = '@sdm_push_token';
const PUSH_REGISTERED_KEY = '@sdm_push_registered';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  /**
   * Initialize push notifications
   * Call this when app starts or user logs in
   */
  async initialize(userType = 'client') {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return { success: false, error: 'Physical device required' };
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return { success: false, error: 'Permission denied' };
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: ONESIGNAL_APP_ID, // Using OneSignal app ID as project ID
      });
      
      this.expoPushToken = tokenData.data;
      console.log('Expo Push Token:', this.expoPushToken);

      // Save token locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, this.expoPushToken);

      // Register with backend
      await this.registerWithBackend(userType);

      // Setup listeners
      this.setupListeners();

      // Android channel setup
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }

      return { success: true, token: this.expoPushToken };
    } catch (error) {
      console.error('Push notification init error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Register push token with backend
   */
  async registerWithBackend(userType = 'client') {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No auth token, skipping push registration');
        return;
      }

      const endpoint = userType === 'merchant' 
        ? '/api/merchants/push/register' 
        : '/api/clients/push/register';

      const response = await api.post(endpoint, {
        player_id: this.expoPushToken,
        platform: Platform.OS,
        device_model: Device.modelName || 'Unknown',
      });

      if (response.data.success) {
        await AsyncStorage.setItem(PUSH_REGISTERED_KEY, 'true');
        console.log('Push token registered with backend');
      }
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }

  /**
   * Unregister from push notifications
   */
  async unregister(userType = 'client') {
    try {
      const token = await AsyncStorage.getItem('token');
      const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);

      if (token && pushToken) {
        const endpoint = userType === 'merchant' 
          ? '/api/merchants/push/unregister' 
          : '/api/clients/push/unregister';

        await api.post(endpoint, { player_id: pushToken });
      }

      // Clear local storage
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      await AsyncStorage.removeItem(PUSH_REGISTERED_KEY);

      // Remove listeners
      this.removeListeners();

      console.log('Push notifications unregistered');
      return { success: true };
    } catch (error) {
      console.error('Unregister error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup notification listeners
   */
  setupListeners() {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // You can handle the notification here (e.g., show in-app alert)
    });

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      // Handle navigation based on notification data
      this.handleNotificationTap(data);
    });
  }

  /**
   * Remove notification listeners
   */
  removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * Handle notification tap navigation
   */
  handleNotificationTap(data) {
    // Navigation logic based on notification data
    // This will be called when user taps on a notification
    if (data?.screen) {
      // Navigate to specific screen
      console.log('Navigate to:', data.screen);
      // You would use navigation ref here to navigate
    }
  }

  /**
   * Setup Android notification channel
   */
  async setupAndroidChannel() {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SDM Rewards',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED', // Purple color
      sound: 'default',
    });

    // High priority channel for transactions
    await Notifications.setNotificationChannelAsync('transactions', {
      name: 'Transactions',
      description: 'Payment and cashback notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981', // Green color
      sound: 'default',
    });

    // Promotions channel
    await Notifications.setNotificationChannelAsync('promotions', {
      name: 'Promotions',
      description: 'Special offers and promotions',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  /**
   * Schedule a local notification (for testing or reminders)
   */
  async scheduleLocalNotification(title, body, data = {}, seconds = 1) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: { seconds },
    });
  }

  /**
   * Get current push token
   */
  async getToken() {
    if (this.expoPushToken) {
      return this.expoPushToken;
    }
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  }

  /**
   * Check if push is registered
   */
  async isRegistered() {
    const registered = await AsyncStorage.getItem(PUSH_REGISTERED_KEY);
    return registered === 'true';
  }

  /**
   * Get badge count
   */
  async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear all notifications
   */
  async clearAll() {
    await Notifications.dismissAllNotificationsAsync();
    await this.setBadgeCount(0);
  }
}

// Export singleton instance
export const pushNotifications = new PushNotificationService();
export default pushNotifications;

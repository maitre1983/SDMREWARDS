/**
 * SDM REWARDS - Notification Settings Component
 * ==============================================
 * Allows users to manage their push notification preferences
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import pushNotifications from '../services/pushNotifications';
import { useAuth } from '../contexts/AuthContext';

const NotificationSettings = ({ navigation }) => {
  const { userType } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      const isRegistered = await pushNotifications.isRegistered();
      setEnabled(isRegistered);
    } catch (error) {
      console.error('Error checking notification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifications = async (value) => {
    setProcessing(true);
    try {
      if (value) {
        // Enable notifications
        const result = await pushNotifications.initialize(userType);
        if (result.success) {
          setEnabled(true);
          Alert.alert(
            'Notifications Activées',
            'Vous recevrez désormais les notifications de SDM Rewards.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Erreur',
            result.error || 'Impossible d\'activer les notifications. Vérifiez vos paramètres.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Disable notifications
        const result = await pushNotifications.unregister(userType);
        if (result.success) {
          setEnabled(false);
          Alert.alert(
            'Notifications Désactivées',
            'Vous ne recevrez plus de notifications.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setProcessing(false);
    }
  };

  const testNotification = async () => {
    try {
      await pushNotifications.scheduleLocalNotification(
        'Test SDM Rewards',
        'Ceci est une notification de test!',
        { screen: 'Dashboard' },
        2
      );
      Alert.alert('Test envoyé', 'Une notification de test arrivera dans 2 secondes.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la notification de test.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications Push</Text>
      <Text style={styles.description}>
        Recevez des alertes pour vos paiements, cashbacks, et offres spéciales.
      </Text>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Ionicons name="notifications" size={24} color="#7C3AED" />
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Notifications Push</Text>
            <Text style={styles.settingSubtitle}>
              {enabled ? 'Activées' : 'Désactivées'}
            </Text>
          </View>
        </View>
        {processing ? (
          <ActivityIndicator size="small" color="#7C3AED" />
        ) : (
          <Switch
            value={enabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#374151', true: '#7C3AED' }}
            thumbColor={enabled ? '#fff' : '#9CA3AF'}
          />
        )}
      </View>

      {enabled && (
        <>
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Types de notifications</Text>
          
          <View style={styles.notificationTypes}>
            <View style={styles.typeRow}>
              <Ionicons name="cash-outline" size={20} color="#10B981" />
              <Text style={styles.typeText}>Paiements et cashbacks</Text>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
            
            <View style={styles.typeRow}>
              <Ionicons name="gift-outline" size={20} color="#F59E0B" />
              <Text style={styles.typeText}>Promotions et offres</Text>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
            
            <View style={styles.typeRow}>
              <Ionicons name="trophy-outline" size={20} color="#8B5CF6" />
              <Text style={styles.typeText}>Missions et récompenses</Text>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
          </View>

          <TouchableOpacity style={styles.testButton} onPress={testNotification}>
            <Ionicons name="paper-plane-outline" size={20} color="#fff" />
            <Text style={styles.testButtonText}>Envoyer une notification test</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
        <Text style={styles.infoText}>
          Vous pouvez également gérer les notifications dans les paramètres de votre téléphone.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  notificationTypes: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  typeText: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
    marginLeft: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
    lineHeight: 18,
  },
});

export default NotificationSettings;

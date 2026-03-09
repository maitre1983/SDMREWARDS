/**
 * SDM REWARDS Mobile - Merchant Settings Screen
 * Business info, cashback rate, PIN management, payouts
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Easing,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { merchantAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONTS, formatGhanaPhone } from '../../utils/constants';

const NETWORKS = [
  { id: 'MTN', name: 'MTN MoMo', color: '#FFCC00' },
  { id: 'TELECEL', name: 'Telecel Cash', color: '#E60000' },
  { id: 'AIRTELTIGO', name: 'AirtelTigo', color: '#0066CC' },
];

export default function MerchantSettingsScreen({ navigation }) {
  const { user, logout, refreshDashboard } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [editModal, setEditModal] = useState(null); // 'business', 'cashback', 'pin', 'payout'
  
  // Form states
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [cashbackRate, setCashbackRate] = useState('5');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoNetwork, setMomoNetwork] = useState('MTN');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const menuAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    const menuAnimations = menuAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: 200 + index * 80,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      })
    );
    Animated.stagger(80, menuAnimations).start();

    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await merchantAPI.getSettings();
      setSettings(response);
      
      // Populate form fields
      setBusinessName(response.business_name || user?.business_name || '');
      setBusinessType(response.business_type || user?.business_type || '');
      setBusinessAddress(response.address || user?.address || '');
      setBusinessPhone(response.phone?.replace('+233', '') || '');
      setGoogleMapsUrl(response.google_maps_url || '');
      setCashbackRate(String(response.cashback_rate || user?.cashback_rate || 5));
      setMomoNumber(response.momo_number?.replace('+233', '') || '');
      setMomoNetwork(response.momo_network || 'MTN');
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleUpdateBusiness = async () => {
    try {
      setLoading(true);
      await merchantAPI.updateBusinessInfo({
        business_name: businessName,
        business_type: businessType,
        address: businessAddress,
        phone: businessPhone ? formatGhanaPhone(businessPhone) : undefined,
        google_maps_url: googleMapsUrl,
      });
      await refreshDashboard();
      setEditModal(null);
      Alert.alert('Success', 'Business information updated');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCashback = async () => {
    const rate = parseFloat(cashbackRate);
    if (isNaN(rate) || rate < 0 || rate > 50) {
      Alert.alert('Error', 'Cashback rate must be between 0% and 50%');
      return;
    }
    
    try {
      setLoading(true);
      await merchantAPI.updateCashbackRate(rate);
      await refreshDashboard();
      setEditModal(null);
      Alert.alert('Success', `Cashback rate updated to ${rate}%`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async () => {
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      Alert.alert('Error', 'PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }
    
    // TODO: Implement PIN change API
    Alert.alert('Coming Soon', 'PIN change will be available soon');
    setEditModal(null);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  };

  const handleUpdatePayout = async () => {
    if (!momoNumber || momoNumber.length < 9) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    
    try {
      setLoading(true);
      await merchantAPI.updateBusinessInfo({
        momo_number: formatGhanaPhone(momoNumber),
        momo_network: momoNetwork,
      });
      await refreshDashboard();
      setEditModal(null);
      Alert.alert('Success', 'Payout settings updated');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const openGoogleMaps = () => {
    if (googleMapsUrl) {
      Linking.openURL(googleMapsUrl);
    }
  };

  const menuItems = [
    { 
      icon: 'business-outline', 
      label: 'Business Information', 
      subtitle: businessName || 'Set up your business',
      action: () => setEditModal('business'), 
      color: COLORS.primary 
    },
    { 
      icon: 'gift-outline', 
      label: 'Cashback Rate', 
      subtitle: `${cashbackRate}% cashback to customers`,
      action: () => setEditModal('cashback'), 
      color: COLORS.secondary 
    },
    { 
      icon: 'wallet-outline', 
      label: 'Payout Settings', 
      subtitle: momoNumber ? `${momoNetwork} - ${momoNumber}` : 'Set up payout method',
      action: () => setEditModal('payout'), 
      color: '#8B5CF6' 
    },
    { 
      icon: 'lock-closed-outline', 
      label: 'Change PIN', 
      subtitle: 'Update your security PIN',
      action: () => setEditModal('pin'), 
      color: '#3B82F6' 
    },
    { 
      icon: 'help-circle-outline', 
      label: 'Help & Support', 
      subtitle: 'Get help with your account',
      action: () => Linking.openURL('mailto:support@sdmrewards.com'), 
      color: '#06B6D4' 
    },
    { 
      icon: 'log-out-outline', 
      label: 'Logout', 
      subtitle: 'Sign out of your account',
      action: handleLogout, 
      color: '#EF4444' 
    },
  ];

  const getInitials = (name) => {
    if (!name) return 'M';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Particles */}
      <View style={styles.particlesContainer}>
        {[...Array(8)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.2 + Math.random() * 0.3],
                }),
                transform: [{ scale: 0.3 + Math.random() * 0.7 }],
              },
            ]}
          />
        ))}
      </View>

      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Settings</Text>
        
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
            style={styles.profileCard}
          >
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{getInitials(businessName)}</Text>
              </LinearGradient>
              <View style={styles.verifiedBadge}>
                <Ionicons name="storefront" size={12} color={COLORS.white} />
              </View>
            </View>
            
            <Text style={styles.businessName}>{businessName || 'Your Business'}</Text>
            <Text style={styles.businessType}>{businessType || 'Merchant'}</Text>
            
            <View style={styles.merchantBadge}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.secondary} />
              <Text style={styles.merchantBadgeText}>Verified Merchant</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{cashbackRate}%</Text>
                <Text style={styles.statLabel}>Cashback</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user?.qr_code || '-'}</Text>
                <Text style={styles.statLabel}>QR Code</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <Animated.View
              key={item.label}
              style={[
                styles.menuItemWrapper,
                {
                  opacity: menuAnims[index] || 1,
                  transform: [
                    {
                      translateX: (menuAnims[index] || new Animated.Value(1)).interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Business Info Modal */}
      <Modal
        visible={editModal === 'business'}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Business Information</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Enter business name"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Type</Text>
                <TextInput
                  style={styles.textInput}
                  value={businessType}
                  onChangeText={setBusinessType}
                  placeholder="e.g., Restaurant, Retail, Services"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={businessAddress}
                  onChangeText={setBusinessAddress}
                  placeholder="Enter business address"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+233</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={businessPhone}
                    onChangeText={setBusinessPhone}
                    placeholder="XX XXX XXXX"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Google Maps URL</Text>
                <TextInput
                  style={styles.textInput}
                  value={googleMapsUrl}
                  onChangeText={setGoogleMapsUrl}
                  placeholder="https://maps.google.com/..."
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                />
              </View>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateBusiness}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  style={styles.saveButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Cashback Rate Modal */}
      <Modal
        visible={editModal === 'cashback'}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cashback Rate</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Set the percentage of cashback your customers will receive on each purchase.
            </Text>
            
            <View style={styles.cashbackInputContainer}>
              <TextInput
                style={styles.cashbackInput}
                value={cashbackRate}
                onChangeText={setCashbackRate}
                keyboardType="numeric"
                maxLength={2}
              />
              <Text style={styles.cashbackPercent}>%</Text>
            </View>
            
            <Text style={styles.cashbackHint}>
              Recommended: 3-10% • Maximum: 50%
            </Text>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateCashback}
              disabled={loading}
            >
              <LinearGradient
                colors={[COLORS.secondary, '#059669']}
                style={styles.saveButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Update Rate</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payout Settings Modal */}
      <Modal
        visible={editModal === 'payout'}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payout Settings</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Configure where you want to receive your payments.
            </Text>
            
            <Text style={styles.sectionTitle}>Mobile Money Network</Text>
            <View style={styles.networkSelector}>
              {NETWORKS.map((net) => (
                <TouchableOpacity
                  key={net.id}
                  style={[
                    styles.networkOption,
                    momoNetwork === net.id && { borderColor: net.color, backgroundColor: `${net.color}15` }
                  ]}
                  onPress={() => setMomoNetwork(net.id)}
                >
                  <Text style={[
                    styles.networkOptionText,
                    momoNetwork === net.id && { color: net.color }
                  ]}>
                    {net.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MoMo Number</Text>
              <View style={styles.phoneInputRow}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>+233</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={momoNumber}
                  onChangeText={setMomoNumber}
                  placeholder="XX XXX XXXX"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdatePayout}
              disabled={loading}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.saveButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Payout Settings</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PIN Change Modal */}
      <Modal
        visible={editModal === 'pin'}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change PIN</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current PIN</Text>
              <TextInput
                style={styles.textInput}
                value={currentPin}
                onChangeText={setCurrentPin}
                placeholder="Enter current PIN"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New PIN</Text>
              <TextInput
                style={styles.textInput}
                value={newPin}
                onChangeText={setNewPin}
                placeholder="Enter new 4-digit PIN"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New PIN</Text>
              <TextInput
                style={styles.textInput}
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Confirm new PIN"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleChangePin}
              disabled={loading}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.saveButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Update PIN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: SPACING.md,
  },
  backButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  backButtonGradient: {
    padding: 10,
    borderRadius: 12,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  profileCard: {
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  businessName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  businessType: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginTop: 4,
  },
  merchantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    marginTop: SPACING.md,
    gap: 6,
  },
  merchantBadgeText: {
    color: COLORS.secondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    width: '100%',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  statValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  menuSection: {
    gap: SPACING.sm,
  },
  menuItemWrapper: {},
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  menuSubtitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
  },
  modalDescription: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
  },
  phoneInputRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  phonePrefix: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  phonePrefixText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  networkSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  networkOption: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  networkOptionText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  cashbackInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.xl,
  },
  cashbackInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    color: COLORS.text,
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 120,
  },
  cashbackPercent: {
    color: COLORS.secondary,
    fontSize: 36,
    fontWeight: 'bold',
    marginLeft: SPACING.sm,
  },
  cashbackHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: SPACING.md,
  },
  saveButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
});

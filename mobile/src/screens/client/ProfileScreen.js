/**
 * SDM REWARDS Mobile - Profile Screen
 * User settings and account management
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { clientAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONTS, formatGhanaPhone } from '../../utils/constants';

const NETWORKS = [
  { id: 'MTN', name: 'MTN MoMo', color: '#FFCC00' },
  { id: 'VODAFONE', name: 'Vodafone Cash', color: '#E60000' },
  { id: 'AIRTELTIGO', name: 'AirtelTigo Money', color: '#FF0000' },
];

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshDashboard } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [editMode, setEditMode] = useState(null); // 'profile', 'payment', null
  
  // Form state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoNetwork, setMomoNetwork] = useState('MTN');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const profileScale = useRef(new Animated.Value(0.9)).current;
  const menuAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    // Entrance animations
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
      Animated.spring(profileScale, {
        toValue: 1,
        delay: 200,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Menu items staggered animation
    const menuAnimations = menuAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: 300 + index * 80,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      })
    );
    Animated.stagger(80, menuAnimations).start();

    fetchPaymentSettings();
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      const response = await clientAPI.getPaymentSettings();
      setPaymentSettings(response);
      setMomoNumber(response.momo_number?.replace('+233', '') || '');
      setMomoNetwork(response.momo_network || 'MTN');
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      await clientAPI.updateProfile({ full_name: fullName });
      await refreshDashboard();
      setEditMode(null);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePaymentSettings = async () => {
    try {
      setLoading(true);
      await clientAPI.updatePaymentSettings({
        momo_number: formatGhanaPhone(momoNumber),
        momo_network: momoNetwork,
      });
      await fetchPaymentSettings();
      setEditMode(null);
      Alert.alert('Success', 'Payment settings updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment settings');
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

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', action: () => setEditMode('profile'), color: COLORS.primary },
    { icon: 'wallet-outline', label: 'Payment Settings', action: () => setEditMode('payment'), color: '#10B981' },
    { icon: 'card-outline', label: 'My Card', action: () => navigation.navigate('CardDetails'), color: '#8B5CF6' },
    { icon: 'shield-checkmark-outline', label: 'Security', action: () => Alert.alert('Coming Soon'), color: '#3B82F6' },
    { icon: 'log-out-outline', label: 'Logout', action: handleLogout, color: '#EF4444' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated background */}
      <View style={styles.particlesContainer}>
        {[...Array(10)].map((_, i) => (
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
        
        <Text style={styles.headerTitle}>Profile</Text>
        
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Animated.View style={{ transform: [{ scale: profileScale }] }}>
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
            style={styles.profileCard}
          >
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{getInitials(user?.full_name)}</Text>
              </LinearGradient>
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
              </View>
            </View>
            
            <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
            <Text style={styles.userPhone}>{user?.phone || ''}</Text>
            
            <View style={styles.membershipBadge}>
              <Ionicons name="star" size={14} color={COLORS.primary} />
              <Text style={styles.membershipText}>
                {user?.card_type?.toUpperCase() || 'MEMBER'}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>GHS {user?.cashback_balance?.toFixed(2) || '0.00'}</Text>
                <Text style={styles.statLabel}>Balance</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user?.referral_count || 0}</Text>
                <Text style={styles.statLabel}>Referrals</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user?.referral_code || '-'}</Text>
                <Text style={styles.statLabel}>Code</Text>
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
                  opacity: menuAnims[index],
                  transform: [
                    {
                      translateX: menuAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-30, 0],
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
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>SDM Rewards v1.0.0</Text>
        <Text style={styles.poweredBy}>Powered by GIT NFT GHANA LTD</Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editMode === 'profile'}
        transparent
        animationType="slide"
        onRequestClose={() => setEditMode(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditMode(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={[styles.input, styles.disabledInput]}>
                <Text style={styles.disabledText}>{user?.phone}</Text>
              </View>
              <Text style={styles.inputHint}>Phone number cannot be changed</Text>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateProfile}
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
          </View>
        </View>
      </Modal>

      {/* Payment Settings Modal */}
      <Modal
        visible={editMode === 'payment'}
        transparent
        animationType="slide"
        onRequestClose={() => setEditMode(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Settings</Text>
              <TouchableOpacity onPress={() => setEditMode(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MoMo Network</Text>
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
                    {momoNetwork === net.id && (
                      <Ionicons name="checkmark-circle" size={18} color={net.color} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
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
              onPress={handleUpdatePaymentSettings}
              disabled={loading}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.saveButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Payment Settings</Text>
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
    backgroundColor: '#F59E0B',
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
    borderRadius: 24,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 2,
  },
  userName: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  userPhone: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.md,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  membershipText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  menuSection: {
    marginBottom: SPACING.lg,
  },
  menuItemWrapper: {
    marginBottom: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuLabel: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  poweredBy: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  disabledInput: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  disabledText: {
    color: COLORS.textMuted,
  },
  inputHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: SPACING.xs,
  },
  networkSelector: {
    gap: SPACING.sm,
  },
  networkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  networkOptionText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
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

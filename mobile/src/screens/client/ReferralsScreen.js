/**
 * SDM REWARDS Mobile - Referrals Screen
 * Referral code sharing and referral list
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Easing,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { clientAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONTS } from '../../utils/constants';

export default function ReferralsScreen({ navigation }) {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const qrScale = useRef(new Animated.Value(0)).current;
  const statsAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
    ]).start();

    // QR code bounce
    Animated.spring(qrScale, {
      toValue: 1,
      delay: 300,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Stats staggered animation
    const statsAnimations = statsAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 400 + index * 100,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      })
    );
    Animated.stagger(100, statsAnimations).start();

    // Continuous pulse for QR
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const response = await clientAPI.getReferrals();
      setReferralData(response);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReferrals();
    setRefreshing(false);
  }, []);

  const referralCode = user?.referral_code || referralData?.referral_code || '';
  const referralLink = `https://sdmrewards.com/client?ref=${referralCode}`;

  const copyCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(referralLink);
    Alert.alert('Copied!', 'Referral link copied to clipboard');
  };

  const shareReferral = async () => {
    try {
      const message = `Join SDM Rewards and get cashback on every purchase! Use my referral code: ${referralCode}. Sign up here: ${referralLink}`;
      
      await Share.share({
        message,
        title: 'Join SDM Rewards',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const shareWhatsApp = () => {
    const message = `Join SDM Rewards and get cashback on every purchase! Use my referral code: ${referralCode}. Sign up here: ${referralLink}`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    // Linking.openURL(url);
  };

  const stats = [
    { 
      label: 'Total Referrals', 
      value: referralData?.total_referrals || 0,
      icon: 'people',
      color: COLORS.primary,
    },
    { 
      label: 'Active', 
      value: referralData?.active_referrals || 0,
      icon: 'checkmark-circle',
      color: COLORS.secondary,
    },
    { 
      label: 'Bonus Earned', 
      value: `GHS ${referralData?.total_bonus_earned || 0}`,
      icon: 'gift',
      color: '#8B5CF6',
    },
  ];

  const referrals = referralData?.referrals || [];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated particles */}
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
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Referrals</Text>
          <Text style={styles.headerSubtitle}>Invite friends & earn</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={shareReferral}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.shareButtonGradient}
          >
            <Ionicons name="share-social" size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* QR Code Card */}
        <Animated.View 
          style={[
            styles.qrCard,
            {
              transform: [
                { scale: Animated.multiply(qrScale, pulseAnim) }
              ],
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
            style={styles.qrCardGradient}
          >
            <Text style={styles.qrTitle}>Your Referral QR Code</Text>
            <Text style={styles.qrSubtitle}>Friends can scan to register with your code</Text>
            
            <View style={styles.qrContainer}>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={referralLink}
                  size={160}
                  backgroundColor="white"
                  color="#0F172A"
                />
              </View>
            </View>
            
            {/* Referral Code */}
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Your Code</Text>
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>{referralCode}</Text>
                <TouchableOpacity 
                  style={styles.copyButton}
                  onPress={copyCode}
                >
                  <Ionicons 
                    name={copiedCode ? 'checkmark' : 'copy-outline'} 
                    size={20} 
                    color={copiedCode ? COLORS.secondary : COLORS.primary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Share Buttons */}
            <View style={styles.shareButtons}>
              <TouchableOpacity 
                style={styles.shareOption}
                onPress={shareReferral}
              >
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  style={styles.shareOptionGradient}
                >
                  <Ionicons name="share-outline" size={18} color={COLORS.white} />
                  <Text style={styles.shareOptionText}>Share</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.shareOption}
                onPress={copyLink}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.shareOptionGradient}
                >
                  <Ionicons name="link-outline" size={18} color={COLORS.text} />
                  <Text style={[styles.shareOptionText, { color: COLORS.text }]}>Copy Link</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Invite from Contacts Button */}
            <TouchableOpacity 
              style={styles.contactsButton}
              onPress={() => navigation.navigate('Contacts')}
            >
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
                style={styles.contactsButtonGradient}
              >
                <Ionicons name="people" size={20} color={COLORS.secondary} />
                <Text style={styles.contactsButtonText}>Invite from Contacts</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.secondary} />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <Animated.View
              key={stat.label}
              style={[
                styles.statCard,
                {
                  opacity: statsAnims[index],
                  transform: [
                    {
                      translateY: statsAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                    {
                      scale: statsAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Animated.View>
          ))}
        </View>

        {/* How It Works */}
        <View style={styles.howItWorks}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsList}>
            {[
              { icon: 'share-social', text: 'Share your code with friends' },
              { icon: 'person-add', text: 'They register using your code' },
              { icon: 'card', text: 'They purchase a membership card' },
              { icon: 'gift', text: 'You both earn bonus cashback!' },
            ].map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stepIconContainer}>
                  <Ionicons name={step.icon} size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Referrals List */}
        <View style={styles.referralsList}>
          <Text style={styles.sectionTitle}>Your Referrals</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : referrals.length > 0 ? (
            referrals.map((ref, index) => {
              const isActive = ref.card_purchased || ref.display_status === 'active';
              const bonusPaid = ref.bonuses_paid;
              
              return (
                <View key={ref.id || index} style={styles.referralCard}>
                  <View style={[
                    styles.referralAvatar,
                    { backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)' }
                  ]}>
                    <Ionicons 
                      name="person" 
                      size={20} 
                      color={isActive ? COLORS.secondary : COLORS.textMuted} 
                    />
                  </View>
                  
                  <View style={styles.referralInfo}>
                    <Text style={styles.referralName}>
                      {ref.referred_client?.full_name || 'User'}
                    </Text>
                    <Text style={styles.referralDate}>
                      {new Date(ref.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.referralStatus}>
                    {bonusPaid ? (
                      <View style={styles.bonusTag}>
                        <Ionicons name="checkmark-circle" size={14} color={COLORS.secondary} />
                        <Text style={styles.bonusText}>+GHS {ref.referrer_bonus || 3}</Text>
                      </View>
                    ) : isActive ? (
                      <View style={[styles.statusTag, styles.activeTag]}>
                        <Text style={styles.activeText}>Active</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusTag, styles.pendingTag]}>
                        <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                        <Text style={styles.pendingText}>Pending</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No referrals yet</Text>
              <Text style={styles.emptyText}>
                Share your code and start earning bonuses!
              </Text>
            </View>
          )}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    padding: 10,
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  qrCard: {
    marginBottom: SPACING.lg,
    borderRadius: 20,
    overflow: 'hidden',
  },
  qrCardGradient: {
    padding: SPACING.xl,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
  },
  qrTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  qrSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  qrContainer: {
    marginBottom: SPACING.lg,
  },
  qrWrapper: {
    padding: SPACING.md,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  codeContainer: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  codeLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  codeText: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  copyButton: {
    padding: SPACING.sm,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  shareOption: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  shareOptionText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  contactsButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  contactsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  contactsButtonText: {
    color: COLORS.secondary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
    textAlign: 'center',
  },
  howItWorks: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  stepsList: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  referralsList: {
    marginBottom: SPACING.lg,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  referralAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  referralDate: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  referralStatus: {},
  bonusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  bonusText: {
    color: COLORS.secondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  activeText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  pendingTag: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
  },
  pendingText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
});

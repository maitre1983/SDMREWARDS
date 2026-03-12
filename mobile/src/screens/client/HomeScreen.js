/**
 * SDM REWARDS Mobile - Client Home Screen
 * Matching Web Dashboard Design with Animations
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, formatCurrency } from '../../utils/constants';

const { width } = Dimensions.get('window');
const LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/vc8llt43_WhatsApp%20Image%202026-03-04%20at%2020.16.26.jpeg";

export default function ClientHomeScreen({ navigation }) {
  const { user, dashboardData, refreshDashboard, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const balanceScale = useRef(new Animated.Value(0.9)).current;
  const cardPulse = useRef(new Animated.Value(1)).current;
  const statsAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const activityAnim = useRef(new Animated.Value(0)).current;
  const navAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    // Main entrance animation sequence
    Animated.sequence([
      // Fade in header
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
      ]),
      // Scale up balance card
      Animated.spring(balanceScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Stats cards staggered animation
    const statsAnimations = statsAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 300 + index * 100,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      })
    );
    Animated.stagger(100, statsAnimations).start();

    // Activity section animation
    Animated.timing(activityAnim, {
      toValue: 1,
      duration: 500,
      delay: 500,
      useNativeDriver: true,
    }).start();

    // Navigation bar staggered animation
    const navAnimations = navAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: 600 + index * 80,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      })
    );
    Animated.stagger(80, navAnimations).start();

    // Continuous pulse animation for balance card
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardPulse, {
          toValue: 1.02,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDashboard();
    setRefreshing(false);
  }, []);

  const balance = user?.cashback_balance || 0;
  const transactions = dashboardData?.recent_transactions || [];
  const stats = dashboardData?.stats || {};
  const totalEarned = stats.total_earned || user?.total_earned || 0;
  const totalSpent = stats.total_spent || user?.total_spent || 0;
  const referralsCount = user?.referral_count || 0;
  const bonusEarned = stats.referral_bonus || totalEarned;
  const userName = user?.full_name?.split(' ')[0] || 'User';
  const cardType = user?.card_type?.toUpperCase() || 'MEMBER';
  const isActive = user?.status === 'active';

  const handleNavPress = (screen, index) => {
    // Add a bounce animation on press
    Animated.sequence([
      Animated.timing(navAnims[index], {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(navAnims[index], {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
    
    if (screen !== 'Home') {
      navigation.navigate(screen);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated background particles */}
      <View style={styles.particlesContainer}>
        {[...Array(12)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.3 + Math.random() * 0.3],
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
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Image source={{ uri: LOGO_URL }} style={styles.headerLogo} />
          </View>
          <View>
            <Text style={styles.headerTitle}>SDM REWARDS</Text>
            <Text style={styles.headerSubtitle}>Hello, {userName}!</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Profile')}
            data-testid="profile-icon-btn"
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.headerIconGradient}
            >
              <Ionicons name="person-outline" size={20} color={COLORS.text} />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconBtn} 
            onPress={logout}
            data-testid="logout-icon-btn"
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.headerIconGradient}
            >
              <Ionicons name="log-out-outline" size={20} color={COLORS.text} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Balance Card */}
        <Animated.View 
          style={{ 
            transform: [
              { scale: Animated.multiply(balanceScale, cardPulse) }
            ] 
          }}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706', '#B45309']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            {/* Card glow effect */}
            <View style={styles.cardGlow} />
            
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Cashback Balance</Text>
              <View style={styles.memberBadge}>
                <Ionicons name="star" size={10} color="#D97706" />
                <Text style={styles.memberBadgeText}>{cardType}</Text>
              </View>
            </View>
            
            <Text style={styles.balanceAmount}>GHS {balance.toFixed(2)}</Text>
            
            <View style={styles.balanceStats}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Total Earned</Text>
                <Text style={styles.balanceStatValue}>GHS {totalEarned.toFixed(2)}</Text>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Total Spent</Text>
                <Text style={styles.balanceStatValue}>GHS {totalSpent.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.balanceActions}>
              <TouchableOpacity 
                style={styles.balanceActionBtn}
                onPress={() => navigation.navigate('Services')}
                data-testid="services-btn"
              >
                <Ionicons name="grid-outline" size={18} color={COLORS.white} />
                <Text style={styles.balanceActionText}>Services</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.balanceActionBtn}
                onPress={() => navigation.navigate('Withdrawal')}
                data-testid="withdraw-btn"
              >
                <Ionicons name="wallet-outline" size={18} color={COLORS.white} />
                <Text style={styles.balanceActionText}>Withdraw</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.balanceActionBtn, styles.settingsBtn]}
                onPress={() => navigation.navigate('Profile')}
                data-testid="settings-btn"
              >
                <Ionicons name="settings-outline" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <Animated.View 
            style={[
              styles.statCardWrapper,
              {
                opacity: statsAnims[0],
                transform: [
                  {
                    translateX: statsAnims[0].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 0],
                    }),
                  },
                  {
                    scale: statsAnims[0].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigation.navigate('Referrals')}
              activeOpacity={0.8}
              data-testid="referrals-card"
            >
              <LinearGradient
                colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
                style={styles.statCardGradient}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons name="trending-up" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.statLabel}>Referrals</Text>
                <Text style={styles.statValue}>{referralsCount}</Text>
                <View style={styles.statArrow}>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.statCardWrapper,
              {
                opacity: statsAnims[1],
                transform: [
                  {
                    translateX: statsAnims[1].interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                  {
                    scale: statsAnims[1].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
                style={styles.statCardGradient}
              >
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <Ionicons name="gift" size={24} color={COLORS.secondary} />
                </View>
                <Text style={styles.statLabel}>Bonus Earned</Text>
                <Text style={[styles.statValue, { color: COLORS.secondary }]}>GHS {bonusEarned.toFixed(0)}</Text>
              </LinearGradient>
            </View>
          </Animated.View>
        </View>

        {/* AI & Gamification Section */}
        <View style={styles.aiGamSection}>
          <TouchableOpacity 
            style={styles.aiCard}
            onPress={() => navigation.navigate('AIAssistant')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(168, 85, 247, 0.2)', 'rgba(168, 85, 247, 0.05)']}
              style={styles.aiCardGradient}
            >
              <View style={styles.aiIconContainer}>
                <Ionicons name="sparkles" size={24} color="#a855f7" />
              </View>
              <View style={styles.aiCardInfo}>
                <Text style={styles.aiCardTitle}>AI Assistant</Text>
                <Text style={styles.aiCardSubtitle}>Get personalized insights</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.gamButtonsRow}>
            <TouchableOpacity 
              style={styles.gamButton}
              onPress={() => navigation.navigate('Missions')}
              activeOpacity={0.8}
            >
              <View style={[styles.gamIconContainer, { backgroundColor: '#f59e0b20' }]}>
                <Ionicons name="trophy" size={20} color="#f59e0b" />
              </View>
              <Text style={styles.gamButtonText}>Missions</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.gamButton}
              onPress={() => navigation.navigate('ReferralShare')}
              activeOpacity={0.8}
            >
              <View style={[styles.gamIconContainer, { backgroundColor: '#22c55e20' }]}>
                <Ionicons name="gift" size={20} color="#22c55e" />
              </View>
              <Text style={styles.gamButtonText}>Invite</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <Animated.View 
          style={[
            styles.activitySection,
            {
              opacity: activityAnim,
              transform: [
                {
                  translateY: activityAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.activityHeader}>
            <View style={styles.activityHeaderLeft}>
              <Ionicons name="time" size={20} color={COLORS.primary} />
              <Text style={styles.activityTitle}>Recent Activity</Text>
            </View>
            <TouchableOpacity 
              onPress={() => navigation.navigate('History')}
              data-testid="view-all-btn"
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.activityCard}>
            {transactions.length > 0 ? (
              transactions.slice(0, 5).map((tx, index) => (
                <Animated.View 
                  key={tx.id || index} 
                  style={[
                    styles.transactionItem,
                    index === transactions.slice(0, 5).length - 1 && styles.lastTransactionItem,
                  ]}
                >
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: tx.type === 'cashback' || tx.type?.includes('earned') || tx.type?.includes('bonus') ? '#10B98120' : '#EF444420' }
                  ]}>
                    <Ionicons 
                      name={tx.type === 'cashback' || tx.type?.includes('earned') || tx.type?.includes('bonus') ? 'arrow-down' : 'arrow-up'} 
                      size={16} 
                      color={tx.type === 'cashback' || tx.type?.includes('earned') || tx.type?.includes('bonus') ? '#10B981' : '#EF4444'} 
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle} numberOfLines={1}>
                      {tx.description || tx.type?.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {new Date(tx.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: tx.type === 'cashback' || tx.type?.includes('earned') || tx.type?.includes('bonus') ? '#10B981' : '#EF4444' }
                  ]}>
                    {tx.type === 'cashback' || tx.type?.includes('earned') || tx.type?.includes('bonus') ? '+' : '-'}GHS {parseFloat(tx.amount || 0).toFixed(2)}
                  </Text>
                </Animated.View>
              ))
            ) : (
              <View style={styles.emptyActivity}>
                <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No transactions yet</Text>
                <Text style={styles.emptySubtext}>Your activity will appear here</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <LinearGradient
          colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.98)']}
          style={styles.bottomNavGradient}
        >
          {[
            { name: 'Home', icon: 'home', activeIcon: 'home', screen: 'Home' },
            { name: 'Partners', icon: 'storefront-outline', activeIcon: 'storefront', screen: 'Partners' },
            { name: 'QR', icon: 'qr-code-outline', activeIcon: 'qr-code', screen: 'QRScanner', isMain: true },
            { name: 'History', icon: 'time-outline', activeIcon: 'time', screen: 'History' },
            { name: 'Referrals', icon: 'people-outline', activeIcon: 'people', screen: 'Referrals' },
          ].map((item, index) => (
            <Animated.View
              key={item.name}
              style={[
                styles.navItemWrapper,
                {
                  opacity: navAnims[index],
                  transform: [
                    {
                      translateY: navAnims[index].interpolate({
                        inputRange: [0, 1, 1.2],
                        outputRange: [20, 0, -5],
                      }),
                    },
                    {
                      scale: navAnims[index].interpolate({
                        inputRange: [0, 1, 1.2],
                        outputRange: [0.5, 1, 1.1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity 
                style={[styles.navItem, index === 0 && styles.navItemActive]}
                onPress={() => handleNavPress(item.screen, index)}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                {item.isMain ? (
                  <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    style={styles.qrNavButton}
                  >
                    <Ionicons name={item.icon} size={26} color={COLORS.white} />
                  </LinearGradient>
                ) : (
                  <Ionicons 
                    name={index === 0 ? item.activeIcon : item.icon} 
                    size={22} 
                    color={index === 0 ? COLORS.primary : COLORS.textMuted} 
                  />
                )}
                <Text style={[
                  styles.navLabel, 
                  index === 0 && styles.navLabelActive,
                  item.isMain && styles.navLabelQR
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </LinearGradient>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  headerLogo: {
    width: 60,
    height: 60,
    marginLeft: -8,
    marginTop: -8,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerIconBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerIconGradient: {
    padding: 10,
    borderRadius: 12,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  balanceCard: {
    borderRadius: 24,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  cardGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONTS.sizes.md,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  memberBadgeText: {
    color: '#D97706',
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },
  balanceAmount: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  balanceStats: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  balanceStat: {
    flex: 1,
  },
  balanceStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: SPACING.lg,
  },
  balanceStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.sm,
  },
  balanceStatValue: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginTop: 2,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  balanceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 25,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  balanceActionText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  settingsBtn: {
    paddingHorizontal: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCardWrapper: {
    flex: 1,
  },
  statCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xs,
  },
  statValue: {
    color: COLORS.primary,
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  statArrow: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
  },
  activitySection: {
    marginBottom: SPACING.lg,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  activityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  activityTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  activityCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
  },
  lastTransactionItem: {
    borderBottomWidth: 0,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  transactionDate: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  emptyActivity: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '500',
    marginTop: SPACING.md,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xs,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomNavGradient: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
  },
  navItemWrapper: {
    flex: 1,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  navItemActive: {},
  navLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  navLabelActive: {
    color: COLORS.primary,
  },
  navLabelQR: {
    marginTop: 8,
  },
  qrNavButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  // AI & Gamification Section Styles
  aiGamSection: {
    marginBottom: SPACING.lg,
  },
  aiCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  aiCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  aiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCardInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  aiCardTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  aiCardSubtitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  gamButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  gamButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    gap: SPACING.sm,
  },
  gamIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gamButtonText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
});

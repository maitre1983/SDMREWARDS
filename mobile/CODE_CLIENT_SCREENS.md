# SDM REWARDS - Code des Écrans Client

## src/screens/client/HomeScreen.js

```javascript
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
});
```

## src/screens/client/PartnersScreen.js

```javascript
/**
 * SDM REWARDS Mobile - Partners Screen
 * Browse and search partner merchants
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Animated,
  Easing,
  Dimensions,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { publicAPI, merchantAPI } from '../../services/api';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../../utils/constants';

const { width } = Dimensions.get('window');

export default function PartnersScreen({ navigation }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([]).current;

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
      Animated.timing(searchAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    fetchMerchants();
  }, []);

  const fetchMerchants = async (search = '', city = null) => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (search) params.search = search;
      if (city) params.city = city;
      
      const response = await publicAPI.getMerchants(params);
      setMerchants(response.merchants || []);
      
      // Animate cards appearing
      animateCards(response.merchants?.length || 0);
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const animateCards = (count) => {
    // Initialize animation values for each card
    for (let i = cardAnims.length; i < count; i++) {
      cardAnims.push(new Animated.Value(0));
    }
    
    // Staggered animation
    const animations = cardAnims.slice(0, count).map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      })
    );
    
    Animated.stagger(50, animations).start();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMerchants(searchQuery, selectedCity);
    setRefreshing(false);
  }, [searchQuery, selectedCity]);

  const handleSearch = () => {
    fetchMerchants(searchQuery, selectedCity);
  };

  const handlePayMerchant = async (merchant) => {
    // Navigate to QR scanner with merchant info for payment
    // The QRScanner will show the payment modal directly
    navigation.navigate('QRScanner', { 
      merchant: {
        id: merchant.id,
        business_name: merchant.business_name,
        business_type: merchant.business_type,
        cashback_rate: merchant.cashback_rate || 5,
        payment_qr_code: merchant.qr_code,
        qr_code: merchant.qr_code,
        phone: merchant.phone,
      }
    });
  };

  const openMaps = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const callMerchant = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const cities = ['All', 'Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast'];

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
          data-testid="back-btn"
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Partner Merchants</Text>
          <Text style={styles.headerSubtitle}>Find & pay businesses</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={() => navigation.navigate('QRScanner')}
          data-testid="scan-btn"
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.scanButtonGradient}
          >
            <Ionicons name="qr-code" size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            opacity: searchAnim,
            transform: [
              {
                translateY: searchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
          style={styles.searchBar}
        >
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchants..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            data-testid="search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchMerchants(); }}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </LinearGradient>
        
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={handleSearch}
          data-testid="search-btn"
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.searchButtonGradient}
          >
            <Ionicons name="search" size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* City Filter */}
      <Animated.View style={{ opacity: searchAnim }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityFilter}
        >
          {cities.map((city) => (
            <TouchableOpacity
              key={city}
              style={[
                styles.cityChip,
                (city === 'All' ? selectedCity === null : selectedCity === city) && styles.cityChipActive,
              ]}
              onPress={() => {
                const newCity = city === 'All' ? null : city;
                setSelectedCity(newCity);
                fetchMerchants(searchQuery, newCity);
              }}
              data-testid={`city-${city.toLowerCase()}`}
            >
              <Text style={[
                styles.cityChipText,
                (city === 'All' ? selectedCity === null : selectedCity === city) && styles.cityChipTextActive,
              ]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Merchants List */}
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
        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {loading ? 'Searching...' : `${merchants.length} merchant${merchants.length !== 1 ? 's' : ''} found`}
        </Text>

        {loading && merchants.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : merchants.length > 0 ? (
          merchants.map((merchant, index) => (
            <Animated.View
              key={merchant.id || index}
              style={[
                styles.merchantCardWrapper,
                {
                  opacity: cardAnims[index] || 1,
                  transform: [
                    {
                      translateY: (cardAnims[index] || new Animated.Value(1)).interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                    {
                      scale: (cardAnims[index] || new Animated.Value(1)).interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View
                style={styles.merchantCard}
                data-testid={`merchant-card-${merchant.id}`}
              >
                <LinearGradient
                  colors={['rgba(30, 41, 59, 0.9)', 'rgba(30, 41, 59, 0.7)']}
                  style={styles.merchantCardGradient}
                >
                  {/* Merchant Header */}
                  <View style={styles.merchantHeader}>
                    <View style={styles.merchantIconContainer}>
                      <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.merchantIcon}
                      >
                        <Ionicons name="storefront" size={24} color={COLORS.white} />
                      </LinearGradient>
                    </View>
                    
                    <View style={styles.merchantInfo}>
                      <Text style={styles.merchantName} numberOfLines={1}>
                        {merchant.business_name}
                      </Text>
                      {merchant.business_type && (
                        <Text style={styles.merchantType} numberOfLines={1}>
                          {merchant.business_type}
                        </Text>
                      )}
                    </View>
                    
                    {/* Cashback Badge */}
                    {merchant.cashback_rate && (
                      <View style={styles.cashbackBadge}>
                        <Ionicons name="gift" size={12} color={COLORS.secondary} />
                        <Text style={styles.cashbackText}>{merchant.cashback_rate}%</Text>
                      </View>
                    )}
                  </View>

                  {/* Merchant Details */}
                  <View style={styles.merchantDetails}>
                    {/* Location */}
                    {(merchant.business_address || merchant.city) && (
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={16} color={COLORS.textMuted} />
                        <Text style={styles.detailText} numberOfLines={2}>
                          {merchant.business_address || merchant.city}
                        </Text>
                      </View>
                    )}
                    
                    {/* Phone */}
                    {merchant.phone && (
                      <TouchableOpacity 
                        style={styles.detailRow}
                        onPress={() => callMerchant(merchant.phone)}
                      >
                        <Ionicons name="call-outline" size={16} color={COLORS.primary} />
                        <Text style={[styles.detailText, styles.phoneText]}>
                          {merchant.phone}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.merchantActions}>
                    {merchant.google_maps_url && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                          e.stopPropagation && e.stopPropagation();
                          openMaps(merchant.google_maps_url);
                        }}
                        data-testid={`maps-btn-${merchant.id}`}
                      >
                        <LinearGradient
                          colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']}
                          style={styles.actionButtonGradient}
                        >
                          <Ionicons name="navigate" size={16} color="#3B82F6" />
                          <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>
                            Directions
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.payButton]}
                      onPress={(e) => {
                        e.stopPropagation && e.stopPropagation();
                        handlePayMerchant(merchant);
                      }}
                      data-testid={`pay-btn-${merchant.id}`}
                    >
                      <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.actionButtonGradient}
                      >
                        <Ionicons name="wallet" size={16} color={COLORS.white} />
                        <Text style={[styles.actionButtonText, { color: COLORS.white }]}>
                          Pay
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="storefront-outline" size={64} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No merchants found</Text>
            <Text style={styles.emptyText}>
              Try a different search term or city
            </Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSearchQuery('');
                setSelectedCity(null);
                fetchMerchants();
              }}
            >
              <Text style={styles.resetButtonText}>Show all merchants</Text>
            </TouchableOpacity>
          </View>
        )}
        
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
  scanButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  scanButtonGradient: {
    padding: 10,
    borderRadius: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
  },
  searchButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchButtonGradient: {
    padding: 12,
    borderRadius: 12,
  },
  cityFilter: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  cityChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: SPACING.sm,
  },
  cityChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: COLORS.primary,
  },
  cityChipText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  cityChipTextActive: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  resultsCount: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  merchantCardWrapper: {
    marginBottom: SPACING.md,
  },
  merchantCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  merchantCardGradient: {
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  merchantIconContainer: {
    marginRight: SPACING.md,
  },
  merchantIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  merchantType: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  cashbackText: {
    color: COLORS.secondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  merchantDetails: {
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  detailText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 18,
  },
  phoneText: {
    color: COLORS.primary,
  },
  merchantActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    gap: SPACING.xs,
  },
  actionButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  payButton: {
    flex: 1.5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  resetButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 25,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  resetButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
});
```

## src/screens/client/QRScannerScreen.js

```javascript
/**
 * SDM REWARDS Mobile - QR Scanner Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, LoadingOverlay, NetworkSelector } from '../../components/Common';
import { merchantAPI, paymentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, NETWORKS, formatCurrency } from '../../utils/constants';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

export default function QRScannerScreen({ navigation, route }) {
  const { user, refreshDashboard } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [merchant, setMerchant] = useState(route.params?.merchant || null);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [network, setNetwork] = useState('MTN');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // null, 'pending', 'success', 'failed'
  const [paymentId, setPaymentId] = useState(null);
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    // If merchant passed via route, skip camera
    if (route.params?.merchant) {
      setMerchant(route.params.merchant);
      setScanned(true);
    }
    
    if (!permission?.granted && !route.params?.merchant) {
      requestPermission();
    }
  }, [permission, route.params]);

  const extractMerchantCode = (data) => {
    // Handle different QR formats
    // Full URL: https://domain.com/pay/MERCHANT123
    // Short code: MERCHANT123
    if (data.includes('/pay/')) {
      const parts = data.split('/pay/');
      return parts[parts.length - 1];
    }
    return data;
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);

    try {
      const code = extractMerchantCode(data);
      const response = await merchantAPI.getByQRCode(code);
      
      if (response.merchant) {
        setMerchant(response.merchant);
      } else {
        Alert.alert('Error', 'Merchant not found');
        setScanned(false);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to find merchant');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    if (!amount || parseFloat(amount) < 1) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await paymentsAPI.initiateMerchantPayment(
        merchant.id,
        parseFloat(amount),
        phone,
        network
      );

      if (response.success) {
        setPaymentId(response.payment_id);
        setIsTestMode(response.test_mode || false);
        setPaymentStatus('pending');
      } else {
        Alert.alert('Error', response.detail || 'Payment failed');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentId) return;
    setLoading(true);

    try {
      const response = await paymentsAPI.checkPaymentStatus(paymentId);
      
      if (response.status === 'completed') {
        setPaymentStatus('success');
        await refreshDashboard();
      } else if (response.status === 'failed') {
        setPaymentStatus('failed');
      }
      // If still pending, status remains 'pending'
    } catch (error) {
      Alert.alert('Error', 'Failed to check payment status');
    } finally {
      setLoading(false);
    }
  };

  const confirmTestPayment = async () => {
    if (!paymentId) return;
    setLoading(true);

    try {
      const response = await paymentsAPI.confirmTestPayment(paymentId);
      if (response.success) {
        setPaymentStatus('success');
        await refreshDashboard();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm payment');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setMerchant(null);
    setAmount('');
    setPaymentStatus(null);
    setPaymentId(null);
    // If came from partners, go back
    if (route.params?.merchant) {
      navigation.goBack();
    }
  };

  // If merchant passed via route, show payment modal directly
  if (route.params?.merchant && merchant) {
    return (
      <View style={styles.container}>
        {renderPaymentModal()}
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission is required to scan QR codes</Text>
        <Button title="Grant Permission" onPress={requestPermission} style={{ marginTop: 20 }} />
      </View>
    );
  }

  // Payment Modal
  const renderPaymentModal = () => (
    <Modal visible={!!merchant} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LoadingOverlay visible={loading} />
          
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={resetScanner}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>

          {paymentStatus === 'success' ? (
            <View style={styles.statusContainer}>
              <View style={[styles.statusIcon, styles.successIcon]}>
                <Ionicons name="checkmark" size={48} color={COLORS.success} />
              </View>
              <Text style={styles.statusTitle}>Payment Successful!</Text>
              <Text style={styles.statusSubtitle}>
                Cashback credited to your wallet
              </Text>
              <Button title="Done" onPress={() => navigation.goBack()} style={{ marginTop: 24 }} />
            </View>
          ) : paymentStatus === 'failed' ? (
            <View style={styles.statusContainer}>
              <View style={[styles.statusIcon, styles.failedIcon]}>
                <Ionicons name="close" size={48} color={COLORS.error} />
              </View>
              <Text style={styles.statusTitle}>Payment Failed</Text>
              <Button title="Try Again" onPress={() => setPaymentStatus(null)} style={{ marginTop: 24 }} />
            </View>
          ) : paymentStatus === 'pending' ? (
            <View style={styles.statusContainer}>
              <View style={[styles.statusIcon, styles.pendingIcon]}>
                <Ionicons name="phone-portrait" size={48} color={COLORS.warning} />
              </View>
              <Text style={styles.statusTitle}>Waiting for Payment</Text>
              <Text style={styles.statusSubtitle}>
                Approve the MoMo prompt on your phone
              </Text>
              <View style={styles.cashbackPreview}>
                <Text style={styles.cashbackLabel}>Expected Cashback</Text>
                <Text style={styles.cashbackAmount}>
                  +{formatCurrency(parseFloat(amount) * (merchant?.cashback_rate || 5) / 100 * 0.95)}
                </Text>
              </View>
              <View style={styles.buttonGroup}>
                <Button
                  title="Check Status"
                  onPress={checkPaymentStatus}
                  variant="outline"
                  style={{ flex: 1 }}
                />
                {isTestMode && (
                  <Button
                    title="Confirm Test"
                    onPress={confirmTestPayment}
                    style={{ flex: 1, marginLeft: 12 }}
                  />
                )}
              </View>
            </View>
          ) : (
            <>
              {/* Merchant Info */}
              <View style={styles.merchantInfo}>
                <View style={styles.merchantIcon}>
                  <Ionicons name="storefront" size={32} color={COLORS.white} />
                </View>
                <Text style={styles.merchantName}>{merchant?.business_name}</Text>
                <View style={styles.cashbackBadge}>
                  <Ionicons name="gift" size={14} color={COLORS.success} />
                  <Text style={styles.cashbackBadgeText}>
                    {merchant?.cashback_rate || 5}% Cashback
                  </Text>
                </View>
              </View>

              {/* Payment Form */}
              <Input
                label="MoMo Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="0XX XXX XXXX"
                keyboardType="phone-pad"
                icon="call-outline"
              />

              <View style={{ marginBottom: SPACING.lg }}>
                <Text style={styles.inputLabel}>Network</Text>
                <NetworkSelector
                  selected={network}
                  onSelect={setNetwork}
                  networks={NETWORKS}
                />
              </View>

              <Input
                label="Amount (GHS)"
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount"
                keyboardType="decimal-pad"
                icon="cash-outline"
              />

              {/* Cashback Preview */}
              {amount && parseFloat(amount) > 0 && (
                <View style={styles.cashbackPreview}>
                  <Text style={styles.cashbackLabel}>Expected Cashback</Text>
                  <Text style={styles.cashbackAmount}>
                    +{formatCurrency(parseFloat(amount) * (merchant?.cashback_rate || 5) / 100 * 0.95)}
                  </Text>
                </View>
              )}

              <Button
                title="Pay with MoMo"
                onPress={initiatePayment}
                icon="wallet"
                style={{ marginTop: SPACING.lg }}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Merchant QR</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Scan Frame */}
      <View style={styles.scanFrame}>
        <View style={styles.scanArea}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Point your camera at a merchant's QR code
        </Text>
      </View>

      {renderPaymentModal()}
      <LoadingOverlay visible={loading && !merchant} message="Finding merchant..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  camera: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  scanFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  instructions: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  permissionText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    textAlign: 'center',
    padding: SPACING.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xl,
    maxHeight: height * 0.85,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    zIndex: 1,
  },
  merchantInfo: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  merchantIcon: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  merchantName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  cashbackBadgeText: {
    color: COLORS.success,
    marginLeft: SPACING.xs,
    fontWeight: '600',
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
  },
  cashbackPreview: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  cashbackLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  cashbackAmount: {
    color: COLORS.success,
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  successIcon: {
    backgroundColor: COLORS.successBg,
  },
  failedIcon: {
    backgroundColor: COLORS.errorBg,
  },
  pendingIcon: {
    backgroundColor: COLORS.warningBg,
  },
  statusTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
  },
  statusSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    marginTop: SPACING.xl,
    width: '100%',
  },
});
```

## src/screens/client/HistoryScreen.js

```javascript
/**
 * SDM REWARDS Mobile - History Screen
 * Transaction history with filters and pagination
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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { clientAPI } from '../../services/api';
import { COLORS, SPACING, FONTS, formatCurrency } from '../../utils/constants';

export default function HistoryScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, earned, spent
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;

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
      Animated.timing(filterAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    fetchTransactions();
  }, []);

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      const response = await clientAPI.getTransactions(100);
      setTransactions(response.transactions || []);
      setPagination({
        page: response.pagination?.page || 1,
        total: response.pagination?.total_count || response.transactions?.length || 0,
        pages: response.pagination?.total_pages || 1,
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, []);

  const getFilteredTransactions = () => {
    if (filter === 'all') return transactions;
    if (filter === 'earned') {
      return transactions.filter(tx => 
        tx.type?.includes('earned') || 
        tx.type?.includes('bonus') || 
        tx.type === 'cashback' ||
        tx.type === 'welcome_bonus' ||
        tx.type === 'referral_bonus'
      );
    }
    if (filter === 'spent') {
      return transactions.filter(tx => 
        tx.type?.includes('payment') || 
        tx.type?.includes('withdrawal') ||
        tx.type?.includes('purchase') ||
        tx.type === 'card_purchase'
      );
    }
    return transactions;
  };

  const getTransactionIcon = (type) => {
    if (type?.includes('earned') || type?.includes('bonus') || type === 'cashback') {
      return { name: 'arrow-down', color: COLORS.secondary, bg: 'rgba(16, 185, 129, 0.15)' };
    }
    if (type?.includes('withdrawal')) {
      return { name: 'wallet-outline', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
    }
    if (type?.includes('payment') || type?.includes('purchase')) {
      return { name: 'cart-outline', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
    }
    if (type === 'welcome_bonus') {
      return { name: 'gift', color: COLORS.primary, bg: 'rgba(245, 158, 11, 0.15)' };
    }
    if (type === 'referral_bonus') {
      return { name: 'people', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
    }
    return { name: 'swap-horizontal', color: COLORS.textMuted, bg: 'rgba(100, 116, 139, 0.15)' };
  };

  const isPositiveTransaction = (type) => {
    return type?.includes('earned') || 
           type?.includes('bonus') || 
           type === 'cashback' ||
           type === 'welcome_bonus' ||
           type === 'referral_bonus';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTransactions = getFilteredTransactions();

  const filters = [
    { key: 'all', label: 'All', icon: 'list' },
    { key: 'earned', label: 'Earned', icon: 'trending-up' },
    { key: 'spent', label: 'Spent', icon: 'trending-down' },
  ];

  // Calculate totals
  const totalEarned = transactions
    .filter(tx => isPositiveTransaction(tx.type))
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  
  const totalSpent = transactions
    .filter(tx => !isPositiveTransaction(tx.type))
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

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
          <Text style={styles.headerTitle}>Transaction History</Text>
          <Text style={styles.headerSubtitle}>{pagination.total} transactions</Text>
        </View>
        
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* Summary Cards */}
      <Animated.View 
        style={[
          styles.summaryContainer,
          { opacity: filterAnim }
        ]}
      >
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
            style={styles.summaryCardGradient}
          >
            <Ionicons name="trending-up" size={20} color={COLORS.secondary} />
            <Text style={styles.summaryLabel}>Total Earned</Text>
            <Text style={[styles.summaryValue, { color: COLORS.secondary }]}>
              GHS {totalEarned.toFixed(2)}
            </Text>
          </LinearGradient>
        </View>
        
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)']}
            style={styles.summaryCardGradient}
          >
            <Ionicons name="trending-down" size={20} color="#EF4444" />
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
              GHS {totalSpent.toFixed(2)}
            </Text>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Filter Tabs */}
      <Animated.View 
        style={[
          styles.filterContainer,
          { opacity: filterAnim }
        ]}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterTab,
              filter === f.key && styles.filterTabActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Ionicons 
              name={f.icon} 
              size={16} 
              color={filter === f.key ? COLORS.primary : COLORS.textMuted} 
            />
            <Text style={[
              styles.filterText,
              filter === f.key && styles.filterTextActive,
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Transactions List */}
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map((tx, index) => {
            const iconConfig = getTransactionIcon(tx.type);
            const isPositive = isPositiveTransaction(tx.type);
            
            return (
              <Animated.View
                key={tx.id || index}
                style={[
                  styles.transactionCard,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={[styles.transactionIcon, { backgroundColor: iconConfig.bg }]}>
                  <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
                </View>
                
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle} numberOfLines={1}>
                    {tx.description || tx.type?.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDate(tx.created_at)}
                  </Text>
                </View>
                
                <Text style={[
                  styles.transactionAmount,
                  { color: isPositive ? COLORS.secondary : '#EF4444' }
                ]}>
                  {isPositive ? '+' : '-'}GHS {parseFloat(tx.amount || 0).toFixed(2)}
                </Text>
              </Animated.View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No transactions</Text>
            <Text style={styles.emptyText}>
              {filter !== 'all' 
                ? `No ${filter} transactions found` 
                : 'Your transaction history will appear here'}
            </Text>
          </View>
        )}
        
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
    alignItems: 'center',
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  summaryCardGradient: {
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: SPACING.xs,
  },
  summaryValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: SPACING.xs,
  },
  filterTabActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  transactionDate: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
  },
});
```

## src/screens/client/ReferralsScreen.js

```javascript
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
```

## src/screens/client/ServicesScreen.js

```javascript
/**
 * SDM REWARDS Mobile - Services Screen
 * Airtime and Data Bundle purchases
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { servicesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONTS, formatGhanaPhone } from '../../utils/constants';

const NETWORKS = [
  { id: 'mtn', name: 'MTN', color: '#FFCC00', icon: 'cellular' },
  { id: 'vodafone', name: 'Vodafone', color: '#E60000', icon: 'cellular' },
  { id: 'airteltigo', name: 'AirtelTigo', color: '#FF0000', icon: 'cellular' },
];

const QUICK_AMOUNTS = [1, 2, 5, 10, 20, 50];

export default function ServicesScreen({ navigation }) {
  const { user, refreshDashboard } = useAuth();
  const [activeTab, setActiveTab] = useState('airtime');
  const [phone, setPhone] = useState(user?.phone || '');
  const [network, setNetwork] = useState('mtn');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [feeInfo, setFeeInfo] = useState(null);
  
  // Data bundles state
  const [dataServices, setDataServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [bundles, setBundles] = useState([]);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [loadingBundles, setLoadingBundles] = useState(false);
  
  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState(null); // null, 'processing', 'success', 'failed'
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const tabIndicator = useRef(new Animated.Value(0)).current;

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

    fetchFeeInfo();
    fetchDataServices();
  }, []);

  useEffect(() => {
    // Animate tab indicator
    Animated.spring(tabIndicator, {
      toValue: activeTab === 'airtime' ? 0 : 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const fetchFeeInfo = async () => {
    try {
      const response = await servicesAPI.getFeeInfo();
      setFeeInfo(response.fees);
    } catch (error) {
      console.error('Error fetching fee info:', error);
    }
  };

  const fetchDataServices = async () => {
    try {
      const response = await servicesAPI.getDataServices();
      setDataServices(response.services || []);
    } catch (error) {
      console.error('Error fetching data services:', error);
    }
  };

  const fetchBundles = async (serviceId) => {
    if (!phone || phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number first');
      return;
    }
    
    try {
      setLoadingBundles(true);
      const formattedPhone = formatGhanaPhone(phone);
      const response = await servicesAPI.getDataBundles(serviceId, formattedPhone);
      setBundles(response.bundles || []);
      setSelectedService(serviceId);
    } catch (error) {
      console.error('Error fetching bundles:', error);
      Alert.alert('Error', 'Failed to fetch data bundles');
    } finally {
      setLoadingBundles(false);
    }
  };

  const calculateFee = () => {
    if (!feeInfo || !amount) return 0;
    const config = activeTab === 'airtime' ? feeInfo.airtime : feeInfo.data_bundle;
    if (config?.type === 'percentage') {
      return (parseFloat(amount) * (config.rate / 100)).toFixed(2);
    }
    return config?.rate || 0;
  };

  const calculateTotal = () => {
    const fee = parseFloat(calculateFee()) || 0;
    const amt = parseFloat(amount) || 0;
    return (amt + fee).toFixed(2);
  };

  const handlePurchase = () => {
    if (activeTab === 'airtime') {
      if (!phone || !amount || parseFloat(amount) < 1) {
        Alert.alert('Error', 'Please enter a valid phone number and amount');
        return;
      }
    } else {
      if (!phone || !selectedBundle) {
        Alert.alert('Error', 'Please enter a phone number and select a bundle');
        return;
      }
    }
    
    const total = activeTab === 'airtime' ? calculateTotal() : selectedBundle?.total || 0;
    if (parseFloat(total) > (user?.cashback_balance || 0)) {
      Alert.alert('Insufficient Balance', 'You do not have enough cashback balance for this purchase');
      return;
    }
    
    setShowConfirmModal(true);
  };

  const confirmPurchase = async () => {
    try {
      setPurchaseStatus('processing');
      
      if (activeTab === 'airtime') {
        const formattedPhone = formatGhanaPhone(phone);
        await servicesAPI.purchaseAirtime({
          phone: formattedPhone,
          network: network.toUpperCase(),
          amount: parseFloat(amount),
        });
      } else {
        const formattedPhone = formatGhanaPhone(phone);
        await servicesAPI.purchaseDataBundle({
          phone: formattedPhone,
          service_id: selectedService,
          package_code: selectedBundle.package_code,
          amount: selectedBundle.price,
        });
      }
      
      setPurchaseStatus('success');
      await refreshDashboard();
      
      // Reset form after success
      setTimeout(() => {
        setShowConfirmModal(false);
        setPurchaseStatus(null);
        setAmount('');
        setSelectedBundle(null);
      }, 2000);
      
    } catch (error) {
      console.error('Purchase error:', error);
      setPurchaseStatus('failed');
    }
  };

  const balance = user?.cashback_balance || 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

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
          <Text style={styles.headerTitle}>Services</Text>
          <Text style={styles.headerSubtitle}>Balance: GHS {balance.toFixed(2)}</Text>
        </View>
        
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* Tab Selector */}
      <Animated.View style={[styles.tabContainer, { opacity: fadeAnim }]}>
        <View style={styles.tabBackground}>
          <Animated.View 
            style={[
              styles.tabIndicator,
              {
                transform: [
                  {
                    translateX: tabIndicator.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 160],
                    }),
                  },
                ],
              },
            ]}
          />
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('airtime')}
          >
            <Ionicons 
              name="phone-portrait" 
              size={18} 
              color={activeTab === 'airtime' ? COLORS.white : COLORS.textMuted} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'airtime' && styles.tabTextActive,
            ]}>
              Airtime
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('data')}
          >
            <Ionicons 
              name="wifi" 
              size={18} 
              color={activeTab === 'data' ? COLORS.white : COLORS.textMuted} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'data' && styles.tabTextActive,
            ]}>
              Data Bundle
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Phone Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+233</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={phone.replace(/^(\+233|233|0)/, '')}
              onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
              placeholder="XX XXX XXXX"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
        </View>

        {/* Network Selector */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Network</Text>
          <View style={styles.networkGrid}>
            {NETWORKS.map((net) => (
              <TouchableOpacity
                key={net.id}
                style={[
                  styles.networkCard,
                  network === net.id && styles.networkCardActive,
                  { borderColor: network === net.id ? net.color : 'rgba(255,255,255,0.1)' }
                ]}
                onPress={() => setNetwork(net.id)}
              >
                <View style={[styles.networkIcon, { backgroundColor: `${net.color}20` }]}>
                  <Ionicons name={net.icon} size={20} color={net.color} />
                </View>
                <Text style={[
                  styles.networkName,
                  network === net.id && { color: net.color }
                ]}>
                  {net.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {activeTab === 'airtime' ? (
          <>
            {/* Quick Amounts */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Quick Select</Text>
              <View style={styles.quickAmounts}>
                {QUICK_AMOUNTS.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickAmount,
                      parseFloat(amount) === amt && styles.quickAmountActive,
                    ]}
                    onPress={() => setAmount(amt.toString())}
                  >
                    <Text style={[
                      styles.quickAmountText,
                      parseFloat(amount) === amt && styles.quickAmountTextActive,
                    ]}>
                      GHS {amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Amount (GHS)</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>GHS</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Fee Summary */}
            {amount && parseFloat(amount) > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Airtime Amount</Text>
                  <Text style={styles.summaryValue}>GHS {parseFloat(amount).toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Service Fee ({feeInfo?.airtime?.rate || 2}%)
                  </Text>
                  <Text style={styles.summaryValue}>GHS {calculateFee()}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>GHS {calculateTotal()}</Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Data Services */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Select Service</Text>
              <View style={styles.serviceGrid}>
                {dataServices.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.serviceCard,
                      selectedService === service.id && styles.serviceCardActive,
                    ]}
                    onPress={() => fetchBundles(service.id)}
                  >
                    <Ionicons 
                      name="globe" 
                      size={24} 
                      color={selectedService === service.id ? COLORS.primary : COLORS.textMuted} 
                    />
                    <Text style={[
                      styles.serviceName,
                      selectedService === service.id && styles.serviceNameActive,
                    ]}>
                      {service.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Data Bundles */}
            {loadingBundles ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading bundles...</Text>
              </View>
            ) : bundles.length > 0 ? (
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Available Bundles</Text>
                <View style={styles.bundlesList}>
                  {bundles.map((bundle, index) => (
                    <TouchableOpacity
                      key={bundle.package_code || index}
                      style={[
                        styles.bundleCard,
                        selectedBundle?.package_code === bundle.package_code && styles.bundleCardActive,
                      ]}
                      onPress={() => setSelectedBundle(bundle)}
                    >
                      <View style={styles.bundleInfo}>
                        <Text style={styles.bundleName}>{bundle.name}</Text>
                        <Text style={styles.bundleDetails}>{bundle.description || bundle.validity}</Text>
                      </View>
                      <View style={styles.bundlePrice}>
                        <Text style={styles.bundlePriceText}>GHS {bundle.price}</Text>
                        {selectedBundle?.package_code === bundle.package_code && (
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : selectedService ? (
              <View style={styles.emptyBundles}>
                <Ionicons name="wifi-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No bundles available</Text>
              </View>
            ) : null}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Purchase Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            (!amount && !selectedBundle) && styles.purchaseButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!amount && !selectedBundle}
        >
          <LinearGradient
            colors={(!amount && !selectedBundle) ? ['#374151', '#374151'] : ['#F59E0B', '#D97706']}
            style={styles.purchaseButtonGradient}
          >
            <Ionicons name="cart" size={20} color={COLORS.white} />
            <Text style={styles.purchaseButtonText}>
              {activeTab === 'airtime' ? 'Buy Airtime' : 'Buy Data'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => !purchaseStatus && setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {purchaseStatus === 'processing' ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.modalTitle}>Processing...</Text>
                <Text style={styles.modalSubtitle}>Please wait</Text>
              </View>
            ) : purchaseStatus === 'success' ? (
              <View style={styles.modalCenter}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={40} color={COLORS.secondary} />
                </View>
                <Text style={styles.modalTitle}>Success!</Text>
                <Text style={styles.modalSubtitle}>
                  {activeTab === 'airtime' ? 'Airtime sent successfully' : 'Data bundle purchased'}
                </Text>
              </View>
            ) : purchaseStatus === 'failed' ? (
              <View style={styles.modalCenter}>
                <View style={[styles.successIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="close" size={40} color="#EF4444" />
                </View>
                <Text style={styles.modalTitle}>Failed</Text>
                <Text style={styles.modalSubtitle}>Transaction failed. Please try again.</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setShowConfirmModal(false);
                    setPurchaseStatus(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Confirm Purchase</Text>
                <View style={styles.confirmDetails}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Phone</Text>
                    <Text style={styles.confirmValue}>{formatGhanaPhone(phone)}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Network</Text>
                    <Text style={styles.confirmValue}>{network.toUpperCase()}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>
                      {activeTab === 'airtime' ? 'Amount' : 'Bundle'}
                    </Text>
                    <Text style={styles.confirmValue}>
                      {activeTab === 'airtime' 
                        ? `GHS ${amount}` 
                        : selectedBundle?.name
                      }
                    </Text>
                  </View>
                  <View style={[styles.confirmRow, styles.confirmTotal]}>
                    <Text style={styles.confirmTotalLabel}>Total</Text>
                    <Text style={styles.confirmTotalValue}>
                      GHS {activeTab === 'airtime' ? calculateTotal() : selectedBundle?.price}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowConfirmModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={confirmPurchase}
                  >
                    <LinearGradient
                      colors={['#F59E0B', '#D97706']}
                      style={styles.confirmButtonGradient}
                    >
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  tabContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  tabBackground: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 156,
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    zIndex: 1,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  inputSection: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.sm,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  countryCodeText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  networkGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  networkCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  networkCardActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  networkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  networkName: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickAmount: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickAmountActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: COLORS.primary,
  },
  quickAmountText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  quickAmountTextActive: {
    color: COLORS.primary,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginRight: SPACING.sm,
  },
  amountInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    paddingVertical: SPACING.md,
  },
  summaryCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
    marginBottom: 0,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  totalValue: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  serviceCard: {
    width: '48%',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  serviceCardActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: COLORS.primary,
  },
  serviceName: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  serviceNameActive: {
    color: COLORS.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  bundlesList: {
    gap: SPACING.sm,
  },
  bundleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bundleCardActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: COLORS.primary,
  },
  bundleInfo: {
    flex: 1,
  },
  bundleName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  bundleDetails: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  bundlePrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bundlePriceText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
  },
  emptyBundles: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: 30,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  purchaseButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  purchaseButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: SPACING.xl,
  },
  modalCenter: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  confirmDetails: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  confirmLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  confirmValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  confirmTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
    marginBottom: 0,
  },
  confirmTotalLabel: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  confirmTotalValue: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  modalButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  modalButtonText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
  },
});
```

## src/screens/client/WithdrawalScreen.js

```javascript
/**
 * SDM REWARDS Mobile - Withdrawal Screen
 * Withdraw cashback to MoMo
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { paymentsAPI, clientAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONTS, formatGhanaPhone } from '../../utils/constants';

const NETWORKS = [
  { id: 'MTN', name: 'MTN MoMo', color: '#FFCC00', icon: 'phone-portrait' },
  { id: 'VODAFONE', name: 'Vodafone Cash', color: '#E60000', icon: 'phone-portrait' },
  { id: 'AIRTELTIGO', name: 'AirtelTigo Money', color: '#FF0000', icon: 'phone-portrait' },
];

export default function WithdrawalScreen({ navigation }) {
  const { user, refreshDashboard } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [network, setNetwork] = useState('MTN');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [feeInfo, setFeeInfo] = useState(null);
  const [loadingFee, setLoadingFee] = useState(true);
  
  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState(null); // null, 'processing', 'success', 'failed'
  const [errorMessage, setErrorMessage] = useState('');
  
  // Withdrawal history
  const [withdrawals, setWithdrawals] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;

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
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    fetchFeeInfo();
    fetchWithdrawalHistory();
  }, []);

  const fetchFeeInfo = async () => {
    try {
      setLoadingFee(true);
      const response = await paymentsAPI.getWithdrawalFee();
      setFeeInfo(response);
    } catch (error) {
      console.error('Error fetching fee info:', error);
    } finally {
      setLoadingFee(false);
    }
  };

  const fetchWithdrawalHistory = async () => {
    try {
      const response = await clientAPI.getWithdrawals();
      setWithdrawals(response.withdrawals || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const calculateFee = () => {
    if (!feeInfo || !amount) return 0;
    const amt = parseFloat(amount) || 0;
    if (feeInfo.fee_type === 'percentage') {
      return (amt * (feeInfo.fee_rate / 100)).toFixed(2);
    }
    return feeInfo.fee_rate || 0;
  };

  const calculateReceivable = () => {
    const fee = parseFloat(calculateFee()) || 0;
    const amt = parseFloat(amount) || 0;
    return Math.max(0, amt - fee).toFixed(2);
  };

  const balance = user?.cashback_balance || 0;
  const minWithdrawal = feeInfo?.min_amount || 5;

  const handleWithdraw = () => {
    const amt = parseFloat(amount);
    
    if (!phone || phone.length < 9) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    
    if (!amt || amt < minWithdrawal) {
      Alert.alert('Error', `Minimum withdrawal amount is GHS ${minWithdrawal}`);
      return;
    }
    
    if (amt > balance) {
      Alert.alert('Insufficient Balance', 'You do not have enough cashback balance');
      return;
    }
    
    setShowConfirmModal(true);
  };

  const confirmWithdrawal = async () => {
    try {
      setWithdrawalStatus('processing');
      setErrorMessage('');
      
      const formattedPhone = formatGhanaPhone(phone);
      await paymentsAPI.initiateWithdrawal({
        amount: parseFloat(amount),
        momo_number: formattedPhone,
        momo_network: network,
      });
      
      setWithdrawalStatus('success');
      await refreshDashboard();
      await fetchWithdrawalHistory();
      
      // Reset form after success
      setTimeout(() => {
        setShowConfirmModal(false);
        setWithdrawalStatus(null);
        setAmount('');
      }, 2500);
      
    } catch (error) {
      console.error('Withdrawal error:', error);
      setWithdrawalStatus('failed');
      setErrorMessage(error.response?.data?.detail || 'Withdrawal failed. Please try again.');
    }
  };

  const setMaxAmount = () => {
    setAmount(balance.toString());
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return COLORS.secondary;
      case 'pending': return COLORS.primary;
      case 'failed': return '#EF4444';
      default: return COLORS.textMuted;
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
          <Text style={styles.headerTitle}>Withdraw</Text>
          <Text style={styles.headerSubtitle}>To Mobile Money</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={() => setShowHistory(!showHistory)}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="time" size={22} color={COLORS.text} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <Animated.View style={{ transform: [{ scale: cardScale }] }}>
          <LinearGradient
            colors={['#F59E0B', '#D97706', '#B45309']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>GHS {balance.toFixed(2)}</Text>
            <View style={styles.balanceInfo}>
              <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.balanceInfoText}>
                Min. withdrawal: GHS {minWithdrawal}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {showHistory ? (
          /* Withdrawal History */
          <Animated.View style={[styles.historySection, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Withdrawal History</Text>
            {withdrawals.length > 0 ? (
              withdrawals.map((withdrawal, index) => (
                <View key={withdrawal.id || index} style={styles.historyCard}>
                  <View style={styles.historyIcon}>
                    <Ionicons name="wallet-outline" size={20} color={getStatusColor(withdrawal.status)} />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyAmount}>GHS {withdrawal.amount}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(withdrawal.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={[styles.historyStatus, { backgroundColor: `${getStatusColor(withdrawal.status)}20` }]}>
                    <Text style={[styles.historyStatusText, { color: getStatusColor(withdrawal.status) }]}>
                      {withdrawal.status}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyHistory}>
                <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No withdrawals yet</Text>
              </View>
            )}
            
            <TouchableOpacity
              style={styles.backToFormButton}
              onPress={() => setShowHistory(false)}
            >
              <Text style={styles.backToFormText}>← Back to Withdrawal</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <>
            {/* Network Selector */}
            <Animated.View style={[styles.inputSection, { opacity: fadeAnim }]}>
              <Text style={styles.inputLabel}>Select Network</Text>
              <View style={styles.networkGrid}>
                {NETWORKS.map((net) => (
                  <TouchableOpacity
                    key={net.id}
                    style={[
                      styles.networkCard,
                      network === net.id && styles.networkCardActive,
                      { borderColor: network === net.id ? net.color : 'rgba(255,255,255,0.1)' }
                    ]}
                    onPress={() => setNetwork(net.id)}
                  >
                    <View style={[styles.networkIcon, { backgroundColor: `${net.color}20` }]}>
                      <Ionicons name={net.icon} size={20} color={net.color} />
                    </View>
                    <Text style={[
                      styles.networkName,
                      network === net.id && { color: net.color }
                    ]} numberOfLines={1}>
                      {net.name}
                    </Text>
                    {network === net.id && (
                      <View style={[styles.checkMark, { backgroundColor: net.color }]}>
                        <Ionicons name="checkmark" size={12} color={COLORS.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            {/* Phone Input */}
            <Animated.View style={[styles.inputSection, { opacity: fadeAnim }]}>
              <Text style={styles.inputLabel}>MoMo Number</Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+233</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phone.replace(/^(\+233|233|0)/, '')}
                  onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                  placeholder="XX XXX XXXX"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </Animated.View>

            {/* Amount Input */}
            <Animated.View style={[styles.inputSection, { opacity: fadeAnim }]}>
              <View style={styles.amountHeader}>
                <Text style={styles.inputLabel}>Amount (GHS)</Text>
                <TouchableOpacity onPress={setMaxAmount}>
                  <Text style={styles.maxButton}>MAX</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>GHS</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </Animated.View>

            {/* Fee Summary */}
            {amount && parseFloat(amount) > 0 && (
              <Animated.View style={[styles.summaryCard, { opacity: fadeAnim }]}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Withdrawal Amount</Text>
                  <Text style={styles.summaryValue}>GHS {parseFloat(amount).toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Service Fee ({feeInfo?.fee_type === 'percentage' ? `${feeInfo.fee_rate}%` : `GHS ${feeInfo?.fee_rate || 0}`})
                  </Text>
                  <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                    - GHS {calculateFee()}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.totalLabel}>You'll Receive</Text>
                  <Text style={styles.totalValue}>GHS {calculateReceivable()}</Text>
                </View>
              </Animated.View>
            )}

            {/* Fee Info */}
            {!loadingFee && feeInfo && (
              <View style={styles.feeInfoCard}>
                <Ionicons name="information-circle" size={18} color={COLORS.primary} />
                <Text style={styles.feeInfoText}>
                  A {feeInfo.fee_type === 'percentage' ? `${feeInfo.fee_rate}%` : `GHS ${feeInfo.fee_rate}`} fee applies to all withdrawals. 
                  Minimum amount: GHS {feeInfo.min_amount}.
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Withdraw Button */}
      {!showHistory && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.withdrawButton,
              (!amount || parseFloat(amount) < minWithdrawal) && styles.withdrawButtonDisabled,
            ]}
            onPress={handleWithdraw}
            disabled={!amount || parseFloat(amount) < minWithdrawal || loading}
          >
            <LinearGradient
              colors={(!amount || parseFloat(amount) < minWithdrawal) ? ['#374151', '#374151'] : ['#10B981', '#059669']}
              style={styles.withdrawButtonGradient}
            >
              <Ionicons name="wallet" size={20} color={COLORS.white} />
              <Text style={styles.withdrawButtonText}>Withdraw to MoMo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => !withdrawalStatus && setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {withdrawalStatus === 'processing' ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.modalTitle}>Processing...</Text>
                <Text style={styles.modalSubtitle}>Please wait while we process your withdrawal</Text>
              </View>
            ) : withdrawalStatus === 'success' ? (
              <View style={styles.modalCenter}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={40} color={COLORS.secondary} />
                </View>
                <Text style={styles.modalTitle}>Withdrawal Initiated!</Text>
                <Text style={styles.modalSubtitle}>
                  GHS {calculateReceivable()} will be sent to your MoMo account shortly.
                </Text>
                <Text style={styles.modalNote}>
                  You'll receive an SMS confirmation
                </Text>
              </View>
            ) : withdrawalStatus === 'failed' ? (
              <View style={styles.modalCenter}>
                <View style={[styles.successIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="close" size={40} color="#EF4444" />
                </View>
                <Text style={styles.modalTitle}>Withdrawal Failed</Text>
                <Text style={styles.modalSubtitle}>{errorMessage}</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setShowConfirmModal(false);
                    setWithdrawalStatus(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Confirm Withdrawal</Text>
                <View style={styles.confirmDetails}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>MoMo Number</Text>
                    <Text style={styles.confirmValue}>{formatGhanaPhone(phone)}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Network</Text>
                    <Text style={styles.confirmValue}>{network}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Amount</Text>
                    <Text style={styles.confirmValue}>GHS {parseFloat(amount).toFixed(2)}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Fee</Text>
                    <Text style={[styles.confirmValue, { color: '#EF4444' }]}>
                      - GHS {calculateFee()}
                    </Text>
                  </View>
                  <View style={[styles.confirmRow, styles.confirmTotal]}>
                    <Text style={styles.confirmTotalLabel}>You'll Receive</Text>
                    <Text style={styles.confirmTotalValue}>GHS {calculateReceivable()}</Text>
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowConfirmModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={confirmWithdrawal}
                  >
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={styles.confirmButtonGradient}
                    >
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    alignItems: 'center',
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
  historyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  balanceCard: {
    borderRadius: 20,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.xs,
  },
  balanceAmount: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  balanceInfoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONTS.sizes.sm,
  },
  inputSection: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.sm,
  },
  networkGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  networkCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  networkCardActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  networkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  networkName: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  checkMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  countryCodeText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  maxButton: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginRight: SPACING.sm,
  },
  amountInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    paddingVertical: SPACING.md,
  },
  summaryCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
    marginBottom: 0,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  totalValue: {
    color: COLORS.secondary,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
  },
  feeInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  feeInfoText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 18,
  },
  historySection: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  historyInfo: {
    flex: 1,
  },
  historyAmount: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  historyDate: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  historyStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyStatusText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  backToFormButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  backToFormText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: 30,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  withdrawButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  withdrawButtonDisabled: {
    opacity: 0.5,
  },
  withdrawButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  withdrawButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: SPACING.xl,
  },
  modalCenter: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
  },
  modalNote: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.md,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  confirmDetails: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  confirmLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  confirmValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  confirmTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
    marginBottom: 0,
  },
  confirmTotalLabel: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  confirmTotalValue: {
    color: COLORS.secondary,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  modalButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
});
```

## src/screens/client/ProfileScreen.js

```javascript
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
```

## src/screens/client/CardScreen.js

```javascript
/**
 * SDM REWARDS Mobile - Card Screen
 * Purchase and upgrade membership cards
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
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { clientAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONTS, formatGhanaPhone } from '../../utils/constants';

const { width } = Dimensions.get('window');

const CARD_COLORS = {
  silver: ['#A8A9AD', '#8E8E93', '#636366'],
  gold: ['#FFD700', '#FFC400', '#DAA520'],
  platinum: ['#E5E4E2', '#B4B4B4', '#8E8E93'],
};

const CARD_ICONS = {
  silver: 'shield',
  gold: 'star',
  platinum: 'diamond',
};

const NETWORKS = [
  { id: 'MTN', name: 'MTN MoMo', color: '#FFCC00' },
  { id: 'VODAFONE', name: 'Vodafone Cash', color: '#E60000' },
  { id: 'AIRTELTIGO', name: 'AirtelTigo Money', color: '#FF0000' },
];

export default function CardScreen({ navigation }) {
  const { user, refreshDashboard } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  
  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState('momo'); // 'momo', 'cashback', 'combined'
  const [momoNetwork, setMomoNetwork] = useState('MTN');
  const [momoPhone, setMomoPhone] = useState(user?.phone?.replace('+233', '') || '');
  const [cashbackAmount, setCashbackAmount] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardAnims = useRef([]).current;

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

    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await clientAPI.getAvailableCards();
      setCards(response.cards || []);
      animateCards(response.cards?.length || 0);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const animateCards = (count) => {
    for (let i = cardAnims.length; i < count; i++) {
      cardAnims.push(new Animated.Value(0));
    }
    
    const animations = cardAnims.slice(0, count).map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: 300 + index * 150,
        easing: Easing.out(Easing.back(1.3)),
        useNativeDriver: true,
      })
    );
    
    Animated.stagger(150, animations).start();
  };

  const hasActiveCard = user?.status === 'active' && user?.card_type;
  const currentCardType = user?.card_type?.toLowerCase();
  const cashbackBalance = user?.cashback_balance || 0;

  const getCardOrder = (type) => {
    const order = { silver: 1, gold: 2, platinum: 3 };
    return order[type?.toLowerCase()] || 0;
  };

  const canUpgradeTo = (cardType) => {
    if (!hasActiveCard) return true;
    return getCardOrder(cardType) > getCardOrder(currentCardType);
  };

  const isCurrentCard = (cardType) => {
    return currentCardType === cardType?.toLowerCase();
  };

  const handleSelectCard = (card) => {
    if (isCurrentCard(card.type)) {
      Alert.alert('Current Card', 'This is your current membership card.');
      return;
    }
    if (!canUpgradeTo(card.type)) {
      Alert.alert('Cannot Downgrade', 'You can only upgrade to a higher tier card.');
      return;
    }
    setSelectedCard(card);
    setPaymentMethod('momo');
    setCashbackAmount('');
    setShowPurchaseModal(true);
  };

  const calculatePaymentBreakdown = () => {
    if (!selectedCard) return { cashback: 0, momo: 0, total: 0 };
    
    const price = selectedCard.price;
    let cashback = 0;
    let momo = price;
    
    if (paymentMethod === 'cashback') {
      cashback = Math.min(cashbackBalance, price);
      momo = Math.max(0, price - cashback);
    } else if (paymentMethod === 'combined') {
      const amount = parseFloat(cashbackAmount) || 0;
      cashback = Math.min(amount, cashbackBalance, price);
      momo = Math.max(0, price - cashback);
    }
    
    return { cashback, momo, total: price };
  };

  const handlePurchase = async () => {
    if (!selectedCard) return;
    
    const breakdown = calculatePaymentBreakdown();
    
    // Validate MoMo phone if needed
    if (breakdown.momo > 0 && (!momoPhone || momoPhone.length < 9)) {
      Alert.alert('Error', 'Please enter a valid MoMo phone number');
      return;
    }
    
    // Validate cashback if using it
    if (breakdown.cashback > cashbackBalance) {
      Alert.alert('Insufficient Balance', 'You do not have enough cashback balance');
      return;
    }
    
    try {
      setPurchaseStatus('processing');
      
      let response;
      
      if (hasActiveCard) {
        // Upgrade request - supports cashback + momo combination
        const upgradePayload = {
          new_card_type: selectedCard.type,
          use_cashback: paymentMethod !== 'momo',
          cashback_amount: breakdown.cashback > 0 ? breakdown.cashback : undefined,
          payment_phone: breakdown.momo > 0 ? formatGhanaPhone(momoPhone) : undefined,
        };
        response = await clientAPI.upgradeCard(upgradePayload);
      } else {
        // Purchase request - backend only supports momo or full cashback
        // For combined payment on new card purchase, treat as momo (cashback deduction handled separately if needed)
        const purchasePayload = {
          card_type: selectedCard.type,
          payment_method: paymentMethod === 'cashback' && breakdown.cashback >= selectedCard.price ? 'cashback' : 'momo',
          payment_phone: breakdown.momo > 0 ? formatGhanaPhone(momoPhone) : undefined,
        };
        response = await clientAPI.purchaseCard(purchasePayload);
      }
      
      setPurchaseStatus('success');
      await refreshDashboard();
      
      // Show success message from API if available
      if (response?.message) {
        Alert.alert('Success', response.message);
      }
      
      setTimeout(() => {
        setShowPurchaseModal(false);
        setPurchaseStatus(null);
        setSelectedCard(null);
      }, 2500);
      
    } catch (error) {
      console.error('Purchase error:', error);
      setPurchaseStatus('failed');
      const errorMessage = error.response?.data?.detail || error.message || 'Purchase failed. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const breakdown = calculatePaymentBreakdown();

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
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Membership Cards</Text>
          <Text style={styles.headerSubtitle}>
            {hasActiveCard ? 'Upgrade your card' : 'Choose your card'}
          </Text>
        </View>
        
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* Current Card Info */}
      {hasActiveCard && (
        <Animated.View style={[styles.currentCardBanner, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={CARD_COLORS[currentCardType] || CARD_COLORS.silver}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.currentCardGradient}
          >
            <View style={styles.currentCardContent}>
              <Ionicons name={CARD_ICONS[currentCardType] || 'card'} size={24} color="#FFF" />
              <View style={styles.currentCardText}>
                <Text style={styles.currentCardLabel}>Current Card</Text>
                <Text style={styles.currentCardType}>{currentCardType?.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.currentCardExpiry}>
              <Text style={styles.expiryLabel}>Expires</Text>
              <Text style={styles.expiryDate}>
                {user?.card_expires_at 
                  ? new Date(user.card_expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'N/A'
                }
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Cashback Balance */}
      <Animated.View style={[styles.balanceCard, { opacity: fadeAnim }]}>
        <View style={styles.balanceIcon}>
          <Ionicons name="wallet" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Available Cashback</Text>
          <Text style={styles.balanceValue}>GHS {cashbackBalance.toFixed(2)}</Text>
        </View>
        <Text style={styles.balanceHint}>Can be used for payment</Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {cards.map((card, index) => {
              const colors = CARD_COLORS[card.type?.toLowerCase()] || CARD_COLORS.silver;
              const icon = CARD_ICONS[card.type?.toLowerCase()] || 'card';
              const isCurrent = isCurrentCard(card.type);
              const canUpgrade = canUpgradeTo(card.type);
              
              return (
                <Animated.View
                  key={card.type}
                  style={[
                    styles.cardWrapper,
                    {
                      opacity: cardAnims[index] || 1,
                      transform: [
                        {
                          translateY: (cardAnims[index] || new Animated.Value(1)).interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0],
                          }),
                        },
                        {
                          scale: (cardAnims[index] || new Animated.Value(1)).interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.cardItem, isCurrent && styles.currentCardItem]}
                    onPress={() => handleSelectCard(card)}
                    activeOpacity={0.9}
                    disabled={isCurrent || !canUpgrade}
                  >
                    <LinearGradient
                      colors={colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardGradient}
                    >
                      {/* Card Shine Effect */}
                      <View style={styles.cardShine} />
                      
                      {/* Card Header */}
                      <View style={styles.cardHeader}>
                        <View style={styles.cardIconContainer}>
                          <Ionicons name={icon} size={32} color="rgba(255,255,255,0.9)" />
                        </View>
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={styles.currentBadgeText}>Current</Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Card Name */}
                      <Text style={styles.cardName}>{card.name}</Text>
                      
                      {/* Card Price */}
                      <View style={styles.cardPriceContainer}>
                        <Text style={styles.cardPrice}>GHS {card.price}</Text>
                        <Text style={styles.cardDuration}>{card.duration_label}</Text>
                      </View>
                      
                      {/* Card Features */}
                      <View style={styles.cardFeatures}>
                        {(card.features || card.benefits || []).slice(0, 3).map((feature, idx) => (
                          <View key={idx} style={styles.featureItem}>
                            <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.featureText}>{feature}</Text>
                          </View>
                        ))}
                      </View>
                      
                      {/* Action Button */}
                      {!isCurrent && canUpgrade && (
                        <View style={styles.cardAction}>
                          <Text style={styles.cardActionText}>
                            {hasActiveCard ? 'Upgrade Now' : 'Get This Card'}
                          </Text>
                          <Ionicons name="arrow-forward" size={18} color="#FFF" />
                        </View>
                      )}
                      
                      {!canUpgrade && !isCurrent && (
                        <View style={[styles.cardAction, styles.disabledAction]}>
                          <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.5)" />
                          <Text style={[styles.cardActionText, styles.disabledText]}>
                            Lower tier
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Purchase Modal */}
      <Modal
        visible={showPurchaseModal}
        transparent
        animationType="slide"
        onRequestClose={() => !purchaseStatus && setShowPurchaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {purchaseStatus === 'processing' ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.modalTitle}>Processing...</Text>
                <Text style={styles.modalSubtitle}>Please wait</Text>
              </View>
            ) : purchaseStatus === 'success' ? (
              <View style={styles.modalCenter}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={40} color={COLORS.secondary} />
                </View>
                <Text style={styles.modalTitle}>
                  {hasActiveCard ? 'Card Upgraded!' : 'Card Purchased!'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Your {selectedCard?.name} is now active
                </Text>
              </View>
            ) : purchaseStatus === 'failed' ? (
              <View style={styles.modalCenter}>
                <View style={[styles.successIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="close" size={40} color="#EF4444" />
                </View>
                <Text style={styles.modalTitle}>Purchase Failed</Text>
                <Text style={styles.modalSubtitle}>Please try again</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => setPurchaseStatus(null)}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {hasActiveCard ? 'Upgrade to' : 'Purchase'} {selectedCard?.name}
                  </Text>
                  <TouchableOpacity onPress={() => setShowPurchaseModal(false)}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
                
                {/* Card Preview */}
                <LinearGradient
                  colors={CARD_COLORS[selectedCard?.type?.toLowerCase()] || CARD_COLORS.silver}
                  style={styles.previewCard}
                >
                  <Ionicons name={CARD_ICONS[selectedCard?.type?.toLowerCase()] || 'card'} size={28} color="#FFF" />
                  <Text style={styles.previewCardName}>{selectedCard?.name}</Text>
                  <Text style={styles.previewCardPrice}>GHS {selectedCard?.price}</Text>
                </LinearGradient>
                
                {/* Payment Method Selection */}
                <Text style={styles.sectionTitle}>Payment Method</Text>
                
                <View style={styles.paymentOptions}>
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'momo' && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod('momo')}
                  >
                    <Ionicons name="phone-portrait" size={20} color={paymentMethod === 'momo' ? COLORS.primary : COLORS.textMuted} />
                    <Text style={[styles.paymentOptionText, paymentMethod === 'momo' && styles.paymentOptionTextActive]}>
                      Mobile Money
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.paymentOption, 
                      paymentMethod === 'cashback' && styles.paymentOptionActive,
                      cashbackBalance < (selectedCard?.price || 0) && styles.paymentOptionDisabled
                    ]}
                    onPress={() => cashbackBalance >= (selectedCard?.price || 0) && setPaymentMethod('cashback')}
                    disabled={cashbackBalance < (selectedCard?.price || 0)}
                  >
                    <Ionicons name="wallet" size={20} color={paymentMethod === 'cashback' ? COLORS.secondary : COLORS.textMuted} />
                    <Text style={[styles.paymentOptionText, paymentMethod === 'cashback' && { color: COLORS.secondary }]}>
                      Full Cashback
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.paymentOption, 
                      paymentMethod === 'combined' && styles.paymentOptionActive,
                      cashbackBalance <= 0 && styles.paymentOptionDisabled
                    ]}
                    onPress={() => cashbackBalance > 0 && setPaymentMethod('combined')}
                    disabled={cashbackBalance <= 0}
                  >
                    <Ionicons name="git-merge" size={20} color={paymentMethod === 'combined' ? '#8B5CF6' : COLORS.textMuted} />
                    <Text style={[styles.paymentOptionText, paymentMethod === 'combined' && { color: '#8B5CF6' }]}>
                      Combined
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* Cashback Amount (for combined) */}
                {paymentMethod === 'combined' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Cashback Amount (max GHS {Math.min(cashbackBalance, selectedCard?.price || 0).toFixed(2)})
                    </Text>
                    <View style={styles.amountInputContainer}>
                      <Text style={styles.currencySymbol}>GHS</Text>
                      <TextInput
                        style={styles.amountInput}
                        value={cashbackAmount}
                        onChangeText={setCashbackAmount}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                )}
                
                {/* MoMo Details (if needed) */}
                {breakdown.momo > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>MoMo Details</Text>
                    
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
                          value={momoPhone}
                          onChangeText={setMomoPhone}
                          placeholder="XX XXX XXXX"
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="phone-pad"
                          maxLength={10}
                        />
                      </View>
                    </View>
                  </>
                )}
                
                {/* Payment Summary */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Card Price</Text>
                    <Text style={styles.summaryValue}>GHS {selectedCard?.price?.toFixed(2)}</Text>
                  </View>
                  {breakdown.cashback > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Cashback Used</Text>
                      <Text style={[styles.summaryValue, { color: COLORS.secondary }]}>
                        - GHS {breakdown.cashback.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {breakdown.momo > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>MoMo Payment</Text>
                      <Text style={styles.summaryValue}>GHS {breakdown.momo.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={[styles.summaryRow, styles.summaryTotal]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>GHS {breakdown.total.toFixed(2)}</Text>
                  </View>
                </View>
                
                {/* Purchase Button */}
                <TouchableOpacity
                  style={styles.purchaseButton}
                  onPress={handlePurchase}
                >
                  <LinearGradient
                    colors={CARD_COLORS[selectedCard?.type?.toLowerCase()] || ['#F59E0B', '#D97706']}
                    style={styles.purchaseButtonGradient}
                  >
                    <Text style={styles.purchaseButtonText}>
                      {hasActiveCard ? 'Confirm Upgrade' : 'Confirm Purchase'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            )}
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
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
  currentCardBanner: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: 16,
    overflow: 'hidden',
  },
  currentCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  currentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  currentCardText: {},
  currentCardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.xs,
  },
  currentCardType: {
    color: '#FFF',
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  currentCardExpiry: {
    alignItems: 'flex-end',
  },
  expiryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.xs,
  },
  expiryDate: {
    color: '#FFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  balanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
  },
  balanceValue: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  balanceHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  cardsContainer: {
    gap: SPACING.lg,
  },
  cardWrapper: {},
  cardItem: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  currentCardItem: {
    opacity: 0.7,
  },
  cardGradient: {
    padding: SPACING.xl,
    minHeight: 220,
  },
  cardShine: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  currentBadgeText: {
    color: '#10B981',
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  cardName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  cardPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  cardPrice: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  cardDuration: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.sm,
  },
  cardFeatures: {
    marginBottom: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  featureText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONTS.sizes.sm,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 25,
    alignSelf: 'flex-start',
    gap: SPACING.xs,
  },
  disabledAction: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cardActionText: {
    color: '#FFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  disabledText: {
    color: 'rgba(255,255,255,0.5)',
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
    maxHeight: '90%',
  },
  modalCenter: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
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
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  retryButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: 16,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  previewCardName: {
    flex: 1,
    color: '#FFF',
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  previewCardPrice: {
    color: '#FFF',
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  paymentOption: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: SPACING.xs,
  },
  paymentOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  paymentOptionDisabled: {
    opacity: 0.5,
  },
  paymentOptionText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  paymentOptionTextActive: {
    color: COLORS.primary,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.sm,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginRight: SPACING.sm,
  },
  amountInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    paddingVertical: SPACING.md,
  },
  networkSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  networkOption: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  networkOptionText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
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
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    marginVertical: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
    marginBottom: 0,
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  totalValue: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  purchaseButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: SPACING.md,
  },
  purchaseButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
});
```

## src/screens/client/ContactsScreen.js

```javascript
/**
 * SDM REWARDS Mobile - Contacts Integration Screen
 * Invite friends from contacts with referral sync
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
  SectionList,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useAuth } from '../../contexts/AuthContext';
import { clientAPI } from '../../services/api';
import { COLORS, SPACING, FONTS, normalizePhone } from '../../utils/constants';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

export default function ContactsScreen({ navigation }) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [sectionedContacts, setSectionedContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [existingMembers, setExistingMembers] = useState(new Set());
  const [pendingReferrals, setPendingReferrals] = useState(new Set());
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [inviting, setInviting] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

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
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 500,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    requestPermissionAndLoad();
  }, []);

  useEffect(() => {
    filterAndSectionContacts();
  }, [contacts, searchQuery, existingMembers]);

  const requestPermissionAndLoad = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status === 'granted') {
        await loadContacts();
        await fetchReferralData();
      }
    } catch (error) {
      console.error('Permission error:', error);
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Image,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      // Filter contacts with phone numbers and normalize
      const validContacts = data
        .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map(contact => {
          const primaryPhone = contact.phoneNumbers[0]?.number || '';
          const normalizedPhone = normalizePhone(primaryPhone.replace(/\s/g, ''));
          return {
            id: contact.id,
            name: contact.name || 'Unknown',
            phone: primaryPhone,
            normalizedPhone,
            image: contact.image,
          };
        })
        .filter(contact => contact.normalizedPhone.startsWith('+233')); // Ghana numbers only

      setContacts(validContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralData = async () => {
    try {
      const response = await clientAPI.getReferrals();
      const referrals = response.referrals || [];
      
      // Get existing members (completed referrals)
      const members = new Set(
        referrals
          .filter(r => r.status === 'active' || r.card_purchased)
          .map(r => normalizePhone(r.phone))
      );
      
      // Get pending referrals
      const pending = new Set(
        referrals
          .filter(r => r.status === 'pending' && !r.card_purchased)
          .map(r => normalizePhone(r.phone))
      );
      
      setExistingMembers(members);
      setPendingReferrals(pending);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  };

  const filterAndSectionContacts = () => {
    let filtered = [...contacts];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.phone.includes(query)
      );
    }

    setFilteredContacts(filtered);

    // Group by first letter
    const grouped = {};
    filtered.forEach(contact => {
      const firstLetter = (contact.name[0] || '#').toUpperCase();
      const key = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(contact);
    });

    // Convert to section list format
    const sections = Object.keys(grouped)
      .sort()
      .map(letter => ({
        title: letter,
        data: grouped[letter],
      }));

    setSectionedContacts(sections);
  };

  const getContactStatus = (contact) => {
    if (existingMembers.has(contact.normalizedPhone)) {
      return 'member';
    }
    if (pendingReferrals.has(contact.normalizedPhone)) {
      return 'pending';
    }
    return 'invite';
  };

  const toggleSelection = (contactId) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedContacts(newSelection);
  };

  const inviteContact = async (contact) => {
    const referralCode = user?.referral_code || 'SDMREWARDS';
    const message = `Hey ${contact.name.split(' ')[0]}! 👋\n\nJoin SDM Rewards and earn cashback on every purchase! Use my referral code: ${referralCode}\n\nDownload the app: https://sdmrewards.com/download\n\nWe both get bonuses when you sign up! 🎁`;
    
    try {
      await Share.share({
        message,
        title: 'Join SDM Rewards',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const inviteSelected = async () => {
    if (selectedContacts.size === 0) {
      Alert.alert('No Selection', 'Please select contacts to invite');
      return;
    }

    setInviting(true);
    const referralCode = user?.referral_code || 'SDMREWARDS';
    const selectedList = contacts.filter(c => selectedContacts.has(c.id));
    const names = selectedList.map(c => c.name.split(' ')[0]).slice(0, 3).join(', ');
    
    const message = `Hey ${names}${selectedList.length > 3 ? ' and friends' : ''}! 👋\n\nJoin SDM Rewards and earn cashback on every purchase! Use my referral code: ${referralCode}\n\nDownload: https://sdmrewards.com/download\n\n🎁 Bonus for both of us when you sign up!`;
    
    try {
      await Share.share({
        message,
        title: 'Join SDM Rewards',
      });
      setSelectedContacts(new Set());
    } catch (error) {
      console.error('Bulk invite error:', error);
    } finally {
      setInviting(false);
    }
  };

  const sendSMS = (contact) => {
    const referralCode = user?.referral_code || 'SDMREWARDS';
    const message = `Join SDM Rewards! Use code ${referralCode} for bonus. Download: https://sdmrewards.com`;
    const url = Platform.select({
      ios: `sms:${contact.phone}&body=${encodeURIComponent(message)}`,
      android: `sms:${contact.phone}?body=${encodeURIComponent(message)}`,
    });
    Linking.openURL(url);
  };

  const sendWhatsApp = (contact) => {
    const referralCode = user?.referral_code || 'SDMREWARDS';
    const message = `Hey! Join SDM Rewards and earn cashback! Use my code: ${referralCode}\n\nDownload: https://sdmrewards.com`;
    const phone = contact.normalizedPhone.replace('+', '');
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
  };

  const invitableCount = filteredContacts.filter(c => getContactStatus(c) === 'invite').length;
  const memberCount = filteredContacts.filter(c => getContactStatus(c) === 'member').length;

  const renderContact = ({ item: contact }) => {
    const status = getContactStatus(contact);
    const isSelected = selectedContacts.has(contact.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          isSelected && styles.contactItemSelected,
          status === 'member' && styles.contactItemMember,
        ]}
        onPress={() => status === 'invite' && toggleSelection(contact.id)}
        onLongPress={() => status === 'invite' && inviteContact(contact)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.avatarContainer,
          status === 'member' && styles.avatarMember,
          status === 'pending' && styles.avatarPending,
        ]}>
          <Text style={styles.avatarText}>
            {contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
          {status === 'member' && (
            <View style={styles.memberBadge}>
              <Ionicons name="checkmark" size={10} color={COLORS.white} />
            </View>
          )}
        </View>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
          {status === 'member' && (
            <View style={styles.statusBadge}>
              <Ionicons name="star" size={10} color={COLORS.secondary} />
              <Text style={styles.statusText}>SDM Member</Text>
            </View>
          )}
          {status === 'pending' && (
            <View style={[styles.statusBadge, styles.statusPending]}>
              <Ionicons name="time" size={10} color={COLORS.primary} />
              <Text style={[styles.statusText, { color: COLORS.primary }]}>Invited</Text>
            </View>
          )}
        </View>
        
        {status === 'invite' && (
          <View style={styles.contactActions}>
            {isSelected ? (
              <View style={styles.selectedCheck}>
                <Ionicons name="checkmark" size={18} color={COLORS.white} />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => sendWhatsApp(contact)}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => sendSMS(contact)}
                >
                  <Ionicons name="chatbubble" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0F172A', '#1E1B4B', '#0F172A']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.permissionContainer}>
          <Ionicons name="people" size={80} color={COLORS.textMuted} />
          <Text style={styles.permissionTitle}>Contact Access Required</Text>
          <Text style={styles.permissionText}>
            To invite friends and see who's already a member, we need access to your contacts.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => Linking.openSettings()}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.permissionButtonGradient}
            >
              <Text style={styles.permissionButtonText}>Open Settings</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

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
          <Text style={styles.headerTitle}>Invite Friends</Text>
          <Text style={styles.headerSubtitle}>
            {selectedContacts.size > 0 
              ? `${selectedContacts.size} selected`
              : `${invitableCount} contacts to invite`
            }
          </Text>
        </View>
        
        {selectedContacts.size > 0 ? (
          <TouchableOpacity 
            style={styles.inviteAllButton}
            onPress={inviteSelected}
            disabled={inviting}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.inviteAllGradient}
            >
              {inviting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="send" size={18} color={COLORS.white} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </Animated.View>

      {/* Stats */}
      <Animated.View style={[styles.statsCard, { opacity: statsAnim }]}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={24} color={COLORS.primary} />
          <Text style={styles.statValue}>{filteredContacts.length}</Text>
          <Text style={styles.statLabel}>Contacts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="star" size={24} color={COLORS.secondary} />
          <Text style={[styles.statValue, { color: COLORS.secondary }]}>{memberCount}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="gift" size={24} color="#8B5CF6" />
          <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{user?.referral_code || '-'}</Text>
          <Text style={styles.statLabel}>Your Code</Text>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View style={[styles.searchContainer, { opacity: fadeAnim }]}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => {
            const invitable = filteredContacts.filter(c => getContactStatus(c) === 'invite');
            setSelectedContacts(new Set(invitable.map(c => c.id)));
          }}
        >
          <Text style={styles.quickActionText}>Select All</Text>
        </TouchableOpacity>
        {selectedContacts.size > 0 && (
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => setSelectedContacts(new Set())}
          >
            <Text style={styles.quickActionText}>Clear</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Contacts List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (
        <SectionList
          sections={sectionedContacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Contacts Found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery 
                  ? 'Try a different search term'
                  : 'No Ghana phone numbers in your contacts'
                }
              </Text>
            </View>
          }
        />
      )}

      {/* Alphabet Index */}
      <View style={styles.alphabetIndex}>
        {ALPHABET.map((letter) => (
          <TouchableOpacity
            key={letter}
            style={styles.alphabetLetter}
            onPress={() => {
              // Scroll to section - would need SectionList ref
            }}
          >
            <Text style={styles.alphabetLetterText}>{letter}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    alignItems: 'center',
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
  inviteAllButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  inviteAllGradient: {
    padding: 10,
    borderRadius: 12,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  quickAction: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 16,
  },
  quickActionText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  contactItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  contactItemMember: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarMember: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  avatarPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  avatarText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
  },
  memberBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  contactPhone: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '500',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alphabetIndex: {
    position: 'absolute',
    right: 4,
    top: 220,
    bottom: 100,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  alphabetLetter: {
    padding: 2,
  },
  alphabetLetterText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    marginTop: SPACING.lg,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  permissionTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: SPACING.xl,
    textAlign: 'center',
  },
  permissionText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: SPACING.xl,
    borderRadius: 12,
    overflow: 'hidden',
  },
  permissionButtonGradient: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  backLink: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
  },
  backLinkText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
  },
});
```

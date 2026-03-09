/**
 * SDM REWARDS Mobile - Merchant Home Screen
 * Animated & Attractive Dashboard
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
  Share,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../contexts/AuthContext';
import { Card, TransactionItem } from '../../components/Common';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, formatCurrency } from '../../utils/constants';

const { width } = Dimensions.get('window');

export default function MerchantHomeScreen({ navigation }) {
  const { user, dashboardData, refreshDashboard, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const qrScaleAnim = useRef(new Animated.Value(0.8)).current;
  const qrRotateAnim = useRef(new Animated.Value(0)).current;
  const balanceAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.stagger(150, [
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(qrScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(balanceAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

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
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDashboard();
    setRefreshing(false);
  }, []);

  const toggleQR = () => {
    if (!showQR) {
      Animated.spring(qrRotateAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(qrRotateAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
    setShowQR(!showQR);
  };

  const merchant = user;
  const stats = dashboardData?.stats || {};
  const recentSales = dashboardData?.recent_sales || [];
  const balance = merchant?.pending_payout || 0;

  const qrCodeUrl = `https://web-boost-seo.preview.emergentagent.com/pay/${merchant?.shortcode || merchant?.id}`;

  const shareQRCode = async () => {
    try {
      await Share.share({
        message: `Pay me at ${merchant?.business_name} using SDM Rewards!\n\n${qrCodeUrl}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const qrRotation = qrRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const statsCards = [
    { icon: 'cash', value: formatCurrency(stats.total_sales || 0), label: 'Total Sales', color: '#10B981', gradient: ['#10B981', '#059669'] },
    { icon: 'receipt', value: stats.total_transactions || 0, label: 'Transactions', color: '#F59E0B', gradient: ['#F59E0B', '#D97706'] },
    { icon: 'wallet', value: formatCurrency(stats.total_payouts || 0), label: 'Payouts', color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] },
    { icon: 'people', value: stats.unique_customers || 0, label: 'Customers', color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-30, 0],
              }),
            }],
          },
        ]}
      >
        <View>
          <Text style={styles.greeting}>{merchant?.business_name || 'Business'}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, merchant?.status === 'active' && styles.statusActive]} />
            <Text style={styles.subtitle}>Merchant Dashboard</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.settingsGradient}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.text} />
          </LinearGradient>
        </TouchableOpacity>
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
      >
        {/* QR Code Card - Animated */}
        <Animated.View
          style={[
            styles.qrCardWrapper,
            {
              transform: [
                { scale: Animated.multiply(qrScaleAnim, pulseAnim) },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#1E293B', '#334155']}
            style={styles.qrCard}
          >
            <TouchableOpacity
              style={styles.qrContainer}
              onPress={toggleQR}
              activeOpacity={0.9}
            >
              <Animated.View style={{ transform: [{ rotateY: qrRotation }] }}>
                {showQR ? (
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={qrCodeUrl}
                      size={180}
                      backgroundColor={COLORS.white}
                      color={COLORS.black}
                    />
                  </View>
                ) : (
                  <LinearGradient
                    colors={['rgba(59, 130, 246, 0.2)', 'rgba(139, 92, 246, 0.2)']}
                    style={styles.qrPlaceholder}
                  >
                    <Ionicons name="qr-code" size={70} color="#3B82F6" />
                    <Text style={styles.qrPlaceholderText}>Tap to reveal QR Code</Text>
                  </LinearGradient>
                )}
              </Animated.View>
            </TouchableOpacity>
            
            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.qrActionButton} onPress={toggleQR}>
                <Ionicons name={showQR ? 'eye-off' : 'eye'} size={20} color={COLORS.primary} />
                <Text style={styles.qrActionText}>{showQR ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrActionButton} onPress={shareQRCode}>
                <Ionicons name="share-social" size={20} color="#10B981" />
                <Text style={styles.qrActionText}>Share</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.shortcodeContainer}>
              <Text style={styles.shortcodeLabel}>Merchant Code</Text>
              <Text style={styles.shortcode}>{merchant?.shortcode || '---'}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Balance Card - Animated */}
        <Animated.View
          style={[
            styles.balanceCardWrapper,
            {
              opacity: balanceAnim,
              transform: [{
                translateX: balanceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                }),
              }],
            },
          ]}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Pending Payout</Text>
              <Ionicons name="wallet" size={24} color="rgba(255,255,255,0.8)" />
            </View>
            <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
            <View style={styles.balanceFooter}>
              <Text style={styles.cashbackRate}>
                Cashback Rate: {merchant?.cashback_rate || 5}%
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Grid - Animated */}
        <Animated.View
          style={[
            styles.statsGrid,
            {
              opacity: statsAnim,
              transform: [{
                translateY: statsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              }],
            },
          ]}
        >
          {statsCards.map((stat, index) => (
            <View key={index} style={styles.statCardWrapper}>
              <LinearGradient
                colors={[`${stat.color}20`, `${stat.color}10`]}
                style={styles.statCard}
              >
                <View style={[styles.statIconWrapper, { backgroundColor: `${stat.color}30` }]}>
                  <Ionicons name={stat.icon} size={22} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </LinearGradient>
            </View>
          ))}
        </Animated.View>

        {/* Recent Sales */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.salesCard}>
          {recentSales.length > 0 ? (
            recentSales.slice(0, 5).map((sale, index) => (
              <View key={sale.id || index} style={styles.saleItem}>
                <LinearGradient
                  colors={['#10B98120', '#10B98110']}
                  style={styles.saleIcon}
                >
                  <Ionicons name="arrow-down" size={18} color="#10B981" />
                </LinearGradient>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleAmount}>{formatCurrency(sale.amount)}</Text>
                  <Text style={styles.saleDate}>
                    {new Date(sale.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[
                  styles.saleBadge,
                  sale.status === 'completed' ? styles.completedBadge : styles.pendingBadge
                ]}>
                  <Text style={styles.saleBadgeText}>{sale.status}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No sales yet</Text>
              <Text style={styles.emptySubtext}>
                Share your QR code to start receiving payments!
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    paddingBottom: SPACING.lg,
  },
  greeting: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  statusActive: {
    backgroundColor: '#10B981',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  settingsButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsGradient: {
    padding: 12,
    borderRadius: 12,
  },
  qrCardWrapper: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  qrCard: {
    borderRadius: 24,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  qrContainer: {
    padding: SPACING.md,
  },
  qrCodeWrapper: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 16,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderStyle: 'dashed',
  },
  qrPlaceholderText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
  },
  qrActions: {
    flexDirection: 'row',
    gap: SPACING.xl,
    marginTop: SPACING.lg,
  },
  qrActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  qrActionText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  shortcodeContainer: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  shortcodeLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  shortcode: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  balanceCardWrapper: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  balanceCard: {
    borderRadius: 20,
    padding: SPACING.xl,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  balanceAmount: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: 'bold',
  },
  balanceFooter: {
    marginTop: SPACING.md,
  },
  cashbackRate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONTS.sizes.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCardWrapper: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2 - 1,
  },
  statCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  seeAllText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
  },
  salesCard: {
    marginHorizontal: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  saleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  saleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  saleInfo: {
    flex: 1,
  },
  saleAmount: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  saleDate: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  saleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  pendingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  saleBadgeText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xs,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    marginTop: SPACING.lg,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xl,
  },
});

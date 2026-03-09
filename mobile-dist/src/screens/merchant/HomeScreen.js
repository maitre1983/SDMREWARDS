/**
 * SDM REWARDS Mobile - Merchant Home Screen
 * Dashboard with QR code, sales stats, and transactions
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
import { merchantAPI } from '../../services/api';
import { COLORS, SPACING, FONTS } from '../../utils/constants';

const { width } = Dimensions.get('window');

export default function MerchantHomeScreen({ navigation }) {
  const { user, logout, refreshDashboard } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showQRModal, setShowQRModal] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const qrScale = useRef(new Animated.Value(0.8)).current;
  const statsAnims = useRef([
    new Animated.Value(0),
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
      Animated.spring(qrScale, {
        toValue: 1,
        delay: 300,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

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

    // Pulse animation for QR
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboard, txResponse] = await Promise.all([
        merchantAPI.getDashboard(),
        merchantAPI.getTransactions({ limit: 10 }),
      ]);
      setDashboardData(dashboard);
      setTransactions(txResponse.transactions || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, []);

  const shareQRCode = async () => {
    try {
      const message = `Pay at ${user?.business_name || 'our store'} using SDM Rewards! Scan our QR code or use code: ${user?.qr_code}`;
      await Share.share({
        message,
        title: 'SDM Rewards Payment',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const businessName = user?.business_name || 'Merchant';
  const qrCode = user?.qr_code || user?.payment_qr_code || 'MERCHANT-QR';
  const todaySales = dashboardData?.today_sales || 0;
  const totalSales = dashboardData?.total_sales || user?.total_sales || 0;
  const totalTransactions = dashboardData?.total_transactions || 0;
  const cashbackPaid = dashboardData?.cashback_paid || 0;
  const cashbackRate = user?.cashback_rate || 5;

  const stats = [
    { label: "Today's Sales", value: `GHS ${todaySales.toFixed(2)}`, icon: 'today', color: COLORS.primary },
    { label: 'Total Sales', value: `GHS ${totalSales.toFixed(2)}`, icon: 'cash', color: COLORS.secondary },
    { label: 'Transactions', value: totalTransactions.toString(), icon: 'receipt', color: '#8B5CF6' },
    { label: 'Cashback Paid', value: `GHS ${cashbackPaid.toFixed(2)}`, icon: 'gift', color: '#3B82F6' },
  ];

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
          <View style={styles.merchantBadge}>
            <Ionicons name="storefront" size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle} numberOfLines={1}>{businessName}</Text>
            <Text style={styles.headerSubtitle}>Merchant Dashboard</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('MerchantSettings')}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.headerIconGradient}
            >
              <Ionicons name="settings-outline" size={20} color={COLORS.text} />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconBtn}
            onPress={logout}
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
        {/* QR Code Card */}
        <Animated.View 
          style={{ 
            transform: [
              { scale: Animated.multiply(qrScale, pulseAnim) }
            ] 
          }}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706', '#B45309']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.qrCard}
          >
            <View style={styles.qrCardHeader}>
              <Text style={styles.qrCardTitle}>Your Payment QR</Text>
              <View style={styles.cashbackBadge}>
                <Ionicons name="gift" size={12} color={COLORS.white} />
                <Text style={styles.cashbackText}>{cashbackRate}% Cashback</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.qrContainer}
              onPress={() => setShowQRModal(true)}
              activeOpacity={0.9}
            >
              <View style={styles.qrWrapper}>
                <QRCode
                  value={qrCode}
                  size={140}
                  backgroundColor="white"
                  color="#0F172A"
                />
              </View>
              <Text style={styles.qrHint}>Tap to enlarge</Text>
            </TouchableOpacity>

            <View style={styles.qrCodeDisplay}>
              <Text style={styles.qrCodeLabel}>QR Code:</Text>
              <Text style={styles.qrCodeValue}>{qrCode}</Text>
            </View>

            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.qrActionBtn} onPress={shareQRCode}>
                <Ionicons name="share-outline" size={18} color={COLORS.white} />
                <Text style={styles.qrActionText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.qrActionBtn}
                onPress={() => setShowQRModal(true)}
              >
                <Ionicons name="expand-outline" size={18} color={COLORS.white} />
                <Text style={styles.qrActionText}>Full Screen</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <Animated.View
              key={stat.label}
              style={[
                styles.statCardWrapper,
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
              <View style={styles.statCard}>
                <LinearGradient
                  colors={[`${stat.color}15`, `${stat.color}05`]}
                  style={styles.statCardGradient}
                >
                  <View style={[styles.statIcon, { backgroundColor: `${stat.color}25` }]}>
                    <Ionicons name={stat.icon} size={20} color={stat.color} />
                  </View>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </LinearGradient>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Recent Transactions */}
        <Animated.View style={[styles.transactionsSection, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="time" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('MerchantTransactions')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionsList}>
            {transactions.length > 0 ? (
              transactions.slice(0, 5).map((tx, index) => (
                <View key={tx.id || index} style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    <Ionicons name="arrow-down" size={18} color={COLORS.secondary} />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle} numberOfLines={1}>
                      {tx.client_name || 'Customer'}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {new Date(tx.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.transactionAmount}>
                    +GHS {parseFloat(tx.amount || 0).toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyTransactions}>
                <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No transactions yet</Text>
                <Text style={styles.emptySubtext}>Share your QR code to receive payments</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('MerchantTransactions')}
          >
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']}
              style={styles.quickActionGradient}
            >
              <Ionicons name="list" size={24} color="#8B5CF6" />
              <Text style={styles.quickActionText}>All Sales</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('MerchantSettings')}
          >
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)']}
              style={styles.quickActionGradient}
            >
              <Ionicons name="settings" size={24} color="#3B82F6" />
              <Text style={styles.quickActionText}>Settings</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <LinearGradient
          colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.98)']}
          style={styles.bottomNavGradient}
        >
          <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
            <Ionicons name="home" size={22} color={COLORS.primary} />
            <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => setShowQRModal(true)}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.qrNavButton}
            >
              <Ionicons name="qr-code" size={26} color={COLORS.white} />
            </LinearGradient>
            <Text style={styles.navLabelQR}>QR Code</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => navigation.navigate('MerchantTransactions')}
          >
            <Ionicons name="receipt-outline" size={22} color={COLORS.textMuted} />
            <Text style={styles.navLabel}>Sales</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* QR Modal */}
      {showQRModal && (
        <TouchableOpacity 
          style={styles.qrModal}
          activeOpacity={1}
          onPress={() => setShowQRModal(false)}
        >
          <View style={styles.qrModalContent}>
            <Text style={styles.qrModalTitle}>{businessName}</Text>
            <Text style={styles.qrModalSubtitle}>Scan to pay with SDM Rewards</Text>
            <View style={styles.qrModalWrapper}>
              <QRCode
                value={qrCode}
                size={250}
                backgroundColor="white"
                color="#0F172A"
              />
            </View>
            <Text style={styles.qrModalCode}>{qrCode}</Text>
            <View style={styles.qrModalCashback}>
              <Ionicons name="gift" size={18} color={COLORS.secondary} />
              <Text style={styles.qrModalCashbackText}>{cashbackRate}% Cashback for customers</Text>
            </View>
            <TouchableOpacity style={styles.qrModalClose} onPress={() => setShowQRModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
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
    flex: 1,
    gap: SPACING.md,
  },
  merchantBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    maxWidth: 180,
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
  qrCard: {
    borderRadius: 24,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  qrCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.md,
  },
  qrCardTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  cashbackText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  qrWrapper: {
    padding: SPACING.md,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  qrHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.xs,
    marginTop: SPACING.sm,
  },
  qrCodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    marginBottom: SPACING.md,
  },
  qrCodeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.sm,
    marginRight: SPACING.sm,
  },
  qrCodeValue: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  qrActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  qrActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  qrActionText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCardWrapper: {
    width: '48%',
  },
  statCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  transactionsSection: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  transactionsList: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
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
  },
  transactionDate: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  transactionAmount: {
    color: COLORS.secondary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
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
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  quickAction: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionGradient: {
    padding: SPACING.lg,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickActionText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
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
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.lg,
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
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 8,
  },
  qrNavButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  qrModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  qrModalContent: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  qrModalTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  qrModalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.xl,
  },
  qrModalWrapper: {
    padding: SPACING.lg,
    backgroundColor: 'white',
    borderRadius: 24,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: SPACING.lg,
  },
  qrModalCode: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },
  qrModalCashback: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  qrModalCashbackText: {
    color: COLORS.secondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  qrModalClose: {
    position: 'absolute',
    top: -40,
    right: 0,
    padding: SPACING.md,
  },
});

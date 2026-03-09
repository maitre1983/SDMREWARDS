# SDM REWARDS - Code des Écrans Merchant

## src/screens/merchant/HomeScreen.js

```javascript
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
```

## src/screens/merchant/HistoryScreen.js

```javascript
/**
 * SDM REWARDS Mobile - Merchant History Screen
 * Full transaction history with filters, search, and export
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
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { merchantAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONTS } from '../../utils/constants';

const DATE_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
];

export default function MerchantHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, count: 0, cashback: 0 });
  
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

    fetchTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchQuery, dateFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await merchantAPI.getTransactions({ limit: 200 });
      const txList = response.transactions || [];
      setTransactions(txList);
      calculateStats(txList);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (txList) => {
    const total = txList.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
    const cashback = txList.reduce((sum, tx) => sum + parseFloat(tx.cashback_amount || 0), 0);
    setStats({
      total,
      count: txList.length,
      cashback,
    });
  };

  const filterTransactions = () => {
    let filtered = [...transactions];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        (tx.client_name || '').toLowerCase().includes(query) ||
        (tx.client_phone || '').toLowerCase().includes(query) ||
        (tx.id || '').toLowerCase().includes(query)
      );
    }
    
    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.created_at);
        return txDate.toDateString() === now.toDateString();
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(tx => new Date(tx.created_at) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(tx => new Date(tx.created_at) >= monthAgo);
    }
    
    setFilteredTransactions(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, []);

  const exportTransactions = async () => {
    try {
      const csvData = filteredTransactions.map(tx => 
        `${tx.client_name || 'Customer'},${tx.amount},${tx.cashback_amount || 0},${new Date(tx.created_at).toISOString()}`
      ).join('\n');
      
      const header = 'Customer,Amount (GHS),Cashback (GHS),Date\n';
      const content = header + csvData;
      
      await Share.share({
        message: content,
        title: 'Transaction Export',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export transactions');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
          <Text style={styles.headerTitle}>Sales History</Text>
          <Text style={styles.headerSubtitle}>{filteredTransactions.length} transactions</Text>
        </View>
        
        <TouchableOpacity style={styles.exportButton} onPress={exportTransactions}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
            style={styles.exportButtonGradient}
          >
            <Ionicons name="download-outline" size={20} color="#8B5CF6" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Stats Summary */}
      <Animated.View style={[styles.statsCard, { opacity: statsAnim }]}>
        <LinearGradient
          colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
          style={styles.statsGradient}
        >
          <View style={styles.statItem}>
            <Text style={styles.statValue}>GHS {stats.total.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Sales</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.secondary }]}>{stats.count}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>GHS {stats.cashback.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Cashback Paid</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View style={[styles.searchContainer, { opacity: fadeAnim }]}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer name or phone..."
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

      {/* Date Filters */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {DATE_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                dateFilter === filter.id && styles.filterChipActive
              ]}
              onPress={() => setDateFilter(filter.id)}
            >
              <Text style={[
                styles.filterChipText,
                dateFilter === filter.id && styles.filterChipTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : filteredTransactions.length > 0 ? (
          <View style={styles.transactionsList}>
            {filteredTransactions.map((tx, index) => (
              <Animated.View
                key={tx.id || index}
                style={[
                  styles.transactionCard,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    }],
                  },
                ]}
              >
                <View style={styles.transactionIcon}>
                  <Ionicons name="arrow-down" size={20} color={COLORS.secondary} />
                </View>
                
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionCustomer} numberOfLines={1}>
                    {tx.client_name || 'Customer'}
                  </Text>
                  <Text style={styles.transactionPhone}>{tx.client_phone || ''}</Text>
                  <Text style={styles.transactionDateTime}>
                    {formatDate(tx.created_at)} at {formatTime(tx.created_at)}
                  </Text>
                </View>
                
                <View style={styles.transactionAmounts}>
                  <Text style={styles.transactionAmount}>
                    +GHS {parseFloat(tx.amount || 0).toFixed(2)}
                  </Text>
                  {tx.cashback_amount > 0 && (
                    <Text style={styles.transactionCashback}>
                      -{parseFloat(tx.cashback_amount).toFixed(2)} CB
                    </Text>
                  )}
                </View>
              </Animated.View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || dateFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Transactions will appear here'}
            </Text>
          </View>
        )}
        
        <View style={{ height: 30 }} />
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
  exportButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  exportButtonGradient: {
    padding: 10,
    borderRadius: 12,
  },
  statsCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.lg,
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
  filtersContainer: {
    marginBottom: SPACING.md,
  },
  filtersContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 20,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.md,
  },
  transactionsList: {
    gap: SPACING.sm,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCustomer: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  transactionPhone: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  transactionDateTime: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 4,
  },
  transactionAmounts: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    color: COLORS.secondary,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  transactionCashback: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
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
});
```

## src/screens/merchant/SettingsScreen.js

```javascript
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
```

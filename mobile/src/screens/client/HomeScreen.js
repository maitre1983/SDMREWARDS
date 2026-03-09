/**
 * SDM REWARDS Mobile - Client Home Screen
 * Matching Web Dashboard Design
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDashboard();
    setRefreshing(false);
  }, []);

  const balance = user?.cashback_balance || 0;
  const transactions = dashboardData?.recent_transactions || [];
  const stats = dashboardData?.stats || {};
  const totalEarned = stats.total_earned || 0;
  const totalSpent = stats.total_spent || 0;
  const referralsCount = user?.referral_count || 0;
  const bonusEarned = stats.referral_bonus || 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={{ uri: LOGO_URL }} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>SDM</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

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
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <LinearGradient
            colors={['#F59E0B', '#D97706', '#B45309']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Cashback Balance</Text>
              <View style={styles.memberBadge}>
                <Text style={styles.memberBadgeText}>MEMBER</Text>
              </View>
            </View>
            
            <Text style={styles.balanceAmount}>GHS {balance.toFixed(2)}</Text>
            
            <View style={styles.balanceStats}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Total Earned</Text>
                <Text style={styles.balanceStatValue}>GHS {totalEarned.toFixed(2)}</Text>
              </View>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Total Spent</Text>
                <Text style={styles.balanceStatValue}>GHS {totalSpent.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.balanceActions}>
              <TouchableOpacity 
                style={styles.balanceActionBtn}
                onPress={() => navigation.navigate('Services')}
              >
                <Ionicons name="grid-outline" size={18} color={COLORS.white} />
                <Text style={styles.balanceActionText}>Services</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.balanceActionBtn}
                onPress={() => navigation.navigate('Withdrawal')}
              >
                <Ionicons name="wallet-outline" size={18} color={COLORS.white} />
                <Text style={styles.balanceActionText}>Withdraw</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.balanceActionBtn, styles.settingsBtn]}
                onPress={() => navigation.navigate('Profile')}
              >
                <Ionicons name="settings-outline" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Referrals')}
          >
            <Ionicons name="trending-up-outline" size={24} color={COLORS.primary} />
            <Text style={styles.statLabel}>Referrals</Text>
            <Text style={styles.statValue}>{referralsCount}</Text>
          </TouchableOpacity>
          
          <View style={styles.statCard}>
            <Ionicons name="gift-outline" size={24} color={COLORS.primary} />
            <Text style={styles.statLabel}>Bonus Earned</Text>
            <Text style={styles.statValue}>GHS {bonusEarned}</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Ionicons name="time-outline" size={20} color={COLORS.text} />
            <Text style={styles.activityTitle}>Recent Activity</Text>
          </View>
          
          <View style={styles.activityCard}>
            {transactions.length > 0 ? (
              transactions.slice(0, 5).map((tx, index) => (
                <View key={tx.id || index} style={styles.transactionItem}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: tx.type === 'cashback' ? '#10B98120' : '#EF444420' }
                  ]}>
                    <Ionicons 
                      name={tx.type === 'cashback' ? 'arrow-down' : 'arrow-up'} 
                      size={16} 
                      color={tx.type === 'cashback' ? '#10B981' : '#EF4444'} 
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>
                      {tx.description || tx.type?.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {new Date(tx.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: tx.type === 'cashback' ? '#10B981' : '#EF4444' }
                  ]}>
                    {tx.type === 'cashback' ? '+' : '-'}GHS {parseFloat(tx.amount || 0).toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyActivity}>
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="home" size={22} color={COLORS.primary} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Partners')}
        >
          <Ionicons name="storefront-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.navLabel}>Partners</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('QRScanner')}
        >
          <View style={styles.qrNavButton}>
            <Ionicons name="qr-code" size={24} color={COLORS.white} />
          </View>
          <Text style={styles.navLabel}>QR Code</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('History')}
        >
          <Ionicons name="time-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.navLabel}>History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Referrals')}
        >
          <Ionicons name="people-outline" size={22} color={COLORS.textMuted} />
          <Text style={styles.navLabel}>Referrals</Text>
        </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: SPACING.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerIcon: {
    padding: SPACING.sm,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  balanceCard: {
    borderRadius: 20,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
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
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 20,
  },
  memberBadgeText: {
    color: '#D97706',
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },
  balanceAmount: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  balanceStats: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    gap: SPACING.xl,
  },
  balanceStat: {},
  balanceStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.sm,
  },
  balanceStatValue: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  balanceActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  balanceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 25,
    gap: SPACING.xs,
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
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.sm,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  activitySection: {
    marginBottom: SPACING.lg,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  activityTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: COLORS.card,
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
    borderBottomColor: COLORS.cardBorder,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.md,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    paddingVertical: SPACING.sm,
    paddingBottom: 25,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
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
  qrNavButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
});

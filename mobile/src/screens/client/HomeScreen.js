/**
 * SDM REWARDS Mobile - Client Home Screen
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Card, BalanceCard, TransactionItem } from '../../components/Common';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, formatCurrency } from '../../utils/constants';

const { width } = Dimensions.get('window');

export default function ClientHomeScreen({ navigation }) {
  const { user, dashboardData, refreshDashboard, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDashboard();
    setRefreshing(false);
  }, []);

  const balance = user?.cashback_balance || 0;
  const transactions = dashboardData?.recent_transactions || [];
  const stats = dashboardData?.stats || {};

  const quickActions = [
    { icon: 'qr-code-outline', label: 'Scan QR', screen: 'QRScanner', color: COLORS.primary },
    { icon: 'phone-portrait-outline', label: 'Airtime', screen: 'Services', params: { tab: 'airtime' }, color: COLORS.info },
    { icon: 'wifi-outline', label: 'Data', screen: 'Services', params: { tab: 'data' }, color: COLORS.secondary },
    { icon: 'people-outline', label: 'Referrals', screen: 'Referrals', color: '#8B5CF6' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.full_name?.split(' ')[0] || 'User'}</Text>
          <Text style={styles.subtitle}>Welcome back!</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-circle-outline" size={40} color={COLORS.text} />
        </TouchableOpacity>
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
      >
        {/* Balance Card */}
        <BalanceCard
          balance={balance}
          onWithdraw={() => navigation.navigate('Withdrawal')}
        />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickActionButton}
              onPress={() => navigation.navigate(action.screen, action.params)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>{formatCurrency(stats.total_earned || 0)}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="bag-check" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{stats.total_transactions || 0}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </Card>
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.transactionsCard}>
          {transactions.length > 0 ? (
            transactions.slice(0, 5).map((tx, index) => (
              <TransactionItem key={tx.id || index} transaction={tx} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Scan a merchant QR code to start earning cashback!
              </Text>
            </View>
          )}
        </Card>

        <View style={{ height: 100 }} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    paddingBottom: SPACING.lg,
  },
  greeting: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  profileButton: {
    padding: SPACING.xs,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.xl,
  },
  quickActionButton: {
    alignItems: 'center',
    width: (width - 80) / 4,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionLabel: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  statValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xs,
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
  transactionsCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
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

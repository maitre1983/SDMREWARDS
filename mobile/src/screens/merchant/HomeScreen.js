/**
 * SDM REWARDS Mobile - Merchant Home Screen
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
  Share,
} from 'react-native';
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDashboard();
    setRefreshing(false);
  }, []);

  const merchant = user;
  const stats = dashboardData?.stats || {};
  const recentSales = dashboardData?.recent_sales || [];
  const balance = merchant?.pending_payout || 0;

  // QR Code URL
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{merchant?.business_name || 'Business'}</Text>
          <Text style={styles.subtitle}>Merchant Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="settings-outline" size={28} color={COLORS.text} />
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
        {/* QR Code Card */}
        <Card style={styles.qrCard}>
          <TouchableOpacity
            style={styles.qrContainer}
            onPress={() => setShowQR(!showQR)}
          >
            {showQR ? (
              <View style={styles.qrCodeWrapper}>
                <QRCode
                  value={qrCodeUrl}
                  size={200}
                  backgroundColor={COLORS.white}
                  color={COLORS.black}
                />
              </View>
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code" size={80} color={COLORS.primary} />
                <Text style={styles.qrPlaceholderText}>Tap to show QR Code</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <View style={styles.qrActions}>
            <TouchableOpacity style={styles.qrActionButton} onPress={() => setShowQR(!showQR)}>
              <Ionicons name={showQR ? 'eye-off' : 'eye'} size={20} color={COLORS.text} />
              <Text style={styles.qrActionText}>{showQR ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qrActionButton} onPress={shareQRCode}>
              <Ionicons name="share-social" size={20} color={COLORS.text} />
              <Text style={styles.qrActionText}>Share</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.shortcode}>Code: {merchant?.shortcode || '---'}</Text>
        </Card>

        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Pending Payout</Text>
            <View style={[styles.statusBadge, merchant?.status === 'active' ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={styles.statusText}>{merchant?.status || 'pending'}</Text>
            </View>
          </View>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          <Text style={styles.balanceSubtext}>
            Cashback Rate: {merchant?.cashback_rate || 5}%
          </Text>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="cash" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>{formatCurrency(stats.total_sales || 0)}</Text>
            <Text style={styles.statLabel}>Total Sales</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="receipt" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{stats.total_transactions || 0}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="wallet" size={24} color={COLORS.info} />
            <Text style={styles.statValue}>{formatCurrency(stats.total_payouts || 0)}</Text>
            <Text style={styles.statLabel}>Total Payouts</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="people" size={24} color={COLORS.secondary} />
            <Text style={styles.statValue}>{stats.unique_customers || 0}</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </Card>
        </View>

        {/* Recent Sales */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.salesCard}>
          {recentSales.length > 0 ? (
            recentSales.slice(0, 5).map((sale, index) => (
              <View key={sale.id || index} style={styles.saleItem}>
                <View style={styles.saleIcon}>
                  <Ionicons name="arrow-down" size={20} color={COLORS.success} />
                </View>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleAmount}>{formatCurrency(sale.amount)}</Text>
                  <Text style={styles.saleDate}>
                    {new Date(sale.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.saleBadge, 
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
  qrCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  qrContainer: {
    padding: SPACING.lg,
  },
  qrCodeWrapper: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
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
    marginTop: SPACING.md,
  },
  qrActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.lg,
  },
  qrActionText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
  },
  shortcode: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.md,
  },
  balanceCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  activeBadge: {
    backgroundColor: COLORS.successBg,
  },
  inactiveBadge: {
    backgroundColor: COLORS.warningBg,
  },
  statusText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  balanceAmount: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: 'bold',
  },
  balanceSubtext: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2 - 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  statValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
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
  salesCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
  },
  saleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  saleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.successBg,
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
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  completedBadge: {
    backgroundColor: COLORS.successBg,
  },
  pendingBadge: {
    backgroundColor: COLORS.warningBg,
  },
  saleBadgeText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xs,
    textTransform: 'capitalize',
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

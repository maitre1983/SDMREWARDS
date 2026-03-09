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

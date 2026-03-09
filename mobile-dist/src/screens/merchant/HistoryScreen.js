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

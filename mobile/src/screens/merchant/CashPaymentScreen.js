/**
 * SDM REWARDS Mobile - Merchant Cash Payment Screen
 * Record cash payments and manage debit account
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { merchantAPI } from '../../services/api';
import { COLORS, SPACING, FONTS } from '../../utils/constants';

export default function CashPaymentScreen({ navigation }) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Debit Account State
  const [debitAccount, setDebitAccount] = useState(null);
  const [debitHistory, setDebitHistory] = useState([]);
  
  // Search & Payment State
  const [customerSearch, setCustomerSearch] = useState('');
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashDescription, setCashDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpPhone, setTopUpPhone] = useState('');
  const [topUpNetwork, setTopUpNetwork] = useState('MTN');
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
    
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [accountRes, historyRes] = await Promise.all([
        merchantAPI.getDebitAccount(),
        merchantAPI.getDebitHistory({ limit: 20 }),
      ]);
      setDebitAccount(accountRes);
      setDebitHistory(historyRes.transactions || []);
    } catch (error) {
      console.error('Error fetching debit data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const searchCustomer = async () => {
    if (!customerSearch || customerSearch.length < 3) {
      Alert.alert('Error', 'Enter at least 3 characters');
      return;
    }
    
    try {
      setIsSearching(true);
      setFoundCustomer(null);
      const result = await merchantAPI.searchCustomer(customerSearch);
      setFoundCustomer(result.customer);
    } catch (error) {
      Alert.alert('Not Found', error.response?.data?.detail || 'Customer not found');
      setFoundCustomer(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCashPayment = async () => {
    if (!foundCustomer) {
      Alert.alert('Error', 'Please search and select a customer first');
      return;
    }
    
    const amount = parseFloat(cashAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    try {
      setIsProcessing(true);
      const result = await merchantAPI.recordCashTransaction({
        customer_id: foundCustomer.id,
        amount: amount,
        description: cashDescription || undefined,
      });
      
      Alert.alert(
        'Success',
        `Cash payment recorded! GHS ${result.transaction.cashback_amount.toFixed(2)} cashback credited to customer.`,
        [{ text: 'OK', onPress: () => {
          setShowPaymentModal(false);
          resetPaymentForm();
          fetchData();
        }}]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to record payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount < 10) {
      Alert.alert('Error', 'Minimum top-up amount is GHS 10');
      return;
    }
    if (!topUpPhone) {
      Alert.alert('Error', 'Please enter your MoMo number');
      return;
    }
    
    try {
      setIsProcessingTopUp(true);
      await merchantAPI.topUpDebitAccount({
        amount: amount,
        payment_method: 'momo',
        momo_phone: topUpPhone,
        momo_network: topUpNetwork,
      });
      
      Alert.alert(
        'Payment Initiated',
        'Please approve the payment prompt on your phone',
        [{ text: 'OK', onPress: () => {
          setShowTopUpModal(false);
          setTopUpAmount('');
        }}]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to initiate top-up');
    } finally {
      setIsProcessingTopUp(false);
    }
  };

  const resetPaymentForm = () => {
    setFoundCustomer(null);
    setCustomerSearch('');
    setCashAmount('');
    setCashDescription('');
  };

  const cashbackRate = user?.cashback_rate || 5;
  const balance = debitAccount?.stats?.current_balance || 0;
  const limit = debitAccount?.stats?.debit_limit || 0;
  const usagePercentage = debitAccount?.stats?.usage_percentage || 0;
  const isBlocked = debitAccount?.stats?.is_blocked || false;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#0F172A', '#1E1B4B', '#0F172A']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading debit account...</Text>
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
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cash Payments</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color={COLORS.text} />
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
        contentContainerStyle={styles.scrollContent}
      >
        {/* Debit Account Card */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <LinearGradient
            colors={['#F59E0B', '#D97706', '#B45309']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.debitCard}
          >
            <View style={styles.debitCardHeader}>
              <View style={styles.debitIconContainer}>
                <Ionicons name="wallet" size={24} color={COLORS.white} />
              </View>
              <View>
                <Text style={styles.debitCardTitle}>Debit Account</Text>
                <Text style={styles.debitCardSubtitle}>For cash payment cashback</Text>
              </View>
            </View>

            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={[styles.balanceValue, balance < 0 && styles.balanceNegative]}>
                  GHS {balance.toFixed(2)}
                </Text>
              </View>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Debit Limit</Text>
                <Text style={styles.balanceValue}>GHS {limit.toFixed(2)}</Text>
              </View>
            </View>

            {/* Usage Bar */}
            {limit > 0 && (
              <View style={styles.usageContainer}>
                <View style={styles.usageHeader}>
                  <Text style={styles.usageLabel}>Usage</Text>
                  <Text style={styles.usagePercent}>{usagePercentage.toFixed(1)}%</Text>
                </View>
                <View style={styles.usageBar}>
                  <View 
                    style={[
                      styles.usageFill,
                      { 
                        width: `${Math.min(100, usagePercentage)}%`,
                        backgroundColor: usagePercentage >= 100 ? '#EF4444' : 
                                        usagePercentage >= 75 ? '#F59E0B' : '#10B981'
                      }
                    ]} 
                  />
                </View>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Blocked Warning */}
        {isBlocked && (
          <View style={styles.blockedAlert}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <View style={styles.blockedAlertText}>
              <Text style={styles.blockedTitle}>Account Blocked</Text>
              <Text style={styles.blockedSubtitle}>
                Your debit limit has been reached. Please top up to continue.
              </Text>
            </View>
          </View>
        )}

        {/* Warning at 75% */}
        {!isBlocked && usagePercentage >= 75 && (
          <View style={styles.warningAlert}>
            <Ionicons name="warning" size={24} color="#F59E0B" />
            <View style={styles.warningAlertText}>
              <Text style={styles.warningTitle}>Warning: {usagePercentage.toFixed(0)}% Used</Text>
              <Text style={styles.warningSubtitle}>
                Consider topping up soon to avoid interruptions.
              </Text>
            </View>
          </View>
        )}

        {/* No Limit Warning */}
        {limit === 0 && (
          <View style={styles.noLimitAlert}>
            <Ionicons name="information-circle" size={24} color={COLORS.textMuted} />
            <View style={styles.noLimitAlertText}>
              <Text style={styles.noLimitTitle}>No Debit Limit</Text>
              <Text style={styles.noLimitSubtitle}>
                Contact admin to set up your debit limit for cash transactions.
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.recordBtn, (isBlocked || limit === 0) && styles.actionBtnDisabled]}
            onPress={() => setShowPaymentModal(true)}
            disabled={isBlocked || limit === 0}
          >
            <Ionicons name="cash" size={22} color={COLORS.white} />
            <Text style={styles.actionBtnText}>Record Cash Payment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionBtn, styles.topUpBtn]}
            onPress={() => setShowTopUpModal(true)}
          >
            <Ionicons name="arrow-up-circle" size={22} color={COLORS.white} />
            <Text style={styles.actionBtnText}>Top Up Account</Text>
          </TouchableOpacity>
        </View>

        {/* Debit History */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Debit History</Text>
          </View>

          <View style={styles.historyList}>
            {debitHistory.length > 0 ? (
              debitHistory.map((entry, index) => (
                <View key={entry.id || index} style={styles.historyItem}>
                  <View style={[
                    styles.historyIcon,
                    entry.type === 'credit' ? styles.historyIconCredit : styles.historyIconDebit
                  ]}>
                    <Ionicons 
                      name={entry.type === 'credit' ? 'arrow-down' : 'arrow-up'} 
                      size={16} 
                      color={entry.type === 'credit' ? '#10B981' : '#EF4444'} 
                    />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDesc} numberOfLines={1}>
                      {entry.description?.slice(0, 35)}...
                    </Text>
                    <Text style={styles.historyDate}>
                      {new Date(entry.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.historyAmounts}>
                    <Text style={[
                      styles.historyAmount,
                      entry.type === 'credit' ? styles.historyAmountCredit : styles.historyAmountDebit
                    ]}>
                      {entry.type === 'credit' ? '+' : '-'}GHS {entry.amount?.toFixed(2)}
                    </Text>
                    <Text style={styles.historyBalance}>
                      Bal: GHS {entry.balance_after?.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyHistory}>
                <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No debit transactions yet</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Cash Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <Ionicons name="cash" size={24} color="#10B981" />
              </View>
              <Text style={styles.modalTitle}>Record Cash Payment</Text>
              <TouchableOpacity 
                style={styles.modalClose}
                onPress={() => { setShowPaymentModal(false); resetPaymentForm(); }}
              >
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Customer Search */}
              <Text style={styles.inputLabel}>Search Customer</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Customer ID or Phone"
                  placeholderTextColor={COLORS.textMuted}
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  onSubmitEditing={searchCustomer}
                />
                <TouchableOpacity 
                  style={styles.searchBtn}
                  onPress={searchCustomer}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Ionicons name="search" size={20} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Found Customer */}
              {foundCustomer && (
                <View style={styles.foundCustomer}>
                  <View style={styles.foundCustomerIcon}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  </View>
                  <View style={styles.foundCustomerInfo}>
                    <Text style={styles.foundCustomerName}>{foundCustomer.full_name}</Text>
                    <Text style={styles.foundCustomerPhone}>
                      {foundCustomer.phone} • {foundCustomer.card_type?.toUpperCase()} Card
                    </Text>
                  </View>
                </View>
              )}

              {/* Amount */}
              <Text style={styles.inputLabel}>Transaction Amount (GHS)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor={COLORS.textMuted}
                value={cashAmount}
                onChangeText={setCashAmount}
                keyboardType="decimal-pad"
              />

              {/* Cashback Preview */}
              {cashAmount && parseFloat(cashAmount) > 0 && (
                <View style={styles.cashbackPreview}>
                  <View style={styles.cashbackRow}>
                    <Text style={styles.cashbackLabel}>Cashback Rate:</Text>
                    <Text style={styles.cashbackValue}>{cashbackRate}%</Text>
                  </View>
                  <View style={styles.cashbackRow}>
                    <Text style={styles.cashbackLabel}>Customer Cashback:</Text>
                    <Text style={styles.cashbackValueHighlight}>
                      GHS {(parseFloat(cashAmount) * cashbackRate / 100).toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Description */}
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Product purchase"
                placeholderTextColor={COLORS.textMuted}
                value={cashDescription}
                onChangeText={setCashDescription}
              />
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => { setShowPaymentModal(false); resetPaymentForm(); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSubmitBtn, (!foundCustomer || !cashAmount) && styles.modalSubmitBtnDisabled]}
                onPress={handleCashPayment}
                disabled={!foundCustomer || !cashAmount || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSubmitText}>Record Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Top Up Modal */}
      <Modal
        visible={showTopUpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTopUpModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <Ionicons name="arrow-up-circle" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.modalTitle}>Top Up Debit Account</Text>
              <TouchableOpacity 
                style={styles.modalClose}
                onPress={() => setShowTopUpModal(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Amount */}
              <Text style={styles.inputLabel}>Amount (GHS)</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum GHS 10"
                placeholderTextColor={COLORS.textMuted}
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                keyboardType="decimal-pad"
              />

              {/* Phone */}
              <Text style={styles.inputLabel}>MoMo Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 0541008285"
                placeholderTextColor={COLORS.textMuted}
                value={topUpPhone}
                onChangeText={setTopUpPhone}
                keyboardType="phone-pad"
              />

              {/* Network */}
              <Text style={styles.inputLabel}>Network</Text>
              <View style={styles.networkSelector}>
                {['MTN', 'Telecel', 'AirtelTigo'].map((network) => (
                  <TouchableOpacity
                    key={network}
                    style={[
                      styles.networkOption,
                      topUpNetwork === network && styles.networkOptionActive
                    ]}
                    onPress={() => setTopUpNetwork(network)}
                  >
                    <Text style={[
                      styles.networkOptionText,
                      topUpNetwork === network && styles.networkOptionTextActive
                    ]}>
                      {network}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Info */}
              {topUpAmount && parseFloat(topUpAmount) >= 10 && (
                <View style={styles.topUpInfo}>
                  <Ionicons name="information-circle" size={20} color="#F59E0B" />
                  <Text style={styles.topUpInfoText}>
                    You will receive a payment prompt on {topUpPhone || 'your phone'} to approve GHS {parseFloat(topUpAmount).toFixed(2)}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => setShowTopUpModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalSubmitBtn, 
                  styles.topUpSubmitBtn,
                  (!topUpAmount || parseFloat(topUpAmount) < 10 || !topUpPhone) && styles.modalSubmitBtnDisabled
                ]}
                onPress={handleTopUp}
                disabled={!topUpAmount || parseFloat(topUpAmount) < 10 || !topUpPhone || isProcessingTopUp}
              >
                {isProcessingTopUp ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSubmitText}>Pay Now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
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
    padding: SPACING.sm,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: SPACING.sm,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  debitCard: {
    borderRadius: 24,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  debitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  debitIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debitCardTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  debitCardSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONTS.sizes.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.sm,
    marginBottom: 4,
  },
  balanceValue: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  balanceNegative: {
    color: '#FCA5A5',
  },
  usageContainer: {
    marginTop: SPACING.sm,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  usageLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.sm,
  },
  usagePercent: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  usageBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: 4,
  },
  blockedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  blockedAlertText: {
    flex: 1,
  },
  blockedTitle: {
    color: '#EF4444',
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  blockedSubtitle: {
    color: '#FCA5A5',
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  warningAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  warningAlertText: {
    flex: 1,
  },
  warningTitle: {
    color: '#F59E0B',
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  warningSubtitle: {
    color: '#FCD34D',
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  noLimitAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  noLimitAlertText: {
    flex: 1,
  },
  noLimitTitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  noLimitSubtitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 14,
    gap: SPACING.xs,
  },
  recordBtn: {
    backgroundColor: '#10B981',
  },
  topUpBtn: {
    backgroundColor: '#F59E0B',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  historySection: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  historyList: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  historyIconCredit: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  historyIconDebit: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  historyInfo: {
    flex: 1,
  },
  historyDesc: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  historyDate: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  historyAmounts: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  historyAmountCredit: {
    color: '#10B981',
  },
  historyAmountDebit: {
    color: '#EF4444',
  },
  historyBalance: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.md,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.backgroundLight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  modalTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
  },
  modalClose: {
    padding: SPACING.xs,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
  },
  searchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
  },
  searchBtn: {
    backgroundColor: '#10B981',
    width: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  foundCustomerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundCustomerInfo: {
    flex: 1,
  },
  foundCustomerName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  foundCustomerPhone: {
    color: '#6EE7B7',
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  cashbackPreview: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  cashbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  cashbackLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  cashbackValue: {
    color: '#10B981',
    fontSize: FONTS.sizes.sm,
  },
  cashbackValueHighlight: {
    color: '#10B981',
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  networkSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  networkOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  networkOptionActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  networkOptionText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  networkOptionTextActive: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  topUpInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  topUpInfoText: {
    flex: 1,
    color: '#FCD34D',
    fontSize: FONTS.sizes.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  topUpSubmitBtn: {
    backgroundColor: '#F59E0B',
  },
  modalSubmitBtnDisabled: {
    opacity: 0.5,
  },
  modalSubmitText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
});

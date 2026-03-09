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

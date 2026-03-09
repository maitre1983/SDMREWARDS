/**
 * SDM REWARDS Mobile - Services Screen
 * Airtime and Data Bundle purchases
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
import { servicesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONTS, formatGhanaPhone } from '../../utils/constants';

const NETWORKS = [
  { id: 'mtn', name: 'MTN', color: '#FFCC00', icon: 'cellular' },
  { id: 'vodafone', name: 'Vodafone', color: '#E60000', icon: 'cellular' },
  { id: 'airteltigo', name: 'AirtelTigo', color: '#FF0000', icon: 'cellular' },
];

const QUICK_AMOUNTS = [1, 2, 5, 10, 20, 50];

export default function ServicesScreen({ navigation }) {
  const { user, refreshDashboard } = useAuth();
  const [activeTab, setActiveTab] = useState('airtime');
  const [phone, setPhone] = useState(user?.phone || '');
  const [network, setNetwork] = useState('mtn');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [feeInfo, setFeeInfo] = useState(null);
  
  // Data bundles state
  const [dataServices, setDataServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [bundles, setBundles] = useState([]);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [loadingBundles, setLoadingBundles] = useState(false);
  
  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState(null); // null, 'processing', 'success', 'failed'
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const tabIndicator = useRef(new Animated.Value(0)).current;

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
    ]).start();

    fetchFeeInfo();
    fetchDataServices();
  }, []);

  useEffect(() => {
    // Animate tab indicator
    Animated.spring(tabIndicator, {
      toValue: activeTab === 'airtime' ? 0 : 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const fetchFeeInfo = async () => {
    try {
      const response = await servicesAPI.getFeeInfo();
      setFeeInfo(response.fees);
    } catch (error) {
      console.error('Error fetching fee info:', error);
    }
  };

  const fetchDataServices = async () => {
    try {
      const response = await servicesAPI.getDataServices();
      setDataServices(response.services || []);
    } catch (error) {
      console.error('Error fetching data services:', error);
    }
  };

  const fetchBundles = async (serviceId) => {
    if (!phone || phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number first');
      return;
    }
    
    try {
      setLoadingBundles(true);
      const formattedPhone = formatGhanaPhone(phone);
      const response = await servicesAPI.getDataBundles(serviceId, formattedPhone);
      setBundles(response.bundles || []);
      setSelectedService(serviceId);
    } catch (error) {
      console.error('Error fetching bundles:', error);
      Alert.alert('Error', 'Failed to fetch data bundles');
    } finally {
      setLoadingBundles(false);
    }
  };

  const calculateFee = () => {
    if (!feeInfo || !amount) return 0;
    const config = activeTab === 'airtime' ? feeInfo.airtime : feeInfo.data_bundle;
    if (config?.type === 'percentage') {
      return (parseFloat(amount) * (config.rate / 100)).toFixed(2);
    }
    return config?.rate || 0;
  };

  const calculateTotal = () => {
    const fee = parseFloat(calculateFee()) || 0;
    const amt = parseFloat(amount) || 0;
    return (amt + fee).toFixed(2);
  };

  const handlePurchase = () => {
    if (activeTab === 'airtime') {
      if (!phone || !amount || parseFloat(amount) < 1) {
        Alert.alert('Error', 'Please enter a valid phone number and amount');
        return;
      }
    } else {
      if (!phone || !selectedBundle) {
        Alert.alert('Error', 'Please enter a phone number and select a bundle');
        return;
      }
    }
    
    const total = activeTab === 'airtime' ? calculateTotal() : selectedBundle?.total || 0;
    if (parseFloat(total) > (user?.cashback_balance || 0)) {
      Alert.alert('Insufficient Balance', 'You do not have enough cashback balance for this purchase');
      return;
    }
    
    setShowConfirmModal(true);
  };

  const confirmPurchase = async () => {
    try {
      setPurchaseStatus('processing');
      
      if (activeTab === 'airtime') {
        const formattedPhone = formatGhanaPhone(phone);
        await servicesAPI.purchaseAirtime({
          phone: formattedPhone,
          network: network.toUpperCase(),
          amount: parseFloat(amount),
        });
      } else {
        const formattedPhone = formatGhanaPhone(phone);
        await servicesAPI.purchaseDataBundle({
          phone: formattedPhone,
          service_id: selectedService,
          package_code: selectedBundle.package_code,
          amount: selectedBundle.price,
        });
      }
      
      setPurchaseStatus('success');
      await refreshDashboard();
      
      // Reset form after success
      setTimeout(() => {
        setShowConfirmModal(false);
        setPurchaseStatus(null);
        setAmount('');
        setSelectedBundle(null);
      }, 2000);
      
    } catch (error) {
      console.error('Purchase error:', error);
      setPurchaseStatus('failed');
    }
  };

  const balance = user?.cashback_balance || 0;

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
          <Text style={styles.headerTitle}>Services</Text>
          <Text style={styles.headerSubtitle}>Balance: GHS {balance.toFixed(2)}</Text>
        </View>
        
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* Tab Selector */}
      <Animated.View style={[styles.tabContainer, { opacity: fadeAnim }]}>
        <View style={styles.tabBackground}>
          <Animated.View 
            style={[
              styles.tabIndicator,
              {
                transform: [
                  {
                    translateX: tabIndicator.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 160],
                    }),
                  },
                ],
              },
            ]}
          />
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('airtime')}
          >
            <Ionicons 
              name="phone-portrait" 
              size={18} 
              color={activeTab === 'airtime' ? COLORS.white : COLORS.textMuted} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'airtime' && styles.tabTextActive,
            ]}>
              Airtime
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('data')}
          >
            <Ionicons 
              name="wifi" 
              size={18} 
              color={activeTab === 'data' ? COLORS.white : COLORS.textMuted} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'data' && styles.tabTextActive,
            ]}>
              Data Bundle
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Phone Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Phone Number</Text>
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
        </View>

        {/* Network Selector */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Network</Text>
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
                ]}>
                  {net.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {activeTab === 'airtime' ? (
          <>
            {/* Quick Amounts */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Quick Select</Text>
              <View style={styles.quickAmounts}>
                {QUICK_AMOUNTS.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickAmount,
                      parseFloat(amount) === amt && styles.quickAmountActive,
                    ]}
                    onPress={() => setAmount(amt.toString())}
                  >
                    <Text style={[
                      styles.quickAmountText,
                      parseFloat(amount) === amt && styles.quickAmountTextActive,
                    ]}>
                      GHS {amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Amount (GHS)</Text>
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
            </View>

            {/* Fee Summary */}
            {amount && parseFloat(amount) > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Airtime Amount</Text>
                  <Text style={styles.summaryValue}>GHS {parseFloat(amount).toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Service Fee ({feeInfo?.airtime?.rate || 2}%)
                  </Text>
                  <Text style={styles.summaryValue}>GHS {calculateFee()}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>GHS {calculateTotal()}</Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Data Services */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Select Service</Text>
              <View style={styles.serviceGrid}>
                {dataServices.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.serviceCard,
                      selectedService === service.id && styles.serviceCardActive,
                    ]}
                    onPress={() => fetchBundles(service.id)}
                  >
                    <Ionicons 
                      name="globe" 
                      size={24} 
                      color={selectedService === service.id ? COLORS.primary : COLORS.textMuted} 
                    />
                    <Text style={[
                      styles.serviceName,
                      selectedService === service.id && styles.serviceNameActive,
                    ]}>
                      {service.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Data Bundles */}
            {loadingBundles ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading bundles...</Text>
              </View>
            ) : bundles.length > 0 ? (
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Available Bundles</Text>
                <View style={styles.bundlesList}>
                  {bundles.map((bundle, index) => (
                    <TouchableOpacity
                      key={bundle.package_code || index}
                      style={[
                        styles.bundleCard,
                        selectedBundle?.package_code === bundle.package_code && styles.bundleCardActive,
                      ]}
                      onPress={() => setSelectedBundle(bundle)}
                    >
                      <View style={styles.bundleInfo}>
                        <Text style={styles.bundleName}>{bundle.name}</Text>
                        <Text style={styles.bundleDetails}>{bundle.description || bundle.validity}</Text>
                      </View>
                      <View style={styles.bundlePrice}>
                        <Text style={styles.bundlePriceText}>GHS {bundle.price}</Text>
                        {selectedBundle?.package_code === bundle.package_code && (
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : selectedService ? (
              <View style={styles.emptyBundles}>
                <Ionicons name="wifi-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No bundles available</Text>
              </View>
            ) : null}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Purchase Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            (!amount && !selectedBundle) && styles.purchaseButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!amount && !selectedBundle}
        >
          <LinearGradient
            colors={(!amount && !selectedBundle) ? ['#374151', '#374151'] : ['#F59E0B', '#D97706']}
            style={styles.purchaseButtonGradient}
          >
            <Ionicons name="cart" size={20} color={COLORS.white} />
            <Text style={styles.purchaseButtonText}>
              {activeTab === 'airtime' ? 'Buy Airtime' : 'Buy Data'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => !purchaseStatus && setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {purchaseStatus === 'processing' ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.modalTitle}>Processing...</Text>
                <Text style={styles.modalSubtitle}>Please wait</Text>
              </View>
            ) : purchaseStatus === 'success' ? (
              <View style={styles.modalCenter}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={40} color={COLORS.secondary} />
                </View>
                <Text style={styles.modalTitle}>Success!</Text>
                <Text style={styles.modalSubtitle}>
                  {activeTab === 'airtime' ? 'Airtime sent successfully' : 'Data bundle purchased'}
                </Text>
              </View>
            ) : purchaseStatus === 'failed' ? (
              <View style={styles.modalCenter}>
                <View style={[styles.successIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="close" size={40} color="#EF4444" />
                </View>
                <Text style={styles.modalTitle}>Failed</Text>
                <Text style={styles.modalSubtitle}>Transaction failed. Please try again.</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setShowConfirmModal(false);
                    setPurchaseStatus(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Confirm Purchase</Text>
                <View style={styles.confirmDetails}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Phone</Text>
                    <Text style={styles.confirmValue}>{formatGhanaPhone(phone)}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Network</Text>
                    <Text style={styles.confirmValue}>{network.toUpperCase()}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>
                      {activeTab === 'airtime' ? 'Amount' : 'Bundle'}
                    </Text>
                    <Text style={styles.confirmValue}>
                      {activeTab === 'airtime' 
                        ? `GHS ${amount}` 
                        : selectedBundle?.name
                      }
                    </Text>
                  </View>
                  <View style={[styles.confirmRow, styles.confirmTotal]}>
                    <Text style={styles.confirmTotalLabel}>Total</Text>
                    <Text style={styles.confirmTotalValue}>
                      GHS {activeTab === 'airtime' ? calculateTotal() : selectedBundle?.price}
                    </Text>
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
                    onPress={confirmPurchase}
                  >
                    <LinearGradient
                      colors={['#F59E0B', '#D97706']}
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
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  tabContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  tabBackground: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 156,
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    zIndex: 1,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  inputSection: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.sm,
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickAmount: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickAmountActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: COLORS.primary,
  },
  quickAmountText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  quickAmountTextActive: {
    color: COLORS.primary,
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
    color: COLORS.primary,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  serviceCard: {
    width: '48%',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  serviceCardActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: COLORS.primary,
  },
  serviceName: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  serviceNameActive: {
    color: COLORS.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  bundlesList: {
    gap: SPACING.sm,
  },
  bundleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bundleCardActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: COLORS.primary,
  },
  bundleInfo: {
    flex: 1,
  },
  bundleName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  bundleDetails: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  bundlePrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bundlePriceText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
  },
  emptyBundles: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
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
  purchaseButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  purchaseButtonText: {
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
    color: COLORS.primary,
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
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  modalButtonText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
  },
});

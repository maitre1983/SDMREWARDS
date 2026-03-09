/**
 * SDM REWARDS Mobile - Card Screen
 * Purchase and upgrade membership cards
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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { clientAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONTS, formatGhanaPhone } from '../../utils/constants';

const { width } = Dimensions.get('window');

const CARD_COLORS = {
  silver: ['#A8A9AD', '#8E8E93', '#636366'],
  gold: ['#FFD700', '#FFC400', '#DAA520'],
  platinum: ['#E5E4E2', '#B4B4B4', '#8E8E93'],
};

const CARD_ICONS = {
  silver: 'shield',
  gold: 'star',
  platinum: 'diamond',
};

const NETWORKS = [
  { id: 'MTN', name: 'MTN MoMo', color: '#FFCC00' },
  { id: 'VODAFONE', name: 'Vodafone Cash', color: '#E60000' },
  { id: 'AIRTELTIGO', name: 'AirtelTigo Money', color: '#FF0000' },
];

export default function CardScreen({ navigation }) {
  const { user, refreshDashboard } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  
  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState('momo'); // 'momo', 'cashback', 'combined'
  const [momoNetwork, setMomoNetwork] = useState('MTN');
  const [momoPhone, setMomoPhone] = useState(user?.phone?.replace('+233', '') || '');
  const [cashbackAmount, setCashbackAmount] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardAnims = useRef([]).current;

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

    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await clientAPI.getAvailableCards();
      setCards(response.cards || []);
      animateCards(response.cards?.length || 0);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const animateCards = (count) => {
    for (let i = cardAnims.length; i < count; i++) {
      cardAnims.push(new Animated.Value(0));
    }
    
    const animations = cardAnims.slice(0, count).map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: 300 + index * 150,
        easing: Easing.out(Easing.back(1.3)),
        useNativeDriver: true,
      })
    );
    
    Animated.stagger(150, animations).start();
  };

  const hasActiveCard = user?.status === 'active' && user?.card_type;
  const currentCardType = user?.card_type?.toLowerCase();
  const cashbackBalance = user?.cashback_balance || 0;

  const getCardOrder = (type) => {
    const order = { silver: 1, gold: 2, platinum: 3 };
    return order[type?.toLowerCase()] || 0;
  };

  const canUpgradeTo = (cardType) => {
    if (!hasActiveCard) return true;
    return getCardOrder(cardType) > getCardOrder(currentCardType);
  };

  const isCurrentCard = (cardType) => {
    return currentCardType === cardType?.toLowerCase();
  };

  const handleSelectCard = (card) => {
    if (isCurrentCard(card.type)) {
      Alert.alert('Current Card', 'This is your current membership card.');
      return;
    }
    if (!canUpgradeTo(card.type)) {
      Alert.alert('Cannot Downgrade', 'You can only upgrade to a higher tier card.');
      return;
    }
    setSelectedCard(card);
    setPaymentMethod('momo');
    setCashbackAmount('');
    setShowPurchaseModal(true);
  };

  const calculatePaymentBreakdown = () => {
    if (!selectedCard) return { cashback: 0, momo: 0, total: 0 };
    
    const price = selectedCard.price;
    let cashback = 0;
    let momo = price;
    
    if (paymentMethod === 'cashback') {
      cashback = Math.min(cashbackBalance, price);
      momo = Math.max(0, price - cashback);
    } else if (paymentMethod === 'combined') {
      const amount = parseFloat(cashbackAmount) || 0;
      cashback = Math.min(amount, cashbackBalance, price);
      momo = Math.max(0, price - cashback);
    }
    
    return { cashback, momo, total: price };
  };

  const handlePurchase = async () => {
    if (!selectedCard) return;
    
    const breakdown = calculatePaymentBreakdown();
    
    // Validate MoMo phone if needed
    if (breakdown.momo > 0 && (!momoPhone || momoPhone.length < 9)) {
      Alert.alert('Error', 'Please enter a valid MoMo phone number');
      return;
    }
    
    // Validate cashback if using it
    if (breakdown.cashback > cashbackBalance) {
      Alert.alert('Insufficient Balance', 'You do not have enough cashback balance');
      return;
    }
    
    try {
      setPurchaseStatus('processing');
      
      let response;
      
      if (hasActiveCard) {
        // Upgrade request - supports cashback + momo combination
        const upgradePayload = {
          new_card_type: selectedCard.type,
          use_cashback: paymentMethod !== 'momo',
          cashback_amount: breakdown.cashback > 0 ? breakdown.cashback : undefined,
          payment_phone: breakdown.momo > 0 ? formatGhanaPhone(momoPhone) : undefined,
        };
        response = await clientAPI.upgradeCard(upgradePayload);
      } else {
        // Purchase request - backend only supports momo or full cashback
        // For combined payment on new card purchase, treat as momo (cashback deduction handled separately if needed)
        const purchasePayload = {
          card_type: selectedCard.type,
          payment_method: paymentMethod === 'cashback' && breakdown.cashback >= selectedCard.price ? 'cashback' : 'momo',
          payment_phone: breakdown.momo > 0 ? formatGhanaPhone(momoPhone) : undefined,
        };
        response = await clientAPI.purchaseCard(purchasePayload);
      }
      
      setPurchaseStatus('success');
      await refreshDashboard();
      
      // Show success message from API if available
      if (response?.message) {
        Alert.alert('Success', response.message);
      }
      
      setTimeout(() => {
        setShowPurchaseModal(false);
        setPurchaseStatus(null);
        setSelectedCard(null);
      }, 2500);
      
    } catch (error) {
      console.error('Purchase error:', error);
      setPurchaseStatus('failed');
      const errorMessage = error.response?.data?.detail || error.message || 'Purchase failed. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const breakdown = calculatePaymentBreakdown();

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
        {[...Array(10)].map((_, i) => (
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
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Membership Cards</Text>
          <Text style={styles.headerSubtitle}>
            {hasActiveCard ? 'Upgrade your card' : 'Choose your card'}
          </Text>
        </View>
        
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* Current Card Info */}
      {hasActiveCard && (
        <Animated.View style={[styles.currentCardBanner, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={CARD_COLORS[currentCardType] || CARD_COLORS.silver}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.currentCardGradient}
          >
            <View style={styles.currentCardContent}>
              <Ionicons name={CARD_ICONS[currentCardType] || 'card'} size={24} color="#FFF" />
              <View style={styles.currentCardText}>
                <Text style={styles.currentCardLabel}>Current Card</Text>
                <Text style={styles.currentCardType}>{currentCardType?.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.currentCardExpiry}>
              <Text style={styles.expiryLabel}>Expires</Text>
              <Text style={styles.expiryDate}>
                {user?.card_expires_at 
                  ? new Date(user.card_expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'N/A'
                }
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Cashback Balance */}
      <Animated.View style={[styles.balanceCard, { opacity: fadeAnim }]}>
        <View style={styles.balanceIcon}>
          <Ionicons name="wallet" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Available Cashback</Text>
          <Text style={styles.balanceValue}>GHS {cashbackBalance.toFixed(2)}</Text>
        </View>
        <Text style={styles.balanceHint}>Can be used for payment</Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {cards.map((card, index) => {
              const colors = CARD_COLORS[card.type?.toLowerCase()] || CARD_COLORS.silver;
              const icon = CARD_ICONS[card.type?.toLowerCase()] || 'card';
              const isCurrent = isCurrentCard(card.type);
              const canUpgrade = canUpgradeTo(card.type);
              
              return (
                <Animated.View
                  key={card.type}
                  style={[
                    styles.cardWrapper,
                    {
                      opacity: cardAnims[index] || 1,
                      transform: [
                        {
                          translateY: (cardAnims[index] || new Animated.Value(1)).interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0],
                          }),
                        },
                        {
                          scale: (cardAnims[index] || new Animated.Value(1)).interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.cardItem, isCurrent && styles.currentCardItem]}
                    onPress={() => handleSelectCard(card)}
                    activeOpacity={0.9}
                    disabled={isCurrent || !canUpgrade}
                  >
                    <LinearGradient
                      colors={colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardGradient}
                    >
                      {/* Card Shine Effect */}
                      <View style={styles.cardShine} />
                      
                      {/* Card Header */}
                      <View style={styles.cardHeader}>
                        <View style={styles.cardIconContainer}>
                          <Ionicons name={icon} size={32} color="rgba(255,255,255,0.9)" />
                        </View>
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={styles.currentBadgeText}>Current</Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Card Name */}
                      <Text style={styles.cardName}>{card.name}</Text>
                      
                      {/* Card Price */}
                      <View style={styles.cardPriceContainer}>
                        <Text style={styles.cardPrice}>GHS {card.price}</Text>
                        <Text style={styles.cardDuration}>{card.duration_label}</Text>
                      </View>
                      
                      {/* Card Features */}
                      <View style={styles.cardFeatures}>
                        {(card.features || card.benefits || []).slice(0, 3).map((feature, idx) => (
                          <View key={idx} style={styles.featureItem}>
                            <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.featureText}>{feature}</Text>
                          </View>
                        ))}
                      </View>
                      
                      {/* Action Button */}
                      {!isCurrent && canUpgrade && (
                        <View style={styles.cardAction}>
                          <Text style={styles.cardActionText}>
                            {hasActiveCard ? 'Upgrade Now' : 'Get This Card'}
                          </Text>
                          <Ionicons name="arrow-forward" size={18} color="#FFF" />
                        </View>
                      )}
                      
                      {!canUpgrade && !isCurrent && (
                        <View style={[styles.cardAction, styles.disabledAction]}>
                          <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.5)" />
                          <Text style={[styles.cardActionText, styles.disabledText]}>
                            Lower tier
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Purchase Modal */}
      <Modal
        visible={showPurchaseModal}
        transparent
        animationType="slide"
        onRequestClose={() => !purchaseStatus && setShowPurchaseModal(false)}
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
                <Text style={styles.modalTitle}>
                  {hasActiveCard ? 'Card Upgraded!' : 'Card Purchased!'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Your {selectedCard?.name} is now active
                </Text>
              </View>
            ) : purchaseStatus === 'failed' ? (
              <View style={styles.modalCenter}>
                <View style={[styles.successIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="close" size={40} color="#EF4444" />
                </View>
                <Text style={styles.modalTitle}>Purchase Failed</Text>
                <Text style={styles.modalSubtitle}>Please try again</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => setPurchaseStatus(null)}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {hasActiveCard ? 'Upgrade to' : 'Purchase'} {selectedCard?.name}
                  </Text>
                  <TouchableOpacity onPress={() => setShowPurchaseModal(false)}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
                
                {/* Card Preview */}
                <LinearGradient
                  colors={CARD_COLORS[selectedCard?.type?.toLowerCase()] || CARD_COLORS.silver}
                  style={styles.previewCard}
                >
                  <Ionicons name={CARD_ICONS[selectedCard?.type?.toLowerCase()] || 'card'} size={28} color="#FFF" />
                  <Text style={styles.previewCardName}>{selectedCard?.name}</Text>
                  <Text style={styles.previewCardPrice}>GHS {selectedCard?.price}</Text>
                </LinearGradient>
                
                {/* Payment Method Selection */}
                <Text style={styles.sectionTitle}>Payment Method</Text>
                
                <View style={styles.paymentOptions}>
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'momo' && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod('momo')}
                  >
                    <Ionicons name="phone-portrait" size={20} color={paymentMethod === 'momo' ? COLORS.primary : COLORS.textMuted} />
                    <Text style={[styles.paymentOptionText, paymentMethod === 'momo' && styles.paymentOptionTextActive]}>
                      Mobile Money
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.paymentOption, 
                      paymentMethod === 'cashback' && styles.paymentOptionActive,
                      cashbackBalance < (selectedCard?.price || 0) && styles.paymentOptionDisabled
                    ]}
                    onPress={() => cashbackBalance >= (selectedCard?.price || 0) && setPaymentMethod('cashback')}
                    disabled={cashbackBalance < (selectedCard?.price || 0)}
                  >
                    <Ionicons name="wallet" size={20} color={paymentMethod === 'cashback' ? COLORS.secondary : COLORS.textMuted} />
                    <Text style={[styles.paymentOptionText, paymentMethod === 'cashback' && { color: COLORS.secondary }]}>
                      Full Cashback
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.paymentOption, 
                      paymentMethod === 'combined' && styles.paymentOptionActive,
                      cashbackBalance <= 0 && styles.paymentOptionDisabled
                    ]}
                    onPress={() => cashbackBalance > 0 && setPaymentMethod('combined')}
                    disabled={cashbackBalance <= 0}
                  >
                    <Ionicons name="git-merge" size={20} color={paymentMethod === 'combined' ? '#8B5CF6' : COLORS.textMuted} />
                    <Text style={[styles.paymentOptionText, paymentMethod === 'combined' && { color: '#8B5CF6' }]}>
                      Combined
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* Cashback Amount (for combined) */}
                {paymentMethod === 'combined' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Cashback Amount (max GHS {Math.min(cashbackBalance, selectedCard?.price || 0).toFixed(2)})
                    </Text>
                    <View style={styles.amountInputContainer}>
                      <Text style={styles.currencySymbol}>GHS</Text>
                      <TextInput
                        style={styles.amountInput}
                        value={cashbackAmount}
                        onChangeText={setCashbackAmount}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                )}
                
                {/* MoMo Details (if needed) */}
                {breakdown.momo > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>MoMo Details</Text>
                    
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
                          value={momoPhone}
                          onChangeText={setMomoPhone}
                          placeholder="XX XXX XXXX"
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="phone-pad"
                          maxLength={10}
                        />
                      </View>
                    </View>
                  </>
                )}
                
                {/* Payment Summary */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Card Price</Text>
                    <Text style={styles.summaryValue}>GHS {selectedCard?.price?.toFixed(2)}</Text>
                  </View>
                  {breakdown.cashback > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Cashback Used</Text>
                      <Text style={[styles.summaryValue, { color: COLORS.secondary }]}>
                        - GHS {breakdown.cashback.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {breakdown.momo > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>MoMo Payment</Text>
                      <Text style={styles.summaryValue}>GHS {breakdown.momo.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={[styles.summaryRow, styles.summaryTotal]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>GHS {breakdown.total.toFixed(2)}</Text>
                  </View>
                </View>
                
                {/* Purchase Button */}
                <TouchableOpacity
                  style={styles.purchaseButton}
                  onPress={handlePurchase}
                >
                  <LinearGradient
                    colors={CARD_COLORS[selectedCard?.type?.toLowerCase()] || ['#F59E0B', '#D97706']}
                    style={styles.purchaseButtonGradient}
                  >
                    <Text style={styles.purchaseButtonText}>
                      {hasActiveCard ? 'Confirm Upgrade' : 'Confirm Purchase'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
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
  currentCardBanner: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: 16,
    overflow: 'hidden',
  },
  currentCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  currentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  currentCardText: {},
  currentCardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.xs,
  },
  currentCardType: {
    color: '#FFF',
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  currentCardExpiry: {
    alignItems: 'flex-end',
  },
  expiryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.xs,
  },
  expiryDate: {
    color: '#FFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  balanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
  },
  balanceValue: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  balanceHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
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
  cardsContainer: {
    gap: SPACING.lg,
  },
  cardWrapper: {},
  cardItem: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  currentCardItem: {
    opacity: 0.7,
  },
  cardGradient: {
    padding: SPACING.xl,
    minHeight: 220,
  },
  cardShine: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  currentBadgeText: {
    color: '#10B981',
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  cardName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  cardPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  cardPrice: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  cardDuration: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONTS.sizes.sm,
  },
  cardFeatures: {
    marginBottom: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  featureText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONTS.sizes.sm,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 25,
    alignSelf: 'flex-start',
    gap: SPACING.xs,
  },
  disabledAction: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cardActionText: {
    color: '#FFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  disabledText: {
    color: 'rgba(255,255,255,0.5)',
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
    maxHeight: '90%',
  },
  modalCenter: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
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
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.sm,
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
  retryButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: 16,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  previewCardName: {
    flex: 1,
    color: '#FFF',
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  previewCardPrice: {
    color: '#FFF',
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  paymentOption: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: SPACING.xs,
  },
  paymentOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  paymentOptionDisabled: {
    opacity: 0.5,
  },
  paymentOptionText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  paymentOptionTextActive: {
    color: COLORS.primary,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.sm,
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
    fontSize: 20,
    fontWeight: 'bold',
    paddingVertical: SPACING.md,
  },
  networkSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  networkOption: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  networkOptionText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
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
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    marginVertical: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
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
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
    marginBottom: 0,
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
  purchaseButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: SPACING.md,
  },
  purchaseButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
});

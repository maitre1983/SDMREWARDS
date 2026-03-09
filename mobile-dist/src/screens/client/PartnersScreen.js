/**
 * SDM REWARDS Mobile - Partners Screen
 * Browse and search partner merchants
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
  Dimensions,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { publicAPI, merchantAPI } from '../../services/api';
import { COLORS, SPACING, FONTS, BORDER_RADIUS } from '../../utils/constants';

const { width } = Dimensions.get('window');

export default function PartnersScreen({ navigation }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
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
      Animated.timing(searchAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    fetchMerchants();
  }, []);

  const fetchMerchants = async (search = '', city = null) => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (search) params.search = search;
      if (city) params.city = city;
      
      const response = await publicAPI.getMerchants(params);
      setMerchants(response.merchants || []);
      
      // Animate cards appearing
      animateCards(response.merchants?.length || 0);
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const animateCards = (count) => {
    // Initialize animation values for each card
    for (let i = cardAnims.length; i < count; i++) {
      cardAnims.push(new Animated.Value(0));
    }
    
    // Staggered animation
    const animations = cardAnims.slice(0, count).map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      })
    );
    
    Animated.stagger(50, animations).start();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMerchants(searchQuery, selectedCity);
    setRefreshing(false);
  }, [searchQuery, selectedCity]);

  const handleSearch = () => {
    fetchMerchants(searchQuery, selectedCity);
  };

  const handlePayMerchant = async (merchant) => {
    // Navigate to QR scanner with merchant info for payment
    // The QRScanner will show the payment modal directly
    navigation.navigate('QRScanner', { 
      merchant: {
        id: merchant.id,
        business_name: merchant.business_name,
        business_type: merchant.business_type,
        cashback_rate: merchant.cashback_rate || 5,
        payment_qr_code: merchant.qr_code,
        qr_code: merchant.qr_code,
        phone: merchant.phone,
      }
    });
  };

  const openMaps = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const callMerchant = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const cities = ['All', 'Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast'];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated background particles */}
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
          data-testid="back-btn"
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Partner Merchants</Text>
          <Text style={styles.headerSubtitle}>Find & pay businesses</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={() => navigation.navigate('QRScanner')}
          data-testid="scan-btn"
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.scanButtonGradient}
          >
            <Ionicons name="qr-code" size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            opacity: searchAnim,
            transform: [
              {
                translateY: searchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
          style={styles.searchBar}
        >
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchants..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            data-testid="search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchMerchants(); }}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </LinearGradient>
        
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={handleSearch}
          data-testid="search-btn"
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.searchButtonGradient}
          >
            <Ionicons name="search" size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* City Filter */}
      <Animated.View style={{ opacity: searchAnim }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityFilter}
        >
          {cities.map((city) => (
            <TouchableOpacity
              key={city}
              style={[
                styles.cityChip,
                (city === 'All' ? selectedCity === null : selectedCity === city) && styles.cityChipActive,
              ]}
              onPress={() => {
                const newCity = city === 'All' ? null : city;
                setSelectedCity(newCity);
                fetchMerchants(searchQuery, newCity);
              }}
              data-testid={`city-${city.toLowerCase()}`}
            >
              <Text style={[
                styles.cityChipText,
                (city === 'All' ? selectedCity === null : selectedCity === city) && styles.cityChipTextActive,
              ]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Merchants List */}
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
        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {loading ? 'Searching...' : `${merchants.length} merchant${merchants.length !== 1 ? 's' : ''} found`}
        </Text>

        {loading && merchants.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : merchants.length > 0 ? (
          merchants.map((merchant, index) => (
            <Animated.View
              key={merchant.id || index}
              style={[
                styles.merchantCardWrapper,
                {
                  opacity: cardAnims[index] || 1,
                  transform: [
                    {
                      translateY: (cardAnims[index] || new Animated.Value(1)).interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                    {
                      scale: (cardAnims[index] || new Animated.Value(1)).interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View
                style={styles.merchantCard}
                data-testid={`merchant-card-${merchant.id}`}
              >
                <LinearGradient
                  colors={['rgba(30, 41, 59, 0.9)', 'rgba(30, 41, 59, 0.7)']}
                  style={styles.merchantCardGradient}
                >
                  {/* Merchant Header */}
                  <View style={styles.merchantHeader}>
                    <View style={styles.merchantIconContainer}>
                      <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.merchantIcon}
                      >
                        <Ionicons name="storefront" size={24} color={COLORS.white} />
                      </LinearGradient>
                    </View>
                    
                    <View style={styles.merchantInfo}>
                      <Text style={styles.merchantName} numberOfLines={1}>
                        {merchant.business_name}
                      </Text>
                      {merchant.business_type && (
                        <Text style={styles.merchantType} numberOfLines={1}>
                          {merchant.business_type}
                        </Text>
                      )}
                    </View>
                    
                    {/* Cashback Badge */}
                    {merchant.cashback_rate && (
                      <View style={styles.cashbackBadge}>
                        <Ionicons name="gift" size={12} color={COLORS.secondary} />
                        <Text style={styles.cashbackText}>{merchant.cashback_rate}%</Text>
                      </View>
                    )}
                  </View>

                  {/* Merchant Details */}
                  <View style={styles.merchantDetails}>
                    {/* Location */}
                    {(merchant.business_address || merchant.city) && (
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={16} color={COLORS.textMuted} />
                        <Text style={styles.detailText} numberOfLines={2}>
                          {merchant.business_address || merchant.city}
                        </Text>
                      </View>
                    )}
                    
                    {/* Phone */}
                    {merchant.phone && (
                      <TouchableOpacity 
                        style={styles.detailRow}
                        onPress={() => callMerchant(merchant.phone)}
                      >
                        <Ionicons name="call-outline" size={16} color={COLORS.primary} />
                        <Text style={[styles.detailText, styles.phoneText]}>
                          {merchant.phone}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.merchantActions}>
                    {merchant.google_maps_url && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                          e.stopPropagation && e.stopPropagation();
                          openMaps(merchant.google_maps_url);
                        }}
                        data-testid={`maps-btn-${merchant.id}`}
                      >
                        <LinearGradient
                          colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']}
                          style={styles.actionButtonGradient}
                        >
                          <Ionicons name="navigate" size={16} color="#3B82F6" />
                          <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>
                            Directions
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.payButton]}
                      onPress={(e) => {
                        e.stopPropagation && e.stopPropagation();
                        handlePayMerchant(merchant);
                      }}
                      data-testid={`pay-btn-${merchant.id}`}
                    >
                      <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.actionButtonGradient}
                      >
                        <Ionicons name="wallet" size={16} color={COLORS.white} />
                        <Text style={[styles.actionButtonText, { color: COLORS.white }]}>
                          Pay
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="storefront-outline" size={64} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No merchants found</Text>
            <Text style={styles.emptyText}>
              Try a different search term or city
            </Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSearchQuery('');
                setSelectedCity(null);
                fetchMerchants();
              }}
            >
              <Text style={styles.resetButtonText}>Show all merchants</Text>
            </TouchableOpacity>
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
    marginHorizontal: SPACING.md,
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
  scanButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  scanButtonGradient: {
    padding: 10,
    borderRadius: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
  },
  searchButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchButtonGradient: {
    padding: 12,
    borderRadius: 12,
  },
  cityFilter: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  cityChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: SPACING.sm,
  },
  cityChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: COLORS.primary,
  },
  cityChipText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  cityChipTextActive: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  resultsCount: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  merchantCardWrapper: {
    marginBottom: SPACING.md,
  },
  merchantCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  merchantCardGradient: {
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  merchantIconContainer: {
    marginRight: SPACING.md,
  },
  merchantIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  merchantType: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  cashbackText: {
    color: COLORS.secondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  merchantDetails: {
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  detailText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 18,
  },
  phoneText: {
    color: COLORS.primary,
  },
  merchantActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    gap: SPACING.xs,
  },
  actionButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  payButton: {
    flex: 1.5,
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
    marginBottom: SPACING.lg,
  },
  resetButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 25,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  resetButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
});

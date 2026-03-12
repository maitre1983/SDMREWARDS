/**
 * SDM REWARDS Mobile - Welcome Screen
 * Animated & Attractive User type selection
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Dimensions,
  Animated,
  Easing,
  TouchableOpacity,
  ImageBackground,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Common';
import { COLORS, SPACING, FONTS } from '../../utils/constants';

const { width, height } = Dimensions.get('window');

// Responsive scaling based on screen size
const scale = (size) => (width / 375) * size; // 375 is iPhone base width
const verticalScale = (size) => (height / 812) * size; // 812 is iPhone X base height
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

// Company logo URL
const LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/vc8llt43_WhatsApp%20Image%202026-03-04%20at%2020.16.26.jpeg";

// Background carousel images - Beautiful Ghanaian women using SDM Rewards (Optimized for low bandwidth)
const CAROUSEL_IMAGES = [
  "https://static.prod-images.emergentagent.com/jobs/2b0d7634-108c-4eb1-b22d-82f976c95531/images/01b1df557fb0b9b58ab0869db1bfe6667fb94c6ee469d2cb0bedd4a754670fdc.png",
  "https://static.prod-images.emergentagent.com/jobs/2b0d7634-108c-4eb1-b22d-82f976c95531/images/e1923f2d8da8b45d43f9d74219b04906dd4b54a45ed360cb4b43927a0cc4a2a7.png",
  "https://static.prod-images.emergentagent.com/jobs/2b0d7634-108c-4eb1-b22d-82f976c95531/images/aa160bba66dc42fe80a8a6629b5040893f84a10d1bbbebad5fa330bb25a81388.png",
  "https://static.prod-images.emergentagent.com/jobs/2b0d7634-108c-4eb1-b22d-82f976c95531/images/3194f47457d24bb9b5086ab083814e6b2d0d976fe9cc46b95b910da532b29452.png",
];

export default function WelcomeScreen({ navigation }) {
  // Carousel state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselAnim = useRef(new Animated.Value(0)).current;
  
  // Handle navigation - works on both native and web
  const handleNavigate = (userType) => {
    // Direct approach that works on web - use React Navigation
    try {
      if (userType === 'client') {
        navigation.navigate('Login', { userType: 'client' });
      } else if (userType === 'merchant') {
        navigation.navigate('MerchantLogin');
      }
    } catch (e) {
      // Fallback: use window.location for web
      if (typeof window !== 'undefined') {
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
        window.location.href = baseUrl;
      }
    }
  };
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Feature animations (2 features now)
  const featureAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Carousel animation - slide images from right to left
  useEffect(() => {
    const animateCarousel = () => {
      Animated.sequence([
        Animated.timing(carouselAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(4000), // Show image for 4 seconds
        Animated.timing(carouselAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentImageIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
        animateCarousel();
      });
    };
    
    animateCarousel();
  }, []);

  useEffect(() => {
    // Logo entrance animation
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Features staggered animation
    const featureAnimations = featureAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 600 + index * 100,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      })
    );
    Animated.stagger(100, featureAnimations).start();

    // Buttons slide up
    Animated.timing(buttonsTranslateY, {
      toValue: 0,
      duration: 600,
      delay: 1200,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();

    // Continuous pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slow rotation for logo
    Animated.loop(
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const features = [
    { icon: 'qr-code', text: 'Pay Merchants with QR', color: '#F59E0B' },
    { icon: 'gift', text: 'Earn Cashback Rewards', color: '#10B981' },
  ];

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  // Carousel slide animation
  const carouselTranslateX = carouselAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Animated Background Carousel - Ghanaian women using SDM */}
      <Animated.View 
        style={[
          styles.carouselContainer, 
          { 
            opacity: carouselAnim,
            transform: [{ translateX: carouselTranslateX }] 
          }
        ]}
      >
        <Image
          source={{ uri: CAROUSEL_IMAGES[currentImageIndex] }}
          style={styles.carouselImage}
          resizeMode="cover"
        />
        {/* Light overlay gradient - images are more visible */}
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.3)', 'rgba(30, 27, 75, 0.5)', 'rgba(15, 23, 42, 0.7)']}
          style={styles.carouselOverlay}
        />
      </Animated.View>
      
      {/* Animated background particles */}
      <View style={styles.particlesContainer}>
        {[...Array(20)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: glowOpacity,
                transform: [{ scale: 0.5 + Math.random() * 0.5 }],
              },
            ]}
          />
        ))}
      </View>

      {/* Logo with glow effect */}
      <View style={styles.logoContainer}>
        <Animated.View
          style={[
            styles.logoGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              transform: [
                { scale: Animated.multiply(logoScale, pulseAnim) },
                { rotate: spin },
              ],
            },
          ]}
        >
          <Image 
            source={{ uri: LOGO_URL }} 
            style={styles.logoImage}
            resizeMode="cover"
          />
        </Animated.View>
        
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          }}
        >
          <Text style={styles.title}>SDM REWARDS</Text>
          <Text style={styles.subtitle}>Earn cashback on every purchase</Text>
        </Animated.View>
      </View>

      {/* Features with staggered animation */}
      <View style={styles.features}>
        {features.map((feature, index) => (
          <Animated.View
            key={index}
            style={[
              styles.featureItem,
              {
                opacity: featureAnims[index],
                transform: [
                  {
                    translateX: featureAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.featureIcon, { backgroundColor: `${feature.color}20` }]}>
              <Ionicons name={feature.icon} size={22} color={feature.color} />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureText}>{feature.text}</Text>
              {feature.subText && (
                <Text style={styles.featureSubText}>{feature.subText}</Text>
              )}
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Animated Buttons - HIGHLY VISIBLE */}
      <Animated.View
        style={[
          styles.buttonsContainer,
          {
            transform: [{ translateY: buttonsTranslateY }],
            zIndex: 100,
          },
        ]}
      >
        {/* I'm a Customer - Primary Orange Button */}
        <TouchableOpacity
          onPress={() => handleNavigate('client')}
          style={styles.customerButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="I'm a Customer"
        >
          <View 
            style={styles.gradientButtonWrapper}
            onClick={() => Platform.OS === 'web' && handleNavigate('client')}
          >
            <LinearGradient
              colors={['#F59E0B', '#EA580C', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons name="person" size={28} color="#FFF" style={{ marginRight: 12 }} />
              <Text style={styles.ctaButtonText}>I'm a Customer</Text>
              <Ionicons name="arrow-forward" size={24} color="#FFF" style={{ marginLeft: 12 }} />
            </LinearGradient>
          </View>
        </TouchableOpacity>

        {/* I'm a Merchant - Secondary Green Button */}
        <TouchableOpacity
          onPress={() => handleNavigate('merchant')}
          style={styles.merchantButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="I'm a Merchant"
        >
          <View 
            style={styles.gradientButtonWrapper}
            onClick={() => Platform.OS === 'web' && handleNavigate('merchant')}
          >
            <LinearGradient
              colors={['#10B981', '#059669', '#10B981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons name="storefront" size={28} color="#FFF" style={{ marginRight: 12 }} />
              <Text style={styles.ctaButtonText}>I'm a Merchant</Text>
              <Ionicons name="arrow-forward" size={24} color="#FFF" style={{ marginLeft: 12 }} />
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <Animated.Text style={[styles.footer, { opacity: titleOpacity }]}>
        Powered by GIT NFT GHANA LTD
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: moderateScale(16),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(16),
  },
  carouselContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 1,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: verticalScale(15),
    marginBottom: verticalScale(10),
  },
  logoGlow: {
    position: 'absolute',
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: '#3B82F6',
    top: -5,
  },
  logoWrapper: {
    width: moderateScale(85),
    height: moderateScale(85),
    borderRadius: moderateScale(42.5),
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#F59E0B',
    backgroundColor: '#1E3A5F',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  logoImage: {
    width: moderateScale(120),
    height: moderateScale(120),
    marginLeft: moderateScale(-17),
    marginTop: moderateScale(-17),
  },
  title: {
    color: COLORS.text,
    fontSize: moderateScale(26),
    fontWeight: 'bold',
    marginTop: verticalScale(12),
    textShadowColor: 'rgba(245, 158, 11, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(14),
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  features: {
    marginBottom: verticalScale(8),
    marginTop: verticalScale(4),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: moderateScale(10),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  featureText: {
    color: COLORS.text,
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureSubText: {
    color: COLORS.textMuted,
    fontSize: moderateScale(12),
    marginTop: 2,
  },
  buttonsContainer: {
    marginTop: verticalScale(20),
    gap: verticalScale(14),
    paddingBottom: verticalScale(10),
    paddingHorizontal: moderateScale(4),
    zIndex: 100,
  },
  customerButton: {
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  merchantButton: {
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(18),
    paddingHorizontal: moderateScale(20),
    minHeight: verticalScale(60),
  },
  gradientButtonWrapper: {
    width: '100%',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: moderateScale(11),
    textAlign: 'center',
    marginTop: verticalScale(12),
  },
});

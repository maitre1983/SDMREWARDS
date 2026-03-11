/**
 * SDM REWARDS Mobile - Welcome Screen
 * Animated & Attractive User type selection
 */

import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Dimensions,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Common';
import { COLORS, SPACING, FONTS } from '../../utils/constants';

const { width, height } = Dimensions.get('window');

// Company logo URL
const LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/vc8llt43_WhatsApp%20Image%202026-03-04%20at%2020.16.26.jpeg";

export default function WelcomeScreen({ navigation }) {
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Feature animations (3 features now)
  const featureAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

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
    { icon: 'grid', text: 'Pay All Services', subText: 'Airtime, Data, ECG +more', color: '#8B5CF6' },
  ];

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

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
          },
        ]}
      >
        {/* I'm a Customer - Primary Orange Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Login', { userType: 'client' })}
          style={styles.customerButton}
          activeOpacity={0.8}
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
        </TouchableOpacity>

        {/* I'm a Merchant - Secondary Green Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Login', { userType: 'merchant' })}
          style={styles.merchantButton}
          activeOpacity={0.8}
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
    padding: SPACING.xl,
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
  logoContainer: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 30,
  },
  logoGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#3B82F6',
    top: -10,
  },
  logoWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#F59E0B',
    backgroundColor: '#1E3A5F',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 180,
    height: 180,
    marginLeft: -25,
    marginTop: -25,
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: SPACING.xl,
    textShadowColor: 'rgba(245, 158, 11, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.lg,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  features: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  featureText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: '500',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureSubText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  buttonsContainer: {
    marginTop: 'auto',
    gap: SPACING.md,
  },
  customerButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  merchantButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    paddingHorizontal: 24,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
});

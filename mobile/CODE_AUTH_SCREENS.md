# SDM REWARDS - Code des Écrans Auth

## src/screens/auth/WelcomeScreen.js

```javascript
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

  // Feature animations
  const featureAnims = useRef([
    new Animated.Value(0),
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
    { icon: 'gift', text: 'Earn cashback rewards', color: '#F59E0B' },
    { icon: 'qr-code', text: 'Pay merchants with QR', color: '#10B981' },
    { icon: 'phone-portrait', text: 'Buy airtime & data', color: '#3B82F6' },
    { icon: 'flash', text: 'ECG Payment', color: '#EF4444' },
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
            <Text style={styles.featureText}>{feature.text}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Animated Buttons */}
      <Animated.View
        style={[
          styles.buttonsContainer,
          {
            transform: [{ translateY: buttonsTranslateY }],
          },
        ]}
      >
        <Button
          title="I'm a Customer"
          icon="person"
          onPress={() => navigation.navigate('Login', { userType: 'client' })}
          style={styles.primaryButton}
        />
        <Button
          title="I'm a Merchant"
          icon="storefront"
          variant="outline"
          onPress={() => navigation.navigate('Login', { userType: 'merchant' })}
          style={styles.secondaryButton}
        />
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
  buttonsContainer: {
    marginTop: 'auto',
    gap: SPACING.md,
  },
  primaryButton: {
    paddingVertical: 18,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  secondaryButton: {
    paddingVertical: 18,
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
});
```

## src/screens/auth/LoginScreen.js

```javascript
/**
 * SDM REWARDS Mobile - Login Screen
 * Animated & Attractive Design
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  Easing,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, LoadingOverlay } from '../../components/Common';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONTS, normalizePhone } from '../../utils/constants';

const { width } = Dimensions.get('window');
const LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/vc8llt43_WhatsApp%20Image%202026-03-04%20at%2020.16.26.jpeg";

export default function LoginScreen({ navigation, route }) {
  const { userType } = route.params || { userType: 'client' };
  const { loginClient, loginMerchant } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const isClient = userType === 'client';

  useEffect(() => {
    // Entrance animations
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous animations
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

    Animated.loop(
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const validate = () => {
    const newErrors = {};
    if (!phone || phone.length < 9) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (!password || password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      const result = isClient
        ? await loginClient(normalizedPhone, password)
        : await loginMerchant(normalizedPhone, password);

      if (!result.success) {
        Alert.alert('Login Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
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

      {/* Animated particles */}
      <View style={styles.particlesContainer}>
        {[...Array(15)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: glowOpacity,
                transform: [{ scale: 0.3 + Math.random() * 0.7 }],
              },
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <LoadingOverlay visible={loading} message="Signing in..." />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.backButtonGradient}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Logo Header */}
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
          </View>

          {/* Title */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <Text style={styles.title}>
              {isClient ? 'Customer Login' : 'Merchant Login'}
            </Text>
            <Text style={styles.subtitle}>
              Sign in to your {isClient ? 'customer' : 'merchant'} account
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View
            style={[
              styles.form,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                  style={styles.inputGradient}
                >
                  <Ionicons name="call-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <Input
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="0XX XXX XXXX"
                    keyboardType="phone-pad"
                    error={errors.phone}
                    style={styles.input}
                  />
                </LinearGradient>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                  style={styles.inputGradient}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry
                    error={errors.password}
                    style={styles.input}
                  />
                </LinearGradient>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword', { userType })}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isClient ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButton}
              >
                {loading ? (
                  <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Ionicons name="refresh" size={24} color={COLORS.white} />
                  </Animated.View>
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={24} color={COLORS.white} />
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register', { userType })}
            >
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Switch User Type */}
          <TouchableOpacity
            style={styles.switchContainer}
            onPress={() => navigation.navigate('Login', { userType: isClient ? 'merchant' : 'client' })}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={styles.switchGradient}
            >
              <Ionicons name="swap-horizontal" size={20} color={COLORS.textSecondary} />
              <Text style={styles.switchText}>
                Switch to {isClient ? 'Merchant' : 'Customer'} Login
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
    borderRadius: 12,
    overflow: 'hidden',
  },
  backButtonGradient: {
    padding: 12,
    borderRadius: 12,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#3B82F6',
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    width: 140,
    height: 140,
    marginLeft: -20,
    marginTop: -20,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
    textShadowColor: 'rgba(245, 158, 11, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  form: {
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  inputWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: {
    marginLeft: SPACING.lg,
  },
  input: {
    flex: 1,
    marginBottom: 0,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.xl,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: SPACING.sm,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  registerText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  registerLink: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  switchContainer: {
    marginTop: 'auto',
    borderRadius: 16,
    overflow: 'hidden',
  },
  switchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: 16,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  switchText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
});
```

## src/screens/auth/RegisterScreen.js

```javascript
/**
 * SDM REWARDS Mobile - Register Screen with OTP
 * Animated & Attractive Design
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  Easing,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, LoadingOverlay } from '../../components/Common';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { COLORS, SPACING, FONTS, normalizePhone } from '../../utils/constants';

const { width } = Dimensions.get('window');
const LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/vc8llt43_WhatsApp%20Image%202026-03-04%20at%2020.16.26.jpeg";

export default function RegisterScreen({ navigation, route }) {
  const { userType } = route.params || { userType: 'client' };
  const { registerClient, registerMerchant } = useAuth();

  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Details
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;

  const isClient = userType === 'client';

  useEffect(() => {
    // Entrance animations
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous animations
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

    Animated.loop(
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Animate step changes
  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: step,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(stepAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(stepAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [step]);

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [1, 2, 3],
    outputRange: ['33%', '66%', '100%'],
  });

  const sendOTP = async () => {
    if (!phone || phone.length < 9) {
      setErrors({ phone: 'Please enter a valid phone number' });
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      await authAPI.sendOTP(normalizedPhone, 'registration');
      setStep(2);
      Alert.alert('OTP Sent', 'A verification code has been sent to your phone.');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length < 4) {
      setErrors({ otp: 'Please enter the verification code' });
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      await authAPI.verifyOTP(normalizedPhone, otp);
      setStep(3);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const newErrors = {};
    
    if (isClient && (!fullName || fullName.length < 2)) {
      newErrors.fullName = 'Please enter your full name';
    }
    if (!isClient && (!businessName || businessName.length < 2)) {
      newErrors.businessName = 'Please enter your business name';
    }
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      const data = isClient
        ? {
            phone: normalizedPhone,
            full_name: fullName,
            password,
            referral_code: referralCode || undefined,
          }
        : {
            phone: normalizedPhone,
            business_name: businessName,
            business_address: businessAddress || undefined,
            password,
          };

      const result = isClient
        ? await registerClient(data)
        : await registerMerchant(data);

      if (!result.success) {
        Alert.alert('Registration Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    const stepOpacity = stepAnim;
    const stepTranslate = stepAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [30, 0],
    });

    switch (step) {
      case 1:
        return (
          <Animated.View style={{ opacity: stepOpacity, transform: [{ translateY: stepTranslate }] }}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIconWrapper, { backgroundColor: `${COLORS.primary}30` }]}>
                <Ionicons name="call" size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.stepTitle}>Enter your phone number</Text>
              <Text style={styles.stepSubtitle}>We'll send you a verification code</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                  style={styles.inputGradient}
                >
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+233</Text>
                  </View>
                  <Input
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="XX XXX XXXX"
                    keyboardType="phone-pad"
                    error={errors.phone}
                    style={styles.input}
                  />
                </LinearGradient>
              </View>
            </View>

            <TouchableOpacity onPress={sendOTP} disabled={loading} activeOpacity={0.8}>
              <LinearGradient
                colors={isClient ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButton}
              >
                <Ionicons name="paper-plane" size={20} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Send Verification Code</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View style={{ opacity: stepOpacity, transform: [{ translateY: stepTranslate }] }}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIconWrapper, { backgroundColor: '#3B82F630' }]}>
                <Ionicons name="shield-checkmark" size={28} color="#3B82F6" />
              </View>
              <Text style={styles.stepTitle}>Verify your number</Text>
              <Text style={styles.stepSubtitle}>Enter the code sent to {phone}</Text>
            </View>

            <View style={styles.otpContainer}>
              <Input
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                error={errors.otp}
                style={styles.otpInput}
              />
            </View>

            <TouchableOpacity onPress={verifyOTP} disabled={loading} activeOpacity={0.8}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButton}
              >
                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Verify Code</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={sendOTP} disabled={loading} style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive code? </Text>
              <Text style={styles.resendLink}>Resend</Text>
            </TouchableOpacity>
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View style={{ opacity: stepOpacity, transform: [{ translateY: stepTranslate }] }}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIconWrapper, { backgroundColor: '#10B98130' }]}>
                <Ionicons name={isClient ? "person" : "storefront"} size={28} color="#10B981" />
              </View>
              <Text style={styles.stepTitle}>Complete your profile</Text>
              <Text style={styles.stepSubtitle}>
                {isClient ? 'Tell us about yourself' : 'Tell us about your business'}
              </Text>
            </View>
            
            {isClient ? (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                    style={styles.inputGradient}
                  >
                    <Ionicons name="person-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                    <Input
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Enter your full name"
                      error={errors.fullName}
                      style={styles.input}
                    />
                  </LinearGradient>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Business Name</Text>
                  <View style={styles.inputWrapper}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                      style={styles.inputGradient}
                    >
                      <Ionicons name="storefront-outline" size={20} color="#10B981" style={styles.inputIcon} />
                      <Input
                        value={businessName}
                        onChangeText={setBusinessName}
                        placeholder="Enter your business name"
                        error={errors.businessName}
                        style={styles.input}
                      />
                    </LinearGradient>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Business Address (Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                      style={styles.inputGradient}
                    >
                      <Ionicons name="location-outline" size={20} color="#10B981" style={styles.inputIcon} />
                      <Input
                        value={businessAddress}
                        onChangeText={setBusinessAddress}
                        placeholder="Enter business address"
                        style={styles.input}
                      />
                    </LinearGradient>
                  </View>
                </View>
              </>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                  style={styles.inputGradient}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create a password"
                    secureTextEntry
                    error={errors.password}
                    style={styles.input}
                  />
                </LinearGradient>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                  style={styles.inputGradient}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <Input
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    secureTextEntry
                    error={errors.confirmPassword}
                    style={styles.input}
                  />
                </LinearGradient>
              </View>
            </View>

            {isClient && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Referral Code (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                    style={styles.inputGradient}
                  >
                    <Ionicons name="gift-outline" size={20} color="#8B5CF6" style={styles.inputIcon} />
                    <Input
                      value={referralCode}
                      onChangeText={setReferralCode}
                      placeholder="Enter referral code"
                      style={styles.input}
                    />
                  </LinearGradient>
                </View>
              </View>
            )}

            <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
              <LinearGradient
                colors={isClient ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButton}
              >
                <Ionicons name="checkmark-done" size={20} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Create Account</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        );
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

      {/* Animated particles */}
      <View style={styles.particlesContainer}>
        {[...Array(15)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: glowOpacity,
                backgroundColor: isClient ? '#F59E0B' : '#10B981',
                transform: [{ scale: 0.3 + Math.random() * 0.7 }],
              },
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <LoadingOverlay visible={loading} />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.backButtonGradient}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View 
                style={[
                  styles.progressFill, 
                  { 
                    width: progressWidth,
                    backgroundColor: isClient ? '#F59E0B' : '#10B981',
                  }
                ]} 
              />
            </View>
            <View style={styles.progressSteps}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.progressDot,
                    s <= step && { 
                      backgroundColor: isClient ? '#F59E0B' : '#10B981',
                      borderColor: isClient ? '#F59E0B' : '#10B981',
                    },
                  ]}
                >
                  {s < step && (
                    <Ionicons name="checkmark" size={12} color={COLORS.white} />
                  )}
                  {s === step && (
                    <Text style={styles.progressDotText}>{s}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Logo Header */}
          <View style={styles.logoContainer}>
            <Animated.View
              style={[
                styles.logoGlow,
                {
                  opacity: glowOpacity,
                  transform: [{ scale: pulseAnim }],
                  backgroundColor: isClient ? '#F59E0B' : '#10B981',
                },
              ]}
            />
            <Animated.View
              style={[
                styles.logoWrapper,
                {
                  borderColor: isClient ? '#F59E0B' : '#10B981',
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
          </View>

          {/* Title */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <Text style={[styles.title, { color: isClient ? '#F59E0B' : '#10B981' }]}>
              {isClient ? 'Customer Registration' : 'Merchant Registration'}
            </Text>
          </Animated.View>

          {/* Step Content */}
          <Animated.View
            style={[
              styles.form,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            {renderStepContent()}
          </Animated.View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login', { userType })}>
              <Text style={[styles.loginLink, { color: isClient ? '#F59E0B' : '#10B981' }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>

          {/* Switch User Type */}
          <TouchableOpacity
            style={styles.switchContainer}
            onPress={() => {
              setStep(1);
              navigation.navigate('Register', { userType: isClient ? 'merchant' : 'client' });
            }}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={styles.switchGradient}
            >
              <Ionicons name="swap-horizontal" size={20} color={COLORS.textSecondary} />
              <Text style={styles.switchText}>
                Register as {isClient ? 'Merchant' : 'Customer'} instead
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  backButtonGradient: {
    padding: 12,
    borderRadius: 12,
  },
  progressContainer: {
    marginBottom: SPACING.lg,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -10,
    paddingHorizontal: '10%',
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  logoWrapper: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    overflow: 'hidden',
    borderWidth: 3,
    backgroundColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginLeft: -17,
    marginTop: -17,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  form: {
    marginBottom: SPACING.lg,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  stepIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  stepTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  inputWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: {
    marginLeft: SPACING.lg,
  },
  input: {
    flex: 1,
    marginBottom: 0,
  },
  phonePrefix: {
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.sm,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  phonePrefixText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.lg,
  },
  otpContainer: {
    marginBottom: SPACING.lg,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: SPACING.sm,
    marginTop: SPACING.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  resendText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  resendLink: {
    color: '#3B82F6',
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  loginText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  loginLink: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  switchContainer: {
    marginTop: 'auto',
    borderRadius: 16,
    overflow: 'hidden',
  },
  switchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: 16,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  switchText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
});
```

## src/screens/auth/ForgotPasswordScreen.js

```javascript
/**
 * SDM REWARDS Mobile - Forgot Password Screen
 * Reset password with OTP verification
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  Easing,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, LoadingOverlay } from '../../components/Common';
import api from '../../services/api';
import { COLORS, SPACING, FONTS, normalizePhone } from '../../utils/constants';

const { width } = Dimensions.get('window');
const LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/vc8llt43_WhatsApp%20Image%202026-03-04%20at%2020.16.26.jpeg";

const STEPS = {
  PHONE: 'phone',
  OTP: 'otp',
  PASSWORD: 'password',
  SUCCESS: 'success',
};

export default function ForgotPasswordScreen({ navigation, route }) {
  const { userType } = route.params || { userType: 'client' };
  
  const [step, setStep] = useState(STEPS.PHONE);
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [requestId, setRequestId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [countdown, setCountdown] = useState(0);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const isClient = userType === 'client';
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
    
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
  }, []);
  
  useEffect(() => {
    // Update progress bar
    let progress = 0;
    if (step === STEPS.PHONE) progress = 0.25;
    else if (step === STEPS.OTP) progress = 0.5;
    else if (step === STEPS.PASSWORD) progress = 0.75;
    else if (step === STEPS.SUCCESS) progress = 1;
    
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step]);
  
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  
  const handleSendOTP = async () => {
    if (!phone || phone.length < 9) {
      setErrors({ phone: 'Please enter a valid phone number' });
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const normalizedPhone = normalizePhone(phone);
      const response = await api.post('/auth/otp/send', { phone: normalizedPhone });
      
      if (response.data.success || response.data.request_id) {
        setRequestId(response.data.request_id);
        setStep(STEPS.OTP);
        setCountdown(60);
        Alert.alert('OTP Sent', 'A verification code has been sent to your phone.');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to send OTP');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to send OTP. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setErrors({ otp: 'Please enter the 6-digit code' });
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const normalizedPhone = normalizePhone(phone);
      const response = await api.post('/auth/otp/verify', {
        phone: normalizedPhone,
        otp_code: otpCode,
        request_id: requestId,
      });
      
      if (response.data.success || response.data.verified) {
        setStep(STEPS.PASSWORD);
      } else {
        Alert.alert('Error', 'Invalid OTP code. Please try again.');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Invalid OTP code';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const normalizedPhone = normalizePhone(phone);
      const endpoint = isClient ? '/auth/client/reset-password' : '/auth/merchant/reset-password';
      
      const response = await api.post(endpoint, {
        phone: normalizedPhone,
        otp_code: otpCode,
        request_id: requestId,
        new_password: newPassword,
      });
      
      if (response.data.success) {
        setStep(STEPS.SUCCESS);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to reset password');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to reset password';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendOTP = async () => {
    if (countdown > 0) return;
    await handleSendOTP();
  };
  
  const getStepTitle = () => {
    switch (step) {
      case STEPS.PHONE: return 'Forgot Password';
      case STEPS.OTP: return 'Verify OTP';
      case STEPS.PASSWORD: return 'New Password';
      case STEPS.SUCCESS: return 'Success!';
      default: return 'Reset Password';
    }
  };
  
  const getStepSubtitle = () => {
    switch (step) {
      case STEPS.PHONE: return 'Enter your phone number to receive a verification code';
      case STEPS.OTP: return `Enter the 6-digit code sent to ${phone}`;
      case STEPS.PASSWORD: return 'Create a new secure password';
      case STEPS.SUCCESS: return 'Your password has been reset successfully';
      default: return '';
    }
  };
  
  const renderStepContent = () => {
    switch (step) {
      case STEPS.PHONE:
        return (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                  style={styles.inputGradient}
                >
                  <Ionicons name="call-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <Input
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="0XX XXX XXXX"
                    keyboardType="phone-pad"
                    error={errors.phone}
                    style={styles.input}
                  />
                </LinearGradient>
              </View>
            </View>
            
            <TouchableOpacity onPress={handleSendOTP} disabled={loading} activeOpacity={0.8}>
              <LinearGradient
                colors={isClient ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669']}
                style={styles.actionButton}
              >
                <Ionicons name="send-outline" size={22} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Send Verification Code</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        );
        
      case STEPS.OTP:
        return (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Verification Code</Text>
              <View style={styles.inputWrapper}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                  style={styles.inputGradient}
                >
                  <Ionicons name="keypad-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <Input
                    value={otpCode}
                    onChangeText={setOtpCode}
                    placeholder="Enter 6-digit code"
                    keyboardType="number-pad"
                    maxLength={6}
                    error={errors.otp}
                    style={styles.input}
                  />
                </LinearGradient>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.resendButton} 
              onPress={handleResendOTP}
              disabled={countdown > 0}
            >
              <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleVerifyOTP} disabled={loading} activeOpacity={0.8}>
              <LinearGradient
                colors={isClient ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669']}
                style={styles.actionButton}
              >
                <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Verify Code</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        );
        
      case STEPS.PASSWORD:
        return (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrapper}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                  style={styles.inputGradient}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <Input
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    secureTextEntry
                    error={errors.password}
                    style={styles.input}
                  />
                </LinearGradient>
              </View>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                  style={styles.inputGradient}
                >
                  <Ionicons name="lock-open-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <Input
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry
                    error={errors.confirm}
                    style={styles.input}
                  />
                </LinearGradient>
              </View>
            </View>
            
            <View style={styles.passwordHints}>
              <View style={styles.hintRow}>
                <Ionicons 
                  name={newPassword.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={newPassword.length >= 6 ? COLORS.secondary : COLORS.textMuted} 
                />
                <Text style={[styles.hintText, newPassword.length >= 6 && styles.hintTextValid]}>
                  At least 6 characters
                </Text>
              </View>
              <View style={styles.hintRow}>
                <Ionicons 
                  name={newPassword === confirmPassword && confirmPassword.length > 0 ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={newPassword === confirmPassword && confirmPassword.length > 0 ? COLORS.secondary : COLORS.textMuted} 
                />
                <Text style={[styles.hintText, newPassword === confirmPassword && confirmPassword.length > 0 && styles.hintTextValid]}>
                  Passwords match
                </Text>
              </View>
            </View>
            
            <TouchableOpacity onPress={handleResetPassword} disabled={loading} activeOpacity={0.8}>
              <LinearGradient
                colors={isClient ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669']}
                style={styles.actionButton}
              >
                <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Reset Password</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        );
        
      case STEPS.SUCCESS:
        return (
          <View style={styles.successContainer}>
            <Animated.View style={[styles.successIcon, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={[COLORS.secondary, '#059669']}
                style={styles.successIconGradient}
              >
                <Ionicons name="checkmark" size={48} color={COLORS.white} />
              </LinearGradient>
            </Animated.View>
            
            <Text style={styles.successText}>
              Your password has been reset successfully!
            </Text>
            <Text style={styles.successSubtext}>
              You can now sign in with your new password.
            </Text>
            
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login', { userType })}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isClient ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669']}
                style={styles.actionButton}
              >
                <Ionicons name="log-in-outline" size={22} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Back to Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
    }
  };
  
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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
        {[...Array(12)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: 0.3 + Math.random() * 0.4,
                transform: [{ scale: 0.3 + Math.random() * 0.7 }],
              },
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <LoadingOverlay visible={loading} message="Please wait..." />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          {step !== STEPS.SUCCESS && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (step === STEPS.PHONE) {
                  navigation.goBack();
                } else if (step === STEPS.OTP) {
                  setStep(STEPS.PHONE);
                } else if (step === STEPS.PASSWORD) {
                  setStep(STEPS.OTP);
                }
              }}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.backButtonGradient}
              >
                <Ionicons name="arrow-back" size={24} color={COLORS.text} />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Progress Bar */}
          {step !== STEPS.SUCCESS && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
              <View style={styles.progressSteps}>
                <Text style={[styles.progressStep, step === STEPS.PHONE && styles.progressStepActive]}>Phone</Text>
                <Text style={[styles.progressStep, step === STEPS.OTP && styles.progressStepActive]}>OTP</Text>
                <Text style={[styles.progressStep, step === STEPS.PASSWORD && styles.progressStepActive]}>Password</Text>
              </View>
            </View>
          )}

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Animated.View style={[styles.logoWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <Image 
                source={{ uri: LOGO_URL }} 
                style={styles.logoImage}
                resizeMode="cover"
              />
            </Animated.View>
          </View>

          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.title}>{getStepTitle()}</Text>
            <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
          </Animated.View>

          {/* Step Content */}
          <Animated.View
            style={[
              styles.form,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {renderStepContent()}
          </Animated.View>

          {/* Back to Login Link */}
          {step !== STEPS.SUCCESS && (
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login', { userType })}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  backButtonGradient: {
    padding: 12,
    borderRadius: 12,
  },
  progressContainer: {
    marginBottom: SPACING.xl,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  progressStep: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  progressStepActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: '#1E3A5F',
  },
  logoImage: {
    width: 110,
    height: 110,
    marginLeft: -15,
    marginTop: -15,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  form: {
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  inputWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: {
    marginLeft: SPACING.lg,
  },
  input: {
    flex: 1,
    marginBottom: 0,
  },
  resendButton: {
    alignSelf: 'center',
    marginBottom: SPACING.lg,
    padding: SPACING.sm,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
  },
  resendTextDisabled: {
    color: COLORS.textMuted,
  },
  passwordHints: {
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  hintText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  hintTextValid: {
    color: COLORS.secondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: SPACING.sm,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  successIcon: {
    marginBottom: SPACING.xl,
  },
  successIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  successText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  successSubtext: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  loginText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
});
```

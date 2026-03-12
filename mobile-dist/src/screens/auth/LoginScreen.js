/**
 * SDM REWARDS Mobile - Login Screen
 * Animated & Attractive Design with Remember Device Feature
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
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Input, LoadingOverlay } from '../../components/Common';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONTS, normalizePhone } from '../../utils/constants';

const { width } = Dimensions.get('window');
const LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/vc8llt43_WhatsApp%20Image%202026-03-04%20at%2020.16.26.jpeg";

// Device Trust Keys
const DEVICE_TOKEN_KEY_PREFIX = '@sdm_device_token_';

export default function LoginScreen({ navigation, route }) {
  const { userType } = route.params || { userType: 'client' };
  const { loginClient, loginMerchant, loginClientV2, loginMerchantV2 } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Remember device state
  const [rememberDevice, setRememberDevice] = useState(false);
  const [deviceIsTrusted, setDeviceIsTrusted] = useState(false);

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const isClient = userType === 'client';

  // Check for existing device token on mount
  useEffect(() => {
    checkDeviceToken();
  }, [userType]);

  const checkDeviceToken = async () => {
    try {
      const key = `${DEVICE_TOKEN_KEY_PREFIX}${userType}`;
      const token = await AsyncStorage.getItem(key);
      setDeviceIsTrusted(!!token);
    } catch (error) {
      console.log('Error checking device token:', error);
    }
  };

  // Get device info for registration
  const getDeviceInfo = () => {
    return {
      device_name: `${Platform.OS === 'ios' ? 'iPhone' : 'Android'} Device`,
      device_type: Platform.OS,
      user_agent: `SDM-Mobile/${Platform.OS}/${Platform.Version}`,
      platform: `${Platform.OS} ${Platform.Version}`,
      browser: 'SDM Mobile App'
    };
  };

  // Get stored device token
  const getDeviceToken = async () => {
    try {
      const key = `${DEVICE_TOKEN_KEY_PREFIX}${userType}`;
      return await AsyncStorage.getItem(key);
    } catch (error) {
      return null;
    }
  };

  // Store device token after successful login
  const storeDeviceToken = async (token) => {
    try {
      const key = `${DEVICE_TOKEN_KEY_PREFIX}${userType}`;
      await AsyncStorage.setItem(key, token);
    } catch (error) {
      console.log('Error storing device token:', error);
    }
  };

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
      const deviceToken = await getDeviceToken();
      const deviceInfo = getDeviceInfo();
      
      // Use v2 login endpoints with device trust support
      const loginPayload = {
        phone: normalizedPhone,
        password,
        device_token: deviceToken,
        remember_device: rememberDevice,
        device_info: deviceInfo
      };
      
      const result = isClient
        ? await loginClientV2(loginPayload)
        : await loginMerchantV2(loginPayload);

      if (!result.success) {
        // Handle 2FA requirement
        if (result.requires_2fa) {
          Alert.alert(
            'Verification Required',
            'Please enter your 2FA code',
            [{ text: 'OK' }]
          );
          // TODO: Navigate to 2FA screen
          return;
        }
        Alert.alert('Login Failed', result.error);
        return;
      }
      
      // Store device token if provided (remember device was enabled)
      if (result.device_token) {
        await storeDeviceToken(result.device_token);
        Alert.alert(
          'Device Registered',
          'This device is now trusted. You won\'t need to verify next time!',
          [{ text: 'Great!' }]
        );
      } else if (result.device_trusted) {
        // Device was already trusted, just show welcome
        Alert.alert(
          'Welcome Back!',
          'Logged in from trusted device',
          [{ text: 'OK' }]
        );
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

            {/* Remember Device Toggle */}
            <View style={styles.rememberDeviceContainer}>
              <TouchableOpacity 
                style={styles.rememberDeviceRow}
                onPress={() => setRememberDevice(!rememberDevice)}
                activeOpacity={0.7}
              >
                <View style={styles.rememberDeviceLeft}>
                  <Ionicons 
                    name="phone-portrait-outline" 
                    size={20} 
                    color={rememberDevice ? COLORS.primary : COLORS.textSecondary} 
                  />
                  <View style={styles.rememberDeviceTextContainer}>
                    <Text style={styles.rememberDeviceText}>Remember this device</Text>
                    {deviceIsTrusted && (
                      <View style={styles.trustedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                        <Text style={styles.trustedText}>Already trusted</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Switch
                  value={rememberDevice}
                  onValueChange={setRememberDevice}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: isClient ? '#F59E0B' : '#10B981' }}
                  thumbColor={rememberDevice ? '#FFFFFF' : '#94A3B8'}
                  ios_backgroundColor="rgba(255,255,255,0.1)"
                />
              </TouchableOpacity>
              <Text style={styles.rememberDeviceHint}>
                Skip verification on this device for 90 days
              </Text>
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
    marginBottom: SPACING.lg,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
  },
  rememberDeviceContainer: {
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.sm,
  },
  rememberDeviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  rememberDeviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  rememberDeviceTextContainer: {
    flex: 1,
  },
  rememberDeviceText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
  },
  trustedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  trustedText: {
    color: '#10B981',
    fontSize: FONTS.sizes.xs,
  },
  rememberDeviceHint: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xl + SPACING.sm,
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

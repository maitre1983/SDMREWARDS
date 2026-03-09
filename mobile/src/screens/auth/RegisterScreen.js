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

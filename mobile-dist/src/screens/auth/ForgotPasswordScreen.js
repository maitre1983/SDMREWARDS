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

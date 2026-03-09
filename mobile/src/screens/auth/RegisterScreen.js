/**
 * SDM REWARDS Mobile - Register Screen with OTP
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, LoadingOverlay } from '../../components/Common';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { COLORS, SPACING, FONTS, normalizePhone } from '../../utils/constants';

export default function RegisterScreen({ navigation, route }) {
  const { userType } = route.params || { userType: 'client' };
  const { registerClient, registerMerchant } = useAuth();

  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Details
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isClient = userType === 'client';

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
    if (!password || password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>Enter your phone number</Text>
            <Text style={styles.stepSubtitle}>
              We'll send you a verification code
            </Text>
            <Input
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="0XX XXX XXXX"
              keyboardType="phone-pad"
              icon="call-outline"
              error={errors.phone}
            />
            <Button
              title="Send Verification Code"
              onPress={sendOTP}
              loading={loading}
              style={styles.button}
            />
          </>
        );

      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>Verify your number</Text>
            <Text style={styles.stepSubtitle}>
              Enter the code sent to {phone}
            </Text>
            <Input
              label="Verification Code"
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter 6-digit code"
              keyboardType="number-pad"
              icon="shield-checkmark-outline"
              error={errors.otp}
            />
            <Button
              title="Verify"
              onPress={verifyOTP}
              loading={loading}
              style={styles.button}
            />
            <TouchableOpacity
              onPress={sendOTP}
              disabled={loading}
              style={styles.resendContainer}
            >
              <Text style={styles.resendText}>Didn't receive code? Resend</Text>
            </TouchableOpacity>
          </>
        );

      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>Complete your profile</Text>
            <Text style={styles.stepSubtitle}>
              {isClient ? 'Tell us about yourself' : 'Tell us about your business'}
            </Text>
            
            {isClient ? (
              <Input
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                icon="person-outline"
                error={errors.fullName}
              />
            ) : (
              <Input
                label="Business Name"
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Enter your business name"
                icon="storefront-outline"
                error={errors.businessName}
              />
            )}

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.password}
            />

            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.confirmPassword}
            />

            {isClient && (
              <Input
                label="Referral Code (Optional)"
                value={referralCode}
                onChangeText={setReferralCode}
                placeholder="Enter referral code"
                icon="gift-outline"
              />
            )}

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              style={styles.button}
            />
          </>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LoadingOverlay visible={loading} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        {/* Progress */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                s <= step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.header}>
          <View style={[styles.iconCircle, isClient ? styles.clientIcon : styles.merchantIcon]}>
            <Ionicons
              name={isClient ? 'person-add' : 'add-circle'}
              size={32}
              color={COLORS.white}
            />
          </View>
          <Text style={styles.title}>
            {isClient ? 'Customer Registration' : 'Merchant Registration'}
          </Text>
        </View>

        {/* Step Content */}
        <View style={styles.form}>
          {renderStep()}
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login', { userType })}
          >
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
  },
  backButton: {
    marginBottom: SPACING.md,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.cardBorder,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  clientIcon: {
    backgroundColor: COLORS.primary,
  },
  merchantIcon: {
    backgroundColor: COLORS.secondary,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
  },
  form: {
    marginBottom: SPACING.xl,
  },
  stepTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.xl,
  },
  button: {
    paddingVertical: 16,
    marginTop: SPACING.md,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
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

/**
 * SDM REWARDS Mobile - Login Screen
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
import { COLORS, SPACING, BORDER_RADIUS, FONTS, normalizePhone } from '../../utils/constants';

export default function LoginScreen({ navigation, route }) {
  const { userType } = route.params || { userType: 'client' };
  const { loginClient, loginMerchant } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isClient = userType === 'client';

  const validate = () => {
    const newErrors = {};
    if (!phone || phone.length < 9) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LoadingOverlay visible={loading} message="Signing in..." />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.iconCircle, isClient ? styles.clientIcon : styles.merchantIcon]}>
            <Ionicons
              name={isClient ? 'person' : 'storefront'}
              size={32}
              color={COLORS.white}
            />
          </View>
          <Text style={styles.title}>
            {isClient ? 'Customer Login' : 'Merchant Login'}
          </Text>
          <Text style={styles.subtitle}>
            Sign in to your {isClient ? 'customer' : 'merchant'} account
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="0XX XXX XXXX"
            keyboardType="phone-pad"
            icon="call-outline"
            error={errors.phone}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            icon="lock-closed-outline"
            error={errors.password}
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />
        </View>

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
          <Ionicons name="swap-horizontal" size={20} color={COLORS.textSecondary} />
          <Text style={styles.switchText}>
            Switch to {isClient ? 'Merchant' : 'Customer'} Login
          </Text>
        </TouchableOpacity>
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
    marginBottom: SPACING.lg,
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
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  form: {
    marginBottom: SPACING.xl,
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
    paddingVertical: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    marginTop: 'auto',
  },
  switchText: {
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.md,
  },
});

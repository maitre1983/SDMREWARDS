/**
 * SDM REWARDS Mobile - Welcome Screen
 * User type selection (Client or Merchant)
 */

import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Common';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../../utils/constants';

const { width } = Dimensions.get('window');

// Company logo URL
const LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/vc8llt43_WhatsApp%20Image%202026-03-04%20at%2020.16.26.jpeg";

export default function WelcomeScreen({ navigation }) {
  return (
    <LinearGradient
      colors={[COLORS.background, '#1a1a2e']}
      style={styles.container}
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image 
          source={{ uri: LOGO_URL }} 
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>SDM REWARDS</Text>
        <Text style={styles.subtitle}>Earn cashback on every purchase</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        <FeatureItem icon="gift" text="Earn cashback rewards" />
        <FeatureItem icon="qr-code" text="Pay merchants with QR" />
        <FeatureItem icon="phone-portrait" text="Buy airtime & data" />
        <FeatureItem icon="wallet" text="Withdraw to MoMo" />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
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
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Powered by GIT NFT GHANA LTD
      </Text>
    </LinearGradient>
  );
}

const FeatureItem = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </View>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes.title,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.lg,
  },
  features: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  featureText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
  },
  buttonsContainer: {
    marginTop: 'auto',
    gap: SPACING.md,
  },
  primaryButton: {
    paddingVertical: 16,
  },
  secondaryButton: {
    paddingVertical: 16,
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginTop: SPACING.xxl,
    marginBottom: SPACING.lg,
  },
});

/**
 * SDM REWARDS Mobile - QR Scanner Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, LoadingOverlay, NetworkSelector } from '../../components/Common';
import { merchantAPI, paymentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, NETWORKS, formatCurrency } from '../../utils/constants';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

export default function QRScannerScreen({ navigation }) {
  const { user, refreshDashboard } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [network, setNetwork] = useState('MTN');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // null, 'pending', 'success', 'failed'
  const [paymentId, setPaymentId] = useState(null);
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const extractMerchantCode = (data) => {
    // Handle different QR formats
    // Full URL: https://domain.com/pay/MERCHANT123
    // Short code: MERCHANT123
    if (data.includes('/pay/')) {
      const parts = data.split('/pay/');
      return parts[parts.length - 1];
    }
    return data;
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);

    try {
      const code = extractMerchantCode(data);
      const response = await merchantAPI.getByQRCode(code);
      
      if (response.merchant) {
        setMerchant(response.merchant);
      } else {
        Alert.alert('Error', 'Merchant not found');
        setScanned(false);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to find merchant');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    if (!amount || parseFloat(amount) < 1) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await paymentsAPI.initiateMerchantPayment(
        merchant.id,
        parseFloat(amount),
        phone,
        network
      );

      if (response.success) {
        setPaymentId(response.payment_id);
        setIsTestMode(response.test_mode || false);
        setPaymentStatus('pending');
      } else {
        Alert.alert('Error', response.detail || 'Payment failed');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentId) return;
    setLoading(true);

    try {
      const response = await paymentsAPI.checkPaymentStatus(paymentId);
      
      if (response.status === 'completed') {
        setPaymentStatus('success');
        await refreshDashboard();
      } else if (response.status === 'failed') {
        setPaymentStatus('failed');
      }
      // If still pending, status remains 'pending'
    } catch (error) {
      Alert.alert('Error', 'Failed to check payment status');
    } finally {
      setLoading(false);
    }
  };

  const confirmTestPayment = async () => {
    if (!paymentId) return;
    setLoading(true);

    try {
      const response = await paymentsAPI.confirmTestPayment(paymentId);
      if (response.success) {
        setPaymentStatus('success');
        await refreshDashboard();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm payment');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setMerchant(null);
    setAmount('');
    setPaymentStatus(null);
    setPaymentId(null);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission is required to scan QR codes</Text>
        <Button title="Grant Permission" onPress={requestPermission} style={{ marginTop: 20 }} />
      </View>
    );
  }

  // Payment Modal
  const renderPaymentModal = () => (
    <Modal visible={!!merchant} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LoadingOverlay visible={loading} />
          
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={resetScanner}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>

          {paymentStatus === 'success' ? (
            <View style={styles.statusContainer}>
              <View style={[styles.statusIcon, styles.successIcon]}>
                <Ionicons name="checkmark" size={48} color={COLORS.success} />
              </View>
              <Text style={styles.statusTitle}>Payment Successful!</Text>
              <Text style={styles.statusSubtitle}>
                Cashback credited to your wallet
              </Text>
              <Button title="Done" onPress={() => navigation.goBack()} style={{ marginTop: 24 }} />
            </View>
          ) : paymentStatus === 'failed' ? (
            <View style={styles.statusContainer}>
              <View style={[styles.statusIcon, styles.failedIcon]}>
                <Ionicons name="close" size={48} color={COLORS.error} />
              </View>
              <Text style={styles.statusTitle}>Payment Failed</Text>
              <Button title="Try Again" onPress={() => setPaymentStatus(null)} style={{ marginTop: 24 }} />
            </View>
          ) : paymentStatus === 'pending' ? (
            <View style={styles.statusContainer}>
              <View style={[styles.statusIcon, styles.pendingIcon]}>
                <Ionicons name="phone-portrait" size={48} color={COLORS.warning} />
              </View>
              <Text style={styles.statusTitle}>Waiting for Payment</Text>
              <Text style={styles.statusSubtitle}>
                Approve the MoMo prompt on your phone
              </Text>
              <View style={styles.cashbackPreview}>
                <Text style={styles.cashbackLabel}>Expected Cashback</Text>
                <Text style={styles.cashbackAmount}>
                  +{formatCurrency(parseFloat(amount) * (merchant?.cashback_rate || 5) / 100 * 0.95)}
                </Text>
              </View>
              <View style={styles.buttonGroup}>
                <Button
                  title="Check Status"
                  onPress={checkPaymentStatus}
                  variant="outline"
                  style={{ flex: 1 }}
                />
                {isTestMode && (
                  <Button
                    title="Confirm Test"
                    onPress={confirmTestPayment}
                    style={{ flex: 1, marginLeft: 12 }}
                  />
                )}
              </View>
            </View>
          ) : (
            <>
              {/* Merchant Info */}
              <View style={styles.merchantInfo}>
                <View style={styles.merchantIcon}>
                  <Ionicons name="storefront" size={32} color={COLORS.white} />
                </View>
                <Text style={styles.merchantName}>{merchant?.business_name}</Text>
                <View style={styles.cashbackBadge}>
                  <Ionicons name="gift" size={14} color={COLORS.success} />
                  <Text style={styles.cashbackBadgeText}>
                    {merchant?.cashback_rate || 5}% Cashback
                  </Text>
                </View>
              </View>

              {/* Payment Form */}
              <Input
                label="MoMo Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="0XX XXX XXXX"
                keyboardType="phone-pad"
                icon="call-outline"
              />

              <View style={{ marginBottom: SPACING.lg }}>
                <Text style={styles.inputLabel}>Network</Text>
                <NetworkSelector
                  selected={network}
                  onSelect={setNetwork}
                  networks={NETWORKS}
                />
              </View>

              <Input
                label="Amount (GHS)"
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount"
                keyboardType="decimal-pad"
                icon="cash-outline"
              />

              {/* Cashback Preview */}
              {amount && parseFloat(amount) > 0 && (
                <View style={styles.cashbackPreview}>
                  <Text style={styles.cashbackLabel}>Expected Cashback</Text>
                  <Text style={styles.cashbackAmount}>
                    +{formatCurrency(parseFloat(amount) * (merchant?.cashback_rate || 5) / 100 * 0.95)}
                  </Text>
                </View>
              )}

              <Button
                title="Pay with MoMo"
                onPress={initiatePayment}
                icon="wallet"
                style={{ marginTop: SPACING.lg }}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Merchant QR</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Scan Frame */}
      <View style={styles.scanFrame}>
        <View style={styles.scanArea}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Point your camera at a merchant's QR code
        </Text>
      </View>

      {renderPaymentModal()}
      <LoadingOverlay visible={loading && !merchant} message="Finding merchant..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  camera: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  scanFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  instructions: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  permissionText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    textAlign: 'center',
    padding: SPACING.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xl,
    maxHeight: height * 0.85,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    zIndex: 1,
  },
  merchantInfo: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  merchantIcon: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  merchantName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  cashbackBadgeText: {
    color: COLORS.success,
    marginLeft: SPACING.xs,
    fontWeight: '600',
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
  },
  cashbackPreview: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  cashbackLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  cashbackAmount: {
    color: COLORS.success,
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  successIcon: {
    backgroundColor: COLORS.successBg,
  },
  failedIcon: {
    backgroundColor: COLORS.errorBg,
  },
  pendingIcon: {
    backgroundColor: COLORS.warningBg,
  },
  statusTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
  },
  statusSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    marginTop: SPACING.xl,
    width: '100%',
  },
});

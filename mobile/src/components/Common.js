/**
 * SDM REWARDS Mobile - Reusable Components
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../utils/constants';

// ============== BUTTON ==============
export const Button = ({
  title,
  onPress,
  variant = 'primary', // primary, secondary, outline, ghost
  size = 'md', // sm, md, lg
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return COLORS.cardBorder;
    switch (variant) {
      case 'primary':
        return COLORS.primary;
      case 'secondary':
        return COLORS.secondary;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return COLORS.textMuted;
    switch (variant) {
      case 'outline':
        return COLORS.primary;
      case 'ghost':
        return COLORS.textSecondary;
      default:
        return COLORS.white;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 12 };
      case 'lg':
        return { paddingVertical: 16, paddingHorizontal: 24 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 16 };
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        getPadding(),
        {
          backgroundColor: getBackgroundColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: COLORS.primary,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.buttonContent}>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={20} color={getTextColor()} style={{ marginRight: 8 }} />
          )}
          <Text style={[styles.buttonText, { color: getTextColor() }, textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={20} color={getTextColor()} style={{ marginLeft: 8 }} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============== INPUT ==============
export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  error,
  icon,
  editable = true,
  multiline = false,
  style,
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <View style={[styles.inputContainer, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        {icon && (
          <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !showPassword}
          editable={editable}
          multiline={multiline}
          style={[styles.input, !editable && styles.inputDisabled]}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// ============== CARD ==============
export const Card = ({ children, style, onPress }) => {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container onPress={onPress} style={[styles.card, style]}>
      {children}
    </Container>
  );
};

// ============== BALANCE CARD ==============
export const BalanceCard = ({ balance, label = 'Cashback Balance', onWithdraw }) => {
  return (
    <View style={styles.balanceCard}>
      <Text style={styles.balanceLabel}>{label}</Text>
      <Text style={styles.balanceAmount}>GHS {parseFloat(balance || 0).toFixed(2)}</Text>
      {onWithdraw && (
        <TouchableOpacity style={styles.withdrawButton} onPress={onWithdraw}>
          <Ionicons name="arrow-up-circle" size={20} color={COLORS.white} />
          <Text style={styles.withdrawButtonText}>Withdraw</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============== TRANSACTION ITEM ==============
export const TransactionItem = ({ transaction }) => {
  const isCredit = transaction.type === 'cashback' || transaction.type === 'referral_bonus' || transaction.type === 'welcome_bonus';
  const amount = parseFloat(transaction.amount || transaction.cashback_amount || 0);

  return (
    <View style={styles.transactionItem}>
      <View style={[styles.transactionIcon, isCredit ? styles.creditIcon : styles.debitIcon]}>
        <Ionicons
          name={isCredit ? 'arrow-down' : 'arrow-up'}
          size={20}
          color={isCredit ? COLORS.success : COLORS.error}
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle}>
          {transaction.description || transaction.type?.replace(/_/g, ' ')}
        </Text>
        <Text style={styles.transactionDate}>
          {new Date(transaction.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, isCredit ? styles.creditAmount : styles.debitAmount]}>
        {isCredit ? '+' : '-'}GHS {amount.toFixed(2)}
      </Text>
    </View>
  );
};

// ============== NETWORK SELECTOR ==============
export const NetworkSelector = ({ selected, onSelect, networks }) => {
  return (
    <View style={styles.networkContainer}>
      {networks.map((network) => (
        <TouchableOpacity
          key={network.id}
          onPress={() => onSelect(network.id)}
          style={[
            styles.networkButton,
            selected === network.id && { borderColor: network.color, backgroundColor: `${network.color}20` },
          ]}
        >
          <Text style={[styles.networkText, selected === network.id && { color: network.color }]}>
            {network.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============== LOADING OVERLAY ==============
export const LoadingOverlay = ({ visible, message = 'Loading...' }) => {
  if (!visible) return null;
  return (
    <Modal transparent visible={visible}>
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

// ============== STYLES ==============
const styles = StyleSheet.create({
  // Button
  button: {
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },

  // Input
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xs,
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.lg,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  balanceAmount: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: SPACING.sm,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.md,
  },
  withdrawButtonText: {
    color: COLORS.white,
    marginLeft: SPACING.xs,
    fontWeight: '600',
  },

  // Transaction Item
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  creditIcon: {
    backgroundColor: COLORS.successBg,
  },
  debitIcon: {
    backgroundColor: COLORS.errorBg,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    textTransform: 'capitalize',
  },
  transactionDate: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  transactionAmount: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  creditAmount: {
    color: COLORS.success,
  },
  debitAmount: {
    color: COLORS.error,
  },

  // Network Selector
  networkContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  networkButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  networkText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // Loading Overlay
  loadingOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    backgroundColor: COLORS.card,
    padding: SPACING.xxl,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.text,
    marginTop: SPACING.lg,
    fontSize: FONTS.sizes.md,
  },
});

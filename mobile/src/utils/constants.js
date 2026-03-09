/**
 * SDM REWARDS Mobile - Theme & Constants
 */

export const COLORS = {
  // Primary colors
  primary: '#F59E0B', // Amber
  primaryDark: '#D97706',
  secondary: '#10B981', // Emerald
  secondaryDark: '#059669',
  
  // Background colors
  background: '#0F172A', // Slate 900
  backgroundLight: '#1E293B', // Slate 800
  card: '#1E293B',
  cardBorder: '#334155', // Slate 700
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#94A3B8', // Slate 400
  textMuted: '#64748B', // Slate 500
  
  // Status colors
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.2)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.2)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.2)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.2)',
  
  // Network colors
  mtn: '#FACC15', // Yellow
  telecel: '#EF4444', // Red
  airteltigo: '#3B82F6', // Blue
  
  // Other
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.8)',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
    title: 28,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 999,
};

export const NETWORKS = [
  { id: 'MTN', name: 'MTN', color: COLORS.mtn },
  { id: 'TELECEL', name: 'Telecel', color: COLORS.telecel },
  { id: 'AIRTELTIGO', name: 'AirtelTigo', color: COLORS.airteltigo },
];

export const formatCurrency = (amount) => {
  return `GHS ${parseFloat(amount || 0).toFixed(2)}`;
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  // Remove +233 and format as 0XX XXX XXXX
  const cleaned = phone.replace(/^\+233/, '0').replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
};

export const normalizePhone = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('233')) {
    return '+' + cleaned;
  }
  if (cleaned.startsWith('0')) {
    return '+233' + cleaned.substring(1);
  }
  return '+233' + cleaned;
};

// Alias for formatGhanaPhone
export const formatGhanaPhone = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  // Ensure it starts with +233
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (!cleaned.startsWith('233')) {
    cleaned = '233' + cleaned;
  }
  return '+' + cleaned;
};

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Linking,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import api from '../../services/api';

export default function ReferralScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await api.get('/api/growth/referral/prompt?language=en');
      setData(response.data);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const trackShare = async (platform) => {
    try {
      await api.post('/api/growth/referral/track-share', { platform, success: true });
    } catch (error) {
      console.error('Error tracking share:', error);
    }
  };

  const copyToClipboard = (text) => {
    Clipboard.setString(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackShare('copy');
  };

  const shareWhatsApp = () => {
    const message = `${data?.messages?.whatsapp || ''} ${data?.referral_link || ''}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
    trackShare('whatsapp');
  };

  const shareSMS = () => {
    const message = `${data?.messages?.sms || ''} ${data?.referral_link || ''}`;
    Linking.openURL(`sms:?body=${encodeURIComponent(message)}`);
    trackShare('sms');
  };

  const shareEmail = () => {
    const subject = data?.messages?.email_subject || 'Join SDM REWARDS';
    const body = `${data?.messages?.email_body || ''}\n\n${data?.referral_link || ''}`;
    Linking.openURL(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    trackShare('email');
  };

  const shareTelegram = () => {
    const message = `${data?.messages?.telegram || ''} ${data?.referral_link || ''}`;
    Linking.openURL(`tg://msg?text=${encodeURIComponent(message)}`);
    trackShare('telegram');
  };

  const shareNative = async () => {
    try {
      await Share.share({
        message: `${data?.messages?.whatsapp || ''} ${data?.referral_link || ''}`,
        title: 'Join SDM REWARDS'
      });
      trackShare('native');
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="share-social" size={48} color="#f59e0b" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ambassador = data?.ambassador_status || {};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Friends</Text>
        <TouchableOpacity onPress={shareNative}>
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Ionicons name="gift" size={48} color="#fff" />
          <Text style={styles.heroTitle}>Earn rewards for every friend!</Text>
          <Text style={styles.heroSubtitle}>
            Share your code and earn cashback when friends join
          </Text>
        </View>

        {/* Referral Code */}
        <View style={styles.codeSection}>
          <Text style={styles.sectionLabel}>Your Referral Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{data?.referral_code || '------'}</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(data?.referral_code)}
            >
              <Ionicons 
                name={copied ? "checkmark" : "copy"} 
                size={20} 
                color="#1e293b" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Referral Link */}
        <View style={styles.linkSection}>
          <Text style={styles.sectionLabel}>Your Referral Link</Text>
          <View style={styles.linkContainer}>
            <Text style={styles.linkText} numberOfLines={1}>
              {data?.referral_link || 'https://sdmrewards.com/join?ref=...'}
            </Text>
            <TouchableOpacity 
              style={styles.copyButtonOutline}
              onPress={() => copyToClipboard(data?.referral_link)}
            >
              <Ionicons name="copy-outline" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* QR Code Toggle */}
        <TouchableOpacity 
          style={styles.qrToggle}
          onPress={() => setShowQR(!showQR)}
        >
          <Ionicons name="qr-code" size={20} color="#94a3b8" />
          <Text style={styles.qrToggleText}>
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </Text>
        </TouchableOpacity>

        {showQR && data?.referral_link && (
          <View style={styles.qrContainer}>
            <QRCode
              value={data.referral_link}
              size={180}
              backgroundColor="#fff"
              color="#0f172a"
            />
          </View>
        )}

        {/* Share Buttons */}
        <View style={styles.shareSection}>
          <Text style={styles.sectionLabel}>Share Via</Text>
          <View style={styles.shareGrid}>
            <TouchableOpacity style={[styles.shareButton, styles.whatsapp]} onPress={shareWhatsApp}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <Text style={styles.shareLabel}>WhatsApp</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.shareButton, styles.sms]} onPress={shareSMS}>
              <Ionicons name="chatbubble" size={24} color="#3b82f6" />
              <Text style={styles.shareLabel}>SMS</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.shareButton, styles.email]} onPress={shareEmail}>
              <Ionicons name="mail" size={24} color="#a855f7" />
              <Text style={styles.shareLabel}>Email</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.shareButton, styles.telegram]} onPress={shareTelegram}>
              <Ionicons name="paper-plane" size={24} color="#0088cc" />
              <Text style={styles.shareLabel}>Telegram</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionLabel}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>{data?.referral_count || 0}</Text>
              <Text style={styles.statLabel}>Friends Invited</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="gift" size={24} color="#22c55e" />
              <Text style={[styles.statValue, { color: '#22c55e' }]}>
                GHS {data?.total_earnings?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
          </View>
        </View>

        {/* Ambassador Status */}
        <View style={[
          styles.ambassadorSection,
          ambassador.is_ambassador && styles.ambassadorActive
        ]}>
          <View style={styles.ambassadorHeader}>
            <View style={[
              styles.ambassadorIcon,
              ambassador.is_ambassador && styles.ambassadorIconActive
            ]}>
              <Ionicons 
                name="ribbon" 
                size={24} 
                color={ambassador.is_ambassador ? '#f59e0b' : '#64748b'} 
              />
            </View>
            <View style={styles.ambassadorInfo}>
              <Text style={styles.ambassadorTitle}>Ambassador Status</Text>
              {ambassador.is_ambassador ? (
                <Text style={styles.ambassadorBadge}>You're an Ambassador!</Text>
              ) : (
                <Text style={styles.ambassadorProgress}>
                  {ambassador.referrals_needed} referrals needed
                </Text>
              )}
            </View>
          </View>

          {!ambassador.is_ambassador && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${ambassador.progress || 0}%` }]}
                />
              </View>
              <Text style={styles.progressText}>
                {ambassador.referral_count}/{ambassador.threshold}
              </Text>
            </View>
          )}

          {ambassador.is_ambassador && ambassador.benefits?.length > 0 && (
            <View style={styles.benefitsList}>
              {ambassador.benefits.slice(0, 3).map((benefit, i) => (
                <View key={i} style={styles.benefitItem}>
                  <Ionicons name="sparkles" size={14} color="#f59e0b" />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  heroCard: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeSection: {
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },
  codeText: {
    flex: 1,
    color: '#f59e0b',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 16,
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: '#f59e0b',
    padding: 16,
    paddingHorizontal: 20,
  },
  linkSection: {
    marginBottom: 16,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  linkText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 14,
  },
  copyButtonOutline: {
    padding: 8,
  },
  qrToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  qrToggleText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  qrContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  shareSection: {
    marginBottom: 16,
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shareButton: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  whatsapp: {
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
  },
  sms: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  email: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  telegram: {
    backgroundColor: 'rgba(0, 136, 204, 0.15)',
  },
  shareLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  statsSection: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  ambassadorSection: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ambassadorActive: {
    borderColor: '#f59e0b40',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  ambassadorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ambassadorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambassadorIconActive: {
    backgroundColor: '#f59e0b30',
  },
  ambassadorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ambassadorTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ambassadorBadge: {
    color: '#f59e0b',
    fontSize: 14,
  },
  ambassadorProgress: {
    color: '#94a3b8',
    fontSize: 13,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  progressText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  benefitsList: {
    marginTop: 16,
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    color: '#94a3b8',
    fontSize: 13,
  },
});

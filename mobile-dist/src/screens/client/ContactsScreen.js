/**
 * SDM REWARDS Mobile - Contacts Integration Screen
 * Invite friends from contacts with referral sync
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
  SectionList,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useAuth } from '../../contexts/AuthContext';
import { clientAPI } from '../../services/api';
import { COLORS, SPACING, FONTS, normalizePhone } from '../../utils/constants';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

export default function ContactsScreen({ navigation }) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [sectionedContacts, setSectionedContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [existingMembers, setExistingMembers] = useState(new Set());
  const [pendingReferrals, setPendingReferrals] = useState(new Set());
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [inviting, setInviting] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 500,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    requestPermissionAndLoad();
  }, []);

  useEffect(() => {
    filterAndSectionContacts();
  }, [contacts, searchQuery, existingMembers]);

  const requestPermissionAndLoad = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status === 'granted') {
        await loadContacts();
        await fetchReferralData();
      }
    } catch (error) {
      console.error('Permission error:', error);
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Image,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      // Filter contacts with phone numbers and normalize
      const validContacts = data
        .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map(contact => {
          const primaryPhone = contact.phoneNumbers[0]?.number || '';
          const normalizedPhone = normalizePhone(primaryPhone.replace(/\s/g, ''));
          return {
            id: contact.id,
            name: contact.name || 'Unknown',
            phone: primaryPhone,
            normalizedPhone,
            image: contact.image,
          };
        })
        .filter(contact => contact.normalizedPhone.startsWith('+233')); // Ghana numbers only

      setContacts(validContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralData = async () => {
    try {
      const response = await clientAPI.getReferrals();
      const referrals = response.referrals || [];
      
      // Get existing members (completed referrals)
      const members = new Set(
        referrals
          .filter(r => r.status === 'active' || r.card_purchased)
          .map(r => normalizePhone(r.phone))
      );
      
      // Get pending referrals
      const pending = new Set(
        referrals
          .filter(r => r.status === 'pending' && !r.card_purchased)
          .map(r => normalizePhone(r.phone))
      );
      
      setExistingMembers(members);
      setPendingReferrals(pending);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  };

  const filterAndSectionContacts = () => {
    let filtered = [...contacts];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.phone.includes(query)
      );
    }

    setFilteredContacts(filtered);

    // Group by first letter
    const grouped = {};
    filtered.forEach(contact => {
      const firstLetter = (contact.name[0] || '#').toUpperCase();
      const key = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(contact);
    });

    // Convert to section list format
    const sections = Object.keys(grouped)
      .sort()
      .map(letter => ({
        title: letter,
        data: grouped[letter],
      }));

    setSectionedContacts(sections);
  };

  const getContactStatus = (contact) => {
    if (existingMembers.has(contact.normalizedPhone)) {
      return 'member';
    }
    if (pendingReferrals.has(contact.normalizedPhone)) {
      return 'pending';
    }
    return 'invite';
  };

  const toggleSelection = (contactId) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedContacts(newSelection);
  };

  const inviteContact = async (contact) => {
    const referralCode = user?.referral_code || 'SDMREWARDS';
    const message = `Hey ${contact.name.split(' ')[0]}! 👋\n\nJoin SDM Rewards and earn cashback on every purchase! Use my referral code: ${referralCode}\n\nDownload the app: https://sdmrewards.com/download\n\nWe both get bonuses when you sign up! 🎁`;
    
    try {
      await Share.share({
        message,
        title: 'Join SDM Rewards',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const inviteSelected = async () => {
    if (selectedContacts.size === 0) {
      Alert.alert('No Selection', 'Please select contacts to invite');
      return;
    }

    setInviting(true);
    const referralCode = user?.referral_code || 'SDMREWARDS';
    const selectedList = contacts.filter(c => selectedContacts.has(c.id));
    const names = selectedList.map(c => c.name.split(' ')[0]).slice(0, 3).join(', ');
    
    const message = `Hey ${names}${selectedList.length > 3 ? ' and friends' : ''}! 👋\n\nJoin SDM Rewards and earn cashback on every purchase! Use my referral code: ${referralCode}\n\nDownload: https://sdmrewards.com/download\n\n🎁 Bonus for both of us when you sign up!`;
    
    try {
      await Share.share({
        message,
        title: 'Join SDM Rewards',
      });
      setSelectedContacts(new Set());
    } catch (error) {
      console.error('Bulk invite error:', error);
    } finally {
      setInviting(false);
    }
  };

  const sendSMS = (contact) => {
    const referralCode = user?.referral_code || 'SDMREWARDS';
    const message = `Join SDM Rewards! Use code ${referralCode} for bonus. Download: https://sdmrewards.com`;
    const url = Platform.select({
      ios: `sms:${contact.phone}&body=${encodeURIComponent(message)}`,
      android: `sms:${contact.phone}?body=${encodeURIComponent(message)}`,
    });
    Linking.openURL(url);
  };

  const sendWhatsApp = (contact) => {
    const referralCode = user?.referral_code || 'SDMREWARDS';
    const message = `Hey! Join SDM Rewards and earn cashback! Use my code: ${referralCode}\n\nDownload: https://sdmrewards.com`;
    const phone = contact.normalizedPhone.replace('+', '');
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
  };

  const invitableCount = filteredContacts.filter(c => getContactStatus(c) === 'invite').length;
  const memberCount = filteredContacts.filter(c => getContactStatus(c) === 'member').length;

  const renderContact = ({ item: contact }) => {
    const status = getContactStatus(contact);
    const isSelected = selectedContacts.has(contact.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          isSelected && styles.contactItemSelected,
          status === 'member' && styles.contactItemMember,
        ]}
        onPress={() => status === 'invite' && toggleSelection(contact.id)}
        onLongPress={() => status === 'invite' && inviteContact(contact)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.avatarContainer,
          status === 'member' && styles.avatarMember,
          status === 'pending' && styles.avatarPending,
        ]}>
          <Text style={styles.avatarText}>
            {contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
          {status === 'member' && (
            <View style={styles.memberBadge}>
              <Ionicons name="checkmark" size={10} color={COLORS.white} />
            </View>
          )}
        </View>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
          {status === 'member' && (
            <View style={styles.statusBadge}>
              <Ionicons name="star" size={10} color={COLORS.secondary} />
              <Text style={styles.statusText}>SDM Member</Text>
            </View>
          )}
          {status === 'pending' && (
            <View style={[styles.statusBadge, styles.statusPending]}>
              <Ionicons name="time" size={10} color={COLORS.primary} />
              <Text style={[styles.statusText, { color: COLORS.primary }]}>Invited</Text>
            </View>
          )}
        </View>
        
        {status === 'invite' && (
          <View style={styles.contactActions}>
            {isSelected ? (
              <View style={styles.selectedCheck}>
                <Ionicons name="checkmark" size={18} color={COLORS.white} />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => sendWhatsApp(contact)}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => sendSMS(contact)}
                >
                  <Ionicons name="chatbubble" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0F172A', '#1E1B4B', '#0F172A']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.permissionContainer}>
          <Ionicons name="people" size={80} color={COLORS.textMuted} />
          <Text style={styles.permissionTitle}>Contact Access Required</Text>
          <Text style={styles.permissionText}>
            To invite friends and see who's already a member, we need access to your contacts.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => Linking.openSettings()}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.permissionButtonGradient}
            >
              <Text style={styles.permissionButtonText}>Open Settings</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#0F172A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Invite Friends</Text>
          <Text style={styles.headerSubtitle}>
            {selectedContacts.size > 0 
              ? `${selectedContacts.size} selected`
              : `${invitableCount} contacts to invite`
            }
          </Text>
        </View>
        
        {selectedContacts.size > 0 ? (
          <TouchableOpacity 
            style={styles.inviteAllButton}
            onPress={inviteSelected}
            disabled={inviting}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.inviteAllGradient}
            >
              {inviting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="send" size={18} color={COLORS.white} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </Animated.View>

      {/* Stats */}
      <Animated.View style={[styles.statsCard, { opacity: statsAnim }]}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={24} color={COLORS.primary} />
          <Text style={styles.statValue}>{filteredContacts.length}</Text>
          <Text style={styles.statLabel}>Contacts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="star" size={24} color={COLORS.secondary} />
          <Text style={[styles.statValue, { color: COLORS.secondary }]}>{memberCount}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="gift" size={24} color="#8B5CF6" />
          <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{user?.referral_code || '-'}</Text>
          <Text style={styles.statLabel}>Your Code</Text>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View style={[styles.searchContainer, { opacity: fadeAnim }]}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => {
            const invitable = filteredContacts.filter(c => getContactStatus(c) === 'invite');
            setSelectedContacts(new Set(invitable.map(c => c.id)));
          }}
        >
          <Text style={styles.quickActionText}>Select All</Text>
        </TouchableOpacity>
        {selectedContacts.size > 0 && (
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => setSelectedContacts(new Set())}
          >
            <Text style={styles.quickActionText}>Clear</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Contacts List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (
        <SectionList
          sections={sectionedContacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Contacts Found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery 
                  ? 'Try a different search term'
                  : 'No Ghana phone numbers in your contacts'
                }
              </Text>
            </View>
          }
        />
      )}

      {/* Alphabet Index */}
      <View style={styles.alphabetIndex}>
        {ALPHABET.map((letter) => (
          <TouchableOpacity
            key={letter}
            style={styles.alphabetLetter}
            onPress={() => {
              // Scroll to section - would need SectionList ref
            }}
          >
            <Text style={styles.alphabetLetterText}>{letter}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: SPACING.md,
  },
  backButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  backButtonGradient: {
    padding: 10,
    borderRadius: 12,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  inviteAllButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  inviteAllGradient: {
    padding: 10,
    borderRadius: 12,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  quickAction: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 16,
  },
  quickActionText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  contactItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  contactItemMember: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarMember: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  avatarPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  avatarText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
  },
  memberBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  contactPhone: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '500',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alphabetIndex: {
    position: 'absolute',
    right: 4,
    top: 220,
    bottom: 100,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  alphabetLetter: {
    padding: 2,
  },
  alphabetLetterText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    marginTop: SPACING.lg,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  permissionTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: SPACING.xl,
    textAlign: 'center',
  },
  permissionText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: SPACING.xl,
    borderRadius: 12,
    overflow: 'hidden',
  },
  permissionButtonGradient: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  backLink: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
  },
  backLinkText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
  },
});

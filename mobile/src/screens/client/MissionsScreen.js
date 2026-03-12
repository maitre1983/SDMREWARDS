import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

// Level icons mapping
const LEVEL_ICONS = {
  1: 'star-outline',
  2: 'trending-up',
  3: 'flash',
  4: 'ribbon',
  5: 'trophy'
};

export default function MissionsScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('missions');
  const [leaderboard, setLeaderboard] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await api.get('/api/growth/dashboard?language=en');
      setData(response.data);
      
      // Update streak
      await api.post('/api/growth/streak/update');
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await api.get('/api/growth/leaderboard/xp?limit=20');
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'leaderboard' && !leaderboard) {
      loadLeaderboard();
    }
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="trophy" size={48} color="#f59e0b" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const gam = data?.gamification || {};
  const missions = data?.missions || {};
  const level = gam.level || {};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Missions</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        }
      >
        {/* Level Card */}
        <View style={[styles.levelCard, { borderColor: level.color || '#f59e0b' }]}>
          <View style={styles.levelHeader}>
            <View style={[styles.levelIcon, { backgroundColor: `${level.color || '#f59e0b'}30` }]}>
              <Ionicons 
                name={LEVEL_ICONS[level.level] || 'star-outline'} 
                size={28} 
                color={level.color || '#f59e0b'} 
              />
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelName}>{level.name || 'SDM Starter'}</Text>
              <Text style={styles.levelNumber}>Level {level.level || 1}</Text>
            </View>
            <View style={styles.xpContainer}>
              <Text style={[styles.xpValue, { color: level.color || '#f59e0b' }]}>
                {gam.xp?.toLocaleString() || 0}
              </Text>
              <Text style={styles.xpLabel}>XP</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${level.progress || 0}%`, backgroundColor: level.color || '#f59e0b' }
                ]} 
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>{level.progress?.toFixed(0) || 0}%</Text>
              <Text style={styles.progressText}>
                {level.xp_to_next_level?.toLocaleString() || 0} XP to next
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="flame" size={20} color="#f97316" />
              <Text style={styles.statValue}>{gam.current_streak || 0}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="medal" size={20} color="#f59e0b" />
              <Text style={styles.statValue}>{gam.badges?.length || 0}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={styles.statValue}>{gam.missions_completed || 0}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {['missions', 'badges', 'leaderboard'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={tab === 'missions' ? 'flag' : tab === 'badges' ? 'medal' : 'podium'}
                size={16}
                color={activeTab === tab ? '#1e293b' : '#94a3b8'}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Missions Tab */}
        {activeTab === 'missions' && (
          <View style={styles.missionsContainer}>
            {/* Daily */}
            <View style={styles.missionSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time" size={18} color="#f59e0b" />
                <Text style={styles.sectionTitle}>Daily</Text>
              </View>
              {missions.daily?.map((mission) => (
                <MissionCard key={mission.id} mission={mission} />
              ))}
            </View>

            {/* Weekly */}
            <View style={styles.missionSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={18} color="#3b82f6" />
                <Text style={styles.sectionTitle}>Weekly</Text>
              </View>
              {missions.weekly?.map((mission) => (
                <MissionCard key={mission.id} mission={mission} />
              ))}
            </View>
          </View>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <View style={styles.badgesContainer}>
            {gam.badges?.length > 0 ? (
              <View style={styles.badgesGrid}>
                {gam.badges.map((badge, i) => (
                  <View key={i} style={styles.badgeItem}>
                    <View style={[styles.badgeIcon, { backgroundColor: `${badge.color}30` }]}>
                      <Ionicons name="medal" size={24} color={badge.color} />
                    </View>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                    <Text style={styles.badgeXp}>+{badge.xp_reward} XP</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="medal-outline" size={48} color="#475569" />
                <Text style={styles.emptyText}>Complete actions to earn badges</Text>
              </View>
            )}
          </View>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <View style={styles.leaderboardContainer}>
            {/* My Rank */}
            {data?.rank && (
              <View style={styles.myRankCard}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankNumber}>#{data.rank.rank}</Text>
                </View>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankLabel}>Your Rank</Text>
                  <Text style={styles.rankPercentile}>Top {data.rank.percentile?.toFixed(0)}%</Text>
                </View>
                <View style={styles.rankXp}>
                  <Text style={styles.rankXpValue}>{data.rank.xp?.toLocaleString()}</Text>
                  <Text style={styles.rankXpLabel}>XP</Text>
                </View>
              </View>
            )}

            {/* Leaderboard List */}
            {leaderboard?.leaderboard?.slice(0, 10).map((player, i) => (
              <View key={i} style={styles.leaderboardRow}>
                <View style={styles.leaderboardRank}>
                  {i < 3 ? (
                    <Ionicons 
                      name="medal" 
                      size={24} 
                      color={i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7f32'} 
                    />
                  ) : (
                    <Text style={styles.leaderboardRankText}>{i + 1}</Text>
                  )}
                </View>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName}>{player.name}</Text>
                  <Text style={styles.leaderboardLevel}>{player.level?.name}</Text>
                </View>
                <View style={styles.leaderboardXp}>
                  <Text style={styles.leaderboardXpValue}>{player.xp?.toLocaleString()}</Text>
                  <Text style={styles.leaderboardXpLabel}>XP</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Mission Card Component
function MissionCard({ mission }) {
  const progress = (mission.progress / mission.target) * 100;
  const isCompleted = mission.status === 'completed';

  return (
    <View style={[styles.missionCard, isCompleted && styles.missionCompleted]}>
      <View style={styles.missionHeader}>
        <View style={styles.missionTitleContainer}>
          <Text style={styles.missionName}>{mission.name}</Text>
          <Text style={styles.missionDesc}>{mission.description}</Text>
        </View>
        {isCompleted ? (
          <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
        ) : (
          <View style={styles.missionRewards}>
            <Text style={styles.missionXp}>+{mission.xp_reward} XP</Text>
            {mission.cashback_reward > 0 && (
              <Text style={styles.missionCashback}>+GHS {mission.cashback_reward}</Text>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.missionProgress}>
        <View style={styles.missionProgressBar}>
          <View 
            style={[
              styles.missionProgressFill, 
              { width: `${Math.min(progress, 100)}%` },
              isCompleted && { backgroundColor: '#22c55e' }
            ]} 
          />
        </View>
        <Text style={styles.missionProgressText}>
          {mission.progress}/{mission.target}
        </Text>
      </View>
    </View>
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
  levelCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelInfo: {
    flex: 1,
    marginLeft: 12,
  },
  levelName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  levelNumber: {
    color: '#94a3b8',
    fontSize: 14,
  },
  xpContainer: {
    alignItems: 'flex-end',
  },
  xpValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  xpLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressText: {
    color: '#64748b',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    minWidth: 80,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    gap: 4,
  },
  activeTab: {
    backgroundColor: '#f59e0b',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1e293b',
  },
  missionsContainer: {
    gap: 16,
  },
  missionSection: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  missionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  missionCompleted: {
    opacity: 0.6,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  missionTitleContainer: {
    flex: 1,
  },
  missionName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  missionDesc: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  missionRewards: {
    alignItems: 'flex-end',
  },
  missionXp: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
  },
  missionCashback: {
    color: '#22c55e',
    fontSize: 11,
  },
  missionProgress: {
    gap: 4,
  },
  missionProgressBar: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  missionProgressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  missionProgressText: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'right',
  },
  badgesContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
  },
  badgeXp: {
    color: '#f59e0b',
    fontSize: 10,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 12,
  },
  leaderboardContainer: {
    gap: 12,
  },
  myRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f59e0b40',
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f59e0b20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    color: '#f59e0b',
    fontSize: 18,
    fontWeight: '700',
  },
  rankInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rankLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rankPercentile: {
    color: '#94a3b8',
    fontSize: 13,
  },
  rankXp: {
    alignItems: 'flex-end',
  },
  rankXpValue: {
    color: '#f59e0b',
    fontSize: 20,
    fontWeight: '700',
  },
  rankXpLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
  },
  leaderboardRank: {
    width: 32,
    alignItems: 'center',
  },
  leaderboardRankText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leaderboardName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  leaderboardLevel: {
    color: '#64748b',
    fontSize: 12,
  },
  leaderboardXp: {
    alignItems: 'flex-end',
  },
  leaderboardXpValue: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '600',
  },
  leaderboardXpLabel: {
    color: '#64748b',
    fontSize: 10,
  },
});

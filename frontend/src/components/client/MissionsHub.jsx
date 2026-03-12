import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  Target,
  Trophy,
  Star,
  Flame,
  Award,
  Crown,
  Zap,
  TrendingUp,
  Gift,
  CheckCircle,
  Clock,
  ChevronRight,
  Loader2,
  Medal,
  Users,
  RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Level colors and icons mapping
const LEVEL_ICONS = {
  1: Star,
  2: TrendingUp,
  3: Zap,
  4: Crown,
  5: Award
};

const LEVEL_COLORS = {
  1: '#94a3b8',
  2: '#22c55e',
  3: '#3b82f6',
  4: '#a855f7',
  5: '#f59e0b'
};

export default function MissionsHub({ clientToken, language = 'en' }) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('missions');
  const [dashboardData, setDashboardData] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);

  const t = {
    en: {
      missions: 'Missions',
      badges: 'Badges',
      leaderboard: 'Leaderboard',
      level: 'Level',
      xp: 'XP',
      daily: 'Daily',
      weekly: 'Weekly',
      special: 'Special',
      progress: 'Progress',
      completed: 'Completed',
      reward: 'Reward',
      streak: 'Day Streak',
      rank: 'Your Rank',
      topPlayers: 'Top Players',
      loading: 'Loading...',
      noMissions: 'No active missions',
      earnBadge: 'Earn badges by completing actions',
      xpToNext: 'XP to next level'
    },
    fr: {
      missions: 'Missions',
      badges: 'Badges',
      leaderboard: 'Classement',
      level: 'Niveau',
      xp: 'XP',
      daily: 'Quotidien',
      weekly: 'Hebdo',
      special: 'Spécial',
      progress: 'Progression',
      completed: 'Complété',
      reward: 'Récompense',
      streak: 'Jours Consécutifs',
      rank: 'Votre Rang',
      topPlayers: 'Meilleurs Joueurs',
      loading: 'Chargement...',
      noMissions: 'Pas de missions actives',
      earnBadge: 'Gagnez des badges en accomplissant des actions',
      xpToNext: 'XP pour le niveau suivant'
    }
  };

  const text = t[language] || t.en;

  useEffect(() => {
    if (clientToken) {
      loadDashboard();
    }
  }, [clientToken]);

  const loadDashboard = async () => {
    if (!clientToken) return;
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/growth/dashboard?language=${language}`, {
        headers: { Authorization: `Bearer ${clientToken}` }
      });
      setDashboardData(response.data);
      
      // Update streak
      await axios.post(`${API_URL}/api/growth/streak/update`, {}, {
        headers: { Authorization: `Bearer ${clientToken}` }
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/growth/leaderboard/xp?limit=20`, {
        headers: { Authorization: `Bearer ${clientToken}` }
      });
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Trophy className="w-16 h-16 text-amber-400 animate-pulse" />
        <p className="text-slate-400">{text.loading}</p>
      </div>
    );
  }

  const gam = dashboardData?.gamification || {};
  const missions = dashboardData?.missions || {};
  const level = gam.level || {};
  const LevelIcon = LEVEL_ICONS[level.level] || Star;

  return (
    <div className="space-y-4 pb-4">
      {/* Level Card */}
      <div 
        className="rounded-xl p-4 border"
        style={{ 
          background: `linear-gradient(135deg, ${level.color || '#f59e0b'}20, transparent)`,
          borderColor: `${level.color || '#f59e0b'}40`
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${level.color || '#f59e0b'}30` }}
            >
              <LevelIcon className="w-7 h-7" style={{ color: level.color || '#f59e0b' }} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{level.name || 'SDM Starter'}</p>
              <p className="text-sm text-slate-400">{text.level} {level.level || 1}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: level.color || '#f59e0b' }}>
              {gam.xp?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-slate-500">{text.xp}</p>
          </div>
        </div>
        
        {/* XP Progress Bar */}
        <div className="space-y-1">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${level.progress || 0}%`,
                backgroundColor: level.color || '#f59e0b'
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>{level.progress?.toFixed(0) || 0}%</span>
            <span>{level.xp_to_next_level?.toLocaleString() || 0} {text.xpToNext}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{gam.current_streak || 0}</p>
            <p className="text-xs text-slate-500">{text.streak}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <Medal className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{gam.badges?.length || 0}</p>
            <p className="text-xs text-slate-500">{text.badges}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <Target className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{gam.missions_completed || 0}</p>
            <p className="text-xs text-slate-500">{text.completed}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['missions', 'badges', 'leaderboard'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-amber-500 text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {tab === 'missions' && <Target className="w-4 h-4 inline mr-1" />}
            {tab === 'badges' && <Medal className="w-4 h-4 inline mr-1" />}
            {tab === 'leaderboard' && <Trophy className="w-4 h-4 inline mr-1" />}
            {text[tab]}
          </button>
        ))}
      </div>

      {/* Missions Tab */}
      {activeTab === 'missions' && (
        <div className="space-y-4">
          {/* Daily Missions */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              {text.daily}
            </h3>
            <div className="space-y-3">
              {missions.daily?.length > 0 ? (
                missions.daily.map((mission) => (
                  <MissionCard key={mission.id} mission={mission} language={language} />
                ))
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">{text.noMissions}</p>
              )}
            </div>
          </div>

          {/* Weekly Missions */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              {text.weekly}
            </h3>
            <div className="space-y-3">
              {missions.weekly?.length > 0 ? (
                missions.weekly.map((mission) => (
                  <MissionCard key={mission.id} mission={mission} language={language} />
                ))
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">{text.noMissions}</p>
              )}
            </div>
          </div>

          {/* Special Missions */}
          {missions.special?.length > 0 && (
            <div className="bg-gradient-to-r from-purple-500/10 to-amber-500/10 rounded-xl border border-purple-500/30 p-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-purple-400" />
                {text.special}
              </h3>
              <div className="space-y-3">
                {missions.special.map((mission) => (
                  <MissionCard key={mission.id} mission={mission} language={language} special />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div className="grid grid-cols-3 gap-3">
            {gam.badges?.length > 0 ? (
              gam.badges.map((badge, i) => (
                <BadgeCard key={i} badge={badge} earned language={language} />
              ))
            ) : (
              <div className="col-span-3 text-center py-8">
                <Medal className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">{text.earnBadge}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          {/* My Rank */}
          {dashboardData?.rank && (
            <div className="bg-gradient-to-r from-amber-500/20 to-transparent rounded-xl border border-amber-500/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-amber-400">#{dashboardData.rank.rank}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{text.rank}</p>
                    <p className="text-sm text-slate-400">
                      Top {dashboardData.rank.percentile?.toFixed(0)}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-amber-400">{dashboardData.rank.xp?.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{text.xp}</p>
                </div>
              </div>
            </div>
          )}

          {/* Top Players */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              {text.topPlayers}
            </h3>
            <div className="space-y-2">
              {leaderboard?.leaderboard?.slice(0, 10).map((player, i) => (
                <LeaderboardRow key={i} player={player} rank={i + 1} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mission Card Component
function MissionCard({ mission, language, special = false }) {
  const progress = (mission.progress / mission.target) * 100;
  const isCompleted = mission.status === 'completed';

  return (
    <div className={`rounded-lg p-3 ${
      special ? 'bg-slate-900/50' : 'bg-slate-900/30'
    } ${isCompleted ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="text-white font-medium text-sm">{mission.name}</p>
          <p className="text-xs text-slate-500">{mission.description}</p>
        </div>
        {isCompleted ? (
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
        ) : (
          <div className="text-right flex-shrink-0 ml-2">
            <span className="text-amber-400 text-sm font-medium">+{mission.xp_reward} XP</span>
            {mission.cashback_reward > 0 && (
              <p className="text-xs text-green-400">+GHS {mission.cashback_reward}</p>
            )}
          </div>
        )}
      </div>
      
      {/* Progress */}
      <div className="space-y-1">
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              isCompleted ? 'bg-green-500' : special ? 'bg-purple-500' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 text-right">
          {mission.progress}/{mission.target}
        </p>
      </div>
    </div>
  );
}

// Badge Card Component
function BadgeCard({ badge, earned = false, language }) {
  return (
    <div className={`rounded-lg p-3 text-center ${
      earned ? 'bg-slate-900/50' : 'bg-slate-900/20 opacity-40'
    }`}>
      <div 
        className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
        style={{ backgroundColor: earned ? `${badge.color}30` : '#1e293b' }}
      >
        <Award 
          className="w-6 h-6" 
          style={{ color: earned ? badge.color : '#475569' }}
        />
      </div>
      <p className="text-white text-xs font-medium truncate">
        {language === 'fr' ? badge.name_fr : badge.name}
      </p>
      {earned && (
        <p className="text-amber-400 text-xs">+{badge.xp_reward} XP</p>
      )}
    </div>
  );
}

// Leaderboard Row Component
function LeaderboardRow({ player, rank }) {
  const isTopThree = rank <= 3;
  const medalColors = { 1: '#f59e0b', 2: '#94a3b8', 3: '#cd7f32' };

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${
      isTopThree ? 'bg-slate-900/50' : ''
    }`}>
      <div className="w-8 text-center">
        {isTopThree ? (
          <Medal className="w-6 h-6 mx-auto" style={{ color: medalColors[rank] }} />
        ) : (
          <span className="text-slate-500 font-medium">{rank}</span>
        )}
      </div>
      <div className="flex-1">
        <p className="text-white text-sm font-medium truncate">{player.name}</p>
        <p className="text-xs text-slate-500">{player.level?.name}</p>
      </div>
      <div className="text-right">
        <p className="text-amber-400 font-medium">{player.xp?.toLocaleString()}</p>
        <p className="text-xs text-slate-500">XP</p>
      </div>
    </div>
  );
}

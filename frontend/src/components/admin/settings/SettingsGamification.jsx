import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Trophy, Star, Zap, Crown, Award, Target,
  Save, Loader2, RefreshCw, Users, Download,
  BarChart3, TrendingUp, Medal, Gift, Flame,
  ChevronDown, ChevronUp, Calendar, RotateCcw,
  Eye, X, CheckCircle, Clock, Smartphone
} from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function SettingsGamification({ token }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('levels');
  const [showPreview, setShowPreview] = useState(false);
  
  // Configuration data
  const [levels, setLevels] = useState([]);
  const [missions, setMissions] = useState({ daily: [], weekly: [], special: [] });
  const [stats, setStats] = useState(null);
  
  // Expanded sections
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [expandedMission, setExpandedMission] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchGamificationConfig();
    fetchGamificationStats();
  }, []);

  const fetchGamificationConfig = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/api/admin/gamification/config`, { headers });
      setLevels(res.data.levels || []);
      setMissions(res.data.missions || { daily: [], weekly: [], special: [] });
    } catch (error) {
      console.error('Error fetching gamification config:', error);
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGamificationStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/gamification/stats`, { headers });
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching gamification stats:', error);
    }
  };

  const handleSaveLevels = async () => {
    try {
      setIsSaving(true);
      await axios.put(`${API_URL}/api/admin/gamification/levels`, { levels }, { headers });
      toast.success('Configuration des niveaux mise a jour');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMissions = async () => {
    try {
      setIsSaving(true);
      await axios.put(`${API_URL}/api/admin/gamification/missions`, { missions }, { headers });
      toast.success('Configuration des missions mise a jour');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetMissions = async (type) => {
    if (!window.confirm(`Reset all ${type} missions for all users?`)) return;
    try {
      setIsSaving(true);
      await axios.post(`${API_URL}/api/admin/gamification/reset-missions`, { type }, { headers });
      toast.success(`Missions ${type} reinitialisees`);
      fetchGamificationStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la reinitialisation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/gamification/export`, { 
        headers,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gamification_data_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Donnees exportees avec succes');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const updateLevel = (index, field, value) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setLevels(newLevels);
  };

  const updateMission = (type, index, field, value) => {
    const newMissions = { ...missions };
    newMissions[type][index] = { ...newMissions[type][index], [field]: value };
    setMissions(newMissions);
  };

  const getLevelIcon = (level) => {
    const icons = {
      1: Star,
      2: TrendingUp,
      3: Zap,
      4: Crown,
      5: Award
    };
    return icons[level] || Star;
  };

  const getLevelColor = (level) => {
    const colors = {
      1: '#94a3b8',
      2: '#22c55e',
      3: '#3b82f6',
      4: '#a855f7',
      5: '#f59e0b'
    };
    return colors[level] || '#94a3b8';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Trophy className="text-amber-400" size={28} />
            <div>
              <h2 className="text-xl font-bold text-white">Gamification System</h2>
              <p className="text-slate-400 text-sm">Configure levels, XP and missions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowPreview(true)}
              variant="outline"
              className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
              data-testid="preview-gamification-btn"
            >
              <Eye size={16} className="mr-2" /> Preview
            </Button>
            <Button
              onClick={handleExportData}
              variant="outline"
              className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
              data-testid="export-gamification-btn"
            >
              <Download size={16} className="mr-2" /> Export
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <Users className="text-blue-400 mx-auto mb-1" size={20} />
              <p className="text-2xl font-bold text-white">{stats.total_users || 0}</p>
              <p className="text-slate-400 text-xs">Active Users</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <Zap className="text-amber-400 mx-auto mb-1" size={20} />
              <p className="text-2xl font-bold text-white">{stats.total_xp || 0}</p>
              <p className="text-slate-400 text-xs">Total XP Distributed</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <Target className="text-emerald-400 mx-auto mb-1" size={20} />
              <p className="text-2xl font-bold text-white">{stats.missions_completed || 0}</p>
              <p className="text-slate-400 text-xs">Missions Completed</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <Medal className="text-purple-400 mx-auto mb-1" size={20} />
              <p className="text-2xl font-bold text-white">{stats.badges_awarded || 0}</p>
              <p className="text-slate-400 text-xs">Badges Awarded</p>
            </div>
          </div>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 bg-slate-800 p-2 rounded-xl">
        {[
          { id: 'levels', label: 'Levels & XP XP', icon: Trophy },
          { id: 'missions', label: 'Missions', icon: Target },
          { id: 'analytics', label: 'Statistics', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              activeSection === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:bg-slate-700'
            }`}
            data-testid={`gamification-tab-${tab.id}`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Levels Section */}
      {activeSection === 'levels' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Trophy className="text-amber-400" size={20} />
              Level Configuration
            </h3>
            <Button
              onClick={handleSaveLevels}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="save-levels-btn"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              <span className="ml-2">Save</span>
            </Button>
          </div>

          <p className="text-slate-400 text-sm mb-6">
            <strong>XP (Experience Points)</strong>: XP measures user progression on the platform. 
            Each action (transaction, mission, referral) earns XP that allows you to level up and unlock exclusive cashback bonuses.
          </p>

          <div className="space-y-4">
            {levels.map((level, index) => {
              const IconComponent = getLevelIcon(level.level);
              const isExpanded = expandedLevel === index;
              
              return (
                <div 
                  key={level.level}
                  className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden"
                >
                  {/* Level Header */}
                  <button
                    onClick={() => setExpandedLevel(isExpanded ? null : index)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${level.color}20`, color: level.color }}
                      >
                        <IconComponent size={20} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-white font-medium">{level.name}</h4>
                        <p className="text-slate-400 text-sm">
                          {level.min_xp} - {level.max_xp === null ? '+' : level.max_xp} XP | Bonus: +{level.cashback_bonus}%
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="text-slate-400" size={20} /> : <ChevronDown className="text-slate-400" size={20} />}
                  </button>

                  {/* Level Details */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-700 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-slate-300">Level Name</Label>
                          <Input
                            value={level.name}
                            onChange={(e) => updateLevel(index, 'name', e.target.value)}
                            className="mt-1 bg-slate-800 border-slate-600 text-white"
                            data-testid={`level-${level.level}-name`}
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300">Min XP</Label>
                          <Input
                            type="number"
                            value={level.min_xp}
                            onChange={(e) => updateLevel(index, 'min_xp', parseInt(e.target.value))}
                            className="mt-1 bg-slate-800 border-slate-600 text-white"
                            data-testid={`level-${level.level}-min-xp`}
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300">Max XP</Label>
                          <Input
                            type="number"
                            value={level.max_xp || ''}
                            onChange={(e) => updateLevel(index, 'max_xp', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="Unlimited"
                            className="mt-1 bg-slate-800 border-slate-600 text-white"
                            data-testid={`level-${level.level}-max-xp`}
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300">Cashback Bonus (%)</Label>
                          <Input
                            type="number"
                            value={level.cashback_bonus}
                            onChange={(e) => updateLevel(index, 'cashback_bonus', parseInt(e.target.value))}
                            className="mt-1 bg-slate-800 border-slate-600 text-white"
                            data-testid={`level-${level.level}-bonus`}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-300">Color</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={level.color}
                            onChange={(e) => updateLevel(index, 'color', e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <Input
                            value={level.color}
                            onChange={(e) => updateLevel(index, 'color', e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white w-32"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-300">Perks (comma separated)</Label>
                        <Input
                          value={level.perks?.join(', ') || ''}
                          onChange={(e) => updateLevel(index, 'perks', e.target.value.split(',').map(p => p.trim()))}
                          className="mt-1 bg-slate-800 border-slate-600 text-white"
                          placeholder="Avantage 1, Avantage 2, Avantage 3"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Missions Section */}
      {activeSection === 'missions' && (
        <div className="space-y-6">
          {/* Daily Missions */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="text-blue-400" size={20} />
                Daily Missions
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleResetMissions('daily')}
                  variant="outline"
                  size="sm"
                  className="border-amber-500 text-amber-400 hover:bg-amber-500/10"
                  disabled={isSaving}
                  data-testid="reset-daily-missions-btn"
                >
                  <RotateCcw size={14} className="mr-1" /> Reset
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {missions.daily?.map((mission, index) => (
                <div key={mission.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <Label className="text-slate-400 text-xs">Name</Label>
                      <Input
                        value={mission.name}
                        onChange={(e) => updateMission('daily', index, 'name', e.target.value)}
                        className="mt-1 bg-slate-800 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Target</Label>
                      <Input
                        type="number"
                        value={mission.target}
                        onChange={(e) => updateMission('daily', index, 'target', parseInt(e.target.value))}
                        className="mt-1 bg-slate-800 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">XP Reward</Label>
                      <Input
                        type="number"
                        value={mission.xp_reward}
                        onChange={(e) => updateMission('daily', index, 'xp_reward', parseInt(e.target.value))}
                        className="mt-1 bg-slate-800 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Cashback (GHS)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={mission.cashback_reward}
                        onChange={(e) => updateMission('daily', index, 'cashback_reward', parseFloat(e.target.value))}
                        className="mt-1 bg-slate-800 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Difficulty</Label>
                      <select
                        value={mission.difficulty}
                        onChange={(e) => updateMission('daily', index, 'difficulty', e.target.value)}
                        className="mt-1 w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-md p-2"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Missions */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Flame className="text-orange-400" size={20} />
                Weekly Missions
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleResetMissions('weekly')}
                  variant="outline"
                  size="sm"
                  className="border-amber-500 text-amber-400 hover:bg-amber-500/10"
                  disabled={isSaving}
                  data-testid="reset-weekly-missions-btn"
                >
                  <RotateCcw size={14} className="mr-1" /> Reset
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {missions.weekly?.map((mission, index) => (
                <div key={mission.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <Label className="text-slate-400 text-xs">Name</Label>
                      <Input
                        value={mission.name}
                        onChange={(e) => updateMission('weekly', index, 'name', e.target.value)}
                        className="mt-1 bg-slate-800 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Target</Label>
                      <Input
                        type="number"
                        value={mission.target}
                        onChange={(e) => updateMission('weekly', index, 'target', parseInt(e.target.value))}
                        className="mt-1 bg-slate-800 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">XP Reward</Label>
                      <Input
                        type="number"
                        value={mission.xp_reward}
                        onChange={(e) => updateMission('weekly', index, 'xp_reward', parseInt(e.target.value))}
                        className="mt-1 bg-slate-800 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Cashback (GHS)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={mission.cashback_reward}
                        onChange={(e) => updateMission('weekly', index, 'cashback_reward', parseFloat(e.target.value))}
                        className="mt-1 bg-slate-800 border-slate-600 text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Difficulty</Label>
                      <select
                        value={mission.difficulty}
                        onChange={(e) => updateMission('weekly', index, 'difficulty', e.target.value)}
                        className="mt-1 w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-md p-2"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveMissions}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="save-missions-btn"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              <span className="ml-2">Save Missions</span>
            </Button>
          </div>
        </div>
      )}

      {/* Analytics Section */}
      {activeSection === 'analytics' && stats && (
        <div className="space-y-6">
          {/* Users by Level */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Users className="text-blue-400" size={20} />
              Users Distribution by Level
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.users_by_level?.map((item) => (
                <div 
                  key={item.level}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center"
                  style={{ borderColor: `${item.color}50` }}
                >
                  <div 
                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    <Trophy size={24} />
                  </div>
                  <p className="text-2xl font-bold text-white">{item.count}</p>
                  <p className="text-slate-400 text-sm">{item.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Users */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Medal className="text-amber-400" size={20} />
              Top 10 Users by XP
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-slate-400 text-sm border-b border-slate-700">
                    <th className="text-left p-3">Rank</th>
                    <th className="text-left p-3">User</th>
                    <th className="text-right p-3">XP</th>
                    <th className="text-left p-3">Level</th>
                    <th className="text-right p-3">Missions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.top_users?.map((user, index) => (
                    <tr key={user.client_id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="p-3">
                        <span className={`font-bold ${
                          index === 0 ? 'text-amber-400' : 
                          index === 1 ? 'text-slate-300' : 
                          index === 2 ? 'text-orange-400' : 'text-slate-400'
                        }`}>
                          #{index + 1}
                        </span>
                      </td>
                      <td className="p-3 text-white">{user.name}</td>
                      <td className="p-3 text-right text-amber-400 font-bold">{user.xp?.toLocaleString()}</td>
                      <td className="p-3">
                        <span 
                          className="px-2 py-1 rounded-full text-xs"
                          style={{ backgroundColor: `${user.level_color}20`, color: user.level_color }}
                        >
                          {user.level_name}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-300">{user.missions_completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mission Completion Stats */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Target className="text-emerald-400" size={20} />
              Statistics de Completion des Missions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">Daily Missions</h4>
                <p className="text-3xl font-bold text-white">{stats.daily_completion_rate || 0}%</p>
                <p className="text-slate-400 text-sm">Completion rate</p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <h4 className="text-orange-400 font-medium mb-2">Weekly Missions</h4>
                <p className="text-3xl font-bold text-white">{stats.weekly_completion_rate || 0}%</p>
                <p className="text-slate-400 text-sm">Completion rate</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <h4 className="text-purple-400 font-medium mb-2">Special Missions</h4>
                <p className="text-3xl font-bold text-white">{stats.special_completion_rate || 0}%</p>
                <p className="text-slate-400 text-sm">Completion rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          levels={levels}
          missions={missions}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// ============== PREVIEW MODAL COMPONENT ==============
function PreviewModal({ levels, missions, onClose }) {
  const [previewTab, setPreviewTab] = useState('levels');
  const [previewXP, setPreviewXP] = useState(250);
  
  // Find current level based on XP
  const getCurrentLevel = (xp) => {
    for (const level of levels) {
      const maxXp = level.max_xp === null ? Unlimitedty : level.max_xp;
      if (xp >= level.min_xp && xp <= maxXp) {
        return level;
      }
    }
    return levels[0] || { name: 'Unknown', color: '#94a3b8', level: 1 };
  };

  const currentLevel = getCurrentLevel(previewXP);
  const nextLevel = levels.find(l => l.level === (currentLevel?.level || 0) + 1);
  
  // Calculate progress
  const calculateProgress = () => {
    if (!currentLevel || currentLevel.max_xp === null) return 100;
    const range = currentLevel.max_xp - currentLevel.min_xp;
    const current = previewXP - currentLevel.min_xp;
    return Math.min(100, (current / range) * 100);
  };

  const getLevelIcon = (level) => {
    const icons = { 1: Star, 2: TrendingUp, 3: Zap, 4: Crown, 5: Award };
    return icons[level] || Star;
  };

  const LevelIcon = getLevelIcon(currentLevel?.level);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-900/50 to-purple-900/50 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="text-cyan-400" size={24} />
            <div>
              <h2 className="text-white font-bold">Client Preview</h2>
              <p className="text-slate-400 text-xs">User view with your changes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Preview Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* XP Slider to test levels */}
          <div className="bg-slate-800 rounded-lg p-3 mb-4">
            <Label className="text-slate-400 text-xs mb-2 block">
              Test with different XP levels:
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="15000"
                value={previewXP}
                onChange={(e) => setPreviewXP(parseInt(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <span className="text-amber-400 font-bold min-w-[70px] text-right">
                {previewXP.toLocaleString()} XP
              </span>
            </div>
          </div>

          {/* Level Card Preview */}
          <div 
            className="rounded-xl p-4 border mb-4"
            style={{ 
              background: `linear-gradient(135deg, ${currentLevel?.color || '#f59e0b'}20, transparent)`,
              borderColor: `${currentLevel?.color || '#f59e0b'}40`
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${currentLevel?.color || '#f59e0b'}30` }}
                >
                  <LevelIcon className="w-7 h-7" style={{ color: currentLevel?.color || '#f59e0b' }} />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{currentLevel?.name || 'SDM Starter'}</p>
                  <p className="text-sm text-slate-400">Level {currentLevel?.level || 1}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: currentLevel?.color || '#f59e0b' }}>
                  {previewXP.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">XP</p>
              </div>
            </div>
            
            {/* XP Progress Bar */}
            <div className="space-y-1">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${calculateProgress()}%`,
                    backgroundColor: currentLevel?.color || '#f59e0b'
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{calculateProgress().toFixed(0)}%</span>
                <span>
                  {nextLevel ? `${(nextLevel.min_xp - previewXP).toLocaleString()} XP for ${nextLevel.name}` : 'Max level reached'}
                </span>
              </div>
            </div>

            {/* Bonus Display */}
            <div className="mt-3 flex items-center gap-2">
              <Gift className="text-green-400" size={16} />
              <span className="text-green-400 text-sm font-medium">
                Cashback Bonus: +{currentLevel?.cashback_bonus || 0}%
              </span>
            </div>

            {/* Perks */}
            {currentLevel?.perks?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {currentLevel.perks.map((perk, i) => (
                  <span key={i} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full">
                    {perk}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Preview Tabs */}
          <div className="flex gap-2 mb-4">
            {['levels', 'missions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setPreviewTab(tab)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  previewTab === tab
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {tab === 'levels' ? 'Levelx' : 'Missions'}
              </button>
            ))}
          </div>

          {/* Levels Preview */}
          {previewTab === 'levels' && (
            <div className="space-y-2">
              <h3 className="text-white font-medium mb-2">All Levels:</h3>
              {levels.map((level) => {
                const Icon = getLevelIcon(level.level);
                const isCurrent = level.level === currentLevel?.level;
                return (
                  <div
                    key={level.level}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      isCurrent 
                        ? 'bg-slate-800 border-2' 
                        : 'bg-slate-800/50'
                    }`}
                    style={{ borderColor: isCurrent ? level.color : 'transparent' }}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${level.color}30` }}
                    >
                      <Icon style={{ color: level.color }} size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{level.name}</p>
                      <p className="text-slate-400 text-xs">
                        {level.min_xp.toLocaleString()} - {level.max_xp ? level.max_xp.toLocaleString() : '+'} XP
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-green-400 text-sm font-medium">+{level.cashback_bonus}%</span>
                      {isCurrent && (
                        <p className="text-amber-400 text-xs">Current</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Missions Preview */}
          {previewTab === 'missions' && (
            <div className="space-y-4">
              {/* Daily Missions */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-3">
                <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Daily
                </h4>
                <div className="space-y-2">
                  {missions.daily?.map((mission, i) => (
                    <MissionPreviewCard key={i} mission={mission} />
                  ))}
                </div>
              </div>

              {/* Weekly Missions */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-3">
                <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  Weekly
                </h4>
                <div className="space-y-2">
                  {missions.weekly?.map((mission, i) => (
                    <MissionPreviewCard key={i} mission={mission} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mission Preview Card
function MissionPreviewCard({ mission }) {
  const fakeProgress = Math.floor(Math.random() * mission.target);
  const progressPercent = (fakeProgress / mission.target) * 100;
  
  return (
    <div className="bg-slate-900/50 rounded-lg p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="text-white font-medium text-sm">{mission.name}</p>
          <p className="text-xs text-slate-500">{mission.description || `Target: ${mission.target}`}</p>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <span className="text-amber-400 text-sm font-medium">+{mission.xp_reward} XP</span>
          {mission.cashback_reward > 0 && (
            <p className="text-xs text-green-400">+GHS {mission.cashback_reward}</p>
          )}
        </div>
      </div>
      
      {/* Progress */}
      <div className="space-y-1">
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
            mission.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
            mission.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {mission.difficulty === 'easy' ? 'Easy' : mission.difficulty === 'medium' ? 'Medium' : 'Hard'}
          </span>
          <span>{fakeProgress}/{mission.target}</span>
        </div>
      </div>
    </div>
  );
}

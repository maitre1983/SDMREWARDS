import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import {
  Bell,
  BellOff,
  Smartphone,
  Mail,
  MessageSquare,
  Shield,
  Store,
  Gift,
  Megaphone,
  Moon,
  Clock,
  Loader2,
  Save,
  CheckCircle,
  History
} from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function NotificationSettings({ clientToken, language = 'en' }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const t = {
    en: {
      title: 'Notification Settings',
      subtitle: 'Control how SDM REWARDS contacts you',
      channels: 'Notification Channels',
      push: 'Push Notifications',
      pushDesc: 'Instant alerts on your device',
      sms: 'SMS Messages',
      smsDesc: 'Text messages to your phone',
      email: 'Email',
      emailDesc: 'Updates to your email address',
      types: 'Notification Types',
      cashback: 'Cashback Alerts',
      cashbackDesc: 'When you earn cashback rewards',
      recommendations: 'Merchant Recommendations',
      recommendationsDesc: 'AI-powered suggestions for you',
      security: 'Security Alerts',
      securityDesc: 'Suspicious activity warnings',
      promotional: 'Promotional Offers',
      promotionalDesc: 'Special deals and offers',
      quietHours: 'Quiet Hours',
      quietHoursDesc: 'No notifications during these hours',
      from: 'From',
      to: 'To',
      save: 'Save Preferences',
      saved: 'Saved!',
      testNotification: 'Send Test',
      history: 'History',
      noHistory: 'No notifications yet'
    },
    fr: {
      title: 'Paramètres de Notification',
      subtitle: 'Contrôlez comment SDM REWARDS vous contacte',
      channels: 'Canaux de Notification',
      push: 'Notifications Push',
      pushDesc: 'Alertes instantanées sur votre appareil',
      sms: 'Messages SMS',
      smsDesc: 'Text messages to your phone',
      email: 'Email',
      emailDesc: 'Mises à jour par email',
      types: 'Types de Notification',
      cashback: 'Alertes Cashback',
      cashbackDesc: 'Quand vous gagnez des récompenses',
      recommendations: 'Recommandations Marchands',
      recommendationsDesc: 'Suggestions IA personnalisées',
      security: 'Alertes de Sécurité',
      securityDesc: 'Avertissements d\'activité suspecte',
      promotional: 'Offres Promotionnelles',
      promotionalDesc: 'Offres spéciales et promotions',
      quietHours: 'Heures de Silence',
      quietHoursDesc: 'Pas de notifications pendant ces heures',
      from: 'De',
      to: 'À',
      save: 'Sauvegarder',
      saved: 'Sauvegardé!',
      testNotification: 'Tester',
      history: 'Historique',
      noHistory: 'Pas encore de notifications'
    }
  };

  const text = t[language] || t.en;

  useEffect(() => {
    if (clientToken) {
      loadPreferences();
      loadHistory();
    }
  }, [clientToken]);

  const loadPreferences = async () => {
    if (!clientToken) return;
    try {
      const response = await axios.get(`${API_URL}/api/notifications/preferences`, {
        headers: { Authorization: `Bearer ${clientToken}` }
      });
      setPreferences(response.data.preferences);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/notifications/history?limit=10`, {
        headers: { Authorization: `Bearer ${clientToken}` }
      });
      setHistory(response.data.notifications || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      await axios.put(
        `${API_URL}/api/notifications/preferences`,
        preferences,
        { headers: { Authorization: `Bearer ${clientToken}` } }
      );
      toast.success(text.saved);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestNotification = async (channel) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/notifications/test`,
        { channel },
        { headers: { Authorization: `Bearer ${clientToken}` } }
      );
      if (response.data.success) {
        toast.success(`Test notification sent via ${channel}!`);
      } else {
        toast.error(`Failed: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('Failed to send test notification');
    }
  };

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/20 to-purple-500/20 rounded-xl p-4 border border-amber-500/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-purple-500 flex items-center justify-center">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{text.title}</h2>
            <p className="text-sm text-slate-400">{text.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Notification Channels */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-amber-400" />
          {text.channels}
        </h3>
        
        <div className="space-y-4">
          {/* Push */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">{text.push}</p>
                <p className="text-xs text-slate-500">{text.pushDesc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => sendTestNotification('push')}
              >
                {text.testNotification}
              </Button>
              <Switch
                checked={preferences?.push_enabled}
                onCheckedChange={(v) => updatePreference('push_enabled', v)}
              />
            </div>
          </div>

          {/* SMS */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">{text.sms}</p>
                <p className="text-xs text-slate-500">{text.smsDesc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => sendTestNotification('sms')}
              >
                {text.testNotification}
              </Button>
              <Switch
                checked={preferences?.sms_enabled}
                onCheckedChange={(v) => updatePreference('sms_enabled', v)}
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium">{text.email}</p>
                <p className="text-xs text-slate-500">{text.emailDesc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => sendTestNotification('email')}
              >
                {text.testNotification}
              </Button>
              <Switch
                checked={preferences?.email_enabled}
                onCheckedChange={(v) => updatePreference('email_enabled', v)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notification Types */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-400" />
          {text.types}
        </h3>
        
        <div className="space-y-4">
          {/* Cashback Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Gift className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-white text-sm">{text.cashback}</p>
                <p className="text-xs text-slate-500">{text.cashbackDesc}</p>
              </div>
            </div>
            <Switch
              checked={preferences?.cashback_alerts}
              onCheckedChange={(v) => updatePreference('cashback_alerts', v)}
            />
          </div>

          {/* Recommendations */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Store className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-white text-sm">{text.recommendations}</p>
                <p className="text-xs text-slate-500">{text.recommendationsDesc}</p>
              </div>
            </div>
            <Switch
              checked={preferences?.merchant_recommendations}
              onCheckedChange={(v) => updatePreference('merchant_recommendations', v)}
            />
          </div>

          {/* Security */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-white text-sm">{text.security}</p>
                <p className="text-xs text-slate-500">{text.securityDesc}</p>
              </div>
            </div>
            <Switch
              checked={preferences?.security_alerts}
              onCheckedChange={(v) => updatePreference('security_alerts', v)}
            />
          </div>

          {/* Promotional */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-white text-sm">{text.promotional}</p>
                <p className="text-xs text-slate-500">{text.promotionalDesc}</p>
              </div>
            </div>
            <Switch
              checked={preferences?.promotional}
              onCheckedChange={(v) => updatePreference('promotional', v)}
            />
          </div>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Moon className="w-5 h-5 text-amber-400" />
          {text.quietHours}
        </h3>
        <p className="text-xs text-slate-500 mb-4">{text.quietHoursDesc}</p>
        
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-1 block">{text.from}</label>
            <select
              value={preferences?.quiet_hours_start || 22}
              onChange={(e) => updatePreference('quiet_hours_start', parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-1 block">{text.to}</label>
            <select
              value={preferences?.quiet_hours_end || 8}
              onChange={(e) => updatePreference('quiet_hours_end', parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={savePreferences}
        disabled={isSaving}
        className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium"
      >
        {isSaving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Save className="w-5 h-5 mr-2" />
            {text.save}
          </>
        )}
      </Button>

      {/* Notification History */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full p-4 flex items-center justify-between text-white"
        >
          <span className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            {text.history}
          </span>
          <span className="text-slate-500 text-sm">
            {history.length} {language === 'fr' ? 'récents' : 'recent'}
          </span>
        </button>
        
        {showHistory && (
          <div className="border-t border-slate-700 p-4 space-y-3 max-h-60 overflow-y-auto">
            {history.length > 0 ? (
              history.map((notif, i) => (
                <div key={i} className="bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{notif.title}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.body}</p>
                    </div>
                    <span className="text-xs text-slate-600">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {notif.results?.map((r, j) => (
                      <span
                        key={j}
                        className={`text-xs px-2 py-0.5 rounded ${
                          r.success
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {r.channel}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-4">{text.noHistory}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

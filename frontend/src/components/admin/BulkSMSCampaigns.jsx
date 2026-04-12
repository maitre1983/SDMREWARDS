/**
 * BulkSMSCampaigns - Admin Component
 * ===================================
 * Advanced SMS campaign management with:
 * - Pre-defined templates for viral growth
 * - Personalization with {name}
 * - Automatic triggers (registration, inactivity, cashback)
 * - A/B testing support
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  MessageSquare, Users, Store, Send, Loader2, Copy, CheckCircle,
  Zap, Gift, TrendingUp, Target, UserPlus, ShoppingBag, Clock,
  Sparkles, Play, Pause, Settings, BarChart3, RefreshCw, AlertCircle
} from 'lucide-react';
import { API_URL } from '@/config/api';

// Pre-defined SMS Templates for Viral Growth
const SMS_TEMPLATES = {
  referral: {
    category: 'Referral Incentive',
    icon: Gift,
    color: 'emerald',
    templates: [
      {
        id: 'ref_1',
        name: 'Referral - Ultra Impact',
        message: 'Hi {name}! Earn while you invite! 💰 Get GHS 3 for every friend you bring to SDM REWARDS. Share your code now and grow your income daily 🚀',
        target: 'clients'
      },
      {
        id: 'ref_2',
        name: 'Referral - Direct',
        message: 'Hey {name}! Your network = your money 💸 Invite friends on SDM REWARDS and earn GHS 3 each. Start sharing now!',
        target: 'clients'
      }
    ]
  },
  merchant_recruit: {
    category: 'Merchant Recruitment',
    icon: Store,
    color: 'blue',
    templates: [
      {
        id: 'merch_1',
        name: 'Recruit Merchants',
        message: '{name}, bring businesses, earn more! 🏪 Invite shops, clinics, schools to join SDM REWARDS. They get customers, YOU earn rewards 💰',
        target: 'clients'
      }
    ]
  },
  user_education: {
    category: 'User Education',
    icon: Sparkles,
    color: 'purple',
    templates: [
      {
        id: 'edu_1',
        name: 'User Explanation',
        message: 'Hi {name}! With SDM REWARDS, you earn cashback on your daily spending 💳 Invite friends & earn GHS 3 per referral. Spend smart. Earn daily.',
        target: 'clients'
      },
      {
        id: 'edu_2',
        name: 'Mixed Powerful',
        message: '{name}, Shop. Earn. Invite. 💰 With SDM REWARDS: ✔ Cashback on purchases ✔ GHS 3 per referral ✔ More customers for businesses. Join the movement 🚀',
        target: 'both'
      }
    ]
  },
  merchant_education: {
    category: 'Merchant Education',
    icon: TrendingUp,
    color: 'amber',
    templates: [
      {
        id: 'merch_edu_1',
        name: 'Merchant Value Prop',
        message: 'Hi {name}! Grow your business with SDM REWARDS 🚀 Get new customers, increase sales, and pay NO risk. Customers pay you directly. You only reward loyalty.',
        target: 'merchants'
      }
    ]
  }
};

// Automation Triggers
const AUTOMATION_TRIGGERS = [
  {
    id: 'new_registration',
    name: 'New Registration',
    description: 'Send to users who registered in the last 24 hours',
    icon: UserPlus,
    filter: 'recent_signup'
  },
  {
    id: 'inactive_7days',
    name: 'Inactive 7 Days',
    description: 'Users with no activity for 7+ days',
    icon: Clock,
    filter: 'inactive_7'
  },
  {
    id: 'inactive_30days',
    name: 'Inactive 30 Days',
    description: 'Users with no activity for 30+ days',
    icon: AlertCircle,
    filter: 'inactive_30'
  },
  {
    id: 'received_cashback',
    name: 'Received Cashback',
    description: 'Users who received cashback recently',
    icon: Gift,
    filter: 'received_cashback'
  },
  {
    id: 'no_referrals',
    name: 'No Referrals Yet',
    description: 'Users who haven\'t referred anyone',
    icon: Users,
    filter: 'no_referrals'
  }
];

export default function BulkSMSCampaigns({ token }) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('templates'); // templates, custom, automation
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [targetGroup, setTargetGroup] = useState('clients');
  const [filter, setFilter] = useState('all');
  const [automationTrigger, setAutomationTrigger] = useState(null);
  const [previewCount, setPreviewCount] = useState(null);
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  const [abVariantB, setAbVariantB] = useState('');
  const [campaignStats, setCampaignStats] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  // Fetch recipient count preview
  const fetchPreviewCount = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/sms/preview-count`, {
        headers,
        params: { target: targetGroup, filter: automationTrigger || filter }
      });
      setPreviewCount(res.data.count);
    } catch (error) {
      console.error('Preview count error:', error);
    }
  }, [targetGroup, filter, automationTrigger, token]);

  useEffect(() => {
    fetchPreviewCount();
  }, [fetchPreviewCount]);

  // Fetch campaign stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/sms/stats`, { headers });
      setCampaignStats(res.data);
    } catch (error) {
      console.error('Stats error:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setCustomMessage(template.message);
    if (template.target === 'merchants') {
      setTargetGroup('merchants');
    } else if (template.target === 'clients') {
      setTargetGroup('clients');
    }
  };

  const handleCopyTemplate = (message) => {
    navigator.clipboard.writeText(message);
    toast.success('Template copied!');
  };

  const handleSendCampaign = async () => {
    const message = selectedTemplate ? selectedTemplate.message : customMessage;
    
    if (!message.trim()) {
      toast.error('Please enter or select a message');
      return;
    }

    setSending(true);
    try {
      const payload = {
        message: message.trim(),
        target: targetGroup,
        filter: automationTrigger || filter,
        personalize: true, // Always personalize with {name}
        ab_test: abTestEnabled ? {
          variant_a: message.trim(),
          variant_b: abVariantB.trim()
        } : null
      };

      const res = await axios.post(
        `${API_URL}/api/admin/sms/bulk-personalized`,
        payload,
        { headers }
      );

      toast.success(`Campaign sent! ${res.data.sent_count || previewCount} messages queued.`);
      setSelectedTemplate(null);
      setCustomMessage('');
      setAbVariantB('');
      setAbTestEnabled(false);
      fetchStats();
    } catch (error) {
      console.error('Send error:', error);
      toast.error(error.response?.data?.detail || 'Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    };
    return colors[color] || colors.emerald;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      {campaignStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase">Total Sent Today</p>
            <p className="text-2xl font-bold text-white">{campaignStats.sent_today || 0}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase">This Week</p>
            <p className="text-2xl font-bold text-emerald-400">{campaignStats.sent_week || 0}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase">Delivery Rate</p>
            <p className="text-2xl font-bold text-purple-400">{campaignStats.delivery_rate || '98'}%</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase">Credits Used</p>
            <p className="text-2xl font-bold text-amber-400">{campaignStats.credits_used || 0}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg">
        {[
          { id: 'templates', label: 'Templates', icon: MessageSquare },
          { id: 'custom', label: 'Custom Message', icon: Sparkles },
          { id: 'automation', label: 'Automation', icon: Zap }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {Object.entries(SMS_TEMPLATES).map(([key, category]) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-2">
                <category.icon className={`text-${category.color}-400`} size={20} />
                <h3 className="text-white font-semibold">{category.category}</h3>
              </div>
              <div className="grid gap-3">
                {category.templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? `${getColorClasses(category.color)} border-2`
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-white font-medium">{template.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            template.target === 'merchants' 
                              ? 'bg-blue-500/20 text-blue-400'
                              : template.target === 'both'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {template.target === 'merchants' ? 'Merchants' : 
                             template.target === 'both' ? 'Everyone' : 'Clients'}
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm">{template.message}</p>
                        <p className="text-slate-500 text-xs mt-2">
                          {template.message.length} characters
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyTemplate(template.message);
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Message Tab */}
      {activeTab === 'custom' && (
        <div className="space-y-4">
          <div>
            <Label className="text-slate-300">Custom Message</Label>
            <p className="text-slate-500 text-xs mb-2">
              Use {'{name}'} for personalization. Example: "Hi {'{name}'}, earn rewards today!"
            </p>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Enter your custom message..."
              className="bg-slate-700 border-slate-600 text-white min-h-[120px]"
            />
            <p className="text-slate-500 text-xs mt-1">{customMessage.length} characters</p>
          </div>

          {/* A/B Testing */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-purple-400" size={18} />
                <span className="text-white font-medium">A/B Testing</span>
              </div>
              <button
                onClick={() => setAbTestEnabled(!abTestEnabled)}
                className={`w-12 h-6 rounded-full transition-all ${
                  abTestEnabled ? 'bg-purple-600' : 'bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  abTestEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            {abTestEnabled && (
              <div>
                <Label className="text-slate-400 text-sm">Variant B Message</Label>
                <Textarea
                  value={abVariantB}
                  onChange={(e) => setAbVariantB(e.target.value)}
                  placeholder="Enter alternative message for A/B test..."
                  className="bg-slate-700 border-slate-600 text-white min-h-[80px] mt-2"
                />
                <p className="text-slate-500 text-xs mt-2">
                  50% of recipients will receive Variant A, 50% will receive Variant B
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Automation Tab */}
      {activeTab === 'automation' && (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">
            Select a trigger to automatically send messages based on user behavior
          </p>
          <div className="grid gap-3">
            {AUTOMATION_TRIGGERS.map((trigger) => (
              <button
                key={trigger.id}
                onClick={() => setAutomationTrigger(
                  automationTrigger === trigger.filter ? null : trigger.filter
                )}
                className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                  automationTrigger === trigger.filter
                    ? 'bg-amber-500/20 border-amber-500/50'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  automationTrigger === trigger.filter
                    ? 'bg-amber-500/30'
                    : 'bg-slate-700'
                }`}>
                  <trigger.icon className={
                    automationTrigger === trigger.filter ? 'text-amber-400' : 'text-slate-400'
                  } size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{trigger.name}</p>
                  <p className="text-slate-400 text-sm">{trigger.description}</p>
                </div>
                {automationTrigger === trigger.filter && (
                  <CheckCircle className="text-amber-400" size={20} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Target Selection */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <Label className="text-slate-300 mb-3 block">Target Audience</Label>
        <div className="flex gap-2">
          {[
            { id: 'clients', label: 'Clients', icon: Users },
            { id: 'merchants', label: 'Merchants', icon: Store },
            { id: 'both', label: 'Everyone', icon: Target }
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTargetGroup(opt.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
                targetGroup === opt.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <opt.icon size={18} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview & Send */}
      <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold">Campaign Preview</h3>
            <p className="text-slate-400 text-sm">
              {previewCount !== null ? (
                <>Will be sent to <span className="text-purple-400 font-bold">{previewCount}</span> recipients</>
              ) : (
                'Calculating recipients...'
              )}
            </p>
          </div>
          <button
            onClick={fetchPreviewCount}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Message Preview */}
        {(selectedTemplate || customMessage) && (
          <div className="bg-slate-800/80 rounded-lg p-4 mb-4">
            <p className="text-slate-500 text-xs mb-2">Preview (personalized):</p>
            <p className="text-white">
              {(selectedTemplate?.message || customMessage).replace('{name}', 'John')}
            </p>
          </div>
        )}

        <Button
          onClick={handleSendCampaign}
          disabled={sending || (!selectedTemplate && !customMessage.trim()) || previewCount === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 py-6"
        >
          {sending ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              Sending Campaign...
            </>
          ) : (
            <>
              <Send className="mr-2" size={20} />
              Send to {previewCount || 0} Recipients
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

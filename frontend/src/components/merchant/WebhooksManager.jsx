/**
 * Webhooks Management Component for Merchant Dashboard
 * Allows merchants to register and manage webhook endpoints
 */

import React, { useState, useEffect } from 'react';
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  ExternalLink,
  Bell,
  Zap,
  Globe,
  Lock,
  Activity
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { API_URL } from '@/config/api';

const WEBHOOK_EVENTS = [
  { id: 'points_earned', label: 'Points Earned', description: 'When a customer earns points' },
  { id: 'points_redeemed', label: 'Points Redeemed', description: 'When a customer redeems points' },
  { id: 'customer_registered', label: 'Customer Registered', description: 'When a new customer registers' },
  { id: 'transaction_completed', label: 'Transaction Completed', description: 'When any transaction is completed' },
];

export default function WebhooksManager() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWebhookData, setNewWebhookData] = useState(null);
  
  // Form state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [customSecret, setCustomSecret] = useState('');

  const token = localStorage.getItem('sdm_merchant_token');

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/integration/webhooks/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setWebhooks(data.webhooks);
      }
    } catch (err) {
      console.error('Failed to load webhooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async (e) => {
    e.preventDefault();
    
    if (!webhookUrl.trim()) {
      toast.error('Please enter a webhook URL');
      return;
    }
    
    if (selectedEvents.length === 0) {
      toast.error('Please select at least one event');
      return;
    }

    // Validate URL
    try {
      new URL(webhookUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setCreating(true);
    try {
      const body = {
        url: webhookUrl,
        events: selectedEvents,
        secret: customSecret || undefined
      };

      const res = await fetch(`${API_URL}/api/integration/webhooks/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (data.success) {
        setNewWebhookData(data);
        setShowCreateModal(false);
        fetchWebhooks();
        toast.success('Webhook registered successfully!');
        
        // Reset form
        setWebhookUrl('');
        setSelectedEvents([]);
        setCustomSecret('');
      } else {
        toast.error(data.detail || 'Failed to register webhook');
      }
    } catch (err) {
      toast.error('Error registering webhook');
    } finally {
      setCreating(false);
    }
  };

  const deleteWebhook = async (webhookId) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/integration/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Webhook deleted');
        fetchWebhooks();
      } else {
        toast.error(data.detail || 'Failed to delete webhook');
      }
    } catch (err) {
      toast.error('Error deleting webhook');
    }
  };

  const toggleEvent = (eventId) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    );
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Webhook className="text-purple-400" size={24} />
            Webhooks
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Receive real-time notifications for events
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWebhooks}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus size={16} className="mr-2" />
            Add Webhook
          </Button>
        </div>
      </div>

      {/* New Webhook Secret Display */}
      {newWebhookData && (
        <div className="bg-purple-900/30 border border-purple-500/50 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-purple-400 mt-1" size={24} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-purple-400">Webhook Registered!</h3>
              <p className="text-slate-300 text-sm mt-1">
                <AlertTriangle className="inline text-amber-400 mr-1" size={14} />
                Save the webhook secret below. It's used to verify webhook signatures.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewWebhookData(null)}
              className="text-slate-400"
            >
              Dismiss
            </Button>
          </div>
          
          <div className="bg-slate-900 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-xs text-slate-500">Webhook Secret</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-purple-400 font-mono text-sm break-all">
                  {newWebhookData.secret}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newWebhookData.secret)}
                  className="shrink-0 border-purple-500 text-purple-400"
                >
                  <Copy size={14} />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-2">Signature Verification Example:</p>
            <code className="text-xs text-slate-300 font-mono">
              signature = HMAC-SHA256(webhook_secret, request_body)
            </code>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin text-purple-400" size={32} />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="bg-slate-800/50 rounded-xl p-12 text-center">
          <Bell className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-white mb-2">No Webhooks Configured</h3>
          <p className="text-slate-400 mb-6">Set up webhooks to receive real-time event notifications</p>
          <Button onClick={() => setShowCreateModal(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus size={16} className="mr-2" />
            Add Your First Webhook
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div
              key={webhook.webhook_id}
              className={`bg-slate-800/50 border rounded-xl p-5 ${
                webhook.is_active ? 'border-slate-700' : 'border-red-500/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${webhook.is_active ? 'bg-purple-500/20' : 'bg-red-500/20'}`}>
                      <Globe className={webhook.is_active ? 'text-purple-400' : 'text-red-400'} size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-white font-mono text-sm truncate">{webhook.url}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(webhook.url)}
                          className="p-1 h-auto text-slate-400"
                        >
                          <Copy size={12} />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500">{webhook.webhook_id}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {webhook.events.map(event => (
                      <span
                        key={event}
                        className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Activity size={12} />
                      Created: {formatDate(webhook.created_at)}
                    </div>
                    {webhook.last_triggered && (
                      <div className="flex items-center gap-1">
                        <Zap size={12} />
                        Last triggered: {formatDate(webhook.last_triggered)}
                      </div>
                    )}
                    {webhook.failure_count > 0 && (
                      <div className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle size={12} />
                        {webhook.failure_count} failures
                      </div>
                    )}
                  </div>
                </div>
                
                {webhook.is_active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteWebhook(webhook.webhook_id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Webhook className="text-purple-400" size={24} />
                Add Webhook
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={createWebhook} className="space-y-5">
              <div>
                <Label className="text-slate-300">Webhook URL *</Label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/webhooks/sdm"
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white font-mono text-sm"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Must be a valid HTTPS URL</p>
              </div>

              <div>
                <Label className="text-slate-300">Events to Subscribe *</Label>
                <div className="mt-2 space-y-2">
                  {WEBHOOK_EVENTS.map(event => (
                    <div
                      key={event.id}
                      onClick={() => toggleEvent(event.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedEvents.includes(event.id)
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedEvents.includes(event.id)
                            ? 'bg-purple-500 border-purple-500'
                            : 'border-slate-500'
                        }`}>
                          {selectedEvents.includes(event.id) && (
                            <CheckCircle size={12} className="text-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{event.label}</p>
                          <p className="text-slate-400 text-xs">{event.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Custom Secret (optional)</Label>
                <Input
                  value={customSecret}
                  onChange={(e) => setCustomSecret(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Used for webhook signature verification</p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="text-blue-400 shrink-0 mt-0.5" size={18} />
                  <div className="text-sm">
                    <p className="text-blue-400 font-medium">Signature Verification</p>
                    <p className="text-slate-400 mt-1">
                      All webhook requests include a <code className="text-blue-300">X-SDM-Signature</code> header for verification.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="animate-spin mr-2" size={16} />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="mr-2" />
                      Register Webhook
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

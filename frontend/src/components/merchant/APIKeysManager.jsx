/**
 * API Keys Management Component for Merchant Dashboard
 * Allows merchants to create, view, rotate, and revoke API keys for POS integration
 */

import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  Eye, 
  EyeOff, 
  Shield, 
  Clock, 
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Code,
  Lock,
  RotateCw,
  Globe,
  Server
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { API_URL } from '@/config/api';

export default function APIKeysManager() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(null);
  const [newKeyData, setNewKeyData] = useState(null);
  const [showKey, setShowKey] = useState({});
  
  // Form state
  const [keyName, setKeyName] = useState('');
  const [keyDescription, setKeyDescription] = useState('');
  const [allowedIPs, setAllowedIPs] = useState('');
  const [rateLimit, setRateLimit] = useState(100);
  const [gracePeriodDays, setGracePeriodDays] = useState(7);

  const token = localStorage.getItem('sdm_merchant_token');

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch(`${API_URL}/api/integration/keys/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setKeys(data.keys);
      }
    } catch (err) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const createKey = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setCreating(true);
    try {
      const body = {
        name: keyName,
        description: keyDescription || undefined,
        rate_limit: rateLimit,
        allowed_ips: allowedIPs ? allowedIPs.split(',').map(ip => ip.trim()).filter(Boolean) : undefined
      };

      const res = await fetch(`${API_URL}/api/integration/keys/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (data.api_key) {
        setNewKeyData(data);
        setShowCreateModal(false);
        fetchKeys();
        toast.success('API key created successfully!');
        
        // Reset form
        setKeyName('');
        setKeyDescription('');
        setAllowedIPs('');
        setRateLimit(100);
      } else {
        toast.error(data.detail || 'Failed to create API key');
      }
    } catch (err) {
      toast.error('Error creating API key');
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/integration/keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        toast.success('API key revoked');
        fetchKeys();
      } else {
        toast.error(data.detail || 'Failed to revoke key');
      }
    } catch (err) {
      toast.error('Error revoking API key');
    }
  };

  const rotateKey = async (e) => {
    e.preventDefault();
    if (!rotatingKey) return;

    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/integration/keys/rotate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key_id: rotatingKey.key_id,
          grace_period_days: gracePeriodDays
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setNewKeyData({
          ...data,
          api_key: data.new_api_key,
          key_id: data.new_key_id,
          name: rotatingKey.name,
          isRotation: true,
          oldKeyId: data.old_key_id,
          gracePeriodEnd: data.grace_period_end
        });
        setShowRotateModal(false);
        setRotatingKey(null);
        setGracePeriodDays(7);
        fetchKeys();
        toast.success('API key rotated successfully!');
      } else {
        toast.error(data.detail || 'Failed to rotate API key');
      }
    } catch (err) {
      toast.error('Error rotating API key');
    } finally {
      setCreating(false);
    }
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
            <Key className="text-emerald-400" size={24} />
            API Keys
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Manage API keys for POS and third-party integrations
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchKeys}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus size={16} className="mr-2" />
            Create API Key
          </Button>
        </div>
      </div>

      {/* New Key Display (shown once after creation or rotation) */}
      {newKeyData && (
        <div className={`border rounded-xl p-6 space-y-4 ${
          newKeyData.isRotation 
            ? 'bg-blue-900/30 border-blue-500/50' 
            : 'bg-emerald-900/30 border-emerald-500/50'
        }`}>
          <div className="flex items-start gap-3">
            <CheckCircle className={newKeyData.isRotation ? 'text-blue-400 mt-1' : 'text-emerald-400 mt-1'} size={24} />
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${newKeyData.isRotation ? 'text-blue-400' : 'text-emerald-400'}`}>
                {newKeyData.isRotation ? 'API Key Rotated Successfully!' : 'API Key Created Successfully!'}
              </h3>
              <p className="text-slate-300 text-sm mt-1">
                <AlertTriangle className="inline text-amber-400 mr-1" size={14} />
                This is the only time the full API key will be shown. Copy and store it securely!
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewKeyData(null)}
              className="text-slate-400"
            >
              Dismiss
            </Button>
          </div>
          
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 overflow-x-auto">
                <span className={newKeyData.isRotation ? 'text-blue-400' : 'text-emerald-400'}>
                  {newKeyData.api_key}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(newKeyData.api_key)}
                className={`shrink-0 ${
                  newKeyData.isRotation 
                    ? 'border-blue-500 text-blue-400 hover:bg-blue-500/20' 
                    : 'border-emerald-500 text-emerald-400 hover:bg-emerald-500/20'
                }`}
              >
                <Copy size={14} className="mr-2" />
                Copy
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Key ID:</span>
              <span className="text-white ml-2">{newKeyData.key_id}</span>
            </div>
            <div>
              <span className="text-slate-400">Name:</span>
              <span className="text-white ml-2">{newKeyData.name}</span>
            </div>
            {newKeyData.isRotation && (
              <>
                <div>
                  <span className="text-slate-400">Old Key ID:</span>
                  <span className="text-white ml-2">{newKeyData.oldKeyId}</span>
                </div>
                <div>
                  <span className="text-slate-400">Grace Period Ends:</span>
                  <span className="text-amber-400 ml-2">{formatDate(newKeyData.gracePeriodEnd)}</span>
                </div>
              </>
            )}
          </div>
          
          {newKeyData.isRotation && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
              <p className="text-amber-400 flex items-center gap-2">
                <Clock size={14} />
                <span>
                  <strong>Important:</strong> The old key will remain active until {formatDate(newKeyData.gracePeriodEnd)}. 
                  Update your POS system before then!
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* API Keys List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin text-emerald-400" size={32} />
        </div>
      ) : keys.length === 0 ? (
        <div className="bg-slate-800/50 rounded-xl p-12 text-center">
          <Key className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-white mb-2">No API Keys Yet</h3>
          <p className="text-slate-400 mb-6">Create your first API key to integrate with POS systems</p>
          <Button onClick={() => setShowCreateModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus size={16} className="mr-2" />
            Create Your First API Key
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {keys.map((key) => (
            <div
              key={key.key_id}
              className={`bg-slate-800/50 border rounded-xl p-5 ${
                key.is_active ? 'border-slate-700' : 'border-red-500/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${key.is_active ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                      <Key className={key.is_active ? 'text-emerald-400' : 'text-red-400'} size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{key.name}</h3>
                      <p className="text-xs text-slate-500">{key.key_id}</p>
                    </div>
                    {!key.is_active && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                        Revoked
                      </span>
                    )}
                  </div>
                  
                  {key.description && (
                    <p className="text-sm text-slate-400">{key.description}</p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-1.5 bg-slate-900 rounded text-sm text-slate-300 font-mono">
                      {key.key_prefix}
                    </code>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      Created: {formatDate(key.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity size={12} />
                      Last used: {formatDate(key.last_used_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield size={12} />
                      Rate limit: {key.rate_limit}/min
                    </div>
                    {key.request_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Code size={12} />
                        {key.request_count.toLocaleString()} requests
                      </div>
                    )}
                  </div>
                  
                  {key.allowed_ips && key.allowed_ips.length > 0 ? (
                    <div className="flex items-center gap-2 text-xs bg-amber-500/10 px-2 py-1 rounded-lg w-fit">
                      <Lock size={12} className="text-amber-400" />
                      <span className="text-amber-400 font-medium">IP Restricted:</span>
                      <span className="text-slate-300">{key.allowed_ips.join(', ')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Globe size={12} />
                      <span>Accessible from any IP</span>
                    </div>
                  )}
                  
                  {/* Show if key is rotated and has grace period */}
                  {key.rotated_to && (
                    <div className="flex items-center gap-2 text-xs bg-blue-500/10 px-2 py-1 rounded-lg w-fit">
                      <RotateCw size={12} className="text-blue-400" />
                      <span className="text-blue-400">Rotated → {key.rotated_to}</span>
                      {key.grace_period_end && (
                        <span className="text-slate-400">
                          (expires {formatDate(key.grace_period_end)})
                        </span>
                      )}
                    </div>
                  )}
                  {key.rotated_from && (
                    <div className="flex items-center gap-2 text-xs bg-emerald-500/10 px-2 py-1 rounded-lg w-fit">
                      <CheckCircle size={12} className="text-emerald-400" />
                      <span className="text-emerald-400">New key (rotated from {key.rotated_from})</span>
                    </div>
                  )}
                </div>
                
                {key.is_active && (
                  <div className="flex flex-col gap-2">
                    {!key.rotated_to && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRotatingKey(key);
                          setShowRotateModal(true);
                        }}
                        className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                      >
                        <RotateCw size={14} className="mr-2" />
                        Rotate
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeKey(key.key_id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} className="mr-2" />
                      Revoke
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documentation Link */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Code className="text-blue-400" size={20} />
            </div>
            <div>
              <h3 className="font-medium text-white">API Documentation</h3>
              <p className="text-sm text-slate-400">Learn how to integrate with your POS system</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`${API_URL}/docs`, '_blank')}
            className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
          >
            <ExternalLink size={14} className="mr-2" />
            View Docs
          </Button>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Key className="text-emerald-400" size={24} />
                Create API Key
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

            <form onSubmit={createKey} className="space-y-5">
              <div>
                <Label className="text-slate-300">Key Name *</Label>
                <Input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Main POS System"
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <Label className="text-slate-300">Description</Label>
                <Input
                  value={keyDescription}
                  onChange={(e) => setKeyDescription(e.target.value)}
                  placeholder="e.g., API key for store checkout"
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div>
                <Label className="text-slate-300">Rate Limit (requests/minute)</Label>
                <Input
                  type="number"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(parseInt(e.target.value) || 100)}
                  min={10}
                  max={1000}
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-500 mt-1">Default: 100 requests per minute</p>
              </div>

              <div>
                <Label className="text-slate-300">IP Whitelist (optional)</Label>
                <Input
                  value={allowedIPs}
                  onChange={(e) => setAllowedIPs(e.target.value)}
                  placeholder="e.g., 192.168.1.1, 10.0.0.1"
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-500 mt-1">Comma-separated IPs. Leave empty to allow all.</p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                  <div className="text-sm">
                    <p className="text-amber-400 font-medium">Security Notice</p>
                    <p className="text-slate-400 mt-1">
                      The API key will only be shown once after creation. Store it securely and never share it publicly.
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
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="animate-spin mr-2" size={16} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="mr-2" />
                      Create Key
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rotate Key Modal */}
      {showRotateModal && rotatingKey && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <RotateCw className="text-blue-400" size={24} />
                Rotate API Key
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowRotateModal(false);
                  setRotatingKey(null);
                }}
                className="text-slate-400"
              >
                ✕
              </Button>
            </div>

            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Key className="text-slate-400" size={20} />
                <div>
                  <p className="font-medium text-white">{rotatingKey.name}</p>
                  <p className="text-xs text-slate-500">{rotatingKey.key_prefix}...</p>
                </div>
              </div>
            </div>

            <form onSubmit={rotateKey} className="space-y-5">
              <div>
                <Label className="text-slate-300">Grace Period (days)</Label>
                <Input
                  type="number"
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(Math.min(30, Math.max(0, parseInt(e.target.value) || 0)))}
                  min={0}
                  max={30}
                  className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-500 mt-1">
                  During this period, both old and new keys will work. Max: 30 days.
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Server className="text-blue-400 shrink-0 mt-0.5" size={18} />
                  <div className="text-sm">
                    <p className="text-blue-400 font-medium">How Key Rotation Works</p>
                    <ul className="text-slate-400 mt-1 space-y-1 list-disc list-inside">
                      <li>A new API key will be generated</li>
                      <li>Old key remains active during grace period</li>
                      <li>Update your POS system with the new key</li>
                      <li>Old key auto-expires after grace period</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRotateModal(false);
                    setRotatingKey(null);
                  }}
                  className="flex-1 border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="animate-spin mr-2" size={16} />
                      Rotating...
                    </>
                  ) : (
                    <>
                      <RotateCw size={16} className="mr-2" />
                      Rotate Key
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

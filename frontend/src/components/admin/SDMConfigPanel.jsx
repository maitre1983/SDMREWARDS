import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, Loader2, Users, CreditCard, 
  TrendingUp, DollarSign, Award, RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SDMConfigPanel({ token }) {
  const [config, setConfig] = useState(null);
  const [stats, setStats] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [cardTypes, setCardTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [configRes, statsRes, membershipsRes, cardTypesRes] = await Promise.all([
        axios.get(`${API_URL}/api/sdm/admin/config`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/sdm-stats`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/memberships?limit=50`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/card-types`, { headers })
      ]);
      setConfig(configRes.data);
      setStats(statsRes.data);
      setMemberships(membershipsRes.data);
      setCardTypes(cardTypesRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load SDM data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await axios.put(`${API_URL}/api/sdm/admin/config`, config, { headers });
      toast.success('Configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sdm-config-panel">
      {/* Sub Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'config', label: 'Configuration', icon: Settings },
          { id: 'memberships', label: 'Memberships', icon: CreditCard },
          { id: 'card-types', label: 'Card Types', icon: Award },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeSubTab === tab.id 
                ? 'bg-white shadow text-blue-600' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSubTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">SDM Platform Statistics</h3>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
              <RefreshCw size={16} />
              Refresh
            </Button>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={stats.total_users} color="blue" />
            <StatCard icon={CreditCard} label="Active Memberships" value={stats.active_memberships} color="emerald" />
            <StatCard icon={TrendingUp} label="Total Transactions" value={stats.total_transactions} color="violet" />
            <StatCard icon={DollarSign} label="Membership Revenue" value={`GHS ${stats.total_membership_revenue}`} color="amber" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={DollarSign} label="Total Cashback Given" value={`GHS ${stats.total_cashback_given}`} color="cyan" />
            <StatCard icon={DollarSign} label="Commission Earned" value={`GHS ${stats.total_commission_earned}`} color="green" />
            <StatCard icon={DollarSign} label="Referral Bonuses Paid" value={`GHS ${stats.total_referral_bonuses}`} color="pink" />
          </div>

          {/* Users by Level */}
          {stats.users_by_level && Object.keys(stats.users_by_level).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-semibold text-slate-900 mb-4">Users by Referral Level</h4>
              <div className="flex gap-6">
                {Object.entries(stats.users_by_level).map(([level, count]) => (
                  <div key={level} className="text-center">
                    <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                      level === 'gold' ? 'bg-amber-100 text-amber-600' :
                      level === 'silver' ? 'bg-slate-200 text-slate-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      <Award size={20} />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                    <p className="text-xs text-slate-500 capitalize">{level}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Configuration */}
      {activeSubTab === 'config' && config && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Platform Configuration</h3>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Membership Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-700 border-b pb-2">Membership Settings</h4>
              
              <div>
                <label className="block text-sm text-slate-600 mb-1">Default Card Price (GHS)</label>
                <Input
                  type="number"
                  value={config.membership_card_price}
                  onChange={(e) => updateConfig('membership_card_price', parseFloat(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-600 mb-1">Membership Validity (days)</label>
                <Input
                  type="number"
                  value={config.membership_validity_days}
                  onChange={(e) => updateConfig('membership_validity_days', parseInt(e.target.value))}
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-600 mb-1">Welcome Bonus (GHS)</label>
                <Input
                  type="number"
                  value={config.welcome_bonus}
                  onChange={(e) => updateConfig('welcome_bonus', parseFloat(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="require_membership"
                  checked={config.require_membership_for_referral}
                  onChange={(e) => updateConfig('require_membership_for_referral', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <label htmlFor="require_membership" className="text-sm text-slate-600">
                  Require membership to receive referral bonus
                </label>
              </div>
            </div>

            {/* Referral Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-700 border-b pb-2">Referral Bonuses</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Bronze Bonus (GHS)</label>
                  <Input
                    type="number"
                    value={config.referral_bonus_bronze}
                    onChange={(e) => updateConfig('referral_bonus_bronze', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Bronze Min Referrals</label>
                  <Input
                    type="number"
                    value={config.bronze_min_referrals}
                    onChange={(e) => updateConfig('bronze_min_referrals', parseInt(e.target.value))}
                    min="0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Silver Bonus (GHS)</label>
                  <Input
                    type="number"
                    value={config.referral_bonus_silver}
                    onChange={(e) => updateConfig('referral_bonus_silver', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Silver Min Referrals</label>
                  <Input
                    type="number"
                    value={config.silver_min_referrals}
                    onChange={(e) => updateConfig('silver_min_referrals', parseInt(e.target.value))}
                    min="0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Gold Bonus (GHS)</label>
                  <Input
                    type="number"
                    value={config.referral_bonus_gold}
                    onChange={(e) => updateConfig('referral_bonus_gold', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Gold Min Referrals</label>
                  <Input
                    type="number"
                    value={config.gold_min_referrals}
                    onChange={(e) => updateConfig('gold_min_referrals', parseInt(e.target.value))}
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t flex justify-end">
            <Button 
              onClick={handleSaveConfig} 
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save Configuration
            </Button>
          </div>
        </div>
      )}

      {/* Memberships */}
      {activeSubTab === 'memberships' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Recent Memberships</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Card Number</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">User</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Merchant</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Card Type</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Price</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Purchased</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {memberships.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No memberships yet
                    </td>
                  </tr>
                ) : (
                  memberships.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{m.card_number}</td>
                      <td className="px-4 py-3">{m.user_phone}</td>
                      <td className="px-4 py-3">{m.merchant_name}</td>
                      <td className="px-4 py-3">{m.card_type_name}</td>
                      <td className="px-4 py-3">GHS {m.price_paid}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          m.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          m.status === 'expired' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{new Date(m.purchased_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card Types */}
      {activeSubTab === 'card-types' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Merchant Card Types</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Merchant</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Price</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Validity</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Referral Bonus</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Welcome Bonus</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cardTypes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No card types created yet
                    </td>
                  </tr>
                ) : (
                  cardTypes.map((ct) => (
                    <tr key={ct.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{ct.name}</td>
                      <td className="px-4 py-3">{ct.merchant_name}</td>
                      <td className="px-4 py-3">GHS {ct.price}</td>
                      <td className="px-4 py-3">{ct.validity_days} days</td>
                      <td className="px-4 py-3">GHS {ct.referral_bonus}</td>
                      <td className="px-4 py-3">GHS {ct.welcome_bonus}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          ct.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {ct.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    violet: 'bg-violet-100 text-violet-600',
    amber: 'bg-amber-100 text-amber-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    green: 'bg-green-100 text-green-600',
    pink: 'bg-pink-100 text-pink-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon size={20} />
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

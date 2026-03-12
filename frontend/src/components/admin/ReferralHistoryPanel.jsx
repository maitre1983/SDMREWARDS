import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserPlus, DollarSign, Clock, CheckCircle, Search, Filter, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function ReferralHistoryPanel({ token }) {
  const [referralData, setReferralData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('completed'); // 'completed' or 'pending'

  const headers = { Authorization: `Bearer ${token}` };

  const fetchReferralHistory = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/sdm/admin/referrals?period=${period}&limit=200`, { headers });
      setReferralData(response.data);
    } catch (error) {
      console.error('Failed to fetch referral history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralHistory();
  }, [period]);

  const filteredCompleted = referralData?.completed_referrals?.filter(ref => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      ref.referrer?.name?.toLowerCase().includes(search) ||
      ref.referrer?.phone?.includes(search) ||
      ref.referred?.name?.toLowerCase().includes(search) ||
      ref.referred?.phone?.includes(search)
    );
  }) || [];

  const filteredPending = referralData?.pending_referrals?.filter(ref => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      ref.referrer?.name?.toLowerCase().includes(search) ||
      ref.referrer?.phone?.includes(search) ||
      ref.referred?.name?.toLowerCase().includes(search) ||
      ref.referred?.phone?.includes(search)
    );
  }) || [];

  if (isLoading && !referralData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Referral History</h2>
          <p className="text-sm text-slate-500">Track who referred who and bonus payments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{referralData?.stats?.total_completed_referrals || 0}</p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{referralData?.stats?.total_pending_referrals || 0}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <DollarSign size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">GHS {(referralData?.stats?.total_bonus_paid || 0).toFixed(2)}</p>
              <p className="text-xs text-slate-500">Bonus Paid</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <UserPlus size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                GHS {referralData?.stats?.referrer_bonus || 3} / GHS {referralData?.stats?.welcome_bonus || 1}
              </p>
              <p className="text-xs text-slate-500">Referrer / New User</p>
            </div>
          </div>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex flex-wrap gap-2">
        {['all', 'day', 'week', 'month', 'year'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === p 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {p === 'all' ? 'All Time' : p === 'day' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
          </button>
        ))}
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeView === 'completed' ? 'default' : 'outline'}
            onClick={() => setActiveView('completed')}
            className="gap-2"
          >
            <CheckCircle size={16} />
            Completed ({filteredCompleted.length})
          </Button>
          <Button
            variant={activeView === 'pending' ? 'default' : 'outline'}
            onClick={() => setActiveView('pending')}
            className="gap-2"
          >
            <Clock size={16} />
            Pending ({filteredPending.length})
          </Button>
        </div>
      </div>

      {/* Referral Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Referrer</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Referred</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                {activeView === 'completed' && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Bonus</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeView === 'completed' ? (
                filteredCompleted.length > 0 ? (
                  filteredCompleted.map((ref, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users size={14} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{ref.referrer?.name || 'N/A'}</p>
                            <p className="text-xs text-slate-500">{ref.referrer?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ArrowRight size={16} className="text-slate-400 mx-auto" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <UserPlus size={14} className="text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{ref.referred?.name || 'N/A'}</p>
                            <p className="text-xs text-slate-500">{ref.referred?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(ref.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-emerald-600">
                          +GHS {ref.bonus_amount}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No completed referrals found
                    </td>
                  </tr>
                )
              ) : (
                filteredPending.length > 0 ? (
                  filteredPending.map((ref, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users size={14} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{ref.referrer?.name || 'N/A'}</p>
                            <p className="text-xs text-slate-500">{ref.referrer?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ArrowRight size={16} className="text-slate-400 mx-auto" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <UserPlus size={14} className="text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{ref.referred?.name || 'N/A'}</p>
                            <p className="text-xs text-slate-500">{ref.referred?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">
                          Pending Card
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(ref.registered_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No pending referrals found
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

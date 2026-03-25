/**
 * MerchantReferralLeaderboard - Admin Component
 * ==============================================
 * Displays merchant referral leaderboard for admin dashboard.
 * Shows top recruiting merchants with detailed stats.
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Trophy,
  Medal,
  Crown,
  Users,
  TrendingUp,
  RefreshCw,
  Loader2,
  Store,
  DollarSign,
  Calendar,
  Download
} from 'lucide-react';
import { Button } from '../ui/button';
import { API_URL } from '../../config/api';

export default function MerchantReferralLeaderboard({ token }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/admin/merchant-referral-leaderboard?limit=50`, { headers });
      setData(res.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const formatCurrency = (amount) => `GHS ${(amount || 0).toFixed(2)}`;

  const exportToCSV = () => {
    if (!data?.all_data) return;
    
    const headers = ['Rank', 'Merchant', 'Phone', 'Total Referrals', 'This Month', 'Total Earned', 'Status'];
    const rows = data.all_data.map(m => [
      m.rank,
      m.business_name,
      m.phone || '',
      m.referral_count,
      m.referrals_this_month,
      m.total_earned,
      m.status
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merchant_referral_leaderboard_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
        <Trophy className="text-slate-600 mx-auto mb-3" size={48} />
        <p className="text-slate-400">Unable to load leaderboard</p>
        <Button onClick={fetchLeaderboard} variant="outline" className="mt-4">
          <RefreshCw size={16} className="mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const displayData = showAll ? data.all_data : data.leaderboard;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 border-b border-slate-700 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <Trophy className="text-amber-400" size={22} />
          </div>
          <div>
            <h3 className="text-white font-semibold">Merchant Referral Leaderboard</h3>
            <p className="text-slate-400 text-xs">Top customer recruiters</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="text-slate-400 border-slate-600"
          >
            <Download size={14} className="mr-1" />
            CSV
          </Button>
          <Button
            onClick={fetchLeaderboard}
            variant="ghost"
            size="sm"
            className="text-slate-400"
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-900/30 border-b border-slate-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{data.summary?.total_merchants || 0}</p>
          <p className="text-slate-500 text-xs">Merchants</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-400">{data.summary?.active_recruiters || 0}</p>
          <p className="text-slate-500 text-xs">Active Recruiters</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-400">{data.summary?.total_referrals || 0}</p>
          <p className="text-slate-500 text-xs">Total Referrals</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(data.summary?.total_commissions_paid || 0)}</p>
          <p className="text-slate-500 text-xs">Commissions Paid</p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Merchant</th>
              <th className="px-4 py-3 text-center">Referrals</th>
              <th className="px-4 py-3 text-center hidden sm:table-cell">This Month</th>
              <th className="px-4 py-3 text-right">Total Earned</th>
              <th className="px-4 py-3 text-center hidden sm:table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {displayData && displayData.length > 0 ? (
              displayData.map((entry) => (
                <tr key={entry.merchant_id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      entry.rank === 1 ? 'bg-amber-500/30 text-amber-400' :
                      entry.rank === 2 ? 'bg-slate-400/30 text-slate-300' :
                      entry.rank === 3 ? 'bg-orange-500/30 text-orange-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {entry.rank <= 3 ? (
                        entry.rank === 1 ? <Crown size={16} /> :
                        entry.rank === 2 ? <Medal size={16} /> :
                        <Medal size={16} />
                      ) : entry.rank}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                        {entry.logo_url ? (
                          <img src={entry.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <Store className="text-slate-400" size={16} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{entry.business_name}</p>
                        <p className="text-slate-500 text-xs truncate">{entry.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-purple-400 font-semibold">{entry.referral_count}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className={`${entry.referrals_this_month > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      +{entry.referrals_this_month}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-emerald-400 font-semibold">{formatCurrency(entry.total_earned)}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      entry.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                      entry.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {entry.status === 'active' ? 'Active' : 
                       entry.status === 'pending' ? 'Pending' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                  No merchants have referred customers yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Show More Button */}
      {data.all_data && data.all_data.length > 20 && (
        <div className="px-5 py-3 border-t border-slate-700 text-center">
          <Button
            onClick={() => setShowAll(!showAll)}
            variant="ghost"
            size="sm"
            className="text-slate-400"
          >
            {showAll ? 'Show Less' : `View All (${data.all_data.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}

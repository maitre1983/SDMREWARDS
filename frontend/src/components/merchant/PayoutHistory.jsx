/**
 * PayoutHistory Component
 * =======================
 * Displays merchant payout history with stats and filtering.
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  ArrowDownToLine, 
  Wallet, 
  Building2, 
  Phone,
  CheckCircle, 
  Clock, 
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { API_URL } from '../../config/api';

const statusConfig = {
  completed: { 
    icon: CheckCircle, 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-500/20',
    label: 'Completed'
  },
  pending: { 
    icon: Clock, 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/20',
    label: 'Pending'
  },
  failed: { 
    icon: XCircle, 
    color: 'text-red-400', 
    bg: 'bg-red-500/20',
    label: 'Failed'
  }
};

const methodConfig = {
  momo: { icon: Phone, label: 'Mobile Money', color: 'text-purple-400' },
  bank: { icon: Building2, label: 'Bank Transfer', color: 'text-blue-400' }
};

export default function PayoutHistory({ token }) {
  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState({});
  const [byMethod, setByMethod] = useState({});
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', method: '' });

  const fetchPayouts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (filter.status) params.append('status', filter.status);
      if (filter.method) params.append('payout_method', filter.method);

      const res = await axios.get(`${API_URL}/api/merchants/payouts?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPayouts(res.data.payouts || []);
      setStats(res.data.stats || {});
      setByMethod(res.data.by_method || {});
      setPagination(res.data.pagination || { page: 1, total: 0, pages: 0 });
    } catch (error) {
      console.error('Error fetching payouts:', error);
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `GHS ${(amount || 0).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Received */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-emerald-400" size={20} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Received</p>
              <p className="text-xl font-bold text-emerald-400">
                {formatCurrency(stats.total_completed)}
              </p>
              <p className="text-xs text-slate-500">{stats.count_completed || 0} payouts</p>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/30 rounded-lg flex items-center justify-center">
              <Clock className="text-amber-400" size={20} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Pending</p>
              <p className="text-xl font-bold text-amber-400">
                {formatCurrency(stats.total_pending)}
              </p>
              <p className="text-xs text-slate-500">{stats.count_pending || 0} payouts</p>
            </div>
          </div>
        </div>

        {/* By Method */}
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/30 rounded-lg flex items-center justify-center">
              <Wallet className="text-purple-400" size={20} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">By Method</p>
              <div className="flex gap-3 mt-1">
                {byMethod.momo && (
                  <div className="text-xs">
                    <span className="text-purple-400">MoMo:</span>
                    <span className="text-white ml-1">{formatCurrency(byMethod.momo.total)}</span>
                  </div>
                )}
                {byMethod.bank && (
                  <div className="text-xs">
                    <span className="text-blue-400">Bank:</span>
                    <span className="text-white ml-1">{formatCurrency(byMethod.bank.total)}</span>
                  </div>
                )}
                {!byMethod.momo && !byMethod.bank && (
                  <span className="text-slate-500 text-xs">No payouts yet</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="bg-transparent text-sm text-slate-300 outline-none"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
          <Wallet size={16} className="text-slate-400" />
          <select
            value={filter.method}
            onChange={(e) => setFilter({ ...filter, method: e.target.value })}
            className="bg-transparent text-sm text-slate-300 outline-none"
          >
            <option value="">All Methods</option>
            <option value="momo">Mobile Money</option>
            <option value="bank">Bank Transfer</option>
          </select>
        </div>

        <button
          onClick={() => fetchPayouts(pagination.page)}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Payouts Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        {loading && payouts.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="animate-spin text-slate-400 mx-auto mb-2" size={24} />
            <p className="text-slate-400">Loading payouts...</p>
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-8 text-center">
            <ArrowDownToLine className="text-slate-600 mx-auto mb-2" size={32} />
            <p className="text-slate-400">No payouts found</p>
            <p className="text-slate-500 text-sm mt-1">Payouts will appear here when customers make payments</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Reference</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Method</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Destination</th>
                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Amount</th>
                    <th className="text-center text-xs font-medium text-slate-400 uppercase px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {payouts.map((payout) => {
                    const status = statusConfig[payout.status] || statusConfig.pending;
                    const method = methodConfig[payout.payout_method] || methodConfig.momo;
                    const StatusIcon = status.icon;
                    const MethodIcon = method.icon;

                    return (
                      <tr key={payout.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-300">{formatDate(payout.created_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono text-slate-400">{payout.reference}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <MethodIcon size={16} className={method.color} />
                            <span className="text-sm text-slate-300">{method.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-300">
                            {payout.payout_method === 'bank' 
                              ? `${payout.bank_name || 'Bank'} - ****${(payout.bank_account || '').slice(-4)}`
                              : payout.phone || '-'
                            }
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-white">
                            {formatCurrency(payout.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.bg} ${status.color}`}>
                            <StatusIcon size={12} />
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-700/50">
              {payouts.map((payout) => {
                const status = statusConfig[payout.status] || statusConfig.pending;
                const method = methodConfig[payout.payout_method] || methodConfig.momo;
                const StatusIcon = status.icon;
                const MethodIcon = method.icon;

                return (
                  <div key={payout.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white font-semibold">{formatCurrency(payout.amount)}</p>
                        <p className="text-xs text-slate-400">{formatDate(payout.created_at)}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.bg} ${status.color}`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <MethodIcon size={14} className={method.color} />
                      <span>
                        {payout.payout_method === 'bank' 
                          ? `${payout.bank_name || 'Bank'} - ****${(payout.bank_account || '').slice(-4)}`
                          : payout.phone || '-'
                        }
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">{payout.reference}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
            <span className="text-sm text-slate-400">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchPayouts(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => fetchPayouts(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

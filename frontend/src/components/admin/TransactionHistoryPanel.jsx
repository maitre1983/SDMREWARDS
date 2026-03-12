import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft, Search, Filter, Download, RefreshCw,
  CheckCircle, XCircle, Clock, TrendingUp, Users, Store,
  ChevronDown, ChevronUp, Eye, Calendar, DollarSign
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import axios from 'axios';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function TransactionHistoryPanel({ token }) {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, completed, pending, failed
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all'); // today, week, month, all
  const [expandedTxn, setExpandedTxn] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, [filter, dateRange]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (dateRange !== 'all') params.append('period', dateRange);
      if (searchTerm) params.append('search', searchTerm);
      
      const res = await axios.get(
        `${API_URL}/api/sdm/admin/transactions?${params.toString()}`,
        { headers }
      );
      setTransactions(res.data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/transactions/stats`, { headers });
      setStats(res.data);
    } catch (error) {
      // Silently fail for stats
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      failed: 'bg-red-100 text-red-700',
      collected: 'bg-blue-100 text-blue-700',
    };
    const icons = {
      completed: <CheckCircle size={14} />,
      pending: <Clock size={14} />,
      failed: <XCircle size={14} />,
      collected: <CheckCircle size={14} />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
        {icons[status]}
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const filteredTransactions = transactions.filter(txn => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      txn.transaction_id?.toLowerCase().includes(search) ||
      txn.merchant_name?.toLowerCase().includes(search) ||
      txn.user_phone?.includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Transaction History</h2>
          <p className="text-slate-500">All client and merchant transactions</p>
        </div>
        <Button
          onClick={() => { fetchTransactions(); fetchStats(); }}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <DollarSign size={24} className="opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded">Today</span>
            </div>
            <p className="text-2xl font-bold mt-2">{formatAmount(stats.today_volume)} GHS</p>
            <p className="text-sm opacity-80">Total Volume</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <ArrowRightLeft size={24} className="opacity-80" />
            </div>
            <p className="text-2xl font-bold mt-2">{stats.today_count || 0}</p>
            <p className="text-sm opacity-80">Transactions</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <TrendingUp size={24} className="opacity-80" />
            </div>
            <p className="text-2xl font-bold mt-2">{formatAmount(stats.total_commission)} GHS</p>
            <p className="text-sm opacity-80">SDM Commission</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <Users size={24} className="opacity-80" />
            </div>
            <p className="text-2xl font-bold mt-2">{formatAmount(stats.total_cashback)} GHS</p>
            <p className="text-sm opacity-80">Cashback Distributed</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Search by ID, merchant, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          {['all', 'completed', 'failed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-white text-sm"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="animate-spin mx-auto text-slate-400" size={32} />
            <p className="mt-2 text-slate-500">Loading...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <ArrowRightLeft className="mx-auto text-slate-300" size={48} />
            <p className="mt-2 text-slate-500">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-slate-600">Transaction</th>
                  <th className="text-left p-4 font-medium text-slate-600">Merchant</th>
                  <th className="text-left p-4 font-medium text-slate-600">Client</th>
                  <th className="text-right p-4 font-medium text-slate-600">Amount</th>
                  <th className="text-right p-4 font-medium text-slate-600">Merchant Receives</th>
                  <th className="text-right p-4 font-medium text-slate-600">Commission</th>
                  <th className="text-right p-4 font-medium text-slate-600">Cashback</th>
                  <th className="text-center p-4 font-medium text-slate-600">Status</th>
                  <th className="text-left p-4 font-medium text-slate-600">Date</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTransactions.map((txn) => (
                  <React.Fragment key={txn.id || txn.transaction_id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                          {txn.transaction_id?.slice(0, 15)}...
                        </code>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Store size={14} className="text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{txn.merchant_name || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{txn.user_phone || '-'}</p>
                      </td>
                      <td className="p-4 text-right font-semibold">
                        {formatAmount(txn.amount)} GHS
                      </td>
                      <td className="p-4 text-right text-emerald-600 font-medium">
                        {formatAmount(txn.merchant_receives)} GHS
                      </td>
                      <td className="p-4 text-right text-blue-600">
                        {formatAmount(txn.sdm_commission)} GHS
                      </td>
                      <td className="p-4 text-right text-amber-600">
                        {formatAmount(txn.net_cashback || txn.cashback_amount)} GHS
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(txn.payment_status || txn.status)}
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {formatDate(txn.created_at)}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setExpandedTxn(expandedTxn === txn.transaction_id ? null : txn.transaction_id)}
                          className="p-2 hover:bg-slate-100 rounded-lg"
                        >
                          {expandedTxn === txn.transaction_id ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedTxn === txn.transaction_id && (
                      <tr className="bg-slate-50">
                        <td colSpan={10} className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">ID Transaction</p>
                              <p className="font-mono">{txn.transaction_id}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">ID Externe</p>
                              <p className="font-mono">{txn.ext_transaction_id || '-'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Taux Cashback</p>
                              <p>{txn.cashback_rate}%</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Complété le</p>
                              <p>{formatDate(txn.completed_at)}</p>
                            </div>
                            {txn.settlement_result && (
                              <div className="col-span-2">
                                <p className="text-slate-500">Merchant Settlement</p>
                                <p className={txn.settlement_result.status === 'completed' ? 'text-emerald-600' : 'text-red-600'}>
                                  {txn.settlement_result.status} - Ref: {txn.settlement_result.reference}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

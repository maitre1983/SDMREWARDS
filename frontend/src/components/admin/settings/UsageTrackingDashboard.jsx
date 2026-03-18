import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { 
  Activity, RefreshCw, Loader2, AlertTriangle, CheckCircle, 
  TrendingUp, Users, DollarSign, Clock, Filter, ChevronDown,
  Search, ArrowUpDown
} from 'lucide-react';

import { API_URL } from '@/config/api';

export default function UsageTrackingDashboard({ token }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [sortBy, setSortBy] = useState('daily_percent');
  const [filterApproaching, setFilterApproaching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(50);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchUsageData();
  }, [sortBy, filterApproaching, limit]);

  const fetchUsageData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        sort_by: sortBy,
        filter_approaching: filterApproaching.toString(),
        threshold: '0.8'
      });
      
      const res = await axios.get(
        `${API_URL}/api/admin/withdrawal-limits/usage?${params}`, 
        { headers }
      );
      
      setData(res.data);
    } catch (error) {
      console.error('Error fetching usage data:', error);
      toast.error('Failed to load usage data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'at_limit':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            <AlertTriangle size={12} />
            At Limit
          </span>
        );
      case 'approaching':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <TrendingUp size={12} />
            Approaching
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle size={12} />
            Normal
          </span>
        );
    }
  };

  const getProgressBar = (percent) => {
    let bgColor = 'bg-green-500';
    if (percent >= 100) bgColor = 'bg-red-500';
    else if (percent >= 80) bgColor = 'bg-yellow-500';
    else if (percent >= 50) bgColor = 'bg-blue-500';
    
    return (
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div 
          className={`${bgColor} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    );
  };

  const formatCurrency = (amount) => {
    return `GHS ${(amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
  };

  const filteredClients = data?.clients?.filter(client => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      client.name?.toLowerCase().includes(search) ||
      client.phone?.includes(search) ||
      client.email?.toLowerCase().includes(search)
    );
  }) || [];

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Active Clients</p>
              <p className="text-white text-xl font-bold">{summary.total_clients_with_activity || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="text-red-400" size={20} />
            </div>
            <div>
              <p className="text-slate-400 text-xs">At Limit</p>
              <p className="text-white text-xl font-bold">{summary.clients_at_limit || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <TrendingUp className="text-yellow-400" size={20} />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Approaching Limit</p>
              <p className="text-white text-xl font-bold">{summary.clients_approaching_limit || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="text-green-400" size={20} />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Today's Volume</p>
              <p className="text-white text-xl font-bold">{formatCurrency(summary.total_daily_volume)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Volume Summary */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <Activity size={18} className="text-purple-400" />
          Withdrawal Volume Summary
        </h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Daily</p>
            <p className="text-white font-semibold">{formatCurrency(summary.total_daily_volume)}</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Weekly</p>
            <p className="text-white font-semibold">{formatCurrency(summary.total_weekly_volume)}</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Monthly</p>
            <p className="text-white font-semibold">{formatCurrency(summary.total_monthly_volume)}</p>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <Input
              type="text"
              placeholder="Search by name, phone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-700 text-white"
              data-testid="usage-search-input"
            />
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white text-sm"
              data-testid="usage-sort-select"
            >
              <option value="daily_percent">Daily % Used</option>
              <option value="weekly_percent">Weekly % Used</option>
              <option value="monthly_percent">Monthly % Used</option>
              <option value="daily_usage">Daily Volume</option>
              <option value="weekly_usage">Weekly Volume</option>
              <option value="monthly_usage">Monthly Volume</option>
              <option value="tx_count">Transaction Count</option>
            </select>
          </div>

          {/* Filter Toggle */}
          <Button
            variant={filterApproaching ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterApproaching(!filterApproaching)}
            className={filterApproaching ? "bg-yellow-600 hover:bg-yellow-700" : "border-slate-600"}
            data-testid="filter-approaching-btn"
          >
            <Filter size={14} className="mr-1" />
            {filterApproaching ? 'Showing At-Risk' : 'Show At-Risk Only'}
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsageData}
            disabled={isLoading}
            className="border-slate-600"
            data-testid="refresh-usage-btn"
          >
            <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Client Usage Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h4 className="text-white font-medium flex items-center gap-2">
            <Users size={18} className="text-blue-400" />
            Client Withdrawal Usage
            <span className="text-slate-400 text-sm font-normal">
              ({filteredClients.length} clients)
            </span>
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" data-testid="usage-tracking-table">
            <thead className="bg-slate-900">
              <tr>
                <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Client</th>
                <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Daily Usage</th>
                <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Weekly Usage</th>
                <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Monthly Usage</th>
                <th className="text-center text-xs text-slate-400 font-medium px-4 py-3">Tx Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    {searchTerm ? 'No clients match your search' : 'No withdrawal activity found'}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.client_id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium text-sm">{client.name || 'Unknown'}</p>
                        <p className="text-slate-400 text-xs">{client.phone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(client.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 min-w-[120px]">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">{formatCurrency(client.daily_usage)}</span>
                          <span className="text-white font-medium">{client.daily_percent}%</span>
                        </div>
                        {getProgressBar(client.daily_percent)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 min-w-[120px]">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">{formatCurrency(client.weekly_usage)}</span>
                          <span className="text-white font-medium">{client.weekly_percent}%</span>
                        </div>
                        {getProgressBar(client.weekly_percent)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 min-w-[120px]">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">{formatCurrency(client.monthly_usage)}</span>
                          <span className="text-white font-medium">{client.monthly_percent}%</span>
                        </div>
                        {getProgressBar(client.monthly_percent)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-900 rounded-full text-white text-sm font-medium">
                        {client.tx_count}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Limits Reference */}
      {summary.global_limits && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <h4 className="text-slate-300 font-medium mb-3 text-sm">Current Global Limits Reference</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-500 mb-1">MoMo Limits</p>
              <p className="text-slate-300">
                Daily: {formatCurrency(summary.global_limits.momo?.daily)} | 
                Weekly: {formatCurrency(summary.global_limits.momo?.weekly)} | 
                Monthly: {formatCurrency(summary.global_limits.momo?.monthly)}
              </p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Bank Limits</p>
              <p className="text-slate-300">
                Daily: {formatCurrency(summary.global_limits.bank?.daily)} | 
                Weekly: {formatCurrency(summary.global_limits.bank?.weekly)} | 
                Monthly: {formatCurrency(summary.global_limits.bank?.monthly)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

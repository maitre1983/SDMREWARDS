import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, ArrowDownToLine, ArrowUpFromLine, 
  CheckCircle, XCircle, Clock, RefreshCw, Loader2,
  DollarSign, Users, Store, Building2, FileText, Shield,
  ChevronDown, ChevronUp, Search, Filter, AlertTriangle,
  Download, BarChart3, PieChart, Activity, Zap, AlertCircle,
  Bell, Send, Trash2, Eye, Plus
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function FintechDashboard({ token }) {
  const [summary, setSummary] = useState(null);
  const [investorData, setInvestorData] = useState(null);
  const [floatStatus, setFloatStatus] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [fintechConfig, setFintechConfig] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [floatAlerts, setFloatAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('investor');
  const [processingId, setProcessingId] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showNewNotificationForm, setShowNewNotificationForm] = useState(false);
  
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [summaryRes, investorRes, floatRes, withdrawalsRes, depositsRes, transactionsRes, walletsRes, configRes] = await Promise.all([
        axios.get(`${API_URL}/api/sdm/admin/fintech/summary`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/fintech/investor-dashboard?period_days=30`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/fintech/float/status`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/fintech/withdrawals?limit=50`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/fintech/deposits?limit=50`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/fintech/transactions?limit=50`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/fintech/wallets?limit=100`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/config`, { headers })
      ]);
      setSummary(summaryRes.data);
      setInvestorData(investorRes.data);
      setFloatStatus(floatRes.data);
      setWithdrawals(withdrawalsRes.data);
      setDeposits(depositsRes.data);
      setTransactions(transactionsRes.data);
      setWallets(walletsRes.data);
      setFintechConfig(configRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load fintech data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/fintech/audit-logs?limit=100`, { headers });
      setAuditLogs(res.data);
    } catch (error) {
      console.error('Audit logs error:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/notifications?limit=50`, { headers });
      setNotifications(res.data);
    } catch (error) {
      console.error('Notifications error:', error);
    }
  };

  const fetchFloatAlerts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/float-alerts?limit=50`, { headers });
      setFloatAlerts(res.data);
    } catch (error) {
      console.error('Float alerts error:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'audit') {
      fetchAuditLogs();
    } else if (activeSubTab === 'notifications') {
      fetchNotifications();
    } else if (activeSubTab === 'alerts') {
      fetchFloatAlerts();
    }
  }, [activeSubTab]);

  const handleApproveWithdrawal = async (id) => {
    setProcessingId(id);
    try {
      await axios.post(`${API_URL}/api/sdm/admin/fintech/withdrawals/${id}/approve`, {}, { headers });
      toast.success('Withdrawal approved');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectWithdrawal = async (id) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    
    setProcessingId(id);
    try {
      await axios.post(`${API_URL}/api/sdm/admin/fintech/withdrawals/${id}/reject`, 
        { rejection_reason: reason }, 
        { headers }
      );
      toast.success('Withdrawal rejected');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCompleteWithdrawal = async (id) => {
    const ref = prompt('Mobile Money Reference:');
    if (!ref) return;
    
    setProcessingId(id);
    try {
      await axios.post(`${API_URL}/api/sdm/admin/fintech/withdrawals/${id}/complete?provider_reference=${ref}`, {}, { headers });
      toast.success('Withdrawal marked as paid');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmDeposit = async (id) => {
    setProcessingId(id);
    try {
      await axios.post(`${API_URL}/api/sdm/admin/fintech/deposits/${id}/confirm`, {}, { headers });
      toast.success('Deposit confirmed');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to confirm');
    } finally {
      setProcessingId(null);
    }
  };

  const handleProcessPending = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/sdm/admin/fintech/process-pending`, {}, { headers });
      toast.success(`Processed ${res.data.converted_count} pending cashbacks (GHS ${res.data.total_converted})`);
      fetchData();
    } catch (error) {
      toast.error('Failed to process pending cashback');
    }
  };

  const handleTopUpFloat = async () => {
    if (!topUpAmount || parseFloat(topUpAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/api/sdm/admin/fintech/float/topup`, 
        { amount: parseFloat(topUpAmount), source: 'BANK_TRANSFER' },
        { headers }
      );
      toast.success(`Float topped up: ${res.data.reference}`);
      setTopUpAmount('');
      fetchData();
    } catch (error) {
      toast.error('Failed to top up float');
    }
  };

  const handleExportTransactions = async (format) => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/fintech/export/transactions?format=${format}`, { headers });
      if (format === 'csv') {
        const blob = new Blob([res.data.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ledger_transactions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(`Exported ${res.data.count} transactions`);
      } else {
        const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ledger_transactions_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(`Exported ${res.data.count} transactions`);
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleExportAuditLogs = async (format) => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/fintech/export/audit-logs?format=${format}`, { headers });
      if (format === 'csv') {
        const blob = new Blob([res.data.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(`Exported ${res.data.count} logs`);
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handlePurgeTestData = async () => {
    if (!window.confirm('⚠️ WARNING: This will DELETE ALL fintech data. Are you absolutely sure?')) return;
    if (!window.confirm('This action CANNOT be undone. Type "DELETE" to confirm.')) return;
    
    try {
      const res = await axios.post(`${API_URL}/api/sdm/admin/fintech/purge-test-data?confirm=true`, {}, { headers });
      toast.success('Test data purged successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to purge data');
    }
  };

  const handleSaveConfig = async (updates) => {
    setIsSavingConfig(true);
    try {
      await axios.put(`${API_URL}/api/sdm/admin/config`, updates, { headers });
      toast.success('Configuration saved successfully');
      // Refresh config
      const res = await axios.get(`${API_URL}/api/sdm/admin/config`, { headers });
      setFintechConfig(res.data);
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const formatCurrency = (amount) => `GHS ${(amount || 0).toFixed(2)}`;
  const formatDate = (date) => date ? new Date(date).toLocaleString() : '-';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="fintech-dashboard">
      {/* Sub Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-lg overflow-x-auto">
        {[
          { id: 'investor', label: 'Investor', icon: BarChart3 },
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
          { id: 'deposits', label: 'Deposits', icon: ArrowDownToLine },
          { id: 'float', label: 'Float', icon: Zap },
          { id: 'wallets', label: 'Wallets', icon: Wallet },
          { id: 'ledger', label: 'Ledger', icon: FileText },
          { id: 'config', label: 'Config', icon: Filter },
          { id: 'audit', label: 'Audit', icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
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

      {/* Investor Dashboard */}
      {activeSubTab === 'investor' && investorData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Investor Dashboard (30 days)</h3>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
              <RefreshCw size={16} />
              Refresh
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              title="GMV (Gross Merchandise Value)"
              value={`GHS ${investorData.gmv.current.toLocaleString()}`}
              change={investorData.gmv.growth_percent}
              icon={DollarSign}
            />
            <MetricCard
              title="Commission Earned"
              value={`GHS ${investorData.commission_earned.current.toLocaleString()}`}
              change={investorData.commission_earned.growth_percent}
              icon={TrendingUp}
            />
            <MetricCard
              title="Transaction Count"
              value={investorData.transaction_count.current.toLocaleString()}
              change={investorData.transaction_count.growth_percent}
              icon={Activity}
            />
            <MetricCard
              title="Avg Transaction"
              value={`GHS ${investorData.average_transaction.toLocaleString()}`}
              icon={BarChart3}
            />
          </div>

          {/* Users & Revenue */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{investorData.total_users}</p>
                  <p className="text-xs text-slate-500">Total Users</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Merchants</p>
                  <p className="font-semibold">{investorData.total_merchants}</p>
                </div>
                <div>
                  <p className="text-slate-500">Active</p>
                  <p className="font-semibold text-emerald-600">{investorData.active_merchants}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">GHS {investorData.memberships.revenue.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Membership Revenue</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Total Cards</p>
                  <p className="font-semibold">{investorData.memberships.total}</p>
                </div>
                <div>
                  <p className="text-slate-500">Active</p>
                  <p className="font-semibold text-emerald-600">{investorData.memberships.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <ArrowDownToLine size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">GHS {investorData.deposits.total_amount.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Total Deposits</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Count</p>
                  <p className="font-semibold">{investorData.deposits.count}</p>
                </div>
                <div>
                  <p className="text-slate-500">Cashback Given</p>
                  <p className="font-semibold text-blue-600">GHS {investorData.total_cashback_given}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Chart */}
          {investorData.daily_breakdown && investorData.daily_breakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-semibold text-slate-900 mb-4">Daily GMV & Commission</h4>
              <div className="overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {investorData.daily_breakdown.map((day) => (
                    <div key={day.date} className="text-center min-w-[80px]">
                      <div className="h-32 flex flex-col justify-end gap-1">
                        <div 
                          className="bg-blue-500 rounded-t"
                          style={{ height: `${Math.min((day.gmv / Math.max(...investorData.daily_breakdown.map(d => d.gmv))) * 100, 100)}%` }}
                          title={`GMV: GHS ${day.gmv}`}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">{day.date.slice(5)}</p>
                      <p className="text-xs font-semibold">{day.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Wallet Balances Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-900 mb-4">Platform Wallet Balances</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500">Client Wallets ({investorData.wallets.client.count})</p>
                <p className="text-lg font-bold text-blue-600">GHS {(investorData.wallets.client.total_available || 0).toLocaleString()}</p>
                <p className="text-xs text-amber-600">Pending: GHS {(investorData.wallets.client.total_pending || 0).toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500">Merchant Wallets ({investorData.wallets.merchant.count})</p>
                <p className="text-lg font-bold text-emerald-600">GHS {(investorData.wallets.merchant.total_available || 0).toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500">SDM Commission</p>
                <p className="text-lg font-bold text-purple-600">GHS {(investorData.wallets.sdm_commission.total_available || 0).toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500">SDM Float (MoMo)</p>
                <p className="text-lg font-bold text-cyan-600">GHS {(investorData.wallets.sdm_float.total_available || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overview */}
      {activeSubTab === 'overview' && summary && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Financial Overview</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleProcessPending} className="gap-2">
                <Clock size={16} />
                Process Pending Cashback
              </Button>
              <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
                <RefreshCw size={16} />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* SDM System Wallets */}
          <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-6 text-white">
            <h4 className="text-sm font-medium opacity-80 mb-4">SDM Platform Wallets</h4>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-3xl font-bold">{formatCurrency(summary.sdm_wallets.commission)}</p>
                <p className="text-sm opacity-70">Commission Earned</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{formatCurrency(summary.sdm_wallets.operations)}</p>
                <p className="text-sm opacity-70">Operations</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{formatCurrency(summary.sdm_wallets.float)}</p>
                <p className="text-sm opacity-70">Float (MoMo)</p>
              </div>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard 
              icon={Users} 
              label="Client Wallets" 
              value={summary.client_wallets.count}
              subValue={`Available: ${formatCurrency(summary.client_wallets.total_available)}`}
              color="blue" 
            />
            <StatCard 
              icon={Store} 
              label="Merchant Wallets" 
              value={summary.merchant_wallets.count}
              subValue={`Balance: ${formatCurrency(summary.merchant_wallets.total_available)}`}
              color="emerald" 
            />
            <StatCard 
              icon={Clock} 
              label="Pending Cashback" 
              value={formatCurrency(summary.client_wallets.total_pending)}
              subValue="Awaiting clearance"
              color="amber" 
            />
            <StatCard 
              icon={AlertTriangle} 
              label="Pending Withdrawals" 
              value={summary.pending_withdrawals}
              subValue="Require approval"
              color="red" 
            />
          </div>

          {/* Transaction Types Breakdown */}
          {Object.keys(summary.transactions_by_type).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-semibold text-slate-900 mb-4">Transactions by Type</h4>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(summary.transactions_by_type).map(([type, data]) => (
                  <div key={type} className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 uppercase">{type.replace(/_/g, ' ')}</p>
                    <p className="text-xl font-bold text-slate-900">{data.count}</p>
                    <p className="text-sm text-slate-600">{formatCurrency(data.amount)}</p>
                    {data.fees > 0 && (
                      <p className="text-xs text-emerald-600">Fees: {formatCurrency(data.fees)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Float Management */}
      {activeSubTab === 'float' && floatStatus && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Float Management (Mobile Money)</h3>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
              <RefreshCw size={16} />
              Refresh
            </Button>
          </div>

          {/* Alert Banner */}
          {floatStatus.alert_level !== 'OK' && (
            <div className={`rounded-xl p-4 flex items-center gap-4 ${
              floatStatus.alert_level === 'CRITICAL' ? 'bg-red-100 border border-red-200' : 'bg-amber-100 border border-amber-200'
            }`}>
              <AlertCircle size={24} className={floatStatus.alert_level === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'} />
              <div>
                <p className={`font-semibold ${floatStatus.alert_level === 'CRITICAL' ? 'text-red-700' : 'text-amber-700'}`}>
                  {floatStatus.alert_level === 'CRITICAL' ? '⚠️ CRITICAL: Float balance very low!' : '⚡ LOW: Float balance running low'}
                </p>
                <p className="text-sm">{floatStatus.recommendation}</p>
              </div>
            </div>
          )}

          {/* Float Status Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`rounded-xl p-6 ${
              floatStatus.alert_level === 'OK' ? 'bg-emerald-50 border border-emerald-200' :
              floatStatus.alert_level === 'LOW' ? 'bg-amber-50 border border-amber-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <p className="text-sm text-slate-600 mb-2">Float Balance</p>
              <p className={`text-3xl font-bold ${
                floatStatus.alert_level === 'OK' ? 'text-emerald-600' :
                floatStatus.alert_level === 'LOW' ? 'text-amber-600' : 'text-red-600'
              }`}>
                GHS {floatStatus.float_balance.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Threshold: Low &lt; GHS {floatStatus.thresholds.low} | Critical &lt; GHS {floatStatus.thresholds.critical}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-sm text-slate-600 mb-2">Pending Withdrawals</p>
              <p className="text-3xl font-bold text-slate-900">{floatStatus.pending_withdrawals.count}</p>
              <p className="text-sm text-amber-600 mt-2">Total: GHS {floatStatus.pending_withdrawals.total_amount.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-sm text-slate-600 mb-2">Coverage Ratio</p>
              <p className={`text-3xl font-bold ${
                typeof floatStatus.coverage_ratio === 'number' && floatStatus.coverage_ratio < 1 ? 'text-red-600' : 'text-emerald-600'
              }`}>
                {floatStatus.coverage_ratio === '∞' ? '∞' : `${floatStatus.coverage_ratio}x`}
              </p>
              <p className="text-xs text-slate-500 mt-2">Float ÷ Pending Withdrawals</p>
            </div>
          </div>

          {/* Top Up Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-900 mb-4">Top Up Float</h4>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm text-slate-600 mb-2">Amount (GHS)</label>
                <Input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="1000"
                  min="1"
                  step="0.01"
                />
              </div>
              <Button 
                onClick={handleTopUpFloat}
                disabled={!topUpAmount}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <ArrowDownToLine size={16} className="mr-2" />
                Top Up Float
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              This records an incoming float top-up (e.g., from bank transfer to Mobile Money account).
            </p>
          </div>
        </div>
      )}

      {/* Withdrawals */}
      {activeSubTab === 'withdrawals' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Withdrawal Requests</h3>
            <span className="text-sm text-slate-500">{withdrawals.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Entity</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Amount</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Provider</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Phone</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Requested</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No withdrawal requests
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          w.entity_type === 'CLIENT' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {w.entity_type}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">{w.entity_name || w.entity_id.substring(0, 8)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{formatCurrency(w.amount)}</p>
                        <p className="text-xs text-slate-500">Net: {formatCurrency(w.net_amount)}</p>
                      </td>
                      <td className="px-4 py-3 font-medium">{w.provider}</td>
                      <td className="px-4 py-3 font-mono text-xs">{w.phone_number}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={w.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(w.requested_at)}</td>
                      <td className="px-4 py-3">
                        {w.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleApproveWithdrawal(w.id)}
                              disabled={processingId === w.id}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white h-7 px-2"
                            >
                              {processingId === w.id ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectWithdrawal(w.id)}
                              disabled={processingId === w.id}
                              className="text-red-600 h-7 px-2"
                            >
                              <XCircle size={14} />
                            </Button>
                          </div>
                        )}
                        {w.status === 'APPROVED' && (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteWithdrawal(w.id)}
                            disabled={processingId === w.id}
                            className="bg-blue-500 hover:bg-blue-600 text-white h-7 px-2 text-xs"
                          >
                            {processingId === w.id ? <Loader2 className="animate-spin" size={14} /> : 'Mark Paid'}
                          </Button>
                        )}
                        {w.status === 'REJECTED' && (
                          <span className="text-xs text-red-500">{w.rejection_reason}</span>
                        )}
                        {w.status === 'PAID' && (
                          <span className="text-xs text-emerald-600 font-mono">{w.provider_reference}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deposits */}
      {activeSubTab === 'deposits' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Merchant Deposits (Pre-funding)</h3>
            <span className="text-sm text-slate-500">{deposits.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Merchant</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Amount</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Method</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Reference</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Requested</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deposits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No deposit requests
                    </td>
                  </tr>
                ) : (
                  deposits.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{d.merchant_id.substring(0, 12)}...</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(d.amount)}</td>
                      <td className="px-4 py-3">{d.deposit_method}</td>
                      <td className="px-4 py-3 font-mono text-xs">{d.provider_reference || '-'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(d.requested_at)}</td>
                      <td className="px-4 py-3">
                        {d.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmDeposit(d.id)}
                            disabled={processingId === d.id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white h-7 px-3 text-xs"
                          >
                            {processingId === d.id ? <Loader2 className="animate-spin" size={14} /> : 'Confirm'}
                          </Button>
                        )}
                        {d.status === 'CONFIRMED' && (
                          <span className="text-xs text-emerald-600">By: {d.confirmed_by}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wallets */}
      {activeSubTab === 'wallets' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">All Wallets ({wallets.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Entity</th>
                  <th className="px-4 py-3 text-right text-slate-600 font-medium">Available</th>
                  <th className="px-4 py-3 text-right text-slate-600 font-medium">Pending</th>
                  <th className="px-4 py-3 text-right text-slate-600 font-medium">Reserved</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wallets.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        w.entity_type === 'CLIENT' ? 'bg-blue-100 text-blue-700' :
                        w.entity_type === 'MERCHANT' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {w.entity_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{w.entity_name || '-'}</p>
                      <p className="text-xs text-slate-500 font-mono">{w.entity_id.substring(0, 12)}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatCurrency(w.available_balance)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600">
                      {formatCurrency(w.pending_balance)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatCurrency(w.reserved_balance)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={w.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(w.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ledger Transactions */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Ledger Transactions ({transactions.length})</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExportTransactions('csv')} className="gap-2">
                <Download size={14} />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportTransactions('json')} className="gap-2">
                <Download size={14} />
                Export JSON
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Reference</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Type</th>
                  <th className="px-4 py-3 text-right text-slate-600 font-medium">Amount</th>
                  <th className="px-4 py-3 text-right text-slate-600 font-medium">Fee</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No ledger transactions yet
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{t.reference_id}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded">
                          {t.transaction_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(t.amount)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(t.fee_amount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(t.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fintech Configuration */}
      {activeSubTab === 'config' && fintechConfig && (
        <FintechConfigPanel 
          config={fintechConfig} 
          onSave={handleSaveConfig} 
          isSaving={isSavingConfig} 
        />
      )}

      {/* Audit Logs */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Audit Logs ({auditLogs.length})</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExportAuditLogs('csv')} className="gap-2">
                  <Download size={14} />
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePurgeTestData} 
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <AlertTriangle size={14} />
                  Purge Test Data
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-600 font-medium">Action</th>
                    <th className="px-4 py-3 text-left text-slate-600 font-medium">Entity</th>
                    <th className="px-4 py-3 text-left text-slate-600 font-medium">Performed By</th>
                    <th className="px-4 py-3 text-left text-slate-600 font-medium">Changes</th>
                    <th className="px-4 py-3 text-left text-slate-600 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No audit logs yet
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-slate-600">{log.entity_type}</p>
                          <p className="font-mono text-xs text-slate-400">{log.entity_id.substring(0, 12)}</p>
                        </td>
                        <td className="px-4 py-3 font-medium">{log.performed_by}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                          {log.new_values ? JSON.stringify(log.new_values).substring(0, 50) : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(log.performed_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, change, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
          <Icon size={20} />
        </div>
        {change !== undefined && (
          <span className={`text-sm font-medium px-2 py-1 rounded ${
            change >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{title}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
      {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-blue-100 text-blue-700',
    PROCESSING: 'bg-cyan-100 text-cyan-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    CONFIRMED: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-red-100 text-red-700',
    REJECTED: 'bg-red-100 text-red-700',
    BLOCKED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-600',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

function FintechConfigPanel({ config, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    sdm_commission_rate: config.sdm_commission_rate || 0.02,
    cashback_pending_days: config.cashback_pending_days || 7,
    withdrawal_fee: config.withdrawal_fee || 1.0,
    float_low_threshold: config.float_low_threshold || 5000,
    float_critical_threshold: config.float_critical_threshold || 1000,
  });

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      sdm_commission_rate: parseFloat(formData.sdm_commission_rate),
      cashback_pending_days: parseInt(formData.cashback_pending_days),
      withdrawal_fee: parseFloat(formData.withdrawal_fee),
      float_low_threshold: parseFloat(formData.float_low_threshold),
      float_critical_threshold: parseFloat(formData.float_critical_threshold),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Fintech Configuration</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Commission & Fees */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-600" />
            Commission & Fees
          </h4>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                SDM Commission Rate (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="0.5"
                value={formData.sdm_commission_rate * 100}
                onChange={(e) => handleChange('sdm_commission_rate', e.target.value / 100)}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Commission SDM prélevée sur le cashback (ex: 2 = 2%)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Withdrawal Fee (GHS)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={formData.withdrawal_fee}
                onChange={(e) => handleChange('withdrawal_fee', e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Frais de retrait Mobile Money
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cashback Pending Days
              </label>
              <Input
                type="number"
                min="0"
                max="30"
                value={formData.cashback_pending_days}
                onChange={(e) => handleChange('cashback_pending_days', e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Jours avant que le cashback soit disponible
              </p>
            </div>
          </div>
        </div>

        {/* Float Thresholds */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            Float Alert Thresholds
          </h4>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Low Balance Threshold (GHS)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.float_low_threshold}
                onChange={(e) => handleChange('float_low_threshold', e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Alerte jaune si le float passe sous ce seuil
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Critical Threshold (GHS)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.float_critical_threshold}
                onChange={(e) => handleChange('float_critical_threshold', e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Alerte rouge si le float passe sous ce seuil critique
              </p>
            </div>
          </div>
        </div>

        {/* Current Values Display */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
          <h4 className="font-semibold text-slate-700 mb-4">Current Active Configuration</h4>
          <div className="grid grid-cols-5 gap-4 text-sm">
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-slate-500">Commission</p>
              <p className="text-lg font-bold text-emerald-600">{(config.sdm_commission_rate * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-slate-500">Withdrawal Fee</p>
              <p className="text-lg font-bold text-blue-600">GHS {config.withdrawal_fee}</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-slate-500">Pending Days</p>
              <p className="text-lg font-bold text-purple-600">{config.cashback_pending_days} days</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-slate-500">Low Threshold</p>
              <p className="text-lg font-bold text-amber-600">GHS {config.float_low_threshold}</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-slate-500">Critical</p>
              <p className="text-lg font-bold text-red-600">GHS {config.float_critical_threshold}</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin mr-2" size={16} />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

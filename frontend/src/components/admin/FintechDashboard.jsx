import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, ArrowDownToLine, ArrowUpFromLine, 
  CheckCircle, XCircle, Clock, RefreshCw, Loader2,
  DollarSign, Users, Store, Building2, FileText, Shield,
  ChevronDown, ChevronUp, Search, Filter, AlertTriangle,
  Download, BarChart3, PieChart, Activity, Zap, AlertCircle
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
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('investor');
  const [processingId, setProcessingId] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [summaryRes, withdrawalsRes, depositsRes, transactionsRes, walletsRes] = await Promise.all([
        axios.get(`${API_URL}/api/sdm/admin/fintech/summary`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/fintech/withdrawals?limit=50`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/fintech/deposits?limit=50`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/fintech/transactions?limit=50`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/fintech/wallets?limit=100`, { headers })
      ]);
      setSummary(summaryRes.data);
      setWithdrawals(withdrawalsRes.data);
      setDeposits(depositsRes.data);
      setTransactions(transactionsRes.data);
      setWallets(walletsRes.data);
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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'audit') {
      fetchAuditLogs();
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
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
          { id: 'deposits', label: 'Deposits', icon: ArrowDownToLine },
          { id: 'wallets', label: 'Wallets', icon: Wallet },
          { id: 'ledger', label: 'Ledger', icon: FileText },
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
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Ledger Transactions ({transactions.length})</h3>
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

      {/* Audit Logs */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Audit Logs ({auditLogs.length})</h3>
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
      )}
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

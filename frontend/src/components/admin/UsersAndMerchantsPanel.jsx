import React, { useState, useEffect } from 'react';
import { 
  Users, Store, Search, Loader2, CheckCircle, XCircle, 
  Phone, RefreshCw, Eye, Ban, Play, Pause, Wallet,
  Settings, AlertTriangle, History, Shield, DollarSign,
  ChevronDown, ChevronUp, X, Save, Trash2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function UsersAndMerchantsPanel({ token }) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [actionLogs, setActionLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('add');
  
  // Merchant cash limit settings
  const [cashLimitSettings, setCashLimitSettings] = useState({
    cash_debit_limit: 5000,
    cash_grace_period_days: 3,
    max_cash_cashback_rate: 15
  });
  
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, merchantsRes, logsRes] = await Promise.all([
        axios.get(`${API_URL}/api/sdm/admin/users?limit=200`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/merchants`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/action-logs?limit=50`, { headers }).catch(() => ({ data: { logs: [] } }))
      ]);
      setUsers(usersRes.data || []);
      setMerchants(merchantsRes.data || []);
      setActionLogs(logsRes.data?.logs || []);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Client control actions
  const handleClientAction = async (action) => {
    if (!selectedUser) return;
    
    try {
      const payload = {
        action,
        reason: actionReason || undefined
      };
      
      if (action === 'adjust_balance' && adjustmentAmount) {
        payload.balance_adjustment = parseFloat(adjustmentAmount);
        payload.adjustment_type = adjustmentType;
      }
      
      await axios.post(
        `${API_URL}/api/sdm/admin/clients/${selectedUser.id}/control`,
        payload,
        { headers }
      );
      
      toast.success(`Client ${action} successful`);
      setShowUserModal(false);
      setActionReason('');
      setAdjustmentAmount('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    }
  };

  // Merchant control actions
  const handleMerchantAction = async (action) => {
    if (!selectedMerchant) return;
    
    try {
      const payload = {
        action,
        reason: actionReason || undefined
      };
      
      if (action === 'update_cash_limit') {
        payload.cash_debit_limit = cashLimitSettings.cash_debit_limit;
        payload.cash_grace_period_days = cashLimitSettings.cash_grace_period_days;
        payload.max_cash_cashback_rate = cashLimitSettings.max_cash_cashback_rate;
      }
      
      await axios.post(
        `${API_URL}/api/sdm/admin/merchants/${selectedMerchant.id}/control`,
        payload,
        { headers }
      );
      
      toast.success(`Merchant ${action} successful`);
      setShowMerchantModal(false);
      setActionReason('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    }
  };

  const handleVerifyMerchant = async (merchantId, verify) => {
    try {
      await axios.put(`${API_URL}/api/sdm/admin/merchants/${merchantId}/verify`, 
        { is_verified: verify },
        { headers }
      );
      toast.success(verify ? 'Merchant verified' : 'Merchant unverified');
      fetchData();
    } catch (error) {
      toast.error('Failed to update merchant');
    }
  };

  const openUserModal = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
    setActionReason('');
    setAdjustmentAmount('');
  };

  const openMerchantModal = (merchant) => {
    setSelectedMerchant(merchant);
    setCashLimitSettings({
      cash_debit_limit: merchant.cash_debit_limit || 5000,
      cash_grace_period_days: merchant.cash_grace_period_days || 3,
      max_cash_cashback_rate: merchant.max_cash_cashback_rate || 15
    });
    setShowMerchantModal(true);
    setActionReason('');
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm)
  );

  const filteredMerchants = merchants.filter(m => 
    m.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone?.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="users-merchants-panel">
      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'users' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
            }`}
          >
            <Users size={16} />
            Clients ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('merchants')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'merchants' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
            }`}
          >
            <Store size={16} />
            Merchants ({merchants.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'logs' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
            }`}
          >
            <History size={16} />
            Action Logs
          </button>
        </div>
        
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      {activeTab !== 'logs' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'users' ? 'Search clients by name or phone...' : 'Search merchants by name or phone...'}
            className="pl-10"
          />
        </div>
      )}

      {/* Users List */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Phone</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Balance</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Wallet</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Joined</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No clients found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className={`hover:bg-slate-50 ${user.is_blocked || user.is_suspended ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            user.is_blocked ? 'bg-red-100' : user.is_suspended ? 'bg-amber-100' : 'bg-blue-100'
                          }`}>
                            <Users size={14} className={`${
                              user.is_blocked ? 'text-red-600' : user.is_suspended ? 'text-amber-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <span className="font-medium">{user.full_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{user.phone}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">
                        GHS {(user.wallet_available || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {user.is_blocked ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                            <Ban size={12} /> Blocked
                          </span>
                        ) : user.is_suspended ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 flex items-center gap-1 w-fit">
                            <Pause size={12} /> Suspended
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit">
                            <CheckCircle size={12} /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.wallet_frozen ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Frozen</span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">Normal</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openUserModal(user)}
                          className="h-7 text-xs gap-1"
                        >
                          <Settings size={12} />
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Merchants List */}
      {activeTab === 'merchants' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Business</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Phone</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Cashback</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Cash Balance</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Cash Limit</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Verified</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No merchants found
                    </td>
                  </tr>
                ) : (
                  filteredMerchants.map((merchant) => (
                    <tr key={merchant.id} className={`hover:bg-slate-50 ${merchant.is_deleted ? 'bg-slate-100' : merchant.is_blocked || merchant.is_suspended ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            merchant.is_deleted ? 'bg-slate-200' : merchant.is_blocked ? 'bg-red-100' : merchant.is_suspended ? 'bg-amber-100' : 'bg-cyan-100'
                          }`}>
                            <Store size={14} className={`${
                              merchant.is_deleted ? 'text-slate-500' : merchant.is_blocked ? 'text-red-600' : merchant.is_suspended ? 'text-amber-600' : 'text-cyan-600'
                            }`} />
                          </div>
                          <div>
                            <span className="font-medium block">{merchant.business_name || 'N/A'}</span>
                            <span className="text-xs text-slate-500">{merchant.business_type}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{merchant.phone}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">
                        {merchant.cashback_rate || 5}%
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${(merchant.cash_debit_balance || 0) < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                          GHS {(merchant.cash_debit_balance || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        GHS {merchant.cash_debit_limit || 5000}
                      </td>
                      <td className="px-4 py-3">
                        {merchant.is_deleted ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-200 text-slate-700 flex items-center gap-1 w-fit">
                            <Trash2 size={12} /> Deleted
                          </span>
                        ) : merchant.is_blocked ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                            <Ban size={12} /> Blocked
                          </span>
                        ) : merchant.is_suspended ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 flex items-center gap-1 w-fit">
                            <Pause size={12} /> Suspended
                          </span>
                        ) : !merchant.cash_mode_enabled ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600 flex items-center gap-1 w-fit">
                            Cash Off
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit">
                            <CheckCircle size={12} /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {merchant.is_verified ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleVerifyMerchant(merchant.id, false)}
                            className="h-6 text-xs gap-1 text-emerald-600"
                          >
                            <CheckCircle size={12} />
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={() => handleVerifyMerchant(merchant.id, true)}
                            className="h-6 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            Verify
                          </Button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openMerchantModal(merchant)}
                          className="h-7 text-xs gap-1"
                        >
                          <Settings size={12} />
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Admin</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Action</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Target</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actionLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No action logs found
                    </td>
                  </tr>
                ) : (
                  actionLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs">{log.admin_email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          log.action === 'block' ? 'bg-red-100 text-red-700' :
                          log.action === 'unblock' ? 'bg-emerald-100 text-emerald-700' :
                          log.action === 'suspend' ? 'bg-amber-100 text-amber-700' :
                          log.action === 'freeze_wallet' ? 'bg-blue-100 text-blue-700' :
                          log.action === 'delete' ? 'bg-slate-200 text-slate-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">
                          <span className={`px-1 py-0.5 rounded ${log.target_type === 'merchant' ? 'bg-cyan-50 text-cyan-700' : 'bg-blue-50 text-blue-700'}`}>
                            {log.target_type}
                          </span>
                          {' '}{log.target_identifier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                        {log.reason || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <Users className="w-8 h-8 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-blue-900">{users.length}</p>
          <p className="text-sm text-blue-600">Total Clients</p>
        </div>
        <div className="bg-cyan-50 rounded-xl p-4">
          <Store className="w-8 h-8 text-cyan-600 mb-2" />
          <p className="text-2xl font-bold text-cyan-900">{merchants.length}</p>
          <p className="text-sm text-cyan-600">Total Merchants</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <Ban className="w-8 h-8 text-red-600 mb-2" />
          <p className="text-2xl font-bold text-red-900">
            {users.filter(u => u.is_blocked).length + merchants.filter(m => m.is_blocked).length}
          </p>
          <p className="text-sm text-red-600">Blocked</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <AlertTriangle className="w-8 h-8 text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-amber-900">
            {merchants.filter(m => (m.cash_debit_balance || 0) < -1000).length}
          </p>
          <p className="text-sm text-amber-600">Cash Deficit &gt; 1000</p>
        </div>
      </div>

      {/* User Control Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Manage Client</h3>
                <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* User Info */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="font-semibold text-lg">{selectedUser.full_name || 'N/A'}</p>
                <p className="text-sm text-slate-500">{selectedUser.phone}</p>
                <div className="mt-2 flex gap-2">
                  {selectedUser.is_blocked && <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">Blocked</span>}
                  {selectedUser.is_suspended && <span className="px-2 py-1 text-xs rounded bg-amber-100 text-amber-700">Suspended</span>}
                  {selectedUser.wallet_frozen && <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">Wallet Frozen</span>}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500">Balance</p>
                    <p className="font-semibold text-emerald-600">GHS {(selectedUser.wallet_available || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Earned</p>
                    <p className="font-semibold">GHS {(selectedUser.total_earned || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              {/* Reason Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason (optional)</label>
                <Input
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter reason for action..."
                />
              </div>
              
              {/* Account Actions */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Account Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {!selectedUser.is_blocked ? (
                    <Button 
                      variant="outline" 
                      className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleClientAction('block')}
                    >
                      <Ban size={16} /> Block
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleClientAction('unblock')}
                    >
                      <Play size={16} /> Unblock
                    </Button>
                  )}
                  {!selectedUser.is_suspended ? (
                    <Button 
                      variant="outline" 
                      className="gap-2 border-amber-200 text-amber-600 hover:bg-amber-50"
                      onClick={() => handleClientAction('suspend')}
                    >
                      <Pause size={16} /> Suspend
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleClientAction('unsuspend')}
                    >
                      <Play size={16} /> Unsuspend
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Wallet Actions */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Wallet Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {!selectedUser.wallet_frozen ? (
                    <Button 
                      variant="outline" 
                      className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={() => handleClientAction('freeze_wallet')}
                    >
                      <Wallet size={16} /> Freeze Wallet
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleClientAction('unfreeze_wallet')}
                    >
                      <Wallet size={16} /> Unfreeze
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Balance Adjustment */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Balance Adjustment</p>
                <div className="flex gap-2">
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="add">Add</option>
                    <option value="subtract">Subtract</option>
                    <option value="set">Set to</option>
                  </select>
                  <Input
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    placeholder="Amount"
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleClientAction('adjust_balance')}
                    disabled={!adjustmentAmount}
                    className="gap-2"
                  >
                    <DollarSign size={16} /> Apply
                  </Button>
                </div>
              </div>
              
              {/* Delete Account */}
              <div className="pt-4 border-t border-slate-200">
                <Button 
                  variant="outline" 
                  className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
                      handleClientAction('delete');
                    }
                  }}
                >
                  <Trash2 size={16} /> Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merchant Control Modal */}
      {showMerchantModal && selectedMerchant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Manage Merchant</h3>
                <button onClick={() => setShowMerchantModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Merchant Info */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="font-semibold text-lg">{selectedMerchant.business_name}</p>
                <p className="text-sm text-slate-500">{selectedMerchant.phone} • {selectedMerchant.business_type}</p>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {selectedMerchant.is_verified && <span className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700">Verified</span>}
                  {selectedMerchant.is_deleted && <span className="px-2 py-1 text-xs rounded bg-slate-200 text-slate-700">Deleted</span>}
                  {selectedMerchant.is_blocked && <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">Blocked</span>}
                  {selectedMerchant.is_suspended && <span className="px-2 py-1 text-xs rounded bg-amber-100 text-amber-700">Suspended</span>}
                  {!selectedMerchant.cash_mode_enabled && <span className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-600">Cash Mode Off</span>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500">Cashback Rate</p>
                    <p className="font-semibold text-emerald-600">{selectedMerchant.cashback_rate}%</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Cash Balance</p>
                    <p className={`font-semibold ${(selectedMerchant.cash_debit_balance || 0) < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      GHS {(selectedMerchant.cash_debit_balance || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Cash Limit</p>
                    <p className="font-semibold">GHS {selectedMerchant.cash_debit_limit || 5000}</p>
                  </div>
                </div>
              </div>
              
              {/* Reason Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason (optional)</label>
                <Input
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter reason for action..."
                />
              </div>
              
              {/* Account Actions */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Account Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {!selectedMerchant.is_blocked ? (
                    <Button 
                      variant="outline" 
                      className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleMerchantAction('block')}
                    >
                      <Ban size={16} /> Block
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleMerchantAction('unblock')}
                    >
                      <Play size={16} /> Unblock
                    </Button>
                  )}
                  {!selectedMerchant.is_suspended ? (
                    <Button 
                      variant="outline" 
                      className="gap-2 border-amber-200 text-amber-600 hover:bg-amber-50"
                      onClick={() => handleMerchantAction('suspend')}
                    >
                      <Pause size={16} /> Suspend
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleMerchantAction('unsuspend')}
                    >
                      <Play size={16} /> Unsuspend
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Cash Mode */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Cash Mode</p>
                <Button 
                  variant="outline" 
                  className={`w-full gap-2 ${selectedMerchant.cash_mode_enabled 
                    ? 'border-amber-200 text-amber-600 hover:bg-amber-50' 
                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                  }`}
                  onClick={() => handleMerchantAction('toggle_cash_mode')}
                >
                  {selectedMerchant.cash_mode_enabled ? (
                    <><Pause size={16} /> Disable Cash Mode</>
                  ) : (
                    <><Play size={16} /> Enable Cash Mode</>
                  )}
                </Button>
              </div>
              
              {/* Cash Limit Settings */}
              <div className="space-y-3 bg-amber-50 rounded-xl p-4 border border-amber-200">
                <p className="text-sm font-medium text-amber-800">Cash Debit Settings</p>
                
                <div>
                  <label className="block text-xs text-amber-700 mb-1">Cash Debit Limit (GHS)</label>
                  <Input
                    type="number"
                    value={cashLimitSettings.cash_debit_limit}
                    onChange={(e) => setCashLimitSettings({...cashLimitSettings, cash_debit_limit: parseFloat(e.target.value) || 0})}
                    className="bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-amber-700 mb-1">Grace Period (days)</label>
                  <Input
                    type="number"
                    value={cashLimitSettings.cash_grace_period_days}
                    onChange={(e) => setCashLimitSettings({...cashLimitSettings, cash_grace_period_days: parseInt(e.target.value) || 0})}
                    className="bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-amber-700 mb-1">Max Cash Cashback Rate (%)</label>
                  <Input
                    type="number"
                    value={cashLimitSettings.max_cash_cashback_rate}
                    onChange={(e) => setCashLimitSettings({...cashLimitSettings, max_cash_cashback_rate: parseFloat(e.target.value) || 0})}
                    className="bg-white"
                  />
                </div>
                
                <Button 
                  className="w-full gap-2"
                  onClick={() => handleMerchantAction('update_cash_limit')}
                >
                  <Save size={16} /> Save Cash Settings
                </Button>
              </div>
              
              {/* Delete Merchant (Super Admin Only) */}
              <div className="pt-4 border-t border-slate-200">
                <Button 
                  variant="outline" 
                  className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce marchand ? Cette action ne peut pas être annulée et le marchand ne sera plus visible pour les clients.')) {
                      handleMerchantAction('delete');
                    }
                  }}
                  data-testid="delete-merchant-btn"
                >
                  <Trash2 size={16} /> Delete Merchant
                </Button>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  (Réservé aux Super Admins)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { 
  Banknote, Settings, Unlock, RefreshCw, Loader2,
  AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SettingsDebit({ token }) {
  const [isLoading, setIsLoading] = useState(false);
  const [merchantDebitOverview, setMerchantDebitOverview] = useState({ accounts: [], summary: {} });
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [debitSettingsForm, setDebitSettingsForm] = useState({ debit_limit: 0, settlement_days: 14 });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchMerchantDebitOverview();
  }, []);

  const fetchMerchantDebitOverview = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/api/admin/merchants/debit-overview`, { headers });
      setMerchantDebitOverview(res.data);
    } catch (error) {
      console.error('Error fetching debit overview:', error);
      toast.error('Failed to load debit overview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDebitSettings = (account) => {
    setSelectedMerchant(account);
    setDebitSettingsForm({
      debit_limit: account.debit_limit || 0,
      settlement_days: account.settlement_days || 14
    });
    setShowSettingsModal(true);
  };

  const handleSaveDebitSettings = async () => {
    if (!selectedMerchant) return;
    
    try {
      await axios.put(
        `${API_URL}/api/admin/merchants/${selectedMerchant.merchant_id}/debit-settings`,
        debitSettingsForm,
        { headers }
      );
      toast.success('Debit settings updated');
      setShowSettingsModal(false);
      fetchMerchantDebitOverview();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleUnblockMerchant = async (merchantId) => {
    try {
      await axios.post(
        `${API_URL}/api/admin/merchants/${merchantId}/unblock-debit`,
        {},
        { headers }
      );
      toast.success('Merchant unblocked');
      fetchMerchantDebitOverview();
    } catch (error) {
      toast.error('Failed to unblock merchant');
    }
  };

  const getStatusBadge = (status, isBlocked) => {
    if (isBlocked || status === 'blocked') {
      return <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">Blocked</span>;
    }
    if (status === 'warning') {
      return <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400">Warning</span>;
    }
    if (status === 'active') {
      return <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">Active</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-400">Not Configured</span>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Merchants with Cash</p>
          <p className="text-2xl font-bold text-white">{merchantDebitOverview.summary?.merchants_with_cash || 0}</p>
          <p className="text-slate-500 text-xs">out of {merchantDebitOverview.summary?.total_merchants || 0} total</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Banknote size={16} className="text-emerald-400" />
            <p className="text-slate-400 text-sm">Total Cash Volume</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            GHS {(merchantDebitOverview.summary?.total_cash_volume || 0).toLocaleString()}
          </p>
          <p className="text-slate-500 text-xs">
            Cashback: GHS {(merchantDebitOverview.summary?.total_cash_cashback || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-slate-800 border border-red-500/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Debt (Owed by SDM)</p>
          <p className="text-2xl font-bold text-red-400">
            GHS {merchantDebitOverview.summary?.total_debt?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-slate-800 border border-amber-500/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Blocked / Warning</p>
          <p className="text-2xl font-bold text-amber-400">
            {merchantDebitOverview.summary?.blocked_count || 0} / {merchantDebitOverview.summary?.warning_count || 0}
          </p>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button 
          onClick={fetchMerchantDebitOverview} 
          variant="outline" 
          className="border-slate-600" 
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="animate-spin mr-2" size={16} />
          ) : (
            <RefreshCw size={16} className="mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Merchants Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="text-left p-4">Merchant</th>
                <th className="text-right p-4">Cash Volume</th>
                <th className="text-right p-4">Balance</th>
                <th className="text-right p-4">Debit Limit</th>
                <th className="text-center p-4">Usage</th>
                <th className="text-center p-4">Status</th>
                <th className="text-center p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {merchantDebitOverview.accounts?.length > 0 ? (
                merchantDebitOverview.accounts.map((account, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="p-4">
                      <div>
                        <p className="text-white font-medium">{account.business_name || 'Unknown'}</p>
                        <p className="text-slate-500 text-xs">{account.phone}</p>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div>
                        <p className="text-emerald-400 font-semibold">GHS {account.cash_volume?.toFixed(2) || '0.00'}</p>
                        <p className="text-slate-500 text-xs">{account.cash_transactions || 0} txns</p>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={account.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        GHS {account.balance?.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 text-right text-amber-400">
                      GHS {account.debit_limit?.toFixed(2) || '0.00'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              account.usage_percentage >= 100 ? 'bg-red-500' :
                              account.usage_percentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, account.usage_percentage || 0)}%` }}
                          />
                        </div>
                        <span className="text-slate-400 text-xs">{account.usage_percentage?.toFixed(0) || 0}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(account.status, account.is_blocked)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDebitSettings(account)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Settings size={16} />
                        </Button>
                        {account.is_blocked && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUnblockMerchant(account.merchant_id)}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            <Unlock size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-500">
                    {isLoading ? 'Loading...' : 'No merchant debit accounts found. Click Refresh to load.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && selectedMerchant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold text-lg mb-4">
              Debit Settings: {selectedMerchant.business_name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Debit Limit (GHS)</Label>
                <Input
                  type="number"
                  value={debitSettingsForm.debit_limit}
                  onChange={(e) => setDebitSettingsForm({
                    ...debitSettingsForm, 
                    debit_limit: parseFloat(e.target.value)
                  })}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-slate-500 text-xs mt-1">
                  Maximum amount of cashback the merchant can give on cash payments before repayment
                </p>
              </div>
              
              <div>
                <Label className="text-slate-400">Settlement Period (Days)</Label>
                <Input
                  type="number"
                  value={debitSettingsForm.settlement_days}
                  onChange={(e) => setDebitSettingsForm({
                    ...debitSettingsForm, 
                    settlement_days: parseInt(e.target.value)
                  })}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowSettingsModal(false)}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDebitSettings}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

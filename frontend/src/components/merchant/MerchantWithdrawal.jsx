/**
 * MerchantWithdrawal Component
 * ============================
 * Allows merchants to view their balance and withdraw funds.
 * Supports Manual and Automatic withdrawal modes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Wallet, 
  ArrowDownToLine, 
  Send, 
  Settings2, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Loader2,
  Phone,
  Building2,
  RefreshCw,
  Calendar,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  TrendingUp,
  History
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { API_URL } from '../../config/api';

export default function MerchantWithdrawal({ token, merchant, payoutSettings, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({
    available: 0,
    pending: 0,
    total_received: 0,
    total_withdrawn: 0
  });
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [autoWithdrawEnabled, setAutoWithdrawEnabled] = useState(false);
  const [autoWithdrawSettings, setAutoWithdrawSettings] = useState({
    min_amount: 50,
    frequency: 'daily', // daily, weekly, instant
    destination: 'momo' // momo or bank
  });
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSavingAutoSettings, setIsSavingAutoSettings] = useState(false);

  // Fetch merchant balance and withdrawal history
  const fetchBalanceData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch balance
      const balanceRes = await axios.get(`${API_URL}/api/merchants/balance`, { headers });
      setBalance(balanceRes.data);
      
      // Fetch auto-withdraw settings
      const settingsRes = await axios.get(`${API_URL}/api/merchants/auto-withdraw/settings`, { headers });
      if (settingsRes.data) {
        setAutoWithdrawEnabled(settingsRes.data.enabled || false);
        setAutoWithdrawSettings({
          min_amount: settingsRes.data.min_amount || 50,
          frequency: settingsRes.data.frequency || 'daily',
          destination: settingsRes.data.destination || 'momo'
        });
      }
      
      // Fetch recent withdrawals
      const historyRes = await axios.get(`${API_URL}/api/merchants/withdrawals?limit=5`, { headers });
      setWithdrawalHistory(historyRes.data.withdrawals || []);
      
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBalanceData();
  }, [fetchBalanceData]);

  // Manual withdrawal
  const handleManualWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 5) {
      toast.error('Minimum withdrawal is GHS 5');
      return;
    }
    if (amount > balance.available) {
      toast.error('Insufficient balance');
      return;
    }

    setIsWithdrawing(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(
        `${API_URL}/api/merchants/withdraw`,
        { amount },
        { headers }
      );
      
      if (res.data.success) {
        toast.success(`Withdrawal of GHS ${amount.toFixed(2)} initiated!`);
        setWithdrawAmount('');
        fetchBalanceData();
        onRefresh?.();
      } else {
        toast.error(res.data.error || 'Withdrawal failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Save auto-withdraw settings
  const handleSaveAutoSettings = async () => {
    setIsSavingAutoSettings(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/api/merchants/auto-withdraw/settings`,
        {
          enabled: autoWithdrawEnabled,
          ...autoWithdrawSettings
        },
        { headers }
      );
      toast.success('Auto-withdraw settings saved!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setIsSavingAutoSettings(false);
    }
  };

  // Toggle auto-withdraw
  const toggleAutoWithdraw = () => {
    setAutoWithdrawEnabled(!autoWithdrawEnabled);
  };

  const formatCurrency = (amount) => `GHS ${(amount || 0).toFixed(2)}`;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-emerald-400">{formatCurrency(balance.available)}</p>
              <p className="text-xs text-slate-500 mt-1">Ready to withdraw</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/30 rounded-xl flex items-center justify-center">
              <Wallet className="text-emerald-400" size={24} />
            </div>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Pending</p>
              <p className="text-3xl font-bold text-amber-400">{formatCurrency(balance.pending)}</p>
              <p className="text-xs text-slate-500 mt-1">Processing payments</p>
            </div>
            <div className="w-12 h-12 bg-amber-500/30 rounded-xl flex items-center justify-center">
              <Clock className="text-amber-400" size={24} />
            </div>
          </div>
        </div>

        {/* Total Received */}
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Received</p>
              <p className="text-3xl font-bold text-purple-400">{formatCurrency(balance.total_received)}</p>
              <p className="text-xs text-slate-500 mt-1">All time earnings</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-purple-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Withdraw */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Send className="text-blue-400" size={24} />
            </div>
            <div>
              <h3 className="text-white text-lg font-semibold">Manual Withdraw</h3>
              <p className="text-slate-400 text-sm">Retirer vers votre compte</p>
            </div>
          </div>

          {/* Destination Info */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-5">
            <p className="text-slate-400 text-xs mb-2">Destination du retrait</p>
            {payoutSettings?.preferred_payout_method === 'bank' ? (
              <div className="flex items-center gap-3">
                <Building2 className="text-blue-400" size={20} />
                <div>
                  <p className="text-white font-medium">{payoutSettings?.bank_name || 'Bank Account'}</p>
                  <p className="text-slate-400 text-sm">****{(payoutSettings?.bank_account || '').slice(-4)}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Phone className="text-purple-400" size={20} />
                <div>
                  <p className="text-white font-medium">{payoutSettings?.momo_network || 'Mobile Money'}</p>
                  <p className="text-slate-400 text-sm">{payoutSettings?.momo_number || 'Non configuré'}</p>
                </div>
              </div>
            )}
            {!payoutSettings?.momo_number && payoutSettings?.preferred_payout_method !== 'bank' && (
              <p className="text-amber-400 text-xs mt-2">⚠️ Configurez votre MoMo dans Settings &gt; Payment</p>
            )}
          </div>

          {/* Amount Selection */}
          <div className="space-y-4">
            <div>
              <label className="text-slate-300 text-sm block mb-2">Montant à retirer (GHS)</label>
              
              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[50, 100, 500].filter(a => a <= balance.available).map(amt => (
                  <button
                    key={amt}
                    onClick={() => setWithdrawAmount(amt.toString())}
                    className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      withdrawAmount === amt.toString() 
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
                <button
                  onClick={() => setWithdrawAmount(balance.available.toString())}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    parseFloat(withdrawAmount) === balance.available 
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  TOUT
                </button>
              </div>
              
              {/* Custom Amount Input */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">GHS</span>
                <Input
                  type="number"
                  placeholder="Entrez le montant"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="pl-14 bg-slate-900 border-slate-600 text-white text-lg font-semibold h-12"
                  max={balance.available}
                  min={5}
                  data-testid="withdraw-amount-input"
                />
              </div>
              
              {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                <p className="text-slate-400 text-xs mt-2">
                  Vous recevrez: <span className="text-emerald-400 font-semibold">{formatCurrency(parseFloat(withdrawAmount))}</span>
                </p>
              )}
            </div>

            {/* Withdraw Button */}
            <Button
              onClick={handleManualWithdraw}
              disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) < 5 || parseFloat(withdrawAmount) > balance.available || !payoutSettings?.momo_number}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
              data-testid="confirm-withdraw-btn"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <ArrowDownToLine className="mr-2" size={20} />
                  Retirer {withdrawAmount ? formatCurrency(parseFloat(withdrawAmount)) : ''}
                </>
              )}
            </Button>
            
            {balance.available < 5 && (
              <p className="text-amber-400 text-sm text-center">
                Solde minimum requis: GHS 5.00
              </p>
            )}
          </div>
        </div>

        {/* Automatic Withdraw */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Settings2 className="text-purple-400" size={24} />
              </div>
              <div>
                <h3 className="text-white text-lg font-semibold">Automatic Withdraw</h3>
                <p className="text-slate-400 text-sm">Retraits automatiques programmés</p>
              </div>
            </div>
            <button
              onClick={toggleAutoWithdraw}
              className={`p-1 rounded-lg transition-colors ${autoWithdrawEnabled ? 'text-emerald-400' : 'text-slate-500'}`}
              data-testid="auto-withdraw-toggle"
            >
              {autoWithdrawEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
            </button>
          </div>

          {autoWithdrawEnabled && (
            <div className="space-y-4">
              {/* Destination Info */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 mb-2">
                <p className="text-slate-400 text-xs mb-1">Destination</p>
                <p className="text-white text-sm">
                  {autoWithdrawSettings.destination === 'momo' 
                    ? `MoMo: ${payoutSettings?.momo_number || 'Non configuré'}`
                    : `Bank: ${payoutSettings?.bank_name || 'Non configuré'}`
                  }
                </p>
              </div>

              {/* Frequency */}
              <div>
                <label className="text-slate-300 text-sm block mb-2">Fréquence</label>
                <select
                  value={autoWithdrawSettings.frequency}
                  onChange={(e) => setAutoWithdrawSettings({...autoWithdrawSettings, frequency: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2.5"
                >
                  <option value="instant">Instantané (après chaque paiement)</option>
                  <option value="daily">Journalier (à minuit)</option>
                  <option value="weekly">Hebdomadaire (chaque dimanche)</option>
                </select>
              </div>

              {/* Minimum Amount */}
              <div>
                <label className="text-slate-300 text-sm block mb-2">Montant minimum (GHS)</label>
                <Input
                  type="number"
                  value={autoWithdrawSettings.min_amount}
                  onChange={(e) => setAutoWithdrawSettings({...autoWithdrawSettings, min_amount: parseFloat(e.target.value) || 0})}
                  className="bg-slate-900 border-slate-600 text-white"
                  min={5}
                />
                <p className="text-xs text-slate-500 mt-1">Retrait auto quand le solde dépasse ce montant</p>
              </div>

              {/* Destination Choice */}
              <div>
                <label className="text-slate-300 text-sm block mb-2">Envoyer vers</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAutoWithdrawSettings({...autoWithdrawSettings, destination: 'momo'})}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                      autoWithdrawSettings.destination === 'momo'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Phone size={18} />
                    MoMo
                  </button>
                  <button
                    onClick={() => setAutoWithdrawSettings({...autoWithdrawSettings, destination: 'bank'})}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                      autoWithdrawSettings.destination === 'bank'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Building2 size={18} />
                    Bank
                  </button>
                </div>
              </div>

              <Button
                onClick={handleSaveAutoSettings}
                disabled={isSavingAutoSettings}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isSavingAutoSettings ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2" size={16} />
                    Save Auto-Withdraw Settings
                  </>
                )}
              </Button>
            </div>
          )}

          {!autoWithdrawEnabled && (
            <p className="text-slate-400 text-sm text-center py-4">
              Enable to automatically send funds to your MoMo or Bank account
            </p>
          )}
        </div>
      </div>

      {/* Recent Withdrawals */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <History className="text-slate-400" size={18} />
            <h3 className="text-white font-semibold">Recent Withdrawals</h3>
          </div>
          <button
            onClick={fetchBalanceData}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {withdrawalHistory.length === 0 ? (
          <div className="p-8 text-center">
            <ArrowDownToLine className="text-slate-600 mx-auto mb-2" size={32} />
            <p className="text-slate-400">No withdrawals yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {withdrawalHistory.map((w, idx) => (
              <div key={w.id || idx} className="flex items-center justify-between px-5 py-3 hover:bg-slate-700/30">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    w.status === 'completed' ? 'bg-emerald-500/20' :
                    w.status === 'pending' ? 'bg-amber-500/20' : 'bg-red-500/20'
                  }`}>
                    {w.status === 'completed' ? <CheckCircle className="text-emerald-400" size={16} /> :
                     w.status === 'pending' ? <Clock className="text-amber-400" size={16} /> :
                     <AlertCircle className="text-red-400" size={16} />}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{formatCurrency(w.amount)}</p>
                    <p className="text-slate-500 text-xs">{formatDate(w.created_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${
                    w.status === 'completed' ? 'text-emerald-400' :
                    w.status === 'pending' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {w.status?.charAt(0).toUpperCase() + w.status?.slice(1)}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {w.payout_method === 'bank' ? 'Bank' : 'MoMo'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

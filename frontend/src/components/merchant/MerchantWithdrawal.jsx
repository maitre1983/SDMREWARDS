/**
 * MerchantWithdrawal Component
 * ============================
 * Simplified payout destination configuration.
 * 
 * SDM doesn't hold merchant funds - after each customer payment,
 * the merchant's share is sent automatically to their MoMo or Bank account.
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Wallet, 
  ArrowDownToLine, 
  Send, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Loader2,
  Phone,
  Building2,
  RefreshCw,
  TrendingUp,
  History,
  Zap,
  Info
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
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Fetch merchant balance and payout history
  const fetchBalanceData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch balance
      const balanceRes = await axios.get(`${API_URL}/api/merchants/balance`, { headers });
      setBalance(balanceRes.data);
      
      // Fetch recent payouts/withdrawals
      const historyRes = await axios.get(`${API_URL}/api/merchants/withdrawals?limit=10`, { headers });
      setPayoutHistory(historyRes.data.withdrawals || []);
      
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBalanceData();
  }, [fetchBalanceData]);

  // Manual withdrawal (for any remaining balance)
  const handleManualWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 5) {
      toast.error('Minimum: GHS 5');
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

  const formatCurrency = (amount) => `GHS ${(amount || 0).toFixed(2)}`;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
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
      {/* Auto-Payout Info Banner */}
      <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-12 h-12 bg-emerald-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap className="text-emerald-400" size={24} />
          </div>
          <div className="flex-1 w-full">
            <h3 className="text-white text-lg font-semibold mb-1">Automatic Payouts Enabled</h3>
            <p className="text-slate-300 text-sm mb-3">
              After each customer payment, your share is sent <span className="text-emerald-400 font-semibold">instantly</span> to your configured account.
            </p>
            <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-3">
              {payoutSettings?.preferred_payout_method === 'bank' ? (
                <>
                  <Building2 className="text-blue-400 flex-shrink-0" size={20} />
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{payoutSettings?.bank_name || 'Bank Account'}</p>
                    <p className="text-slate-400 text-sm">****{(payoutSettings?.bank_account || '').slice(-4)}</p>
                  </div>
                </>
              ) : (
                <>
                  <Phone className="text-purple-400 flex-shrink-0" size={20} />
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{payoutSettings?.momo_network || 'Mobile Money'}</p>
                    <p className="text-slate-400 text-sm">{payoutSettings?.momo_number || 'Not configured'}</p>
                  </div>
                </>
              )}
              {payoutSettings?.momo_number || payoutSettings?.bank_account ? (
                <CheckCircle className="text-emerald-400 ml-auto flex-shrink-0" size={20} />
              ) : (
                <AlertCircle className="text-amber-400 ml-auto flex-shrink-0" size={20} />
              )}
            </div>
            {!payoutSettings?.momo_number && payoutSettings?.preferred_payout_method !== 'bank' && (
              <p className="text-amber-400 text-xs mt-2 flex items-center gap-1">
                <Info size={14} />
                Configure your MoMo in Settings &gt; Payment
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-slate-400 text-sm mb-1">Available Balance</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-400 truncate">{formatCurrency(balance.available)}</p>
              <p className="text-xs text-slate-500 mt-1">Ready to withdraw</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Wallet className="text-emerald-400" size={20} />
            </div>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-slate-400 text-sm mb-1">Pending</p>
              <p className="text-2xl sm:text-3xl font-bold text-amber-400 truncate">{formatCurrency(balance.pending)}</p>
              <p className="text-xs text-slate-500 mt-1">Processing payments</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="text-amber-400" size={20} />
            </div>
          </div>
        </div>

        {/* Total Received */}
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4 sm:p-5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-slate-400 text-sm mb-1">Total Received</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-400 truncate">{formatCurrency(balance.total_received)}</p>
              <p className="text-xs text-slate-500 mt-1">Lifetime earnings</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="text-purple-400" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Manual Withdraw Section - Only shown if there's available balance */}
      {balance.available >= 5 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Send className="text-blue-400" size={20} />
            </div>
            <div>
              <h3 className="text-white font-semibold">Manual Withdrawal</h3>
              <p className="text-slate-400 text-xs">Withdraw remaining balance to your account</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quick Amount Buttons */}
            <div>
              <label className="text-slate-300 text-sm block mb-2">Amount (GHS)</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[50, 100, 500].filter(a => a <= balance.available).map(amt => (
                  <button
                    key={amt}
                    onClick={() => setWithdrawAmount(amt.toString())}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${
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
                  className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                    parseFloat(withdrawAmount) === balance.available 
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  ALL
                </button>
              </div>
              
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">GHS</span>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="pl-14 bg-slate-900 border-slate-600 text-white h-11"
                  max={balance.available}
                  min={5}
                  data-testid="withdraw-amount-input"
                />
              </div>
            </div>

            {/* Destination & Button */}
            <div className="flex flex-col justify-end">
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 mb-3">
                <p className="text-slate-500 text-xs mb-1">Destination</p>
                {payoutSettings?.preferred_payout_method === 'bank' ? (
                  <div className="flex items-center gap-2">
                    <Building2 className="text-blue-400 flex-shrink-0" size={16} />
                    <span className="text-white text-sm truncate">{payoutSettings?.bank_name} - ****{(payoutSettings?.bank_account || '').slice(-4)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone className="text-purple-400 flex-shrink-0" size={16} />
                    <span className="text-white text-sm truncate">{payoutSettings?.momo_network} - {payoutSettings?.momo_number}</span>
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleManualWithdraw}
                disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) < 5 || parseFloat(withdrawAmount) > balance.available}
                className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                data-testid="confirm-withdraw-btn"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="mr-2" size={18} />
                    Withdraw {withdrawAmount ? formatCurrency(parseFloat(withdrawAmount)) : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Payouts History */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <History className="text-slate-400" size={18} />
            <h3 className="text-white font-semibold">Payment History</h3>
          </div>
          <button
            onClick={fetchBalanceData}
            className="text-slate-400 hover:text-white transition-colors p-2"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {payoutHistory.length === 0 ? (
          <div className="p-8 text-center">
            <ArrowDownToLine className="text-slate-600 mx-auto mb-2" size={32} />
            <p className="text-slate-400">No payments yet</p>
            <p className="text-slate-500 text-sm mt-1">Your automatic payouts will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {payoutHistory.map((p, idx) => (
              <div key={p.id || idx} className="flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-slate-700/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    p.status === 'completed' ? 'bg-emerald-500/20' :
                    p.status === 'processing' ? 'bg-amber-500/20' : 'bg-red-500/20'
                  }`}>
                    {p.status === 'completed' ? <CheckCircle className="text-emerald-400" size={16} /> :
                     p.status === 'processing' ? <Clock className="text-amber-400" size={16} /> :
                     <AlertCircle className="text-red-400" size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">{formatCurrency(p.amount)}</p>
                    <p className="text-slate-500 text-xs truncate">{formatDate(p.created_at)}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className={`text-xs font-medium ${
                    p.status === 'completed' ? 'text-emerald-400' :
                    p.status === 'processing' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {p.status === 'completed' ? 'Completed' :
                     p.status === 'processing' ? 'Processing' : 'Failed'}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {p.payout_method === 'bank' ? 'Bank' : 'MoMo'}
                    {p.is_auto && ' • Auto'}
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

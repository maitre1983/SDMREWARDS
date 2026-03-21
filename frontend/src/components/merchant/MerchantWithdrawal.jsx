/**
 * MerchantWithdrawal Component
 * ============================
 * Simplified payout destination configuration.
 * 
 * SDM ne garde pas l'argent du marchand - après chaque paiement client,
 * la part du marchand est envoyée automatiquement vers son compte MoMo ou Bank.
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
      toast.error('Solde insuffisant');
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
        toast.success(`Retrait de GHS ${amount.toFixed(2)} initié!`);
        setWithdrawAmount('');
        fetchBalanceData();
        onRefresh?.();
      } else {
        toast.error(res.data.error || 'Échec du retrait');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Échec du retrait');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatCurrency = (amount) => `GHS ${(amount || 0).toFixed(2)}`;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
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
      {/* Auto-Payout Info Banner */}
      <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-emerald-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap className="text-emerald-400" size={24} />
          </div>
          <div>
            <h3 className="text-white text-lg font-semibold mb-1">Paiements Automatiques Activés</h3>
            <p className="text-slate-300 text-sm mb-3">
              Après chaque paiement client, votre part est envoyée <span className="text-emerald-400 font-semibold">instantanément</span> vers votre compte configuré.
            </p>
            <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-3">
              {payoutSettings?.preferred_payout_method === 'bank' ? (
                <>
                  <Building2 className="text-blue-400" size={20} />
                  <div>
                    <p className="text-white font-medium">{payoutSettings?.bank_name || 'Compte Bancaire'}</p>
                    <p className="text-slate-400 text-sm">****{(payoutSettings?.bank_account || '').slice(-4)}</p>
                  </div>
                </>
              ) : (
                <>
                  <Phone className="text-purple-400" size={20} />
                  <div>
                    <p className="text-white font-medium">{payoutSettings?.momo_network || 'Mobile Money'}</p>
                    <p className="text-slate-400 text-sm">{payoutSettings?.momo_number || 'Non configuré'}</p>
                  </div>
                </>
              )}
              {payoutSettings?.momo_number || payoutSettings?.bank_account ? (
                <CheckCircle className="text-emerald-400 ml-auto" size={20} />
              ) : (
                <AlertCircle className="text-amber-400 ml-auto" size={20} />
              )}
            </div>
            {!payoutSettings?.momo_number && payoutSettings?.preferred_payout_method !== 'bank' && (
              <p className="text-amber-400 text-xs mt-2 flex items-center gap-1">
                <Info size={14} />
                Configurez votre MoMo dans Settings &gt; Payment
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Solde Disponible</p>
              <p className="text-3xl font-bold text-emerald-400">{formatCurrency(balance.available)}</p>
              <p className="text-xs text-slate-500 mt-1">Prêt à retirer</p>
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
              <p className="text-slate-400 text-sm mb-1">En Attente</p>
              <p className="text-3xl font-bold text-amber-400">{formatCurrency(balance.pending)}</p>
              <p className="text-xs text-slate-500 mt-1">Paiements en cours</p>
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
              <p className="text-slate-400 text-sm mb-1">Total Reçu</p>
              <p className="text-3xl font-bold text-purple-400">{formatCurrency(balance.total_received)}</p>
              <p className="text-xs text-slate-500 mt-1">Gains totaux</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-purple-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Manual Withdraw Section - Only shown if there's available balance */}
      {balance.available >= 5 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Send className="text-blue-400" size={20} />
            </div>
            <div>
              <h3 className="text-white font-semibold">Retrait Manuel</h3>
              <p className="text-slate-400 text-xs">Retirer le solde restant vers votre compte</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Amount Buttons */}
            <div>
              <label className="text-slate-300 text-sm block mb-2">Montant (GHS)</label>
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
                  TOUT
                </button>
              </div>
              
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">GHS</span>
                <Input
                  type="number"
                  placeholder="Montant"
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
                    <Building2 className="text-blue-400" size={16} />
                    <span className="text-white text-sm">{payoutSettings?.bank_name} - ****{(payoutSettings?.bank_account || '').slice(-4)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone className="text-purple-400" size={16} />
                    <span className="text-white text-sm">{payoutSettings?.momo_network} - {payoutSettings?.momo_number}</span>
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
                    Traitement...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="mr-2" size={18} />
                    Retirer {withdrawAmount ? formatCurrency(parseFloat(withdrawAmount)) : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Payouts History */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <History className="text-slate-400" size={18} />
            <h3 className="text-white font-semibold">Historique des Paiements</h3>
          </div>
          <button
            onClick={fetchBalanceData}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {payoutHistory.length === 0 ? (
          <div className="p-8 text-center">
            <ArrowDownToLine className="text-slate-600 mx-auto mb-2" size={32} />
            <p className="text-slate-400">Aucun paiement encore</p>
            <p className="text-slate-500 text-sm mt-1">Vos paiements automatiques apparaîtront ici</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {payoutHistory.map((p, idx) => (
              <div key={p.id || idx} className="flex items-center justify-between px-5 py-3 hover:bg-slate-700/30">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    p.status === 'completed' ? 'bg-emerald-500/20' :
                    p.status === 'processing' ? 'bg-amber-500/20' : 'bg-red-500/20'
                  }`}>
                    {p.status === 'completed' ? <CheckCircle className="text-emerald-400" size={16} /> :
                     p.status === 'processing' ? <Clock className="text-amber-400" size={16} /> :
                     <AlertCircle className="text-red-400" size={16} />}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{formatCurrency(p.amount)}</p>
                    <p className="text-slate-500 text-xs">{formatDate(p.created_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${
                    p.status === 'completed' ? 'text-emerald-400' :
                    p.status === 'processing' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {p.status === 'completed' ? 'Complété' :
                     p.status === 'processing' ? 'En cours' : 'Échoué'}
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

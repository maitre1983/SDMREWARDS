import React, { useState, useEffect } from 'react';
import {
  DollarSign, ArrowUpRight, Wallet, RefreshCw, Send,
  TrendingUp, History, CheckCircle, XCircle, Clock,
  Settings, Percent
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SDMCommissionsPanel({ token, currentAdmin }) {
  const [commissions, setCommissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    momo_number: '',
    momo_provider: 'MTN',
    account_name: ''
  });
  
  // Commission rate state
  const [commissionRate, setCommissionRate] = useState(null);
  const [newRate, setNewRate] = useState('');
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchCommissions();
    fetchCommissionRate();
  }, []);

  const fetchCommissions = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/api/sdm/admin/commissions`, { headers });
      setCommissions(res.data);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      toast.error('Erreur de chargement des commissions');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchCommissionRate = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/commission-rate`, { headers });
      setCommissionRate(res.data.rate_percentage);
      setNewRate(res.data.rate_percentage.toString());
    } catch (error) {
      console.error('Error fetching commission rate:', error);
    }
  };
  
  const handleUpdateRate = async () => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate < 0.5 || rate > 20) {
      toast.error('Le taux doit être entre 0.5% et 20%');
      return;
    }
    
    try {
      setIsUpdatingRate(true);
      const res = await axios.put(`${API_URL}/api/sdm/admin/commission-rate`, { rate }, { headers });
      toast.success(res.data.message);
      setCommissionRate(rate);
      setShowRateForm(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur de mise à jour');
    } finally {
      setIsUpdatingRate(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (!withdrawForm.momo_number) {
      toast.error('Numéro MoMo requis');
      return;
    }

    try {
      setIsWithdrawing(true);
      const res = await axios.post(`${API_URL}/api/sdm/admin/commissions/withdraw`, {
        amount: parseFloat(withdrawForm.amount),
        momo_number: withdrawForm.momo_number,
        momo_provider: withdrawForm.momo_provider,
        account_name: withdrawForm.account_name || 'SDM Admin'
      }, { headers });

      toast.success(res.data.message);
      setShowWithdrawForm(false);
      setWithdrawForm({ amount: '', momo_number: '', momo_provider: 'MTN', account_name: '' });
      fetchCommissions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur de retrait');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-emerald-100 text-emerald-700',
      processing: 'bg-blue-100 text-blue-700',
      failed: 'bg-red-100 text-red-700',
    };
    const icons = {
      completed: <CheckCircle size={14} />,
      processing: <Clock size={14} />,
      failed: <XCircle size={14} />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100'}`}>
        {icons[status]} {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Commissions SDM</h2>
          <p className="text-slate-500">Gérez les revenus de commission de SDM</p>
        </div>
        <Button onClick={fetchCommissions} variant="outline" className="gap-2">
          <RefreshCw size={16} />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <TrendingUp size={24} className="opacity-80" />
          </div>
          <p className="text-3xl font-bold mt-3">{formatAmount(commissions?.total_earned)} GHS</p>
          <p className="text-sm opacity-80 mt-1">Total des commissions gagnées</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <ArrowUpRight size={24} className="opacity-80" />
          </div>
          <p className="text-3xl font-bold mt-3">{formatAmount(commissions?.total_withdrawn)} GHS</p>
          <p className="text-sm opacity-80 mt-1">Total retiré</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <Wallet size={24} className="opacity-80" />
          </div>
          <p className="text-3xl font-bold mt-3">{formatAmount(commissions?.available_balance)} GHS</p>
          <p className="text-sm opacity-80 mt-1">Solde disponible</p>
        </div>
      </div>

      {/* Commission Rate Configuration */}
      {currentAdmin?.role === 'super_admin' && (
        <div className="bg-white rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings size={20} className="text-slate-600" />
              <h3 className="font-semibold text-lg">Taux de Commission SDM</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg">
                <Percent size={18} className="text-purple-600" />
                <span className="text-xl font-bold text-slate-900">{commissionRate ?? '...'} %</span>
              </div>
              {!showRateForm && (
                <Button
                  onClick={() => setShowRateForm(true)}
                  variant="outline"
                  size="sm"
                >
                  Modifier
                </Button>
              )}
            </div>
          </div>
          
          {showRateForm && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-4">
              <p className="text-sm text-slate-600">
                Définissez le taux de commission prélevé sur chaque cashback (entre 0.5% et 20%)
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Nouveau taux (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="20"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder="Ex: 2.5"
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2 pt-6">
                  <Button
                    onClick={handleUpdateRate}
                    disabled={isUpdatingRate}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isUpdatingRate ? <RefreshCw className="animate-spin" size={16} /> : 'Enregistrer'}
                  </Button>
                  <Button onClick={() => { setShowRateForm(false); setNewRate(commissionRate?.toString() || ''); }} variant="outline">
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Withdraw Button */}
      {currentAdmin?.role === 'super_admin' && (
        <div className="bg-white rounded-xl p-6">
          {!showWithdrawForm ? (
            <Button
              onClick={() => setShowWithdrawForm(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
              disabled={!commissions?.available_balance || commissions.available_balance <= 0}
            >
              <Send size={18} />
              Retirer mes commissions
            </Button>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Retrait des commissions</h3>
              <p className="text-sm text-slate-500">
                Solde disponible: <strong>{formatAmount(commissions?.available_balance)} GHS</strong>
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Montant (GHS)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    max={commissions?.available_balance}
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                    placeholder="100.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Réseau</label>
                  <select
                    value={withdrawForm.momo_provider}
                    onChange={(e) => setWithdrawForm({...withdrawForm, momo_provider: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="MTN">MTN Mobile Money</option>
                    <option value="TELECEL">Telecel Cash</option>
                    <option value="AIRTELTIGO">AirtelTigo Money</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Numéro MoMo</label>
                  <Input
                    value={withdrawForm.momo_number}
                    onChange={(e) => setWithdrawForm({...withdrawForm, momo_number: e.target.value})}
                    placeholder="0541008285"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nom du compte</label>
                  <Input
                    value={withdrawForm.account_name}
                    onChange={(e) => setWithdrawForm({...withdrawForm, account_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isWithdrawing ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                  <span className="ml-2">Confirmer le retrait</span>
                </Button>
                <Button
                  onClick={() => setShowWithdrawForm(false)}
                  variant="outline"
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Withdrawal History */}
      {commissions?.withdrawal_history?.length > 0 && (
        <div className="bg-white rounded-xl p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <History size={20} />
            Historique des retraits
          </h3>
          <div className="space-y-3">
            {commissions.withdrawal_history.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">{formatAmount(w.amount)} GHS</p>
                  <p className="text-sm text-slate-500">
                    {w.momo_number} ({w.momo_provider}) • {formatDate(w.created_at)}
                  </p>
                </div>
                {getStatusBadge(w.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Commissions */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <DollarSign size={20} />
          Commissions récentes
        </h3>
        {commissions?.recent_commissions?.length > 0 ? (
          <div className="space-y-2">
            {commissions.recent_commissions.slice(0, 20).map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-mono text-slate-600">{c.transaction_id}</p>
                  <p className="text-xs text-slate-400">{formatDate(c.created_at)}</p>
                </div>
                <p className="font-medium text-emerald-600">+{formatAmount(c.amount)} GHS</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">Aucune commission enregistrée</p>
        )}
      </div>
    </div>
  );
}

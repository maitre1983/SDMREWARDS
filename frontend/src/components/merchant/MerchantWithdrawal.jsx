/**
 * MerchantWithdrawal Component - Performance Dashboard
 * =====================================================
 * Dashboard orienté performance de parrainage pour les marchands.
 * 
 * SDM ne retient plus les fonds marchands - après chaque paiement client,
 * la part du marchand est envoyée instantanément sur leur compte MoMo/Banque.
 * 
 * Ce dashboard affiche:
 * - Total gagné via parrainage
 * - Nombre de filleuls
 * - Revenus aujourd'hui / ce mois / 6 derniers mois
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Users,
  TrendingUp,
  Zap,
  Phone,
  Building2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Share2,
  Copy,
  Calendar,
  DollarSign,
  UserPlus,
  BarChart3,
  RefreshCw,
  ExternalLink,
  Gift
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { API_URL } from '../../config/api';

export default function MerchantWithdrawal({ token, merchant, payoutSettings, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [referralStats, setReferralStats] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch referral statistics
  const fetchReferralStats = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/merchants/referral-stats`, { headers });
      setReferralStats(res.data);
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      // Set default values if endpoint not ready
      setReferralStats({
        total_referrals: 0,
        total_earned: 0,
        earnings_today: 0,
        earnings_this_month: 0,
        referrals_today: 0,
        referrals_this_month: 0,
        bonus_per_referral: 3,
        recruitment_qr_code: merchant?.recruitment_qr_code || '',
        monthly_breakdown: [],
        recent_referrals: []
      });
    } finally {
      setLoading(false);
    }
  }, [token, merchant]);

  useEffect(() => {
    fetchReferralStats();
  }, [fetchReferralStats]);

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

  const copyReferralCode = async () => {
    const code = referralStats?.recruitment_qr_code || merchant?.recruitment_qr_code;
    if (code) {
      try {
        await navigator.clipboard.writeText(code);
        setCopySuccess(true);
        toast.success('Code copié!');
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        toast.error('Erreur de copie');
      }
    }
  };

  const shareReferralLink = () => {
    const code = referralStats?.recruitment_qr_code || merchant?.recruitment_qr_code;
    const link = `https://sdmrewards.com/join?ref=${code}`;
    const text = `Rejoins SDM REWARDS et gagne du cashback! Utilise mon code: ${code}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'SDM REWARDS - Parrainage',
        text: text,
        url: link
      }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + link)}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  const stats = referralStats || {};

  return (
    <div className="space-y-6">
      {/* Auto-Payout Info Banner */}
      <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-12 h-12 bg-emerald-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap className="text-emerald-400" size={24} />
          </div>
          <div className="flex-1 w-full">
            <h3 className="text-white text-lg font-semibold mb-1">Paiements Automatiques Activés</h3>
            <p className="text-slate-300 text-sm mb-3">
              Après chaque paiement client, votre part est envoyée <span className="text-emerald-400 font-semibold">instantanément</span> sur votre compte configuré.
              <br/>
              <span className="text-amber-300">Les commissions de parrainage (GHS 3 par filleul) sont aussi envoyées automatiquement.</span>
            </p>
            <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-3">
              {payoutSettings?.preferred_payout_method === 'bank' ? (
                <>
                  <Building2 className="text-blue-400 flex-shrink-0" size={20} />
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{payoutSettings?.bank_name || 'Compte Bancaire'}</p>
                    <p className="text-slate-400 text-sm">****{(payoutSettings?.bank_account || '').slice(-4)}</p>
                  </div>
                </>
              ) : (
                <>
                  <Phone className="text-purple-400 flex-shrink-0" size={20} />
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{payoutSettings?.momo_network || 'Mobile Money'}</p>
                    <p className="text-slate-400 text-sm">{payoutSettings?.momo_number || 'Non configuré'}</p>
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
                Configurez votre MoMo dans Paramètres &gt; Paiement
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Stats Cards - Referral Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Earned from Referrals */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                <Gift size={14} />
                Total gagné via parrainage
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-emerald-400 truncate" data-testid="total-referral-earnings">
                {formatCurrency(stats.total_earned)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                GHS {stats.bonus_per_referral || 3} par filleul
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <DollarSign className="text-emerald-400" size={24} />
            </div>
          </div>
        </div>

        {/* Total Referrals Count */}
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                <Users size={14} />
                Nombre total de filleuls
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-purple-400" data-testid="total-referrals">
                {stats.total_referrals || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Clients recrutés via votre lien
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <UserPlus className="text-purple-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Time-based Earnings Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-xs uppercase tracking-wide">Aujourd'hui</p>
            <Calendar size={14} className="text-slate-500" />
          </div>
          <p className="text-xl font-bold text-white" data-testid="earnings-today">
            {formatCurrency(stats.earnings_today)}
          </p>
          <p className="text-xs text-emerald-400 mt-1">
            +{stats.referrals_today || 0} filleul{(stats.referrals_today || 0) > 1 ? 's' : ''}
          </p>
        </div>

        {/* This Month */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-xs uppercase tracking-wide">Ce mois</p>
            <BarChart3 size={14} className="text-slate-500" />
          </div>
          <p className="text-xl font-bold text-white" data-testid="earnings-this-month">
            {formatCurrency(stats.earnings_this_month)}
          </p>
          <p className="text-xs text-emerald-400 mt-1">
            +{stats.referrals_this_month || 0} filleul{(stats.referrals_this_month || 0) > 1 ? 's' : ''}
          </p>
        </div>

        {/* Bonus Info */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-amber-400 text-xs uppercase tracking-wide">Commission</p>
            <Gift size={14} className="text-amber-400" />
          </div>
          <p className="text-xl font-bold text-amber-400">
            GHS {stats.bonus_per_referral || 3}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Par client recruté
          </p>
        </div>
      </div>

      {/* 6 Months Chart */}
      {stats.monthly_breakdown && stats.monthly_breakdown.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" />
              Revenus des 6 derniers mois
            </h3>
            <button
              onClick={fetchReferralStats}
              className="text-slate-400 hover:text-white transition-colors p-2"
            >
              <RefreshCw size={16} />
            </button>
          </div>
          
          {/* Simple Bar Chart */}
          <div className="flex items-end justify-between gap-2 h-32 mb-2">
            {stats.monthly_breakdown.slice().reverse().map((month, idx) => {
              const maxEarnings = Math.max(...stats.monthly_breakdown.map(m => m.earnings || 0), 1);
              const heightPercent = ((month.earnings || 0) / maxEarnings) * 100;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center justify-end h-24">
                    <span className="text-xs text-emerald-400 mb-1">
                      {month.earnings > 0 ? formatCurrency(month.earnings) : ''}
                    </span>
                    <div 
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-sm transition-all duration-500"
                      style={{ height: `${Math.max(heightPercent, 4)}%`, minHeight: '4px' }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 mt-2">{month.month_short}</span>
                </div>
              );
            })}
          </div>
          
          {/* Monthly Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-700">
            {stats.monthly_breakdown.slice(0, 3).map((month, idx) => (
              <div key={idx} className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs">{month.month}</p>
                <p className="text-white font-medium">{formatCurrency(month.earnings)}</p>
                <p className="text-emerald-400 text-xs">+{month.referrals} filleuls</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Referral Section */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Share2 className="text-blue-400" size={20} />
          </div>
          <div>
            <h3 className="text-white font-semibold">Partagez et Gagnez!</h3>
            <p className="text-slate-400 text-xs">Gagnez GHS {stats.bonus_per_referral || 3} pour chaque nouveau client</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Referral Code */}
          <div className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs">Votre code de parrainage</p>
              <p className="text-white font-mono text-lg" data-testid="referral-code">
                {stats.recruitment_qr_code || merchant?.recruitment_qr_code || '---'}
              </p>
            </div>
            <button
              onClick={copyReferralCode}
              className={`p-2 rounded-lg transition-all ${
                copySuccess 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {copySuccess ? <CheckCircle size={20} /> : <Copy size={20} />}
            </button>
          </div>

          {/* Share Button */}
          <Button
            onClick={shareReferralLink}
            className="bg-blue-600 hover:bg-blue-700 px-6"
            data-testid="share-referral-btn"
          >
            <ExternalLink size={18} className="mr-2" />
            Partager
          </Button>
        </div>
      </div>

      {/* Recent Referrals */}
      {stats.recent_referrals && stats.recent_referrals.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <UserPlus className="text-purple-400" size={18} />
              <h3 className="text-white font-semibold">Filleuls Récents</h3>
            </div>
            <span className="text-slate-500 text-sm">{stats.total_referrals} total</span>
          </div>

          <div className="divide-y divide-slate-700/50">
            {stats.recent_referrals.map((referral, idx) => (
              <div key={referral.id || idx} className="flex items-center justify-between px-5 py-3 hover:bg-slate-700/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="text-purple-400" size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{referral.name}</p>
                    <p className="text-slate-500 text-xs">@{referral.username} • {formatDate(referral.joined_at)}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-emerald-400 text-sm font-semibold">
                    +{formatCurrency(referral.bonus_earned)}
                  </p>
                  <p className={`text-xs ${
                    referral.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {referral.status === 'active' ? 'Actif' : 'En attente'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State if no referrals */}
      {(!stats.recent_referrals || stats.recent_referrals.length === 0) && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
          <Users className="text-slate-600 mx-auto mb-3" size={48} />
          <h3 className="text-white font-semibold mb-1">Pas encore de filleuls</h3>
          <p className="text-slate-400 text-sm mb-4">
            Partagez votre code et gagnez GHS {stats.bonus_per_referral || 3} par nouveau client!
          </p>
          <Button
            onClick={shareReferralLink}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Share2 size={18} className="mr-2" />
            Commencer à partager
          </Button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, ArrowDownToLine, ArrowUpFromLine, 
  CheckCircle, XCircle, Clock, RefreshCw, Loader2,
  DollarSign, Users, Store, Building2, FileText, Shield,
  ChevronDown, ChevronUp, Search, Filter, AlertTriangle,
  Download, BarChart3, PieChart, Activity, Zap, AlertCircle,
  Bell, Send, Trash2, Eye, Plus, Smartphone, Trophy, Gift, Megaphone,
  Percent, Calendar, Crown, MapPin, Edit, Ticket, Play, Award
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
  const [pushStats, setPushStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('investor');
  const [processingId, setProcessingId] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showNewNotificationForm, setShowNewNotificationForm] = useState(false);
  
  // Promotions & Leaderboard state
  const [promotions, setPromotions] = useState([]);
  const [leaderboardCashback, setLeaderboardCashback] = useState(null);
  const [leaderboardServices, setLeaderboardServices] = useState(null);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('month');
  const [showNewPromoForm, setShowNewPromoForm] = useState(false);
  const [newPromo, setNewPromo] = useState({
    name: '',
    description: '',
    target_service: 'ALL',
    discount_percent: 10,
    min_amount: 0,
    days_of_week: [],
    is_active: true
  });
  
  // VIP Cards & Partners state
  const [vipCards, setVipCards] = useState([]);
  const [partners, setPartners] = useState([]);
  const [showVipCardForm, setShowVipCardForm] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editingVipCard, setEditingVipCard] = useState(null);
  const [editingPartner, setEditingPartner] = useState(null);
  const [newPartner, setNewPartner] = useState({
    name: '',
    category: 'SHOP',
    address: '',
    city: 'Accra',
    phone: '',
    cashback_rate: 5,
    is_gold_exclusive: false
  });
  
  // Lottery state
  const [lotteries, setLotteries] = useState([]);
  const [showLotteryForm, setShowLotteryForm] = useState(false);
  const [newLottery, setNewLottery] = useState({
    name: '',
    description: '',
    month: new Date().toISOString().slice(0, 7),
    funding_source: 'FIXED',
    fixed_amount: 500,
    commission_percentage: 10,
    prize_distribution: [40, 25, 15, 12, 8],
    start_date: '',
    end_date: ''
  });
  
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

  const fetchPushStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/push/stats`, { headers });
      setPushStats(res.data);
    } catch (error) {
      console.error('Push stats error:', error);
    }
  };

  const fetchPromotions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/promotions`, { headers });
      setPromotions(res.data.promotions || []);
    } catch (error) {
      console.error('Promotions error:', error);
    }
  };

  const fetchLeaderboard = async (period = leaderboardPeriod) => {
    try {
      const [cashbackRes, servicesRes] = await Promise.all([
        axios.get(`${API_URL}/api/sdm/admin/leaderboard/cashback?period=${period}`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/leaderboard/services?period=${period}`, { headers })
      ]);
      setLeaderboardCashback(cashbackRes.data);
      setLeaderboardServices(servicesRes.data);
    } catch (error) {
      console.error('Leaderboard error:', error);
    }
  };

  const handleCreatePromo = async () => {
    try {
      await axios.post(`${API_URL}/api/sdm/admin/promotions`, newPromo, { headers });
      toast.success('Promotion créée!');
      setShowNewPromoForm(false);
      setNewPromo({
        name: '',
        description: '',
        target_service: 'ALL',
        discount_percent: 10,
        min_amount: 0,
        days_of_week: [],
        is_active: true
      });
      fetchPromotions();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleTogglePromo = async (promoId) => {
    try {
      await axios.patch(`${API_URL}/api/sdm/admin/promotions/${promoId}/toggle`, {}, { headers });
      toast.success('Statut modifié');
      fetchPromotions();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDeletePromo = async (promoId) => {
    if (!window.confirm('Supprimer cette promotion?')) return;
    try {
      await axios.delete(`${API_URL}/api/sdm/admin/promotions/${promoId}`, { headers });
      toast.success('Promotion supprimée');
      fetchPromotions();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleAnnounceTopClients = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/sdm/admin/leaderboard/announce?period=${leaderboardPeriod}`, {}, { headers });
      toast.success('Annonce envoyée à tous les clients!');
    } catch (error) {
      toast.error('Erreur lors de l\'annonce');
    }
  };

  // VIP Cards functions
  const fetchVipCards = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/vip-cards`, { headers });
      setVipCards(res.data.cards || []);
    } catch (error) {
      console.error('VIP cards error:', error);
    }
  };

  const handleUpdateVipCard = async (cardId, data) => {
    try {
      await axios.put(`${API_URL}/api/sdm/admin/vip-cards/${cardId}`, data, { headers });
      toast.success('Carte VIP mise à jour');
      fetchVipCards();
      setEditingVipCard(null);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // Partners functions
  const fetchPartners = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/partners`, { headers });
      setPartners(res.data.partners || []);
    } catch (error) {
      console.error('Partners error:', error);
    }
  };

  const handleCreatePartner = async () => {
    try {
      await axios.post(`${API_URL}/api/sdm/admin/partners`, newPartner, { headers });
      toast.success('Partenaire ajouté');
      setShowPartnerForm(false);
      setNewPartner({ name: '', category: 'SHOP', address: '', city: 'Accra', phone: '', cashback_rate: 5, is_gold_exclusive: false });
      fetchPartners();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleUpdatePartner = async (partnerId, data) => {
    try {
      await axios.put(`${API_URL}/api/sdm/admin/partners/${partnerId}`, data, { headers });
      toast.success('Partenaire mis à jour');
      fetchPartners();
      setEditingPartner(null);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDeletePartner = async (partnerId) => {
    if (!window.confirm('Supprimer ce partenaire?')) return;
    try {
      await axios.delete(`${API_URL}/api/sdm/admin/partners/${partnerId}`, { headers });
      toast.success('Partenaire supprimé');
      fetchPartners();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // Lottery functions
  const fetchLotteries = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/lotteries`, { headers });
      setLotteries(res.data.lotteries || []);
    } catch (error) {
      console.error('Lotteries error:', error);
    }
  };

  const handleCreateLottery = async () => {
    try {
      await axios.post(`${API_URL}/api/sdm/admin/lotteries`, newLottery, { headers });
      toast.success('Tirage créé');
      setShowLotteryForm(false);
      setNewLottery({
        name: '',
        description: '',
        month: new Date().toISOString().slice(0, 7),
        funding_source: 'FIXED',
        fixed_amount: 500,
        commission_percentage: 10,
        prize_distribution: [40, 25, 15, 12, 8],
        start_date: '',
        end_date: ''
      });
      fetchLotteries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleActivateLottery = async (lotteryId) => {
    try {
      const res = await axios.patch(`${API_URL}/api/sdm/admin/lotteries/${lotteryId}/activate`, {}, { headers });
      toast.success(res.data.message);
      fetchLotteries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDrawLottery = async (lotteryId) => {
    if (!window.confirm('Effectuer le tirage maintenant? Cette action est irréversible.')) return;
    try {
      const res = await axios.post(`${API_URL}/api/sdm/admin/lotteries/${lotteryId}/draw`, {}, { headers });
      toast.success(res.data.message);
      fetchLotteries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleAnnounceLottery = async (lotteryId) => {
    try {
      const res = await axios.post(`${API_URL}/api/sdm/admin/lotteries/${lotteryId}/announce`, {}, { headers });
      toast.success('Résultats annoncés!');
      fetchLotteries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDeleteLottery = async (lotteryId) => {
    if (!window.confirm('Supprimer ce tirage?')) return;
    try {
      await axios.delete(`${API_URL}/api/sdm/admin/lotteries/${lotteryId}`, { headers });
      toast.success('Tirage supprimé');
      fetchLotteries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
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
      fetchPushStats();
    } else if (activeSubTab === 'alerts') {
      fetchFloatAlerts();
    } else if (activeSubTab === 'promotions') {
      fetchPromotions();
    } else if (activeSubTab === 'leaderboard') {
      fetchLeaderboard();
    } else if (activeSubTab === 'vip-cards') {
      fetchVipCards();
    } else if (activeSubTab === 'partners') {
      fetchPartners();
    } else if (activeSubTab === 'lottery') {
      fetchLotteries();
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

  const handleCreateNotification = async (notificationData) => {
    try {
      await axios.post(`${API_URL}/api/sdm/admin/notifications`, notificationData, { headers });
      toast.success('Notification sent successfully');
      setShowNewNotificationForm(false);
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to send notification');
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      await axios.delete(`${API_URL}/api/sdm/admin/notifications/${id}`, { headers });
      toast.success('Notification deleted');
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleAcknowledgeAlert = async (id) => {
    try {
      await axios.post(`${API_URL}/api/sdm/admin/float-alerts/${id}/acknowledge`, {}, { headers });
      toast.success('Alert acknowledged');
      fetchFloatAlerts();
    } catch (error) {
      toast.error('Failed to acknowledge');
    }
  };

  const handleTestFloatAlert = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/sdm/admin/float-alerts/test`, {}, { headers });
      toast.success(`Test alert sent! Webhook: ${res.data.webhook_sent ? '✓' : '✗'} | Email: ${res.data.email_sent ? '✓' : '✗'}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send test alert');
    }
  };

  const handleSendPushNotification = async (notificationData) => {
    try {
      const res = await axios.post(
        `${API_URL}/api/sdm/admin/push/send?recipient_type=${notificationData.recipient_type}`,
        {
          title: notificationData.title,
          message: notificationData.message,
          url: notificationData.action_url
        },
        { headers }
      );
      toast.success(`Push notification sent! ${res.data.push_result?.simulated ? '(Simulated - OneSignal not configured)' : ''}`);
      setShowNewNotificationForm(false);
      fetchNotifications();
      fetchPushStats();
    } catch (error) {
      toast.error('Failed to send push notification');
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
          { id: 'leaderboard', label: 'Top Clients', icon: Trophy },
          { id: 'promotions', label: 'Promos', icon: Gift },
          { id: 'vip-cards', label: 'VIP Cards', icon: Crown },
          { id: 'lottery', label: 'Lottery', icon: Ticket },
          { id: 'partners', label: 'Partenaires', icon: MapPin },
          { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
          { id: 'deposits', label: 'Deposits', icon: ArrowDownToLine },
          { id: 'float', label: 'Float', icon: Zap },
          { id: 'wallets', label: 'Wallets', icon: Wallet },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
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

      {/* Leaderboard - Top Clients */}
      {activeSubTab === 'leaderboard' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Top Clients Leaderboard</h3>
            <div className="flex gap-2">
              <select
                value={leaderboardPeriod}
                onChange={(e) => { setLeaderboardPeriod(e.target.value); fetchLeaderboard(e.target.value); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="year">Cette année</option>
              </select>
              <Button onClick={handleAnnounceTopClients} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Megaphone size={16} />
                Annoncer les Gagnants
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Top Cashback Earners */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Trophy className="text-amber-600" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Meilleurs Cashback</h4>
                  <p className="text-sm text-slate-500">{leaderboardCashback?.period_label}</p>
                </div>
              </div>
              
              {leaderboardCashback?.top_clients?.length > 0 ? (
                <div className="space-y-3">
                  {leaderboardCashback.top_clients.map((client, i) => (
                    <div key={client.user_id} className={`flex items-center justify-between p-3 rounded-lg ${
                      i === 0 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {client.rank}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">{client.name}</p>
                          <p className="text-xs text-slate-500">{client.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">GHS {client.total_cashback.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">{client.transaction_count} txns</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">Aucune donnée</p>
              )}
            </div>

            {/* Top Service Users */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Activity className="text-blue-600" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Champions Services</h4>
                  <p className="text-sm text-slate-500">{leaderboardServices?.period_label}</p>
                </div>
              </div>
              
              {leaderboardServices?.top_clients?.length > 0 ? (
                <div className="space-y-3">
                  {leaderboardServices.top_clients.map((client, i) => (
                    <div key={client.user_id} className={`flex items-center justify-between p-3 rounded-lg ${
                      i === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          i === 0 ? 'bg-blue-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {client.rank}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">{client.name}</p>
                          <p className="text-xs text-slate-500">{client.services_used?.join(', ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">GHS {client.total_spent.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">{client.transaction_count} txns</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">Aucune donnée</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Promotions Management */}
      {activeSubTab === 'promotions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Gestion des Promotions</h3>
            <Button onClick={() => setShowNewPromoForm(!showNewPromoForm)} className="gap-2">
              <Plus size={16} />
              Nouvelle Promo
            </Button>
          </div>

          {/* New Promo Form */}
          {showNewPromoForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-semibold text-slate-900 mb-4">Créer une Promotion</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                  <Input
                    value={newPromo.name}
                    onChange={(e) => setNewPromo({...newPromo, name: e.target.value})}
                    placeholder="-10% Data Weekend"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Service ciblé</label>
                  <select
                    value={newPromo.target_service}
                    onChange={(e) => setNewPromo({...newPromo, target_service: e.target.value})}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  >
                    <option value="ALL">Tous les services</option>
                    <option value="AIRTIME">Airtime uniquement</option>
                    <option value="DATA">Data uniquement</option>
                    <option value="BILL_PAYMENT">Factures uniquement</option>
                    <option value="MOMO_WITHDRAWAL">Retrait MoMo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Réduction (%)</label>
                  <Input
                    type="number"
                    value={newPromo.discount_percent}
                    onChange={(e) => setNewPromo({...newPromo, discount_percent: parseFloat(e.target.value)})}
                    min="1"
                    max="50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Montant minimum (GHS)</label>
                  <Input
                    type="number"
                    value={newPromo.min_amount}
                    onChange={(e) => setNewPromo({...newPromo, min_amount: parseFloat(e.target.value)})}
                    min="0"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <Input
                    value={newPromo.description}
                    onChange={(e) => setNewPromo({...newPromo, description: e.target.value})}
                    placeholder="Description de la promotion"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Jours actifs (vide = tous les jours)</label>
                  <div className="flex flex-wrap gap-2">
                    {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const days = newPromo.days_of_week.includes(day)
                            ? newPromo.days_of_week.filter(d => d !== day)
                            : [...newPromo.days_of_week, day];
                          setNewPromo({...newPromo, days_of_week: days});
                        }}
                        className={`px-3 py-1 rounded-full text-sm ${
                          newPromo.days_of_week.includes(day)
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleCreatePromo} className="bg-emerald-600 hover:bg-emerald-700">
                  Créer la Promotion
                </Button>
                <Button variant="outline" onClick={() => setShowNewPromoForm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Promotions List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Promotion</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Service</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Réduction</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Jours</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Utilisations</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Statut</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promotions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                      Aucune promotion. Créez-en une!
                    </td>
                  </tr>
                ) : (
                  promotions.map((promo) => (
                    <tr key={promo.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{promo.name}</p>
                        <p className="text-xs text-slate-500">{promo.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {promo.target_service}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-emerald-600">{promo.discount_percent}%</span>
                        {promo.min_amount > 0 && (
                          <p className="text-xs text-slate-500">Min: GHS {promo.min_amount}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {promo.days_of_week?.length > 0 
                          ? promo.days_of_week.map(d => d.slice(0, 3)).join(', ')
                          : 'Tous'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{promo.usage_count || 0}</p>
                        <p className="text-xs text-slate-500">GHS {(promo.total_discount_given || 0).toFixed(2)} économisés</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          promo.is_active 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {promo.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTogglePromo(promo.id)}
                          >
                            {promo.is_active ? 'Désactiver' : 'Activer'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDeletePromo(promo.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIP Cards Management */}
      {activeSubTab === 'vip-cards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Gestion des Cartes VIP</h3>
            <Button variant="outline" size="sm" onClick={fetchVipCards} className="gap-2">
              <RefreshCw size={16} />
              Actualiser
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {vipCards.map((card) => (
              <div 
                key={card.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                <div 
                  className="p-4 text-white"
                  style={{ backgroundColor: card.badge_color === '#C0C0C0' ? '#6B7280' : card.badge_color }}
                >
                  <div className="flex items-center justify-between">
                    <Crown size={32} />
                    <span className="text-2xl font-bold">GHS {card.price}</span>
                  </div>
                  <h4 className="text-xl font-bold mt-2">{card.name}</h4>
                  <p className="text-sm opacity-80">{card.tier}</p>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-slate-600">{card.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="text-slate-500">Cashback Boost</p>
                      <p className="font-bold">+{card.cashback_boost}%</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="text-slate-500">Limite Retrait</p>
                      <p className="font-bold">GHS {card.monthly_withdrawal_limit}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="text-slate-500">Lottery</p>
                      <p className="font-bold">x{card.lottery_multiplier}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="text-slate-500">Validité</p>
                      <p className="font-bold">{card.validity_days} jours</p>
                    </div>
                  </div>

                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {card.benefits_list?.slice(0, 5).map((benefit, i) => (
                      <p key={i} className="text-xs text-slate-600 flex items-start gap-1">
                        <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={10} />
                        {benefit}
                      </p>
                    ))}
                  </div>

                  {editingVipCard === card.id ? (
                    <div className="space-y-2 pt-2 border-t">
                      <Input
                        type="number"
                        placeholder="Prix"
                        defaultValue={card.price}
                        onChange={(e) => card._newPrice = parseFloat(e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Cashback Boost %"
                        defaultValue={card.cashback_boost}
                        step="0.1"
                        onChange={(e) => card._newBoost = parseFloat(e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Limite retrait"
                        defaultValue={card.monthly_withdrawal_limit}
                        onChange={(e) => card._newLimit = parseFloat(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateVipCard(card.id, {
                            ...card,
                            price: card._newPrice || card.price,
                            cashback_boost: card._newBoost || card.cashback_boost,
                            monthly_withdrawal_limit: card._newLimit || card.monthly_withdrawal_limit
                          })}
                        >
                          Sauvegarder
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingVipCard(null)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-2"
                      onClick={() => setEditingVipCard(card.id)}
                    >
                      <Edit size={14} />
                      Modifier
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lottery Management */}
      {activeSubTab === 'lottery' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Monthly VIP Draws</h3>
            <Button onClick={() => setShowLotteryForm(!showLotteryForm)} className="gap-2 bg-purple-600 hover:bg-purple-700">
              <Plus size={16} />
              New Draw
            </Button>
          </div>

          {/* New Lottery Form */}
          {showLotteryForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-semibold text-slate-900 mb-4">Create a Draw</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Draw Name</label>
                  <Input
                    value={newLottery.name}
                    onChange={(e) => setNewLottery({...newLottery, name: e.target.value})}
                    placeholder="March 2026 Draw"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                  <Input
                    type="month"
                    value={newLottery.month}
                    onChange={(e) => setNewLottery({...newLottery, month: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prize Pool Source</label>
                  <select
                    value={newLottery.funding_source}
                    onChange={(e) => setNewLottery({...newLottery, funding_source: e.target.value})}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  >
                    <option value="FIXED">Fixed Amount</option>
                    <option value="COMMISSION">% of SDM Commissions</option>
                    <option value="MIXED">Mixed (fixed + commissions)</option>
                  </select>
                </div>
                {newLottery.funding_source !== 'COMMISSION' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fixed Amount (GHS)</label>
                    <Input
                      type="number"
                      value={newLottery.fixed_amount}
                      onChange={(e) => setNewLottery({...newLottery, fixed_amount: parseFloat(e.target.value)})}
                      min="100"
                    />
                  </div>
                )}
                {newLottery.funding_source !== 'FIXED' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">% of commissions</label>
                    <Input
                      type="number"
                      value={newLottery.commission_percentage}
                      onChange={(e) => setNewLottery({...newLottery, commission_percentage: parseFloat(e.target.value)})}
                      min="1"
                      max="50"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={newLottery.start_date}
                    onChange={(e) => setNewLottery({...newLottery, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <Input
                    type="date"
                    value={newLottery.end_date}
                    onChange={(e) => setNewLottery({...newLottery, end_date: e.target.value})}
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <Input
                    value={newLottery.description}
                    onChange={(e) => setNewLottery({...newLottery, description: e.target.value})}
                    placeholder="Draw description..."
                  />
                </div>
              </div>
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-900">Prize Distribution (5 winners):</p>
                <p className="text-xs text-purple-700">1st: 40% | 2nd: 25% | 3rd: 15% | 4th: 12% | 5th: 8%</p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleCreateLottery} className="bg-purple-600 hover:bg-purple-700">
                  Create Draw
                </Button>
                <Button variant="outline" onClick={() => setShowLotteryForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Lotteries List */}
          <div className="space-y-4">
            {lotteries.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Ticket size={48} className="mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">Aucun tirage. Créez-en un!</p>
              </div>
            ) : (
              lotteries.map((lottery) => (
                <div key={lottery.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className={`p-4 ${
                    lottery.status === 'COMPLETED' ? 'bg-emerald-50' :
                    lottery.status === 'ACTIVE' ? 'bg-purple-50' :
                    'bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          lottery.status === 'COMPLETED' ? 'bg-emerald-200' :
                          lottery.status === 'ACTIVE' ? 'bg-purple-200' :
                          'bg-slate-200'
                        }`}>
                          <Ticket className={
                            lottery.status === 'COMPLETED' ? 'text-emerald-700' :
                            lottery.status === 'ACTIVE' ? 'text-purple-700' :
                            'text-slate-600'
                          } size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{lottery.name}</h4>
                          <p className="text-sm text-slate-600">{lottery.month}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">GHS {lottery.total_prize_pool?.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          lottery.status === 'COMPLETED' ? 'bg-emerald-200 text-emerald-800' :
                          lottery.status === 'ACTIVE' ? 'bg-purple-200 text-purple-800' :
                          lottery.status === 'DRAFT' ? 'bg-slate-200 text-slate-800' :
                          'bg-amber-200 text-amber-800'
                        }`}>
                          {lottery.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-500">Participants</p>
                        <p className="font-bold text-slate-900">{lottery.total_participants || 0}</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-500">Entrées totales</p>
                        <p className="font-bold text-slate-900">{lottery.total_entries || 0}</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-500">Début</p>
                        <p className="font-bold text-slate-900">{lottery.start_date?.slice(0, 10) || '-'}</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-500">Fin</p>
                        <p className="font-bold text-slate-900">{lottery.end_date?.slice(0, 10) || '-'}</p>
                      </div>
                    </div>

                    {/* Winners display */}
                    {lottery.status === 'COMPLETED' && lottery.winners?.length > 0 && (
                      <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                        <p className="text-sm font-medium text-amber-900 mb-2">🏆 Gagnants:</p>
                        <div className="space-y-1">
                          {lottery.winners.map((w, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}
                                <span className="font-medium">{w.name}</span>
                                <span className="text-xs text-slate-500">({w.tier})</span>
                              </span>
                              <span className="font-bold text-emerald-600">GHS {w.prize_amount?.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {lottery.status === 'DRAFT' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleActivateLottery(lottery.id)}
                            className="gap-2 bg-purple-600 hover:bg-purple-700"
                          >
                            <Play size={14} />
                            Activer & Inscrire VIP
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteLottery(lottery.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                      {lottery.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          onClick={() => handleDrawLottery(lottery.id)}
                          className="gap-2 bg-amber-600 hover:bg-amber-700"
                        >
                          <Award size={14} />
                          Effectuer le Tirage
                        </Button>
                      )}
                      {lottery.status === 'COMPLETED' && !lottery.is_announced && (
                        <Button
                          size="sm"
                          onClick={() => handleAnnounceLottery(lottery.id)}
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Megaphone size={14} />
                          Annoncer les Résultats
                        </Button>
                      )}
                      {lottery.is_announced && (
                        <span className="text-sm text-emerald-600 flex items-center gap-1">
                          <CheckCircle size={14} />
                          Résultats annoncés
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Partners Management */}
      {activeSubTab === 'partners' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Gestion des Partenaires SDM</h3>
            <Button onClick={() => setShowPartnerForm(!showPartnerForm)} className="gap-2">
              <Plus size={16} />
              Ajouter Partenaire
            </Button>
          </div>

          {/* New Partner Form */}
          {showPartnerForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-semibold text-slate-900 mb-4">Nouveau Partenaire</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                  <Input
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({...newPartner, name: e.target.value})}
                    placeholder="Restaurant Chez Akwaba"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={newPartner.category}
                    onChange={(e) => setNewPartner({...newPartner, category: e.target.value})}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  >
                    <option value="RESTAURANT">Restaurant</option>
                    <option value="SHOP">Boutique</option>
                    <option value="HOTEL">Hôtel</option>
                    <option value="SCHOOL">École</option>
                    <option value="SALON">Salon</option>
                    <option value="PHARMACY">Pharmacie</option>
                    <option value="SUPERMARKET">Supermarché</option>
                    <option value="GAS_STATION">Station Essence</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
                  <Input
                    value={newPartner.city}
                    onChange={(e) => setNewPartner({...newPartner, city: e.target.value})}
                    placeholder="Accra"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                  <Input
                    value={newPartner.address}
                    onChange={(e) => setNewPartner({...newPartner, address: e.target.value})}
                    placeholder="123 Oxford Street, Osu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                  <Input
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner({...newPartner, phone: e.target.value})}
                    placeholder="024 XXX XXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Taux Cashback (%)</label>
                  <Input
                    type="number"
                    value={newPartner.cashback_rate}
                    onChange={(e) => setNewPartner({...newPartner, cashback_rate: parseFloat(e.target.value)})}
                    min="1"
                    max="20"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={newPartner.is_gold_exclusive}
                    onChange={(e) => setNewPartner({...newPartner, is_gold_exclusive: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-slate-700">Exclusif Gold/Platinum</label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleCreatePartner} className="bg-emerald-600 hover:bg-emerald-700">
                  Ajouter
                </Button>
                <Button variant="outline" onClick={() => setShowPartnerForm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Partners List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Partenaire</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Catégorie</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Ville</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Cashback</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Exclusif</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {partners.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      Aucun partenaire. Ajoutez-en un!
                    </td>
                  </tr>
                ) : (
                  partners.map((partner) => (
                    <tr key={partner.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{partner.name}</p>
                        <p className="text-xs text-slate-500">{partner.address}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {partner.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{partner.city}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-emerald-600">{partner.cashback_rate}%</span>
                      </td>
                      <td className="px-4 py-3">
                        {partner.is_gold_exclusive && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                            Gold+
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDeletePartner(partner.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

      {/* Notifications Management */}
      {activeSubTab === 'notifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Client Notifications</h3>
            <Button 
              onClick={() => setShowNewNotificationForm(!showNewNotificationForm)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={16} />
              New Notification
            </Button>
          </div>

          {/* Push Notification Stats */}
          {pushStats && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pushStats.is_configured ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    <Smartphone size={20} className={pushStats.is_configured ? 'text-emerald-600' : 'text-amber-600'} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Push Status</p>
                    <p className={`font-semibold ${pushStats.is_configured ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {pushStats.is_configured ? 'Active' : 'Not Configured'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bell size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Active Devices</p>
                    <p className="text-xl font-bold text-slate-900">{pushStats.active_devices}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Users size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Clients</p>
                    <p className="text-xl font-bold text-slate-900">{pushStats.by_user_type?.client || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Store size={20} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Merchants</p>
                    <p className="text-xl font-bold text-slate-900">{pushStats.by_user_type?.merchant || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showNewNotificationForm && (
            <NotificationForm 
              onSubmit={handleCreateNotification}
              onSubmitPush={handleSendPushNotification}
              onCancel={() => setShowNewNotificationForm(false)} 
            />
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Title</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Recipients</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Priority</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Sent</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No notifications sent yet
                    </td>
                  </tr>
                ) : (
                  notifications.map((notif) => (
                    <tr key={notif.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          notif.notification_type === 'promo' ? 'bg-purple-100 text-purple-700' :
                          notif.notification_type === 'alert' ? 'bg-red-100 text-red-700' :
                          notif.notification_type === 'transaction' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {notif.notification_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{notif.title}</p>
                        <p className="text-xs text-slate-500 truncate max-w-xs">{notif.message}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize">{notif.recipient_type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          notif.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                          notif.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          notif.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {notif.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(notif.sent_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteNotification(notif.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
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

      {/* Float Alerts */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Float Alerts</h3>
            <Button 
              onClick={handleTestFloatAlert}
              variant="outline"
              className="gap-2"
            >
              <Send size={16} />
              Test Alert
            </Button>
          </div>

          {/* Alert Configuration */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              Alert Configuration
            </h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Webhook URL
                </label>
                <Input
                  type="url"
                  placeholder="https://your-webhook.com/alert"
                  value={fintechConfig?.float_alert_webhook_url || ''}
                  onChange={(e) => setFintechConfig({...fintechConfig, float_alert_webhook_url: e.target.value})}
                />
                <p className="text-xs text-slate-500 mt-1">URL to receive POST alerts</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Alert Emails (comma separated)
                </label>
                <Input
                  type="text"
                  placeholder="admin@sdm.com, finance@sdm.com"
                  value={(fintechConfig?.float_alert_emails || []).join(', ')}
                  onChange={(e) => setFintechConfig({
                    ...fintechConfig, 
                    float_alert_emails: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                />
                <p className="text-xs text-slate-500 mt-1">Email addresses for alerts</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={() => handleSaveConfig({
                  float_alert_webhook_url: fintechConfig?.float_alert_webhook_url,
                  float_alert_emails: fintechConfig?.float_alert_emails
                })}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Save Alert Settings
              </Button>
            </div>
          </div>

          {/* Alert History */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h4 className="font-semibold text-slate-900">Alert History</h4>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Balance</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Threshold</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Webhook</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {floatAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No alerts triggered yet
                    </td>
                  </tr>
                ) : (
                  floatAlerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          alert.alert_type === 'critical' ? 'bg-red-100 text-red-700' :
                          alert.alert_type === 'low' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {alert.alert_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">GHS {alert.float_balance.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-500">GHS {alert.threshold.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {alert.webhook_sent ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <XCircle size={16} className="text-slate-400" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {alert.email_sent ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <XCircle size={16} className="text-slate-400" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {alert.is_acknowledged ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Acknowledged</span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(alert.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {!alert.is_acknowledged && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
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

function NotificationForm({ onSubmit, onSubmitPush, onCancel }) {
  const [formData, setFormData] = useState({
    recipient_type: 'all',
    title: '',
    message: '',
    notification_type: 'system',
    priority: 'normal',
    action_url: '',
    send_push: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast.error('Title and message are required');
      return;
    }
    
    if (formData.send_push && onSubmitPush) {
      onSubmitPush(formData);
    } else {
      onSubmit(formData);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h4 className="font-semibold text-slate-900 flex items-center gap-2">
        <Send size={18} className="text-blue-600" />
        New Notification
      </h4>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Recipients</label>
            <select
              value={formData.recipient_type}
              onChange={(e) => setFormData({...formData, recipient_type: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
            >
              <option value="all">All Users & Merchants</option>
              <option value="clients">All Clients</option>
              <option value="merchants">All Merchants</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              value={formData.notification_type}
              onChange={(e) => setFormData({...formData, notification_type: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
            >
              <option value="system">System</option>
              <option value="promo">Promo</option>
              <option value="alert">Alert</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="Notification title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
            placeholder="Enter your message..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Action URL (optional)</label>
          <Input
            type="url"
            value={formData.action_url}
            onChange={(e) => setFormData({...formData, action_url: e.target.value})}
            placeholder="https://..."
          />
        </div>

        {/* Push Notification Toggle */}
        <div className="bg-slate-50 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.send_push}
              onChange={(e) => setFormData({...formData, send_push: e.target.checked})}
              className="w-5 h-5 text-blue-600 rounded border-slate-300"
            />
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-blue-600" />
              <div>
                <span className="font-medium text-slate-900">Send as Push Notification</span>
                <p className="text-xs text-slate-500">Also send to devices with push enabled</p>
              </div>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            {formData.send_push ? <Bell size={14} className="mr-2" /> : <Send size={14} className="mr-2" />}
            {formData.send_push ? 'Send Push' : 'Send In-App'}
          </Button>
        </div>
      </form>
    </div>
  );
}

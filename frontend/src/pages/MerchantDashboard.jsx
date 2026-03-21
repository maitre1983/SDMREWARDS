import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Store, 
  QrCode, 
  History, 
  Settings,
  LogOut,
  TrendingUp,
  DollarSign,
  Users,
  Loader2,
  Copy,
  Save,
  RefreshCw,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Percent,
  CreditCard,
  Wallet,
  BarChart3,
  Phone,
  Shield,
  UserCog,
  Building,
  ChevronRight,
  Info,
  Banknote,
  ArrowUpRight,
  ArrowDownToLine,
  AlertTriangle,
  Smartphone,
  XCircle,
  FileText,
  Key,
  Webhook
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// Lazy load merchant components for better performance
const PinModal = lazy(() => import('../components/merchant/PinModal'));
const ForgotPinModal = lazy(() => import('../components/merchant/ForgotPinModal'));
const CashierManager = lazy(() => import('../components/merchant/CashierManager'));
const BusinessInfoEditor = lazy(() => import('../components/merchant/BusinessInfoEditor'));
const PinSettings = lazy(() => import('../components/merchant/PinSettings'));
const AdvancedDashboard = lazy(() => import('../components/merchant/AdvancedDashboard'));
const MonthlyStatements = lazy(() => import('../components/merchant/MonthlyStatements'));
const APIKeysManager = lazy(() => import('../components/merchant/APIKeysManager'));
const WebhooksManager = lazy(() => import('../components/merchant/WebhooksManager'));
const PaymentNotificationToast = lazy(() => import('../components/merchant/PaymentNotificationToast'));
const PayoutHistory = lazy(() => import('../components/merchant/PayoutHistory'));
const MerchantWithdrawal = lazy(() => import('../components/merchant/MerchantWithdrawal'));

// Mini loader for lazy components
const MiniLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
  </div>
);

// API URL imported from config
import { API_URL } from '@/config/api';
const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function MerchantDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [isSaving, setIsSaving] = useState(false);
  
  // Data states
  const [merchant, setMerchant] = useState(null);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({
    cashback_rate: 5,
    momo_number: '',
    momo_network: '',
    bank_name: '',
    bank_account: '',
    bank_id: '',
    bank_account_name: '',
    preferred_payout_method: 'momo'
  });
  
  // Bank settings
  const [bankList, setBankList] = useState([]);
  const [isFetchingBanks, setIsFetchingBanks] = useState(false);
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [bankVerified, setBankVerified] = useState(false);
  
  // MoMo verification
  const [isVerifyingMoMo, setIsVerifyingMoMo] = useState(false);
  const [momoVerified, setMomoVerified] = useState(false);
  const [momoAccountName, setMomoAccountName] = useState('');

  // Settings sub-tabs
  const [settingsTab, setSettingsTab] = useState('cashback');
  
  // PIN Protection states
  const [pinStatus, setPinStatus] = useState({ pin_enabled: false, has_pin: false });
  const [showPinModal, setShowPinModal] = useState(false);
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Cash Payment & Debit Account states
  const [debitAccount, setDebitAccount] = useState(null);
  const [debitHistory, setDebitHistory] = useState([]);
  const [todayCashStats, setTodayCashStats] = useState(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpPhone, setTopUpPhone] = useState('');
  const [topUpNetwork, setTopUpNetwork] = useState('MTN');
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  
  // Pending Cash Confirmations states
  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(null);
  const [isRejecting, setIsRejecting] = useState(null);

  const token = localStorage.getItem('sdm_merchant_token');

  useEffect(() => {
    if (!token) {
      navigate('/merchant');
      return;
    }
    fetchDashboardData();
    fetchPinStatus();
    fetchDebitAccount();
    fetchTodayCashStats();
    fetchPendingConfirmations();
  }, [token]);

  const fetchPinStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/merchants/settings/pin-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPinStatus(res.data);
    } catch (error) {
      console.error('Error fetching PIN status:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch dashboard
      const dashRes = await axios.get(`${API_URL}/api/merchants/me`, { headers });
      setMerchant(dashRes.data.merchant);
      setStats(dashRes.data.stats);
      setTransactions(dashRes.data.recent_transactions || []);
      
      // Set settings from merchant data
      if (dashRes.data.merchant) {
        setSettings({
          cashback_rate: dashRes.data.merchant.cashback_rate || 5,
          momo_number: dashRes.data.merchant.momo_number || '',
          momo_network: dashRes.data.merchant.momo_network || '',
          bank_name: dashRes.data.merchant.bank_name || '',
          bank_account: dashRes.data.merchant.bank_account || '',
          bank_id: dashRes.data.merchant.bank_id || '',
          bank_account_name: dashRes.data.merchant.bank_account_name || '',
          preferred_payout_method: dashRes.data.merchant.preferred_payout_method || 'momo'
        });
        // Mark bank as verified if already has account name
        if (dashRes.data.merchant.bank_account_name) {
          setBankVerified(true);
        }
      }
      
      // Fetch bank list
      fetchBankList();
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('sdm_merchant_token');
        navigate('/merchant');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/merchants/transactions?limit=50`, { headers });
      setTransactions(res.data.transactions || []);
    } catch (error) {
      console.error('Transactions fetch error:', error);
    }
  };

  // ============== DEBIT ACCOUNT FUNCTIONS ==============
  
  const fetchDebitAccount = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/merchants/debit-account`, { headers });
      setDebitAccount(res.data);
    } catch (error) {
      console.error('Debit account fetch error:', error);
    }
  };

  const fetchDebitHistory = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/merchants/debit-history?limit=20`, { headers });
      setDebitHistory(res.data.transactions || []);
    } catch (error) {
      console.error('Debit history fetch error:', error);
    }
  };

  const fetchTodayCashStats = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/merchants/dashboard/payment-methods?chart_type=daily`, { headers });
      // Get today's data (last item in the array)
      const todayData = res.data.data?.[res.data.data.length - 1] || {};
      setTodayCashStats({
        cash_volume: todayData.cash_volume || 0,
        cash_count: todayData.cash_count || 0,
        cash_cashback: todayData.cash_cashback || 0,
        momo_volume: todayData.momo_volume || 0,
        momo_count: todayData.momo_count || 0,
        total_volume: todayData.total_volume || 0,
        total_count: todayData.total_count || 0
      });
    } catch (error) {
      console.error('Today cash stats fetch error:', error);
    }
  };

  // ============== PENDING CONFIRMATIONS FUNCTIONS ==============
  
  const fetchPendingConfirmations = async () => {
    try {
      setIsLoadingPending(true);
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/merchants/pending-confirmations`, { headers });
      setPendingConfirmations(res.data.transactions || []);
    } catch (error) {
      console.error('Pending confirmations fetch error:', error);
    } finally {
      setIsLoadingPending(false);
    }
  };

  const handleConfirmPayment = async (transactionId) => {
    try {
      setIsConfirming(transactionId);
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/api/merchants/confirm-cash-payment/${transactionId}`, {}, { headers });
      toast.success(res.data.message || 'Payment confirmed!');
      fetchPendingConfirmations();
      fetchDebitAccount();
      fetchTodayCashStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to confirm payment');
    } finally {
      setIsConfirming(null);
    }
  };

  const handleRejectPayment = async (transactionId) => {
    if (!window.confirm('Are you sure you want to reject this payment? The customer will be notified.')) {
      return;
    }
    try {
      setIsRejecting(transactionId);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/merchants/reject-cash-payment/${transactionId}?reason=Payment not received`, {}, { headers });
      toast.success('Payment rejected. Customer has been notified.');
      fetchPendingConfirmations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject payment');
    } finally {
      setIsRejecting(null);
    }
  };

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount < 10) {
      toast.error('Minimum top-up amount is GHS 10');
      return;
    }
    if (!topUpPhone) {
      toast.error('Please enter your MoMo number');
      return;
    }
    try {
      setIsProcessingTopUp(true);
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/api/merchants/topup-debit-account`, {
        amount: amount,
        payment_method: 'momo',
        momo_phone: topUpPhone,
        momo_network: topUpNetwork
      }, { headers });
      
      toast.success('Please approve the payment prompt on your phone');
      setShowTopUpModal(false);
      setTopUpAmount('');
      // Poll for payment status or wait for callback
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initiate top-up');
    } finally {
      setIsProcessingTopUp(false);
    }
  };

  const handleSaveCashbackRate = async () => {
    if (settings.cashback_rate < 1 || settings.cashback_rate > 20) {
      toast.error('Cashback rate must be between 1% and 20%');
      return;
    }

    setIsSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/merchants/settings/cashback`, {
        cashback_rate: parseFloat(settings.cashback_rate)
      }, { headers });
      
      toast.success('Cashback rate updated!');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePaymentInfo = async () => {
    setIsSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/merchants/settings/payment`, {
        momo_number: settings.momo_number,
        momo_network: settings.momo_network,
        bank_name: settings.bank_name,
        bank_account: settings.bank_account,
        bank_id: settings.bank_id,
        bank_account_name: settings.bank_account_name,
        preferred_payout_method: settings.preferred_payout_method
      }, { headers });
      
      toast.success('Payment info updated!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchBankList = async () => {
    setIsFetchingBanks(true);
    try {
      // Use the new verification API for bank list
      const res = await axios.get(`${API_URL}/api/verify/banks`);
      setBankList(res.data.banks || []);
    } catch (error) {
      console.error('Failed to fetch banks:', error);
      // Fallback to hardcoded list if API fails
      setBankList([
        { code: "300335", name: "GCB Bank", id: "300335" },
        { code: "300330", name: "Ecobank Ghana", id: "300330" },
        { code: "300331", name: "Stanbic Bank", id: "300331" },
        { code: "300329", name: "Absa Bank Ghana", id: "300329" },
        { code: "300332", name: "Zenith Bank Ghana", id: "300332" },
        { code: "300323", name: "Fidelity Bank Ghana", id: "300323" },
        { code: "300333", name: "United Bank for Africa", id: "300333" },
        { code: "300328", name: "Access Bank Ghana", id: "300328" },
        { code: "300327", name: "CAL Bank", id: "300327" },
      ]);
    } finally {
      setIsFetchingBanks(false);
    }
  };

  const handleVerifyBankAccount = async () => {
    if (!settings.bank_id || !settings.bank_account) {
      toast.error('Please select a bank and enter account number');
      return;
    }

    setIsVerifyingBank(true);
    setBankVerified(false);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(
        `${API_URL}/api/verify/bank/verify`,
        {
          bank_code: settings.bank_id,
          account_number: settings.bank_account
        },
        { headers }
      );
      
      if (res.data.verified) {
        setSettings(prev => ({
          ...prev,
          bank_account_name: res.data.account_name,
          bank_code: res.data.bank_code
        }));
        setBankVerified(true);
        toast.success(`Account verified: ${res.data.account_name}`);
      } else {
        toast.error(res.data.error || 'Account verification failed');
        setBankVerified(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to verify account');
      setBankVerified(false);
    } finally {
      setIsVerifyingBank(false);
    }
  };

  const handleVerifyMoMo = async () => {
    if (!settings.momo_number || !settings.momo_network) {
      toast.error('Please enter MoMo number and select network');
      return;
    }

    setIsVerifyingMoMo(true);
    setMomoVerified(false);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(
        `${API_URL}/api/verify/momo/verify/merchant`,
        {
          phone: settings.momo_number,
          network: settings.momo_network
        },
        { headers }
      );
      
      if (res.data.verified) {
        setMomoAccountName(res.data.account_name);
        setMomoVerified(true);
        toast.success(`MoMo verified: ${res.data.account_name}`);
      } else {
        toast.error(res.data.error || 'MoMo verification failed');
        setMomoVerified(false);
        setMomoAccountName('');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to verify MoMo');
      setMomoVerified(false);
      setMomoAccountName('');
    } finally {
      setIsVerifyingMoMo(false);
    }
  };

  const handleBankChange = (bankCode) => {
    const selectedBank = bankList.find(b => b.code === bankCode || b.id === bankCode);
    setSettings(prev => ({
      ...prev,
      bank_id: bankCode,
      bank_code: bankCode,
      bank_name: selectedBank?.name || '',
      bank_account_name: '' // Reset verification when bank changes
    }));
    setBankVerified(false);
  };

  const handleMoMoChange = (value) => {
    setSettings(prev => ({ ...prev, momo_number: value }));
    setMomoVerified(false);
    setMomoAccountName('');
  };

  const handleMoMoNetworkChange = (value) => {
    setSettings(prev => ({ ...prev, momo_network: value }));
    setMomoVerified(false);
    setMomoAccountName('');
  };

  const copyQRCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('QR code copied!');
  };

  // PIN verification functions
  const handleSettingsClick = () => {
    if (pinStatus.pin_enabled && !pinVerified) {
      setShowPinModal(true);
      setPinError('');
    } else {
      setActiveTab('settings');
    }
  };

  const handleVerifyPin = async (pin) => {
    setIsVerifyingPin(true);
    setPinError('');
    
    try {
      await axios.post(
        `${API_URL}/api/merchants/settings/pin/verify`,
        { pin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPinVerified(true);
      setShowPinModal(false);
      setActiveTab('settings');
    } catch (error) {
      setPinError(error.response?.data?.detail || 'PIN incorrect');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handlePinModalClose = (action) => {
    setShowPinModal(false);
    if (action === 'forgot') {
      setShowForgotPinModal(true);
    }
  };

  const handleRequestOTP = async (method) => {
    const res = await axios.post(
      `${API_URL}/api/merchants/settings/pin/forgot`,
      { method },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  };

  const handleResetPin = async (otp, newPin) => {
    await axios.post(
      `${API_URL}/api/merchants/settings/pin/reset`,
      { otp, new_pin: newPin },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchPinStatus();
  };

  const handlePinStatusChange = (newStatus) => {
    setPinStatus(newStatus);
    // If PIN was disabled, reset verification
    if (!newStatus.pin_enabled) {
      setPinVerified(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sdm_merchant_token');
    localStorage.removeItem('sdm_merchant_data');
    navigate('/merchant');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full">
            <CheckCircle size={12} /> Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full">
            <Clock size={12} /> Pending Approval
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/10 text-slate-400 text-xs rounded-full">
            <AlertCircle size={12} /> {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-400" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-9 h-9 object-contain rounded-lg" />
            <div>
              <span className="font-bold text-white block">{merchant?.business_name}</span>
              {getStatusBadge(merchant?.status)}
            </div>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-white">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Advanced Dashboard Tab */}
        {activeTab === 'home' && (
          <AdvancedDashboard 
            token={token} 
            basicStats={stats} 
            merchant={merchant}
          />
        )}

        {/* QR Codes Tab */}
        {activeTab === 'qr' && (
          <div className="space-y-8">
            {/* Payment QR Code - Green/Emerald Theme */}
            <div className="bg-gradient-to-br from-emerald-900/50 to-slate-800 border-2 border-emerald-500/50 rounded-2xl p-6 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400/10 rounded-full blur-2xl" />
              
              <div className="relative">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CreditCard size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Payment QR Code</h3>
                    <p className="text-emerald-300 text-sm">Receive payments from customers</p>
                  </div>
                </div>
                
                {/* QR Code Container */}
                <div className="text-center">
                  <div className="relative inline-block">
                    {/* QR Code with green border */}
                    <div className="bg-white rounded-2xl p-6 shadow-2xl shadow-emerald-500/20 border-4 border-emerald-500">
                      <QRCodeSVG 
                        value={`https://web-boost-seo.preview.emergentagent.com/pay/${merchant?.payment_qr_code || 'DEMO'}`}
                        size={200}
                        level="H"
                        includeMargin={false}
                        fgColor="#059669"
                        bgColor="#ffffff"
                      />
                    </div>
                    {/* Badge */}
                    <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      PAY
                    </div>
                  </div>
                  
                  {/* Instructions */}
                  <div className="mt-6 space-y-3">
                    <p className="text-emerald-100 font-medium">
                      Customers scan to pay you instantly
                    </p>
                    <div className="flex items-center gap-2 justify-center flex-wrap">
                      <code className="text-emerald-400 bg-slate-900/80 px-4 py-2 rounded-lg text-base font-mono border border-emerald-500/30">
                        {merchant?.payment_qr_code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyQRCode(merchant?.payment_qr_code)}
                        className="text-emerald-400 hover:bg-emerald-500/20"
                      >
                        <Copy size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recruitment QR Code - Purple/Blue Theme */}
            <div className="bg-gradient-to-br from-purple-900/50 to-slate-800 border-2 border-purple-500/50 rounded-2xl p-6 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl" />
              
              <div className="relative">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Users size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Recruitment QR Code</h3>
                    <p className="text-purple-300 text-sm">Invite new customers & earn bonuses</p>
                  </div>
                </div>
                
                {/* QR Code Container */}
                <div className="text-center">
                  <div className="relative inline-block">
                    {/* QR Code with purple border */}
                    <div className="bg-white rounded-2xl p-6 shadow-2xl shadow-purple-500/20 border-4 border-purple-500">
                      <QRCodeSVG 
                        value={`https://web-boost-seo.preview.emergentagent.com/register?ref=${merchant?.recruitment_qr_code || 'DEMO'}`}
                        size={200}
                        level="H"
                        includeMargin={false}
                        fgColor="#7c3aed"
                        bgColor="#ffffff"
                      />
                    </div>
                    {/* Badge */}
                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      REFER
                    </div>
                  </div>
                  
                  {/* Instructions */}
                  <div className="mt-6 space-y-3">
                    <p className="text-purple-100 font-medium">
                      New customers scan to register via your referral
                    </p>
                    <div className="flex items-center gap-2 justify-center flex-wrap">
                      <code className="text-purple-400 bg-slate-900/80 px-4 py-2 rounded-lg text-base font-mono border border-purple-500/30">
                        {merchant?.recruitment_qr_code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyQRCode(merchant?.recruitment_qr_code)}
                        className="text-purple-400 hover:bg-purple-500/20"
                      >
                        <Copy size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tips Section */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h4 className="text-amber-400 font-medium mb-3 flex items-center gap-2">
                <Info size={18} />
                Tips for better scanning
              </h4>
              <ul className="text-slate-400 text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  Print QR codes in high quality for best results
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">•</span>
                  Place QR codes in well-lit areas
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  Minimum recommended size: 3cm x 3cm
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Cash Payment Tab */}
        {activeTab === 'cash' && (
          <div className="space-y-6">
            {/* Today's Cash Stats */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Banknote size={20} className="text-emerald-400" />
                  Today's Payments
                </h3>
                <Button
                  onClick={() => { fetchTodayCashStats(); fetchDebitAccount(); fetchDebitHistory(); }}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400"
                >
                  <RefreshCw size={16} />
                </Button>
              </div>
              
              {todayCashStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Cash Sales */}
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote className="text-emerald-400" size={18} />
                      <span className="text-emerald-400 text-sm font-medium">Cash</span>
                    </div>
                    <p className="text-white text-xl font-bold">
                      GHS {todayCashStats.cash_volume?.toFixed(2)}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {todayCashStats.cash_count} transaction{todayCashStats.cash_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  {/* MoMo Sales */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="text-blue-400" size={18} />
                      <span className="text-blue-400 text-sm font-medium">MoMo</span>
                    </div>
                    <p className="text-white text-xl font-bold">
                      GHS {todayCashStats.momo_volume?.toFixed(2)}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {todayCashStats.momo_count} transaction{todayCashStats.momo_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  {/* Total */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-600">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="text-amber-400" size={18} />
                      <span className="text-slate-300 text-sm font-medium">Total</span>
                    </div>
                    <p className="text-white text-xl font-bold">
                      GHS {todayCashStats.total_volume?.toFixed(2)}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {todayCashStats.total_count} transactions
                    </p>
                  </div>
                  
                  {/* Cash Cashback Given */}
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="text-purple-400" size={18} />
                      <span className="text-purple-400 text-sm font-medium">Cashback</span>
                    </div>
                    <p className="text-purple-400 text-xl font-bold">
                      GHS {todayCashStats.cash_cashback?.toFixed(2)}
                    </p>
                    <p className="text-slate-400 text-xs">from cash sales</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Loader2 className="animate-spin text-amber-400 mx-auto mb-2" size={24} />
                  <p className="text-slate-400 text-sm">Loading today's stats...</p>
                </div>
              )}
            </div>

            {/* Pending Cash Confirmations */}
            <div className="bg-gradient-to-br from-orange-900/30 to-slate-800 border border-orange-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center relative">
                    <Clock size={24} className="text-white" />
                    {pendingConfirmations.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {pendingConfirmations.length}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Pending Confirmations</h3>
                    <p className="text-orange-300 text-sm">Confirm cash payments to credit cashback</p>
                  </div>
                </div>
                <Button
                  onClick={fetchPendingConfirmations}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400"
                  disabled={isLoadingPending}
                >
                  {isLoadingPending ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                </Button>
              </div>
              
              {isLoadingPending ? (
                <div className="text-center py-6">
                  <Loader2 className="animate-spin text-orange-400 mx-auto mb-2" size={24} />
                  <p className="text-slate-400 text-sm">Loading pending confirmations...</p>
                </div>
              ) : pendingConfirmations.length === 0 ? (
                <div className="text-center py-6 bg-slate-800/50 rounded-lg">
                  <CheckCircle className="text-emerald-400 mx-auto mb-2" size={32} />
                  <p className="text-slate-400">No pending confirmations</p>
                  <p className="text-slate-500 text-sm">All cash payments have been processed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingConfirmations.map((txn) => {
                    const expiresAt = new Date(txn.expires_at);
                    const hoursLeft = Math.max(0, Math.floor((expiresAt - new Date()) / (1000 * 60 * 60)));
                    
                    return (
                      <div 
                        key={txn.id} 
                        className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                        data-testid={`pending-${txn.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-white font-medium">{txn.client_name}</p>
                            <p className="text-slate-400 text-sm">{txn.client_phone}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-400 font-bold text-lg">GHS {txn.amount?.toFixed(2)}</p>
                            <p className="text-purple-400 text-sm">+{txn.cashback_amount?.toFixed(2)} cashback</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                          <span>{new Date(txn.created_at).toLocaleString()}</span>
                          <span className={hoursLeft < 12 ? 'text-red-400' : 'text-orange-400'}>
                            Expires in {hoursLeft}h
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleConfirmPayment(txn.id)}
                            disabled={isConfirming === txn.id || isRejecting === txn.id}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            data-testid={`confirm-${txn.id}`}
                          >
                            {isConfirming === txn.id ? (
                              <Loader2 className="animate-spin mr-2" size={16} />
                            ) : (
                              <CheckCircle className="mr-2" size={16} />
                            )}
                            Confirm Receipt
                          </Button>
                          <Button
                            onClick={() => handleRejectPayment(txn.id)}
                            disabled={isConfirming === txn.id || isRejecting === txn.id}
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            data-testid={`reject-${txn.id}`}
                          >
                            {isRejecting === txn.id ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : (
                              <XCircle size={16} />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <p className="text-slate-500 text-xs mt-4 text-center">
                Payments auto-expire after 72 hours if not confirmed. Max 3 pending per customer.
              </p>
            </div>

            {/* Debit Account Overview */}
            <div className="bg-gradient-to-br from-amber-900/30 to-slate-800 border border-amber-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                    <Wallet size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Debit Account</h3>
                    <p className="text-amber-300 text-sm">For cash payment cashback</p>
                  </div>
                </div>
                <Button
                  onClick={() => { fetchDebitAccount(); fetchDebitHistory(); }}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400"
                >
                  <RefreshCw size={16} />
                </Button>
              </div>
              
              {debitAccount ? (
                <div className="space-y-4">
                  {/* Balance Display */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm mb-1">Current Balance</p>
                      <p className={`text-2xl font-bold ${debitAccount.stats?.current_balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        GHS {debitAccount.stats?.current_balance?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm mb-1">Debit Limit</p>
                      <p className="text-2xl font-bold text-amber-400">
                        GHS {debitAccount.stats?.debit_limit?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status Alerts */}
                  {debitAccount.stats?.is_blocked && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle size={20} />
                        <span className="font-semibold">Account Blocked</span>
                      </div>
                      <p className="text-red-300 text-sm mt-1">
                        Your debit limit has been reached. Please top up your account to continue processing cash payments.
                      </p>
                    </div>
                  )}
                  
                  {debitAccount.stats?.usage_percentage >= 75 && !debitAccount.stats?.is_blocked && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-amber-400">
                        <AlertCircle size={20} />
                        <span className="font-semibold">Warning: {debitAccount.stats?.usage_percentage?.toFixed(0)}% of limit used</span>
                      </div>
                      <p className="text-amber-300 text-sm mt-1">
                        Consider topping up your account soon to avoid interruptions.
                      </p>
                    </div>
                  )}
                  
                  {/* Usage Bar */}
                  {debitAccount.stats?.debit_limit > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Usage</span>
                        <span className="text-slate-300">{debitAccount.stats?.usage_percentage?.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            debitAccount.stats?.usage_percentage >= 100 ? 'bg-red-500' :
                            debitAccount.stats?.usage_percentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, debitAccount.stats?.usage_percentage || 0)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {debitAccount.stats?.debit_limit === 0 && (
                    <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 text-center">
                      <Info size={24} className="text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-300">No debit limit configured</p>
                      <p className="text-slate-500 text-sm">Contact admin to set up your debit limit for cash transactions</p>
                    </div>
                  )}
                  
                  {/* Cash Payment Info Box */}
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                        <Banknote className="text-emerald-400" size={20} />
                      </div>
                      <div>
                        <h4 className="text-emerald-400 font-medium">Cash Payments</h4>
                        <p className="text-slate-400 text-sm mt-1">
                          Clients can pay cash by scanning your QR code and selecting "Cash" as payment method. 
                          Cashback is automatically credited to them and debited from your account.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Top Up Button */}
                  <Button
                    onClick={() => setShowTopUpModal(true)}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    <ArrowUpRight size={18} className="mr-2" />
                    Top Up Debit Account
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="animate-spin text-amber-400 mx-auto mb-2" size={32} />
                  <p className="text-slate-400">Loading debit account...</p>
                </div>
              )}
            </div>
            
            {/* Debit History */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <History size={18} /> Debit History
              </h3>
              {debitHistory.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {debitHistory.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          entry.type === 'credit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {entry.type === 'credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <p className="text-white text-sm">{entry.description?.slice(0, 40)}...</p>
                          <p className="text-slate-500 text-xs">{new Date(entry.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${entry.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {entry.type === 'credit' ? '+' : '-'}GHS {entry.amount?.toFixed(2)}
                        </p>
                        <p className="text-slate-500 text-xs">Bal: GHS {entry.balance_after?.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No debit transactions yet</p>
              )}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'history' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <History size={18} /> Recent Transactions
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchTransactions}
                  className="text-slate-400"
                >
                  <RefreshCw size={16} />
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate('/merchant/history')}
                  className="bg-amber-500 hover:bg-amber-600 text-sm"
                  data-testid="view-all-history-btn"
                >
                  View All
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((txn) => (
                  <div key={txn.id} className="p-4 bg-slate-900 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{txn.description || 'Payment'}</span>
                      <span className="text-white font-bold">GHS {txn.amount?.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        {new Date(txn.created_at).toLocaleString()}
                      </span>
                      <span className="text-emerald-400">
                        Cashback: GHS {txn.cashback_amount?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        txn.status === 'completed' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {txn.status}
                      </span>
                      {txn.payment_method === 'cash' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <Banknote size={12} /> Cash
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          <Smartphone size={12} /> MoMo
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No transactions yet</p>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Settings Sub-tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'cashback', label: 'Cashback', icon: Percent },
                { id: 'payment', label: 'Payment', icon: Wallet },
                { id: 'withdrawal', label: 'Withdrawal', icon: ArrowDownToLine },
                { id: 'payouts', label: 'Payouts', icon: History },
                { id: 'statements', label: 'Relevés', icon: FileText },
                { id: 'cashiers', label: 'Caissiers', icon: UserCog },
                { id: 'business', label: 'Commerce', icon: Building },
                { id: 'security', label: 'Sécurité', icon: Shield },
                { id: 'api', label: 'API & Webhooks', icon: Key }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    settingsTab === tab.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  data-testid={`settings-tab-${tab.id}`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Cashback Settings */}
            {settingsTab === 'cashback' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Percent size={18} /> Taux de Cashback
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      step="0.5"
                      value={settings.cashback_rate}
                      onChange={(e) => setSettings({...settings, cashback_rate: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white text-lg"
                    />
                    <p className="text-slate-500 text-xs mt-1">Plage: 1% - 20%</p>
                  </div>
                  <Button
                    onClick={handleSaveCashbackRate}
                    disabled={isSaving}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  </Button>
                </div>
              </div>
            )}

            {/* Monthly Statements */}
            {settingsTab === 'statements' && (
              <MonthlyStatements token={token} />
            )}

            {/* Payouts History */}
            {settingsTab === 'payouts' && (
              <Suspense fallback={<div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-slate-400" /></div>}>
                <PayoutHistory token={token} />
              </Suspense>
            )}

            {/* Withdrawal */}
            {settingsTab === 'withdrawal' && (
              <Suspense fallback={<div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-slate-400" /></div>}>
                <MerchantWithdrawal 
                  token={token} 
                  merchant={merchant}
                  payoutSettings={settings}
                  onRefresh={fetchDashboardData}
                />
              </Suspense>
            )}

            {/* Payment Settings */}
            {settingsTab === 'payment' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Wallet size={18} /> Payout Settings
                </h3>
                
                {/* Preferred Payout Method */}
                <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                  <h4 className="text-slate-300 text-sm font-medium mb-3">Preferred Payout Method</h4>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setSettings({...settings, preferred_payout_method: 'momo'})}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                        settings.preferred_payout_method === 'momo' 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                          : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <Phone className="mx-auto mb-1" size={20} />
                      <span className="text-sm">Mobile Money</span>
                    </button>
                    <button
                      onClick={() => setSettings({...settings, preferred_payout_method: 'bank'})}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                        settings.preferred_payout_method === 'bank' 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                          : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <Building className="mx-auto mb-1" size={20} />
                      <span className="text-sm">Bank Transfer</span>
                    </button>
                  </div>
                </div>
                
                {/* MoMo Settings */}
                <div className="space-y-4 mb-6">
                  <h4 className="text-slate-300 text-sm font-medium flex items-center gap-2">
                    <Phone size={16} /> Mobile Money
                    {settings.preferred_payout_method === 'momo' && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Primary</span>
                    )}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400 text-xs">MoMo Number</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <Input
                          type="tel"
                          placeholder="0XX XXX XXXX"
                          value={settings.momo_number}
                          onChange={(e) => handleMoMoChange(e.target.value)}
                          className="pl-10 bg-slate-900 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Network</Label>
                      <select
                        value={settings.momo_network}
                        onChange={(e) => handleMoMoNetworkChange(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                      >
                        <option value="">Select Network</option>
                        <option value="MTN">MTN MoMo</option>
                        <option value="TELECEL">Telecel (ex-Vodafone)</option>
                        <option value="AIRTELTIGO">AirtelTigo (AT)</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* MoMo Verification */}
                  {settings.momo_number && settings.momo_network && (
                    <div className="mt-3">
                      {!momoVerified ? (
                        <Button
                          onClick={handleVerifyMoMo}
                          disabled={isVerifyingMoMo}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          data-testid="verify-momo-btn"
                        >
                          {isVerifyingMoMo ? (
                            <>
                              <Loader2 className="animate-spin mr-2" size={16} />
                              Verifying MoMo...
                            </>
                          ) : (
                            <>
                              <Phone className="mr-2" size={16} />
                              Verify MoMo Account
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="text-purple-400" size={18} />
                            <div>
                              <p className="text-purple-400 text-sm font-medium">MoMo Verified</p>
                              <p className="text-white text-sm">{momoAccountName}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bank Settings */}
                <div className="space-y-4">
                  <h4 className="text-slate-300 text-sm font-medium flex items-center gap-2">
                    <Building size={16} /> Bank Account
                    {settings.preferred_payout_method === 'bank' && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Primary</span>
                    )}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400 text-xs">Select Bank</Label>
                      <select
                        value={settings.bank_id || settings.bank_code}
                        onChange={(e) => handleBankChange(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                        disabled={isFetchingBanks}
                      >
                        <option value="">Select Bank</option>
                        {bankList.map(bank => (
                          <option key={bank.code || bank.id} value={bank.code || bank.id}>{bank.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Account Number</Label>
                      <Input
                        type="text"
                        placeholder="Enter account number"
                        value={settings.bank_account}
                        onChange={(e) => {
                          setSettings({...settings, bank_account: e.target.value, bank_account_name: ''});
                          setBankVerified(false);
                        }}
                        className="mt-1 bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  
                  {/* Branch Name (Optional) */}
                  <div>
                    <Label className="text-slate-400 text-xs">Branch Name (Optional)</Label>
                    <Input
                      type="text"
                      placeholder="e.g., Osu Branch, Accra Main"
                      value={settings.bank_branch || ''}
                      onChange={(e) => setSettings({...settings, bank_branch: e.target.value})}
                      className="mt-1 bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  
                  {/* Bank Verification */}
                  {settings.bank_id && settings.bank_account && (
                    <div className="mt-4">
                      {!bankVerified ? (
                        <Button
                          onClick={handleVerifyBankAccount}
                          disabled={isVerifyingBank}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          data-testid="verify-bank-btn"
                        >
                          {isVerifyingBank ? (
                            <>
                              <Loader2 className="animate-spin mr-2" size={16} />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2" size={16} />
                              Verify Bank Account
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="text-emerald-400" size={18} />
                            <div>
                              <p className="text-emerald-400 text-sm font-medium">Account Verified</p>
                              <p className="text-white text-sm">{settings.bank_account_name}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSavePaymentInfo}
                  disabled={isSaving || (settings.preferred_payout_method === 'bank' && settings.bank_account && !bankVerified)}
                  className="mt-6 w-full bg-emerald-500 hover:bg-emerald-600"
                  data-testid="save-payment-info-btn"
                >
                  {isSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                  Save Payout Settings
                </Button>
                
                {settings.preferred_payout_method === 'bank' && settings.bank_account && !bankVerified && (
                  <p className="text-amber-400 text-xs text-center mt-2">
                    Please verify your bank account before saving
                  </p>
                )}
              </div>
            )}

            {/* Cashiers Management */}
            {settingsTab === 'cashiers' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <CashierManager token={token} />
              </div>
            )}

            {/* Business Info */}
            {settingsTab === 'business' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <BusinessInfoEditor 
                  token={token} 
                  merchant={merchant} 
                  onUpdate={(updatedMerchant) => setMerchant(updatedMerchant)}
                />
              </div>
            )}

            {/* Security / PIN Settings */}
            {settingsTab === 'security' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <PinSettings 
                  token={token} 
                  pinStatus={pinStatus} 
                  onPinStatusChange={handlePinStatusChange}
                />
              </div>
            )}

            {/* API & Webhooks Settings */}
            {settingsTab === 'api' && (
              <div className="space-y-8">
                <APIKeysManager />
                <WebhooksManager />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700">
        <div className="max-w-4xl mx-auto flex justify-around py-3">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-emerald-400' : 'text-slate-500'}`}
            data-testid="nav-home"
          >
            <BarChart3 size={22} />
            <span className="text-xs">Dashboard</span>
          </button>
          <button
            onClick={() => { setActiveTab('cash'); fetchDebitAccount(); fetchDebitHistory(); fetchTodayCashStats(); }}
            className={`flex flex-col items-center gap-1 ${activeTab === 'cash' ? 'text-emerald-400' : 'text-slate-500'}`}
            data-testid="nav-cash"
          >
            <Banknote size={22} />
            <span className="text-xs">Cash</span>
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'qr' ? 'text-emerald-400' : 'text-slate-500'}`}
            data-testid="nav-qr"
          >
            <QrCode size={22} />
            <span className="text-xs">QR Codes</span>
          </button>
          <button
            onClick={() => { setActiveTab('history'); fetchTransactions(); }}
            className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-emerald-400' : 'text-slate-500'}`}
            data-testid="nav-history"
          >
            <History size={22} />
            <span className="text-xs">History</span>
          </button>
          <button
            onClick={handleSettingsClick}
            className={`flex flex-col items-center gap-1 relative ${activeTab === 'settings' ? 'text-emerald-400' : 'text-slate-500'}`}
            data-testid="nav-settings"
          >
            <Settings size={22} />
            <span className="text-xs">Settings</span>
            {pinStatus.pin_enabled && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full"></span>
            )}
          </button>
        </div>
      </nav>

      {/* PIN Modal */}
      <PinModal
        isOpen={showPinModal}
        onClose={handlePinModalClose}
        onVerify={handleVerifyPin}
        isLoading={isVerifyingPin}
        error={pinError}
      />

      {/* Forgot PIN Modal */}
      <ForgotPinModal
        isOpen={showForgotPinModal}
        onClose={() => setShowForgotPinModal(false)}
        onRequestOTP={handleRequestOTP}
        onResetPin={handleResetPin}
        merchantPhone={merchant?.phone}
        merchantEmail={merchant?.email}
      />

      {/* Real-time Payment Notifications */}
      <Suspense fallback={null}>
        <PaymentNotificationToast 
          token={token}
          onNotification={(notification) => {
            // Refresh dashboard data when payment received
            fetchDashboardData();
            fetchTodayCashStats();
            fetchTransactions();
          }}
        />
      </Suspense>

      {/* Cash Payment Info Modal - Removed: Clients now initiate cash payments */}

      {/* Top Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <ArrowUpRight className="text-amber-400" size={24} />
              Top Up Debit Account
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Amount (GHS)</label>
                <Input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Minimum GHS 10"
                  className="bg-slate-900 border-slate-700 text-white"
                  min="10"
                />
              </div>
              
              <div>
                <label className="text-slate-300 text-sm mb-2 block">MoMo Number</label>
                <Input
                  value={topUpPhone}
                  onChange={(e) => setTopUpPhone(e.target.value)}
                  placeholder="e.g., 0541008285"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Network</label>
                <select
                  value={topUpNetwork}
                  onChange={(e) => setTopUpNetwork(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="MTN">MTN Mobile Money</option>
                  <option value="Telecel">Telecel Cash</option>
                  <option value="AirtelTigo">AirtelTigo Money</option>
                </select>
              </div>
              
              {topUpAmount && parseFloat(topUpAmount) >= 10 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-amber-400 text-sm">
                    You will receive a payment prompt on <strong>{topUpPhone || 'your phone'}</strong> to approve GHS {parseFloat(topUpAmount).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => { setShowTopUpModal(false); setTopUpAmount(''); }}
                variant="outline"
                className="flex-1 border-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleTopUp}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                disabled={!topUpAmount || parseFloat(topUpAmount) < 10 || !topUpPhone || isProcessingTopUp}
              >
                {isProcessingTopUp ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                Pay Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef, useMemo, useCallback, memo, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useLanguage, LanguageSelector } from '../contexts/LanguageContext';
import { QRCodeSVG } from 'qrcode.react';

// Lazy load heavy components
const QRScanner = lazy(() => import('../components/QRScanner'));
const ReferralQRCode = lazy(() => import('../components/client/ReferralQRCode'));
const MerchantPayModal = lazy(() => import('../components/client/MerchantPayModal'));
const WithdrawalModal = lazy(() => import('../components/client/WithdrawalModal'));
const PaymentSettingsModal = lazy(() => import('../components/client/PaymentSettingsModal'));
const AIAssistant = lazy(() => import('../components/client/AIAssistant'));
const AIWidget = lazy(() => import('../components/client/AIWidget'));
const NotificationSettings = lazy(() => import('../components/client/NotificationSettings'));
const MissionsHub = lazy(() => import('../components/client/MissionsHub'));
const ReferralShare = lazy(() => import('../components/client/ReferralShare'));
const ServicesPage = lazy(() => import('./ServicesPage'));

// Mini loader for lazy components
const MiniLoader = () => (
  <div className="flex items-center justify-center p-4">
    <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
  </div>
);
import { 
  Sparkles, 
  CreditCard, 
  History, 
  Users, 
  User,
  QrCode,
  Settings,
  LogOut,
  Wallet,
  TrendingUp,
  Gift,
  Share2,
  Copy,
  CheckCircle,
  Clock,
  Store,
  Loader2,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  X,
  AlertCircle,
  Camera,
  Percent,
  Smartphone,
  Grid3X3,
  MapPin,
  Banknote,
  Send,
  Crown,
  ArrowUp,
  Zap,
  Building,
  Building2,
  ExternalLink,
  Navigation,
  Search,
  Brain,
  Bell,
  Target,
  Trophy
} from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';
const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, syncLanguageWithServer } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  
  // Data states
  const [client, setClient] = useState(null);
  const [card, setCard] = useState(null);
  const [cardValidity, setCardValidity] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [referrals, setReferrals] = useState(null);
  const [availableCards, setAvailableCards] = useState([]);
  const [partners, setPartners] = useState([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');
  
  // Card Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [paymentPhone, setPaymentPhone] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [isPaymentTestMode, setIsPaymentTestMode] = useState(false);
  const pollingRef = useRef(null);
  
  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false);
  
  // Merchant Payment modal state
  const [showMerchantPayModal, setShowMerchantPayModal] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [merchantPayAmount, setMerchantPayAmount] = useState('');
  const [merchantPayPhone, setMerchantPayPhone] = useState('');
  const [merchantPayNetwork, setMerchantPayNetwork] = useState('MTN');
  const [merchantPayStatus, setMerchantPayStatus] = useState(null);
  const [merchantPaymentId, setMerchantPaymentId] = useState(null);
  const [isMerchantPayTestMode, setIsMerchantPayTestMode] = useState(false);

  // Withdrawal modal state
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalPhone, setWithdrawalPhone] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalNetwork, setWithdrawalNetwork] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState('momo'); // 'momo' or 'bank'
  const [withdrawalStatus, setWithdrawalStatus] = useState(null);
  const [withdrawalId, setWithdrawalId] = useState(null);
  const [isWithdrawalTestMode, setIsWithdrawalTestMode] = useState(false);
  const [withdrawalFee, setWithdrawalFee] = useState({ type: 'fixed', rate: 0 });
  
  // Payment Settings state
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    momo_number: '',
    momo_network: 'MTN',
    bank_id: '',
    bank_code: '',
    bank_name: '',
    bank_account_name: '',
    bank_account: '',
    bank_branch: '',
    preferred_withdrawal_method: 'momo'
  });
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);

  // Card Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradeCard, setSelectedUpgradeCard] = useState(null);
  const [upgradePaymentPhone, setUpgradePaymentPhone] = useState('');
  const [upgradeStatus, setUpgradeStatus] = useState(null);
  const [upgradePaymentId, setUpgradePaymentId] = useState(null);
  const [isUpgradeTestMode, setIsUpgradeTestMode] = useState(false);
  const [useUpgradeCashback, setUseUpgradeCashback] = useState(false);
  const [upgradeCashbackAmount, setUpgradeCashbackAmount] = useState('');
  const [upgradeWelcomeBonus, setUpgradeWelcomeBonus] = useState(0);
  
  // Services page
  const [showServices, setShowServices] = useState(false);
  
  // Notification settings
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  
  // Referral share modal
  const [showReferralShare, setShowReferralShare] = useState(false);
  
  // Card selection section ref for scrolling
  const cardSelectionRef = useRef(null);

  const token = localStorage.getItem('sdm_client_token');

  useEffect(() => {
    if (!token) {
      navigate('/client');
      return;
    }
    fetchDashboardData();
    fetchPaymentSettings();
    
    // Check if navigated from Partners page or PayPage with merchant to pay
    if (location.state?.payMerchant && location.state?.merchantQR) {
      handleMerchantFromPartners(location.state);
      // Clear the location state
      navigate(location.pathname, { replace: true, state: {} });
    }
    
    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [token, location.state]);
  
  const handleMerchantFromPartners = async (state) => {
    // Look up merchant and open payment modal
    try {
      const res = await axios.get(`${API_URL}/api/merchants/by-qr/${state.merchantQR}`);
      if (res.data.merchant) {
        setSelectedMerchant(res.data.merchant);
        setShowMerchantPayModal(true);
        setMerchantPayStatus(null);
        setMerchantPayAmount('');
        setActiveTab('qr');
      }
    } catch (error) {
      console.error('Failed to load merchant:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch dashboard
      const dashRes = await axios.get(`${API_URL}/api/clients/me`, { headers });
      setClient(dashRes.data.client);
      setCard(dashRes.data.card);
      setTransactions(dashRes.data.recent_transactions || []);
      
      // Sync language preference with server
      syncLanguageWithServer(token);
      
      // Fetch card validity if client has a card
      if (dashRes.data.client?.card_type) {
        try {
          const cardRes = await axios.get(`${API_URL}/api/clients/cards/my-card`, { headers });
          setCardValidity(cardRes.data.validity);
        } catch (e) {
          console.error('Card validity fetch error:', e);
        }
      }
      
      // Fetch available cards
      const cardsRes = await axios.get(`${API_URL}/api/clients/cards/available`);
      setAvailableCards(cardsRes.data.cards || []);
      
      // Fetch withdrawal fee
      try {
        const feeRes = await axios.get(`${API_URL}/api/payments/withdrawal/fee`);
        if (feeRes.data.success) {
          setWithdrawalFee(feeRes.data.fee);
        }
      } catch (e) {
        console.error('Withdrawal fee fetch error:', e);
      }
      
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('sdm_client_token');
        navigate('/client');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/clients/transactions?limit=50`, { headers });
      setTransactions(res.data.transactions || []);
    } catch (error) {
      console.error('Transactions fetch error:', error);
    }
  };

  const fetchReferrals = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/clients/referrals`, { headers });
      setReferrals(res.data);
    } catch (error) {
      console.error('Referrals fetch error:', error);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/clients/payment-settings`, { headers });
      setPaymentSettings({
        momo_number: res.data.momo_number || '',
        momo_network: res.data.momo_network || 'MTN',
        bank_id: res.data.bank_id || '',
        bank_code: res.data.bank_code || '',
        bank_name: res.data.bank_name || '',
        bank_account_name: res.data.bank_account_name || '',
        bank_account: res.data.bank_account || '',
        bank_branch: res.data.bank_branch || '',
        preferred_withdrawal_method: res.data.preferred_withdrawal_method || 'momo'
      });
    } catch (error) {
      console.error('Payment settings fetch error:', error);
    }
  };

  const savePaymentSettings = async () => {
    setSavingPaymentSettings(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/clients/payment-settings`, paymentSettings, { headers });
      toast.success('Payment settings saved successfully');
      setShowPaymentSettings(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSavingPaymentSettings(false);
    }
  };

  const handlePurchaseCard = async (cardType) => {
    // Find card details
    const cardDetails = availableCards.find(c => c.type === cardType);
    if (!cardDetails) {
      toast.error('Card not found');
      return;
    }
    
    // Set initial phone from client data
    setPaymentPhone(client?.phone || '');
    setSelectedCard(cardDetails);
    setShowPaymentModal(true);
    setPaymentStatus(null);
    setPaymentId(null);
  };
  
  const initiatePayment = async () => {
    if (!paymentPhone || paymentPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    setIsProcessingPayment(true);
    setPaymentStatus('processing');
    
    try {
      const res = await axios.post(`${API_URL}/api/payments/card/initiate`, {
        phone: paymentPhone,
        card_type: selectedCard.type
      });
      
      if (res.data.success) {
        setPaymentId(res.data.payment_id);
        
        // Direct MoMo Prompt flow (no checkout redirect)
        setPaymentStatus('pending');
        setIsPaymentTestMode(res.data.test_mode || false);
        
        // In test mode, show confirm button
        if (res.data.test_mode) {
          toast.info('Test mode: Click "Confirm Payment" to simulate payment');
        } else {
          toast.success('MoMo prompt sent! Please approve on your phone.');
          // Start polling for status
          startPolling(res.data.payment_id);
        }
      }
    } catch (error) {
      setPaymentStatus('failed');
      toast.error(error.response?.data?.detail || 'Payment initiation failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };
  
  const startPolling = (pId) => {
    // Poll every 3 seconds for payment status using the new endpoint
    pollingRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/payments/poll-status/${pId}`);
        
        if (res.data.completed || res.data.status === 'completed' || res.data.status === 'success') {
          clearInterval(pollingRef.current);
          setPaymentStatus('success');
          toast.success('Payment successful! Cashback credited.');
          setTimeout(() => {
            setShowPaymentModal(false);
            fetchDashboardData();
          }, 2000);
        } else if (res.data.failed || res.data.status === 'failed') {
          clearInterval(pollingRef.current);
          setPaymentStatus('failed');
          toast.error('Payment failed. Please try again.');
        }
        // Otherwise continue polling (should_poll will be true for pending/processing)
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
    
    // Stop polling after 3 minutes
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        // One final check
        checkPaymentStatus();
      }
    }, 180000);
  };
  
  const confirmTestPayment = async () => {
    if (!paymentId) return;
    
    setIsProcessingPayment(true);
    try {
      const res = await axios.post(`${API_URL}/api/payments/test/confirm/${paymentId}`);
      if (res.data.success) {
        setPaymentStatus('success');
        toast.success('Payment confirmed! Your card is now active.');
        setTimeout(() => {
          setShowPaymentModal(false);
          fetchDashboardData();
        }, 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Confirmation failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Check payment status - "I have paid" button
  const checkPaymentStatus = async () => {
    if (!paymentId) return;
    
    setIsProcessingPayment(true);
    try {
      const res = await axios.post(`${API_URL}/api/payments/check-status/${paymentId}`);
      if (res.data.status === 'completed') {
        setPaymentStatus('success');
        toast.success('Payment confirmed! Your card is now active.');
        setTimeout(() => {
          setShowPaymentModal(false);
          fetchDashboardData();
        }, 2000);
      } else if (res.data.status === 'failed') {
        setPaymentStatus('failed');
        toast.error(res.data.message || 'Payment failed');
      } else {
        toast.info(res.data.message || 'Payment is still processing');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to check status');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Fetch partner merchants
  const fetchPartners = async (search = '') => {
    setPartnersLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.append('search', search);
      
      const res = await axios.get(`${API_URL}/api/public/merchants?${params.toString()}`);
      setPartners(res.data.merchants || []);
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setPartnersLoading(false);
    }
  };
  
  const closePaymentModal = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    setShowPaymentModal(false);
    setSelectedCard(null);
    setPaymentStatus(null);
    setPaymentId(null);
  };

  // ============== QR SCANNER & MERCHANT PAYMENT ==============
  
  const handleQRScan = async (qrCode) => {
    // Close scanner
    setShowQRScanner(false);
    
    // Check if active client
    if (client?.status !== 'active') {
      toast.error('Please purchase a membership card first');
      return;
    }
    
    // Look up merchant by QR code
    try {
      const res = await axios.get(`${API_URL}/api/merchants/by-qr/${qrCode}`);
      if (res.data.merchant) {
        setSelectedMerchant(res.data.merchant);
        setShowMerchantPayModal(true);
        setMerchantPayStatus(null);
        setMerchantPayAmount('');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Merchant not found');
    }
  };
  
  const initiateMerchantPayment = async () => {
    const amount = parseFloat(merchantPayAmount);
    if (!amount || amount < 1) {
      toast.error('Please enter a valid amount (minimum GHS 1)');
      return;
    }
    
    // Validate phone
    const payPhone = merchantPayPhone || client?.phone;
    if (!payPhone || payPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    setIsProcessingPayment(true);
    setMerchantPayStatus('processing');
    
    try {
      const res = await axios.post(`${API_URL}/api/payments/merchant/initiate`, {
        client_phone: payPhone,
        merchant_qr_code: selectedMerchant?.payment_qr_code,
        amount: amount,
        network: merchantPayNetwork
      });
      
      if (res.data.success) {
        setMerchantPaymentId(res.data.payment_id);
        setMerchantPayStatus('pending');
        setIsMerchantPayTestMode(res.data.test_mode || false);
        
        if (res.data.test_mode) {
          toast.info('Test mode: Click "Confirm Payment" to simulate MoMo approval');
        } else {
          toast.success('MoMo prompt sent! Please approve on your phone.');
          // Start polling
          startMerchantPolling(res.data.payment_id);
        }
      }
    } catch (error) {
      setMerchantPayStatus('failed');
      toast.error(error.response?.data?.detail || 'Payment failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };
  
  const startMerchantPolling = (pId) => {
    pollingRef.current = setInterval(async () => {
      try {
        // Use the new poll-status endpoint that queries Hubtel directly
        const res = await axios.get(`${API_URL}/api/payments/poll-status/${pId}`);
        
        if (res.data.completed || res.data.status === 'completed' || res.data.status === 'success') {
          clearInterval(pollingRef.current);
          setMerchantPayStatus('success');
          toast.success('Payment successful! Cashback credited.');
          setTimeout(() => {
            setShowMerchantPayModal(false);
            fetchDashboardData();
          }, 2000);
        } else if (res.data.failed || res.data.status === 'failed') {
          clearInterval(pollingRef.current);
          setMerchantPayStatus('failed');
          toast.error(res.data.message || 'Payment failed');
        }
        // Continue polling if still pending
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
    
    // Stop polling after 3 minutes
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        // Final check
        checkMerchantPaymentStatus();
      }
    }, 180000);
  };
  
  const confirmMerchantTestPayment = async () => {
    if (!merchantPaymentId) return;
    
    setIsProcessingPayment(true);
    try {
      const res = await axios.post(`${API_URL}/api/payments/test/confirm/${merchantPaymentId}`);
      if (res.data.success) {
        setMerchantPayStatus('success');
        toast.success('Payment confirmed! Cashback credited.');
        setTimeout(() => {
          setShowMerchantPayModal(false);
          fetchDashboardData();
        }, 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Confirmation failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Check merchant payment status - "I have paid" button
  const checkMerchantPaymentStatus = async () => {
    if (!merchantPaymentId) return;
    
    setIsProcessingPayment(true);
    try {
      const res = await axios.post(`${API_URL}/api/payments/check-status/${merchantPaymentId}`);
      if (res.data.status === 'completed') {
        setMerchantPayStatus('success');
        toast.success('Payment confirmed! Cashback credited.');
        setTimeout(() => {
          setShowMerchantPayModal(false);
          fetchDashboardData();
        }, 2000);
      } else if (res.data.status === 'failed') {
        setMerchantPayStatus('failed');
        toast.error(res.data.message || 'Payment failed');
      } else {
        toast.info(res.data.message || 'Payment is still processing');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to check status');
    } finally {
      setIsProcessingPayment(false);
    }
  };
  
  const closeMerchantPayModal = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setShowMerchantPayModal(false);
    setSelectedMerchant(null);
    setMerchantPayStatus(null);
    setMerchantPaymentId(null);
    setMerchantPayAmount('');
    setMerchantPayPhone('');
    setMerchantPayNetwork('MTN');
  };

  // ============== CASH PAYMENT TO MERCHANT ==============
  
  const initiateCashPayment = async () => {
    const amount = parseFloat(merchantPayAmount);
    if (!amount || amount < 1) {
      toast.error('Minimum payment is GHS 1');
      return;
    }
    
    if (!selectedMerchant?.payment_qr_code) {
      toast.error('Merchant QR code not found');
      return;
    }
    
    const payPhone = merchantPayPhone || client?.phone;
    if (!payPhone || payPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    setIsProcessingPayment(true);
    setMerchantPayStatus('processing');
    
    try {
      const res = await axios.post(`${API_URL}/api/payments/merchant/cash`, {
        client_phone: payPhone,
        merchant_qr_code: selectedMerchant?.payment_qr_code,
        amount: amount
      });
      
      if (res.data.success) {
        setMerchantPayStatus('cash_success');
        toast.success(`Cash payment pending! Awaiting merchant confirmation.`);
        
        // Refresh dashboard data after a short delay
        setTimeout(() => {
          fetchDashboardData();
        }, 1500);
      }
    } catch (error) {
      setMerchantPayStatus('failed');
      toast.error(error.response?.data?.detail || 'Cash payment failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // ============== CHECK CASH PAYMENT STATUS ==============
  const [currentCashPaymentId, setCurrentCashPaymentId] = useState(null);
  
  const checkCashPaymentStatus = async () => {
    if (!currentCashPaymentId && !selectedMerchant) return;
    
    setIsProcessingPayment(true);
    try {
      // Get latest pending cash payment for this client/merchant
      const res = await axios.get(`${API_URL}/api/payments/cash/status`, {
        params: {
          client_phone: client?.phone,
          merchant_id: selectedMerchant?.id || selectedMerchant?._id
        },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sdm_client_token')}`
        }
      });
      
      if (res.data.status === 'confirmed' || res.data.status === 'completed') {
        setMerchantPayStatus('cash_confirmed');
        toast.success('Payment confirmed! Cashback credited to your wallet.');
        fetchDashboardData();
      } else if (res.data.status === 'pending') {
        toast.info('Still awaiting merchant confirmation...');
      } else if (res.data.status === 'rejected') {
        setMerchantPayStatus('failed');
        toast.error('Payment was rejected by merchant');
      }
    } catch (error) {
      toast.error('Could not check payment status');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // ============== CASHBACK PAYMENT TO MERCHANT ==============
  
  const initiateCashbackPayment = async ({ paymentMethod, cashbackToUse, momoToUse, momoPhone }) => {
    const amount = parseFloat(merchantPayAmount);
    if (!amount || amount < 1) {
      toast.error('Minimum payment is GHS 1');
      return;
    }
    
    if (!selectedMerchant?.payment_qr_code) {
      toast.error('Merchant QR code not found');
      return;
    }
    
    // Validate based on payment method
    if (paymentMethod === 'cashback') {
      if (cashbackToUse > (client?.cashback_balance || 0)) {
        toast.error('Insufficient cashback balance');
        return;
      }
    } else if (paymentMethod === 'hybrid' && momoToUse > 0) {
      if (!momoPhone || momoPhone.length < 10) {
        toast.error('Please enter a valid MoMo phone number');
        return;
      }
    }
    
    setIsProcessingPayment(true);
    setMerchantPayStatus('processing');
    
    try {
      const res = await axios.post(`${API_URL}/api/payments/merchant/cashback`, {
        client_phone: client?.phone,
        merchant_qr_code: selectedMerchant?.payment_qr_code,
        amount: amount,
        payment_method: paymentMethod,
        cashback_to_use: cashbackToUse,
        momo_amount: momoToUse,
        momo_phone: momoPhone || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setMerchantPayStatus('success');
        const earnedCashback = res.data.cashback_earned || 0;
        if (paymentMethod === 'cashback') {
          toast.success(`Payment successful! GHS ${cashbackToUse.toFixed(2)} deducted from your cashback.${earnedCashback > 0 ? ` You earned GHS ${earnedCashback.toFixed(2)} cashback!` : ''}`);
        } else if (paymentMethod === 'hybrid') {
          toast.success(`Payment successful! GHS ${cashbackToUse.toFixed(2)} cashback + GHS ${momoToUse.toFixed(2)} MoMo.${earnedCashback > 0 ? ` You earned GHS ${earnedCashback.toFixed(2)} cashback!` : ''}`);
        }
        
        // Refresh dashboard data after a short delay
        setTimeout(() => {
          fetchDashboardData();
          closeMerchantPayModal();
        }, 2000);
      }
    } catch (error) {
      setMerchantPayStatus('failed');
      toast.error(error.response?.data?.detail || 'Payment failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // ============== REFERRAL SHARING ==============

  const copyReferralCode = () => {
    navigator.clipboard.writeText(client?.referral_code || '');
    toast.success('Referral code copied!');
  };
  
  const shareReferral = async (platform) => {
    const referralLink = `${window.location.origin}/client?ref=${client?.referral_code}`;
    const message = `Join SDM Rewards and get cashback on every purchase! Use my referral code: ${client?.referral_code}. Sign up here: ${referralLink}`;
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(referralLink);
        toast.success('Referral link copied!');
        break;
      default:
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Join SDM Rewards',
              text: message,
              url: referralLink
            });
          } catch (err) {
            // User cancelled or share failed
          }
        }
    }
  };

  // ============== WITHDRAWAL FUNCTIONS ==============

  const openWithdrawalModal = () => {
    // Initialize with saved payment settings
    setWithdrawalPhone(paymentSettings.momo_number || client?.phone || '');
    setWithdrawalNetwork(paymentSettings.momo_network || 'MTN');
    setWithdrawalMethod(paymentSettings.preferred_withdrawal_method || 'momo');
    setWithdrawalAmount('');
    setWithdrawalStatus(null);
    setWithdrawalId(null);
    setShowWithdrawalModal(true);
  };

  const initiateWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (!amount || amount < 5) {
      toast.error('Minimum withdrawal amount is GHS 5');
      return;
    }
    
    if (amount > (client?.cashback_balance || 0)) {
      toast.error(`Insufficient balance. Available: GHS ${(client?.cashback_balance || 0).toFixed(2)}`);
      return;
    }

    // Validate based on withdrawal method
    if (withdrawalMethod === 'momo') {
      if (!withdrawalPhone) {
        toast.error('Please enter phone number');
        return;
      }
      if (!withdrawalNetwork) {
        toast.error('Please select a network');
        return;
      }
    } else if (withdrawalMethod === 'bank') {
      if (!paymentSettings.bank_id || !paymentSettings.bank_account || !paymentSettings.bank_account_name) {
        toast.error('Please configure your bank account in Payment Settings first');
        return;
      }
    }

    setIsProcessingPayment(true);
    setWithdrawalStatus('processing');
    
    try {
      let res;
      
      if (withdrawalMethod === 'momo') {
        // MoMo withdrawal
        const payload = {
          amount: amount,
          phone: withdrawalPhone,
          network: withdrawalNetwork
        };
        res = await axios.post(`${API_URL}/api/services/withdrawal/initiate`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Bank withdrawal
        const payload = {
          account_number: paymentSettings.bank_account,
          bank_id: paymentSettings.bank_id,
          account_name: paymentSettings.bank_account_name,
          amount: amount
        };
        res = await axios.post(`${API_URL}/api/services/withdrawal/bank`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      if (res.data.success) {
        setWithdrawalId(res.data.transaction_id || res.data.withdrawal_id);
        setWithdrawalStatus('pending');
        setIsWithdrawalTestMode(res.data.test_mode || false);
        
        // Refresh balance
        fetchDashboardData();
        
        if (res.data.test_mode) {
          toast.info('Test mode: Click "Confirm Withdrawal" to simulate payout');
        } else {
          toast.success(`Withdrawal initiated! Amount: GHS ${amount.toFixed(2)}`);
        }
      }
    } catch (error) {
      setWithdrawalStatus('failed');
      toast.error(error.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const confirmTestWithdrawal = async () => {
    if (!withdrawalId) return;
    
    setIsProcessingPayment(true);
    try {
      const res = await axios.post(`${API_URL}/api/payments/withdrawal/test/confirm/${withdrawalId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setWithdrawalStatus('success');
        toast.success(`Withdrawal successful! New balance: GHS ${res.data.new_balance.toFixed(2)}`);
        setTimeout(() => {
          setShowWithdrawalModal(false);
          fetchDashboardData();
        }, 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Confirmation failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Check transaction status
  const checkTransactionStatus = async () => {
    if (!withdrawalId) return;
    
    setIsProcessingPayment(true);
    try {
      const res = await axios.get(`${API_URL}/api/services/transaction/status/${withdrawalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        const status = res.data.status;
        setWithdrawalStatus(status);
        
        if (status === 'success') {
          toast.success('Withdrawal completed successfully!');
          fetchDashboardData();
        } else if (status === 'failed') {
          toast.error('Withdrawal failed. Please contact support.');
        } else {
          toast.info(`Status: ${status}. Please check again later.`);
        }
      }
    } catch (error) {
      toast.error('Could not check status. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const closeWithdrawalModal = () => {
    setShowWithdrawalModal(false);
    setWithdrawalPhone('');
    setWithdrawalAmount('');
    setWithdrawalNetwork('');
    setWithdrawalStatus(null);
    setWithdrawalId(null);
  };

  // ============== CARD UPGRADE FUNCTIONS ==============

  const getUpgradeOptions = () => {
    if (!client?.card_type || !availableCards.length) return [];
    
    const cardOrder = ['silver', 'gold', 'platinum', 'diamond', 'business'];
    const currentIndex = cardOrder.indexOf(client.card_type);
    
    // Filter cards that are higher tier - client pays FULL PRICE
    return availableCards
      .filter(card => {
        const cardIndex = cardOrder.indexOf(card.type);
        return cardIndex > currentIndex;
      })
      .map(card => ({
        ...card,
        fullPrice: card.price,  // Full price to pay
        welcomeBonus: card.welcome_bonus || (card.type === 'silver' ? 1 : card.type === 'gold' ? 2 : card.type === 'platinum' ? 3 : 1)
      }))
      .sort((a, b) => a.price - b.price);
  };

  const openUpgradeModal = (card) => {
    setSelectedUpgradeCard(card);
    setUpgradePaymentPhone(client?.phone || '');
    setUpgradeStatus(null);
    setUpgradePaymentId(null);
    setUseUpgradeCashback(false);
    setUpgradeCashbackAmount('');
    setUpgradeWelcomeBonus(card.welcomeBonus || 0);
    setShowUpgradeModal(true);
  };

  const calculateUpgradePayment = () => {
    if (!selectedUpgradeCard) return { cashback: 0, momo: 0, total: 0 };
    
    const total = selectedUpgradeCard.fullPrice;
    const maxCashback = client?.cashback_balance || 0;
    
    let cashbackToUse = 0;
    if (useUpgradeCashback) {
      if (upgradeCashbackAmount && parseFloat(upgradeCashbackAmount) > 0) {
        cashbackToUse = Math.min(parseFloat(upgradeCashbackAmount), maxCashback, total);
      } else {
        cashbackToUse = Math.min(maxCashback, total);
      }
    }
    
    const momoAmount = total - cashbackToUse;
    
    return {
      cashback: cashbackToUse,
      momo: momoAmount,
      total: total
    };
  };

  const initiateUpgrade = async () => {
    const payment = calculateUpgradePayment();
    
    // Validate phone if MoMo payment needed
    if (payment.momo > 0 && (!upgradePaymentPhone || upgradePaymentPhone.length < 10)) {
      toast.error('Please enter a valid phone number for MoMo payment');
      return;
    }
    
    setIsProcessingPayment(true);
    setUpgradeStatus('processing');
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/api/clients/cards/upgrade`, {
        new_card_type: selectedUpgradeCard.type,
        payment_phone: upgradePaymentPhone || null,
        use_cashback: useUpgradeCashback,
        cashback_amount: useUpgradeCashback ? (upgradeCashbackAmount ? parseFloat(upgradeCashbackAmount) : null) : null
      }, { headers });
      
      if (res.data.success) {
        setUpgradePaymentId(res.data.payment_id);
        setUpgradeWelcomeBonus(res.data.welcome_bonus || 0);
        
        // If fully paid with cashback
        if (res.data.status === 'completed') {
          setUpgradeStatus('success');
          toast.success(res.data.message || 'Upgrade successful!');
          setTimeout(() => {
            setShowUpgradeModal(false);
            fetchDashboardData();
          }, 2000);
        } else {
          // Direct MoMo Prompt flow
          setIsUpgradeTestMode(res.data.test_mode || false);
          setUpgradeStatus('pending');
          
          if (res.data.test_mode) {
            toast.info('Test mode: Click "Confirm" to simulate payment');
          } else {
            toast.success(`MoMo prompt sent for GHS ${res.data.momo_amount || res.data.amount}! Approve on your phone.`);
            startPolling(res.data.payment_id);
          }
        }
      }
    } catch (error) {
      setUpgradeStatus('failed');
      toast.error(error.response?.data?.detail || 'Upgrade failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const confirmTestUpgrade = async () => {
    if (!upgradePaymentId) return;
    
    setIsProcessingPayment(true);
    try {
      const res = await axios.post(`${API_URL}/api/payments/test/confirm/${upgradePaymentId}`);
      if (res.data.success) {
        setUpgradeStatus('success');
        toast.success('Upgrade successful! Your new card is active.');
        setTimeout(() => {
          setShowUpgradeModal(false);
          fetchDashboardData();
        }, 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Confirmation échouée');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const closeUpgradeModal = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setShowUpgradeModal(false);
    setSelectedUpgradeCard(null);
    setUpgradeStatus(null);
    setUpgradePaymentId(null);
    setUpgradePaymentPhone('');
    setUseUpgradeCashback(false);
    setUpgradeCashbackAmount('');
    setUpgradeWelcomeBonus(0);
  };

  const handleLogout = () => {
    localStorage.removeItem('sdm_client_token');
    localStorage.removeItem('sdm_client_data');
    navigate('/client');
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'cashback_earned': return <ArrowDownLeft className="text-emerald-400" size={18} />;
      case 'payment': return <ShoppingBag className="text-blue-400" size={18} />;
      case 'welcome_bonus': return <Gift className="text-amber-400" size={18} />;
      case 'referral_bonus': return <Users className="text-purple-400" size={18} />;
      case 'card_purchase': return <CreditCard className="text-orange-400" size={18} />;
      default: return <ArrowUpRight className="text-slate-400" size={18} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-400" size={48} />
      </div>
    );
  }

  const isActive = client?.status === 'active';

  // Show Services Page
  if (showServices) {
    return (
      <ServicesPage 
        balance={client?.cashback_balance || 0}
        onBack={() => setShowServices(false)}
        onRefresh={fetchDashboardData}
        client={client}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-9 h-9 object-contain rounded-lg" />
            <span className="font-bold text-white">SDM</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowNotificationSettings(true)} 
              className="text-slate-400 hover:text-amber-400"
              data-testid="notifications-btn"
            >
              <Bell size={20} />
            </button>
            <button 
              onClick={() => navigate('/client/profile')} 
              className="text-slate-400 hover:text-white"
              data-testid="profile-btn"
            >
              <User size={20} />
            </button>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-amber-100 text-sm">Cashback Balance</p>
              <p className="text-3xl font-bold">GHS {(client?.cashback_balance || 0).toFixed(2)}</p>
            </div>
            {isActive && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                client?.card_type === 'platinum' ? 'bg-slate-700' :
                client?.card_type === 'gold' ? 'bg-amber-700' : 'bg-slate-500'
              }`}>
                {client?.card_type?.toUpperCase()} MEMBER
              </div>
            )}
          </div>
          
          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-amber-200">Total Earned</p>
              <p className="font-semibold">GHS {(client?.total_earned || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-amber-200">Total Spent</p>
              <p className="font-semibold">GHS {(client?.total_spent || 0).toFixed(2)}</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          {isActive && (
            <div className="mt-4 flex gap-3">
              {/* Services Button */}
              <Button
                onClick={() => setShowServices(true)}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white"
                data-testid="services-btn"
              >
                <Grid3X3 size={18} className="mr-2" />
                Services
              </Button>
              
              {/* Withdraw Button */}
              {(client?.cashback_balance || 0) >= 2 && (
                <Button
                  onClick={openWithdrawalModal}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white"
                  data-testid="withdraw-btn"
                >
                  <Banknote size={18} className="mr-2" />
                  Withdraw
                </Button>
              )}
              
              {/* Payment Settings Button */}
              <Button
                onClick={() => setShowPaymentSettings(true)}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                data-testid="payment-settings-btn"
              >
                <Settings size={18} />
              </Button>
            </div>
          )}
        </div>

        {/* Inactive Account Banner */}
        {!isActive && (
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="text-amber-400" size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full uppercase">
                    Inactive Account
                  </span>
                </div>
                <p className="text-white font-medium">Activate your account</p>
                <p className="text-slate-400 text-sm mt-1">
                  Purchase a membership card to start earning cashback on all your purchases!
                </p>
                <Button
                  onClick={() => {
                    setActiveTab('home');
                    // Scroll to card selection section after a short delay
                    setTimeout(() => {
                      cardSelectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                  }}
                  className="mt-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  size="sm"
                  data-testid="activate-account-btn"
                >
                  <CreditCard size={16} className="mr-2" />
                  Buy a card
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            {isActive && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <TrendingUp className="text-emerald-400 mb-2" size={24} />
                  <p className="text-slate-400 text-sm">Referrals</p>
                  <p className="text-white text-xl font-bold">{client?.referral_count || 0}</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <Gift className="text-amber-400 mb-2" size={24} />
                  <p className="text-slate-400 text-sm">Bonus Earned</p>
                  <p className="text-white text-xl font-bold">GHS {(client?.total_earned || 0).toFixed(0)}</p>
                </div>
              </div>
            )}

            {/* My Card */}
            {isActive && card && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <CreditCard size={18} /> My Card
                </h3>
                <div className={`rounded-xl p-4 ${
                  client?.card_type === 'platinum' ? 'bg-gradient-to-br from-slate-600 to-slate-500' :
                  client?.card_type === 'gold' ? 'bg-gradient-to-br from-amber-500 to-yellow-400' :
                  'bg-gradient-to-br from-slate-400 to-slate-300'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white/80 text-sm">{card?.card_number}</p>
                      <p className="text-white font-bold text-lg mt-2">{client?.full_name}</p>
                      <p className="text-white/80 text-xs mt-1">@{client?.username}</p>
                    </div>
                    <img src={SDM_LOGO_URL} alt="SDM" className="w-10 h-10 object-contain opacity-80" />
                  </div>
                </div>
                
                {/* Card Validity Info */}
                {cardValidity && (
                  <div className="mt-4 space-y-3">
                    {/* Validity Status */}
                    <div className={`p-3 rounded-lg flex items-center justify-between ${
                      cardValidity.is_expired 
                        ? 'bg-red-500/10 border border-red-500/30' 
                        : cardValidity.days_remaining <= 30 
                          ? 'bg-amber-500/10 border border-amber-500/30'
                          : 'bg-emerald-500/10 border border-emerald-500/30'
                    }`}>
                      <div className="flex items-center gap-2">
                        {cardValidity.is_expired ? (
                          <AlertCircle className="text-red-400" size={18} />
                        ) : cardValidity.days_remaining <= 30 ? (
                          <Clock className="text-amber-400" size={18} />
                        ) : (
                          <CheckCircle className="text-emerald-400" size={18} />
                        )}
                        <span className={`font-medium ${
                          cardValidity.is_expired ? 'text-red-400' : 
                          cardValidity.days_remaining <= 30 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {cardValidity.is_expired 
                            ? 'Card expired' 
                            : cardValidity.days_remaining <= 30 
                              ? `Expires in ${cardValidity.days_remaining} days`
                              : 'Card active'}
                        </span>
                      </div>
                      {!cardValidity.is_expired && cardValidity.days_remaining !== null && (
                        <span className="text-white font-bold">
                          {cardValidity.days_remaining} days
                        </span>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-900 p-2 rounded-lg">
                        <p className="text-slate-500 text-xs">Activation</p>
                        <p className="text-white">{cardValidity.start_date || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg">
                        <p className="text-slate-500 text-xs">Expiration</p>
                        <p className="text-white">{cardValidity.end_date || 'Unlimited'}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {cardValidity.duration_days && !cardValidity.is_expired && (
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Used: {cardValidity.days_used} days</span>
                          <span>Total: {cardValidity.duration_days} days</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              cardValidity.days_remaining <= 30 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (cardValidity.days_used / cardValidity.duration_days) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Renew Button */}
                    {cardValidity.is_expired && (
                      <Button 
                        className="w-full bg-amber-500 hover:bg-amber-600"
                        onClick={() => setActiveTab('card')}
                      >
                        Renew my card
                      </Button>
                    )}
                  </div>
                )}

                {/* Upgrade Card Button */}
                {!cardValidity?.is_expired && getUpgradeOptions().length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Crown className="text-amber-400" size={18} />
                        <span className="text-white font-medium">Upgrade available</span>
                      </div>
                      <Zap className="text-amber-400" size={16} />
                    </div>
                    <div className="space-y-2">
                      {getUpgradeOptions().slice(0, 2).map((upgradeCard) => (
                        <button
                          key={upgradeCard.type}
                          onClick={() => openUpgradeModal(upgradeCard)}
                          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg hover:from-amber-500/20 hover:to-orange-500/20 transition-all"
                          data-testid={`upgrade-to-${upgradeCard.type}-btn`}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ background: upgradeCard.color }}
                            >
                              <ArrowUp className="text-white" size={16} />
                            </div>
                            <div className="text-left">
                              <p className="text-white font-medium text-sm">{upgradeCard.name}</p>
                              <p className="text-emerald-400 text-xs">+GHS {upgradeCard.welcomeBonus} bonus</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-amber-400 font-bold">GHS {upgradeCard.fullPrice}</p>
                            <p className="text-slate-500 text-xs">full price</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Buy Card Section */}
            {!isActive && (
              <div ref={cardSelectionRef} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-4">Choose your card</h3>
                <div className="space-y-3">
                  {availableCards.map((cardItem) => (
                    <div 
                      key={cardItem.type}
                      className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg"
                          style={{ background: cardItem.color }}
                        />
                        <div>
                          <p className="text-white font-medium">{cardItem.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-amber-400 font-bold">GHS {cardItem.price}</p>
                            {cardItem.duration_label && (
                              <span className="text-slate-400 text-xs flex items-center gap-1">
                                <Clock size={12} /> {cardItem.duration_label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handlePurchaseCard(cardItem.type)}
                        className="bg-gradient-to-r from-amber-500 to-orange-500"
                        data-testid={`buy-${cardItem.type}-btn`}
                      >
                        Buy
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <History size={18} /> Recent Activity
              </h3>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(txn.type)}
                        <div>
                          <p className="text-white text-sm">{txn.description || txn.type}</p>
                          <p className="text-slate-500 text-xs">
                            {new Date(txn.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className={`font-medium ${
                        txn.type.includes('earned') || txn.type.includes('bonus') 
                          ? 'text-emerald-400' 
                          : 'text-slate-400'
                      }`}>
                        {txn.type.includes('earned') || txn.type.includes('bonus') ? '+' : ''}
                        GHS {txn.amount?.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No transactions yet</p>
              )}
            </div>

            {/* AI Widget */}
            {isActive && (
              <AIWidget 
                clientToken={token}
                language={language}
                onViewMore={() => setActiveTab('ai')}
              />
            )}
          </div>
        )}

        {activeTab === 'qr' && isActive && (
          <div className="space-y-6">
            {/* Scan to Pay Button */}
            <Button
              onClick={() => setShowQRScanner(true)}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 py-8 text-lg"
              data-testid="scan-to-pay-btn"
            >
              <Camera className="mr-3" size={24} />
              Scan to Pay Merchant
            </Button>
            
            {/* Browse Partners */}
            <Button
              onClick={() => navigate('/client/partners')}
              variant="outline"
              className="w-full border-slate-600 text-white hover:bg-slate-800 py-6"
              data-testid="browse-partners-btn"
            >
              <Store className="mr-2" size={20} />
              Browse Partner Merchants
            </Button>

            {/* My QR Code */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
              <h3 className="text-white font-semibold mb-4">My QR Code</h3>
              <p className="text-slate-400 text-sm mb-4">
                Merchants can scan this to collect payment from you
              </p>
              <div className="bg-white rounded-xl p-4 inline-block">
                <QRCodeSVG 
                  value={`SDM:${client?.qr_code}`} 
                  size={160}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-amber-400 font-mono mt-4">{client?.qr_code}</p>
            </div>

            {/* Quick Referral */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Your Referral Code</p>
                  <p className="text-amber-400 font-mono text-lg">{client?.referral_code}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyReferralCode}
                  className="text-slate-400 hover:text-white"
                >
                  <Copy size={20} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4">Transaction History</h3>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(txn.type)}
                      <div>
                        <p className="text-white text-sm">{txn.description || txn.type.replace('_', ' ')}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-slate-500 text-xs">
                            {new Date(txn.created_at).toLocaleString()}
                          </p>
                          {txn.status === 'pending_confirmation' && (
                            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                              Awaiting Confirmation
                            </span>
                          )}
                          {txn.status === 'rejected' && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                              Rejected
                            </span>
                          )}
                          {txn.status === 'expired' && (
                            <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded-full">
                              Expired
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        txn.status === 'pending_confirmation' ? 'text-orange-400' :
                        txn.status === 'rejected' || txn.status === 'expired' ? 'text-slate-500' :
                        txn.type.includes('earned') || txn.type.includes('bonus') 
                          ? 'text-emerald-400' 
                          : 'text-slate-400'
                      }`}>
                        {txn.type.includes('earned') || txn.type.includes('bonus') ? '+' : '-'}
                        GHS {txn.amount?.toFixed(2)}
                      </p>
                      {txn.status === 'pending_confirmation' && txn.cashback_amount && (
                        <p className="text-purple-400 text-xs">+{txn.cashback_amount?.toFixed(2)} pending</p>
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

        {activeTab === 'referrals' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{referrals?.total_referrals || 0}</p>
                <p className="text-slate-400 text-xs">Total</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{referrals?.active_referrals || 0}</p>
                <p className="text-slate-400 text-xs">Active</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">GHS {referrals?.total_bonus_earned || 0}</p>
                <p className="text-slate-400 text-xs">Earned</p>
              </div>
            </div>

            {/* QR Code Referral Component */}
            <ReferralQRCode 
              referralCode={client?.referral_code}
              clientName={client?.full_name}
            />

            {/* Referrals List */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4">Your Referrals</h3>
              {referrals?.referrals?.length > 0 ? (
                <div className="space-y-3">
                  {referrals.referrals.map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          ref.display_status === 'active' || ref.card_purchased
                            ? 'bg-emerald-500/20'
                            : 'bg-slate-700'
                        }`}>
                          <User className={`${
                            ref.display_status === 'active' || ref.card_purchased
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`} size={18} />
                        </div>
                        <div>
                          <p className="text-white text-sm">{ref.referred_client?.full_name || 'User'}</p>
                          <p className="text-slate-500 text-xs">
                            {new Date(ref.created_at).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {ref.bonuses_paid ? (
                          <span className="text-emerald-400 text-sm flex items-center gap-1">
                            <CheckCircle size={14} /> +GHS {ref.referrer_bonus || 3}
                          </span>
                        ) : ref.display_status === 'active' || ref.card_purchased ? (
                          <span className="text-amber-400 text-sm flex items-center gap-1">
                            <CheckCircle size={14} /> Active
                          </span>
                        ) : (
                          <span className="text-slate-500 text-sm flex items-center gap-1">
                            <Clock size={14} /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gift className="text-slate-600 mx-auto mb-3" size={40} />
                  <p className="text-slate-400">No referrals yet</p>
                  <p className="text-slate-500 text-sm mt-1">Share your code to start earning!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'ai' && isActive && (
          <AIAssistant
            clientToken={token}
            language={language}
          />
        )}

        {/* Missions Tab */}
        {activeTab === 'missions' && isActive && (
          <MissionsHub
            clientToken={token}
            language={language}
          />
        )}

        {/* Partners Tab */}
        {activeTab === 'partners' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <Input
                    type="text"
                    placeholder="Search merchants..."
                    value={partnerSearch}
                    onChange={(e) => setPartnerSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchPartners(partnerSearch)}
                    className="pl-10 bg-slate-900 border-slate-700 text-white"
                    data-testid="partner-search-input"
                  />
                </div>
                <Button
                  onClick={() => fetchPartners(partnerSearch)}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600"
                  data-testid="partner-search-btn"
                >
                  <Search size={16} />
                </Button>
              </div>
            </div>

            {/* Partners List */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Store className="text-amber-400" size={18} />
                Partner Merchants ({partners.length})
              </h3>
              
              {partnersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-amber-400" size={32} />
                </div>
              ) : partners.length > 0 ? (
                <div className="space-y-3">
                  {partners.map((merchant) => (
                    <div 
                      key={merchant.id} 
                      className="bg-slate-900 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                      data-testid={`partner-card-${merchant.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Building className="text-amber-400" size={18} />
                            <h4 className="text-white font-medium">{merchant.business_name}</h4>
                          </div>
                          
                          {merchant.business_type && (
                            <p className="text-slate-400 text-sm mt-1">{merchant.business_type}</p>
                          )}
                          
                          {/* Location */}
                          {(merchant.business_address || merchant.city) && (
                            <div className="flex items-start gap-2 mt-2">
                              <MapPin className="text-slate-500 mt-0.5" size={14} />
                              <p className="text-slate-400 text-sm">
                                {merchant.business_address || merchant.city}
                              </p>
                            </div>
                          )}
                          
                          {/* Phone */}
                          {merchant.phone && (
                            <div className="flex items-center gap-2 mt-2">
                              <Phone className="text-slate-500" size={14} />
                              <a 
                                href={`tel:${merchant.phone}`}
                                className="text-amber-400 text-sm hover:underline"
                              >
                                {merchant.phone}
                              </a>
                            </div>
                          )}
                          
                          {/* Cashback Rate */}
                          {merchant.cashback_rate && (
                            <div className="flex items-center gap-2 mt-2">
                              <Percent className="text-emerald-400" size={14} />
                              <span className="text-emerald-400 text-sm font-medium">
                                Up to {merchant.cashback_rate}% cashback
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Google Maps Link */}
                        {merchant.google_maps_url && (
                          <a
                            href={merchant.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                            data-testid={`partner-maps-${merchant.id}`}
                          >
                            <Navigation size={16} />
                            <span className="text-xs">Map</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Store className="text-slate-600 mx-auto mb-3" size={40} />
                  <p className="text-slate-400">No merchants found</p>
                  <p className="text-slate-500 text-sm mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700">
        <div className="max-w-lg mx-auto flex justify-around py-3">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-amber-400' : 'text-slate-500'}`}
            data-testid="nav-home"
          >
            <Wallet size={22} />
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => setActiveTab('missions')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'missions' ? 'text-amber-400' : 'text-slate-500'}`}
            disabled={!isActive}
            data-testid="nav-missions"
          >
            <Target size={22} />
            <span className="text-xs">Missions</span>
          </button>
          <button
            onClick={() => { setActiveTab('qr'); }}
            className={`flex flex-col items-center gap-1 ${activeTab === 'qr' ? 'text-amber-400' : 'text-slate-500'}`}
            disabled={!isActive}
            data-testid="nav-qr"
          >
            <QrCode size={22} />
            <span className="text-xs">QR Code</span>
          </button>
          <button
            onClick={() => setShowReferralShare(true)}
            className={`flex flex-col items-center gap-1 text-slate-500 hover:text-amber-400`}
            disabled={!isActive}
            data-testid="nav-invite"
          >
            <Share2 size={22} />
            <span className="text-xs">Invite</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'ai' ? 'text-amber-400' : 'text-slate-500'}`}
            disabled={!isActive}
            data-testid="nav-ai"
          >
            <Brain size={22} />
            <span className="text-xs">AI</span>
          </button>
        </div>
      </nav>
      
      {/* Payment Modal */}
      {showPaymentModal && selectedCard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 relative">
            {/* Close Button */}
            <button
              onClick={closePaymentModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              disabled={isProcessingPayment}
            >
              <X size={20} />
            </button>
            
            {/* Header */}
            <div className="text-center mb-6">
              <div 
                className="w-16 h-16 rounded-2xl mx-auto mb-3"
                style={{ background: selectedCard.color }}
              />
              <h3 className="text-white text-xl font-bold">{selectedCard.name}</h3>
              <p className="text-amber-400 text-2xl font-bold mt-1">GHS {selectedCard.price}</p>
            </div>
            
            {/* Payment Status Display */}
            {paymentStatus === 'success' ? (
              <div className="text-center py-8">
                <CheckCircle className="text-emerald-400 mx-auto mb-4" size={64} />
                <p className="text-white text-lg font-semibold">Payment Successful!</p>
                <p className="text-slate-400 mt-2">Your card is now active</p>
              </div>
            ) : paymentStatus === 'failed' ? (
              <div className="text-center py-8">
                <AlertCircle className="text-red-400 mx-auto mb-4" size={64} />
                <p className="text-white text-lg font-semibold">Payment Failed</p>
                <p className="text-slate-400 mt-2">Please try again</p>
                <Button
                  onClick={() => setPaymentStatus(null)}
                  className="mt-4 bg-amber-500 hover:bg-amber-600"
                >
                  Try Again
                </Button>
              </div>
            ) : paymentStatus === 'pending' ? (
              <div className="text-center py-6">
                <div className="relative">
                  <Loader2 className="text-amber-400 mx-auto mb-4 animate-spin" size={48} />
                </div>
                <p className="text-white text-lg font-semibold">MoMo Prompt Sent</p>
                <p className="text-slate-400 mt-2 text-sm">
                  Please approve the payment on your phone
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-amber-400">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="text-sm">Waiting for confirmation...</span>
                </div>
                
                {/* I Have Paid Button */}
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <Button
                    onClick={checkPaymentStatus}
                    disabled={isProcessingPayment}
                    variant="outline"
                    className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                    data-testid="check-payment-status-btn"
                  >
                    {isProcessingPayment ? (
                      <Loader2 className="animate-spin mr-2" size={16} />
                    ) : (
                      <CheckCircle className="mr-2" size={16} />
                    )}
                    I Have Paid - Check Status
                  </Button>
                </div>
                
                {/* Test Mode Confirm Button - Only show in test mode */}
                {isPaymentTestMode && (
                  <div className="mt-4">
                    <p className="text-slate-500 text-xs mb-3">Test Mode</p>
                    <Button
                      onClick={confirmTestPayment}
                      disabled={isProcessingPayment}
                      className="w-full bg-emerald-500 hover:bg-emerald-600"
                      data-testid="confirm-test-payment-btn"
                    >
                      {isProcessingPayment ? (
                        <Loader2 className="animate-spin mr-2" size={16} />
                      ) : (
                        <CheckCircle className="mr-2" size={16} />
                      )}
                      Confirm Payment (Test)
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Phone Input */}
                <div className="mb-6">
                  <label className="text-slate-300 text-sm block mb-2">
                    MoMo Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="tel"
                      placeholder="+233 XX XXX XXXX"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                      data-testid="momo-phone-input"
                    />
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    A payment prompt will be sent to this number
                  </p>
                </div>
                
                {/* Payment Summary */}
                <div className="bg-slate-900 rounded-lg p-4 mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-400">Card</span>
                    <span className="text-white">{selectedCard.name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-400">Price</span>
                    <span className="text-white">GHS {selectedCard.price}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-slate-400">Welcome Bonus</span>
                    <span className="text-emerald-400">+GHS 1.00</span>
                  </div>
                </div>
                
                {/* Pay Button */}
                <Button
                  onClick={initiatePayment}
                  disabled={isProcessingPayment || !paymentPhone}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 py-6"
                  data-testid="initiate-payment-btn"
                >
                  {isProcessingPayment ? (
                    <Loader2 className="animate-spin mr-2" size={18} />
                  ) : (
                    <CreditCard className="mr-2" size={18} />
                  )}
                  Pay with MoMo
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
          scanTitle="Scan Merchant QR"
          scanHint="Point at merchant's payment QR code"
        />
      )}
      
      {/* Merchant Payment Modal */}
      {showMerchantPayModal && selectedMerchant && (
        <MerchantPayModal
          merchant={selectedMerchant}
          amount={merchantPayAmount}
          setAmount={setMerchantPayAmount}
          phone={merchantPayPhone || client?.phone || ''}
          setPhone={setMerchantPayPhone}
          network={merchantPayNetwork}
          setNetwork={setMerchantPayNetwork}
          status={merchantPayStatus}
          setStatus={setMerchantPayStatus}
          isProcessing={isProcessingPayment}
          isTestMode={isMerchantPayTestMode}
          onClose={closeMerchantPayModal}
          onInitiatePayment={initiateMerchantPayment}
          onCheckStatus={checkMerchantPaymentStatus}
          onConfirmTest={confirmMerchantTestPayment}
          onCashPayment={initiateCashPayment}
          onCashbackPayment={initiateCashbackPayment}
          onCheckCashStatus={checkCashPaymentStatus}
          cashbackAmount={((parseFloat(merchantPayAmount) || 0) * (selectedMerchant?.cashback_rate || 5) / 100).toFixed(2)}
          clientCashbackBalance={client?.cashback_balance || 0}
        />
      )}
      {/* ============== WITHDRAWAL MODAL ============== */}
      {showWithdrawalModal && (
        <WithdrawalModal
          isOpen={showWithdrawalModal}
          balance={client?.cashback_balance || 0}
          phone={withdrawalPhone}
          setPhone={setWithdrawalPhone}
          amount={withdrawalAmount}
          setAmount={setWithdrawalAmount}
          network={withdrawalNetwork}
          setNetwork={setWithdrawalNetwork}
          method={withdrawalMethod}
          setMethod={setWithdrawalMethod}
          status={withdrawalStatus}
          setStatus={setWithdrawalStatus}
          isProcessing={isProcessingPayment}
          isTestMode={isWithdrawalTestMode}
          paymentSettings={paymentSettings}
          withdrawalFee={withdrawalFee}
          transactionId={withdrawalId}
          onClose={closeWithdrawalModal}
          onInitiate={initiateWithdrawal}
          onCheckStatus={checkTransactionStatus} 
          onConfirmTest={confirmTestWithdrawal}
          onOpenPaymentSettings={() => setShowPaymentSettings(true)}
        />
      )}
      {/* Payment Settings Modal */}
      {showPaymentSettings && (
        <PaymentSettingsModal
          isOpen={showPaymentSettings}
          settings={paymentSettings}
          setSettings={setPaymentSettings}
          defaultMethod={paymentSettings.preferred_withdrawal_method || 'momo'}
          setDefaultMethod={(method) => setPaymentSettings({...paymentSettings, preferred_withdrawal_method: method})}
          isSaving={isProcessingPayment}
          onClose={() => setShowPaymentSettings(false)}
          onSave={savePaymentSettings}
        />
      )}
      
      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowNotificationSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"
            >
              <X size={24} />
            </button>
            <div className="p-4">
              <NotificationSettings
                clientToken={token}
                language={language}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Referral Share Modal */}
      {showReferralShare && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <ReferralShare
                clientToken={token}
                language={language}
                onClose={() => setShowReferralShare(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


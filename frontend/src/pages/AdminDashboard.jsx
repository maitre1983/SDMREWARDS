import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Shield, 
  Users, 
  Store, 
  CreditCard,
  TrendingUp,
  DollarSign,
  LogOut,
  Loader2,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  Ban,
  UserCheck,
  Trash2,
  Settings,
  BarChart3,
  Activity,
  Percent,
  Gift,
  RefreshCw,
  Wallet,
  Award,
  Crown,
  Medal,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  MessageSquare,
  MapPin,
  Sliders,
  History,
  Phone,
  Banknote,
  Key,
  Bell,
  Send,
  AlertTriangle,
  Unlock,
  Smartphone,
  Sparkles
} from 'lucide-react';

// Admin Components
import ServiceFeesAnalytics from '../components/admin/ServiceFeesAnalytics';
import CardTypesManager from '../components/admin/CardTypesManager';
import AdminOverview from '../components/admin/AdminOverview';
import AdminClients from '../components/admin/AdminClients';
import AdminMerchants from '../components/admin/AdminMerchants';
import SEODashboard from '../components/admin/SEODashboard';
import AdminSettings from '../components/admin/AdminSettings';

// Modals
import {
  LimitsModal,
  LocationModal,
  ResetPasswordModal,
  CreateClientModal,
  CreateMerchantModal,
  PinModal,
  SetPinModal
} from '../components/admin/modals';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('sdm_admin_token'));
  const [admin, setAdmin] = useState(null);
  
  // Login refs (for Playwright compatibility)
  const emailRef = useRef();
  const passwordRef = useRef();
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Data states
  const [stats, setStats] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [config, setConfig] = useState(null);
  
  // Modal states
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsRecipientType, setSmsRecipientType] = useState('client');
  const [clientTransactions, setClientTransactions] = useState([]);
  const [merchantTransactions, setMerchantTransactions] = useState([]);
  const [transactionSummary, setTransactionSummary] = useState(null);
  const [limitsForm, setLimitsForm] = useState({ withdrawal_limit: 500, transaction_limit: 1000, daily_limit: 2000 });
  const [locationForm, setLocationForm] = useState({ address: '', google_maps_url: '', city: '' });
  const [actionLoading, setActionLoading] = useState(false);
  
  // Settings states - moved to AdminSettings component
  // Only keep what's still used in AdminDashboard for modals
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showCreateMerchantModal, setShowCreateMerchantModal] = useState(false);
  const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);
  const [bulkSMSType, setBulkSMSType] = useState('clients');
  const [bulkSMSFilter, setBulkSMSFilter] = useState('all');
  const [bulkSMSMessage, setBulkSMSMessage] = useState('');
  const [newClientForm, setNewClientForm] = useState({ full_name: '', phone: '', username: '', email: '', card_type: '' });
  const [newMerchantForm, setNewMerchantForm] = useState({ 
    business_name: '', owner_name: '', phone: '', email: '', 
    cashback_rate: 5, city: '', address: '', google_maps_url: ''
  });
  
  // Phase 2 & 3: Advanced features states
  const [smsHistory, setSmsHistory] = useState([]);
  const [smsTemplates, setSmsTemplates] = useState([]);
  const [scheduledSMS, setScheduledSMS] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', message: '', category: 'general' });
  
  // Push Notification states
  const [pushNotifications, setPushNotifications] = useState([]);
  const [pushStats, setPushStats] = useState({ subscribers: 0 });
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushForm, setPushForm] = useState({ title: '', message: '', segment: 'All', url: '' });
  const [pushLoading, setPushLoading] = useState(false);
  
  // Merchant Debit Account states
  const [merchantDebitOverview, setMerchantDebitOverview] = useState({ accounts: [], summary: {} });
  const [selectedMerchantDebit, setSelectedMerchantDebit] = useState(null);
  const [showDebitSettingsModal, setShowDebitSettingsModal] = useState(false);
  const [debitSettingsForm, setDebitSettingsForm] = useState({ debit_limit: 0, settlement_days: 0 });
  const [isLoadingDebit, setIsLoadingDebit] = useState(false);
  
  // Payment Methods Stats for merchant
  const [merchantPaymentMethodsStats, setMerchantPaymentMethodsStats] = useState(null);
  const [paymentMethodsPeriod, setPaymentMethodsPeriod] = useState('today');
  
  // Global Payment Methods Stats (for Overview)
  const [globalPaymentMethods, setGlobalPaymentMethods] = useState(null);
  
  // Cashback Ecosystem Stats (for Overview)
  const [cashbackEcosystem, setCashbackEcosystem] = useState(null);
  
  // Security states
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '', otp_code: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [otpPreview, setOtpPreview] = useState('');
  
  // Reset Password Modal states
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null); // { type: 'client' | 'merchant', data: {...} }
  const [resetPasswordForm, setResetPasswordForm] = useState({ new_password: '', confirm_password: '' });

  // Monthly analytics state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [loadingMonthlyStats, setLoadingMonthlyStats] = useState(false);
  
  // Admin management states
  const [allAdmins, setAllAdmins] = useState([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({ email: '', password: '', name: '', role: 'admin_support' });

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setIsLoading(false);
      setShowLogin(true);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.type === 'admin') {
        setAdmin(res.data.user);
        setShowLogin(false);
        fetchDashboardData();
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      handleLogout();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = emailRef.current?.value;
    const password = passwordRef.current?.value;
    
    if (!email || !password) {
      toast.error('Please fill all fields');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/admin/login`, {
        email,
        password
      });
      
      const newToken = res.data.access_token;
      localStorage.setItem('sdm_admin_token', newToken);
      setToken(newToken);
      setAdmin(res.data.admin);
      setShowLogin(false);
      
      toast.success('Login successful!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sdm_admin_token');
    setToken(null);
    setAdmin(null);
    setShowLogin(true);
    setIsLoading(false);
  };

  const getHeaders = () => {
    const t = token || localStorage.getItem('sdm_admin_token');
    return { Authorization: `Bearer ${t}` };
  };

  const fetchDashboardData = async () => {
    try {
      const headers = getHeaders();
      
      // Fetch clients
      const clientsRes = await axios.get(`${API_URL}/api/admin/clients`, { headers });
      setClients(clientsRes.data.clients || []);
      
      // Fetch merchants
      const merchantsRes = await axios.get(`${API_URL}/api/admin/merchants`, { headers });
      setMerchants(merchantsRes.data.merchants || []);
      
      // Calculate stats
      const totalClients = clientsRes.data.clients?.length || 0;
      const activeClients = clientsRes.data.clients?.filter(c => c.status === 'active').length || 0;
      const totalMerchants = merchantsRes.data.merchants?.length || 0;
      const activeMerchants = merchantsRes.data.merchants?.filter(m => m.status === 'active').length || 0;
      
      setStats({
        total_clients: totalClients,
        active_clients: activeClients,
        total_merchants: totalMerchants,
        active_merchants: activeMerchants,
        pending_merchants: merchantsRes.data.merchants?.filter(m => m.status === 'pending').length || 0
      });
      
      // Fetch advanced stats for Overview
      try {
        const advancedRes = await axios.get(`${API_URL}/api/admin/dashboard/advanced-stats`, { headers });
        setAdvancedStats(advancedRes.data);
      } catch (advErr) {
        console.error('Advanced stats fetch error:', advErr);
      }
      
      // Fetch global payment methods stats (Cash vs MoMo) and cashback ecosystem
      try {
        const dashRes = await axios.get(`${API_URL}/api/admin/dashboard`, { headers });
        if (dashRes.data.payment_methods) {
          setGlobalPaymentMethods(dashRes.data.payment_methods);
        }
        if (dashRes.data.cashback_ecosystem) {
          setCashbackEcosystem(dashRes.data.cashback_ecosystem);
        }
      } catch (pmErr) {
        console.error('Payment methods stats fetch error:', pmErr);
      }
      
      // Fetch platform config for Settings
      try {
        const configRes = await axios.get(`${API_URL}/api/admin/settings`, { headers });
        if (configRes.data.config) {
          setPlatformConfig(configRes.data.config);
          // Update forms with current config
          if (configRes.data.config.card_prices) {
            setCardPricesForm(prev => ({
              ...prev,
              silver_price: configRes.data.config.card_prices.silver || 25,
              gold_price: configRes.data.config.card_prices.gold || 50,
              platinum_price: configRes.data.config.card_prices.platinum || 100
            }));
          }
          if (configRes.data.config.card_benefits) {
            setCardPricesForm(prev => ({
              ...prev,
              silver_benefits: configRes.data.config.card_benefits.silver || prev.silver_benefits,
              gold_benefits: configRes.data.config.card_benefits.gold || prev.gold_benefits,
              platinum_benefits: configRes.data.config.card_benefits.platinum || prev.platinum_benefits
            }));
          }
          if (configRes.data.config.card_durations) {
            setCardPricesForm(prev => ({
              ...prev,
              silver_duration: configRes.data.config.card_durations.silver || 365,
              gold_duration: configRes.data.config.card_durations.gold || 365,
              platinum_duration: configRes.data.config.card_durations.platinum || 730
            }));
          }
          if (configRes.data.config.welcome_bonuses) {
            setCardPricesForm(prev => ({
              ...prev,
              silver_welcome_bonus: configRes.data.config.welcome_bonuses.silver || 1,
              gold_welcome_bonus: configRes.data.config.welcome_bonuses.gold || 2,
              platinum_welcome_bonus: configRes.data.config.welcome_bonuses.platinum || 3
            }));
          }
          if (configRes.data.config.platform_commission_rate) {
            setCommissionsForm(prev => ({
              ...prev,
              platform_commission_rate: configRes.data.config.platform_commission_rate || 5
            }));
          }
          if (configRes.data.config.referral_bonuses) {
            setReferralForm({
              welcome_bonus: configRes.data.config.referral_bonuses.welcome || 1,
              referrer_bonus: configRes.data.config.referral_bonuses.referrer || 3
            });
          }
          // Load service commissions
          if (configRes.data.config.service_commissions) {
            const sc = configRes.data.config.service_commissions;
            setServiceCommissionsForm({
              airtime_type: sc.airtime?.type || 'percentage',
              airtime_rate: sc.airtime?.rate || 2,
              data_type: sc.data?.type || 'percentage',
              data_rate: sc.data?.rate || 2,
              ecg_type: sc.ecg?.type || 'fixed',
              ecg_rate: sc.ecg?.rate || 1,
              merchant_type: sc.merchant_payment?.type || 'percentage',
              merchant_rate: sc.merchant_payment?.rate || 1,
              withdrawal_type: sc.withdrawal?.type || 'percentage',
              withdrawal_rate: sc.withdrawal?.rate || 1
            });
          }
        }
      } catch (configErr) {
        console.error('Config fetch error:', configErr);
      }
      
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateClientStatus = async (clientId, action) => {
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.put(`${API_URL}/api/admin/clients/${clientId}/status`, {
        action
      }, { headers });
      
      toast.success(`Client ${action} successfully`);
      fetchDashboardData();
      setShowClientModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateMerchantStatus = async (merchantId, action) => {
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.put(`${API_URL}/api/admin/merchants/${merchantId}/status`, {
        action
      }, { headers });
      
      toast.success(`Merchant ${action} successfully`);
      fetchDashboardData();
      setShowMerchantModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch client transactions
  const handleViewClientTransactions = async (client) => {
    try {
      setSelectedClient(client);
      setShowClientModal(true);
      const headers = getHeaders();
      const res = await axios.get(`${API_URL}/api/admin/clients/${client.id}/transactions`, { headers });
      setClientTransactions(res.data.transactions || []);
      setTransactionSummary(res.data.summary || {});
      setLimitsForm({
        withdrawal_limit: client.withdrawal_limit || 500,
        transaction_limit: client.transaction_limit || 1000,
        daily_limit: client.daily_limit || 2000
      });
    } catch (error) {
      console.error('Error fetching client transactions:', error);
      toast.error('Failed to load transactions');
    }
  };

  // Fetch merchant transactions
  const handleViewMerchantTransactions = async (merchant) => {
    try {
      setSelectedMerchant(merchant);
      setShowMerchantModal(true);
      setMerchantPaymentMethodsStats(null); // Reset stats
      setPaymentMethodsPeriod('today'); // Reset period
      
      const headers = getHeaders();
      
      // Fetch transactions and payment methods stats in parallel
      const [txRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/merchants/${merchant.id}/transactions`, { headers }),
        axios.get(`${API_URL}/api/admin/merchants/${merchant.id}/payment-methods?period=today`, { headers })
      ]);
      
      setMerchantTransactions(txRes.data.transactions || []);
      setTransactionSummary(txRes.data.summary || {});
      setMerchantPaymentMethodsStats(statsRes.data.stats || null);
      setLocationForm({
        address: merchant.address || '',
        google_maps_url: merchant.google_maps_url || '',
        city: merchant.city || ''
      });
    } catch (error) {
      console.error('Error fetching merchant transactions:', error);
      toast.error('Failed to load transactions');
    }
  };
  
  // Fetch payment methods stats for selected period
  const fetchMerchantPaymentMethodsStats = async (period) => {
    if (!selectedMerchant) return;
    try {
      const headers = getHeaders();
      const res = await axios.get(`${API_URL}/api/admin/merchants/${selectedMerchant.id}/payment-methods?period=${period}`, { headers });
      setMerchantPaymentMethodsStats(res.data.stats || null);
      setPaymentMethodsPeriod(period);
    } catch (error) {
      console.error('Error fetching payment methods stats:', error);
    }
  };

  // Send SMS
  const handleSendSMS = async () => {
    if (!smsMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    try {
      setActionLoading(true);
      const headers = getHeaders();
      const endpoint = smsRecipientType === 'client' 
        ? `/api/admin/clients/${selectedClient.id}/send-sms`
        : `/api/admin/merchants/${selectedMerchant.id}/send-sms`;
      
      await axios.post(`${API_URL}${endpoint}`, { message: smsMessage }, { headers });
      toast.success('SMS sent successfully');
      setShowSMSModal(false);
      setSmsMessage('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send SMS');
    } finally {
      setActionLoading(false);
    }
  };

  // Update client limits
  const handleUpdateLimits = async () => {
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.put(`${API_URL}/api/admin/clients/${selectedClient.id}/limits`, limitsForm, { headers });
      toast.success('Client limits updated');
      setShowLimitsModal(false);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update limits');
    } finally {
      setActionLoading(false);
    }
  };

  // Update merchant location
  const handleUpdateLocation = async () => {
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.put(`${API_URL}/api/admin/merchants/${selectedMerchant.id}/location`, locationForm, { headers });
      toast.success('Merchant location updated');
      setShowLocationModal(false);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update location');
    } finally {
      setActionLoading(false);
    }
  };

  // Block client
  const handleBlockClient = async (clientId) => {
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.post(`${API_URL}/api/admin/clients/${clientId}/block`, {}, { headers });
      toast.success('Client blocked');
      fetchDashboardData();
      setShowClientModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to block client');
    } finally {
      setActionLoading(false);
    }
  };

  // Block/Reject merchant
  const handleBlockMerchant = async (merchantId) => {
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.post(`${API_URL}/api/admin/merchants/${merchantId}/block`, {}, { headers });
      toast.success('Merchant blocked');
      fetchDashboardData();
      setShowMerchantModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to block merchant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectMerchant = async (merchantId) => {
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.post(`${API_URL}/api/admin/merchants/${merchantId}/reject`, {}, { headers });
      toast.success('Merchant rejected');
      fetchDashboardData();
      setShowMerchantModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject merchant');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete client/merchant
  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.delete(`${API_URL}/api/admin/clients/${clientId}`, { headers });
      toast.success('Client deleted');
      fetchDashboardData();
      setShowClientModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete client');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMerchant = async (merchantId) => {
    if (!window.confirm('Are you sure you want to delete this merchant?')) return;
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.delete(`${API_URL}/api/admin/merchants/${merchantId}`, { headers });
      toast.success('Merchant deleted');
      fetchDashboardData();
      setShowMerchantModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete merchant');
    } finally {
      setActionLoading(false);
    }
  };

  // ============== PASSWORD RESET FUNCTIONS ==============
  
  const handleOpenResetPassword = (type, data) => {
    setResetPasswordTarget({ type, data });
    setResetPasswordForm({ new_password: '', confirm_password: '' });
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordTarget) return;
    
    if (resetPasswordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (resetPasswordForm.new_password !== resetPasswordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    
    try {
      setActionLoading(true);
      const headers = getHeaders();
      const endpoint = resetPasswordTarget.type === 'client' 
        ? `/api/admin/clients/${resetPasswordTarget.data.id}/reset-password`
        : `/api/admin/merchants/${resetPasswordTarget.data.id}/reset-password`;
      
      await axios.post(`${API_URL}${endpoint}`, {
        new_password: resetPasswordForm.new_password
      }, { headers });
      
      toast.success(`Password reset successfully for ${resetPasswordTarget.data.full_name || resetPasswordTarget.data.business_name}`);
      setShowResetPasswordModal(false);
      setResetPasswordTarget(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  // ============== SETTINGS FUNCTIONS ==============
  
  // Save card prices
  const handleSaveCardPrices = async () => {
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.put(`${API_URL}/api/admin/settings/card-prices`, cardPricesForm, { headers });
      toast.success('Card prices updated successfully');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update card prices');
    } finally {
      setActionLoading(false);
    }
  };

  // Save commissions
  const handleSaveCommissions = async () => {
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.put(`${API_URL}/api/admin/settings/commissions`, {
        platform_commission_rate: commissionsForm.platform_commission_rate
      }, { headers });
      toast.success('Commission settings updated');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update commissions');
    } finally {
      setActionLoading(false);
    }
  };

  // Save service commissions
  const handleSaveServiceCommissions = async () => {
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.put(`${API_URL}/api/admin/settings/service-commissions`, {
        airtime_commission_type: serviceCommissionsForm.airtime_type,
        airtime_commission_rate: serviceCommissionsForm.airtime_rate,
        data_commission_type: serviceCommissionsForm.data_type,
        data_commission_rate: serviceCommissionsForm.data_rate,
        ecg_commission_type: serviceCommissionsForm.ecg_type,
        ecg_commission_rate: serviceCommissionsForm.ecg_rate,
        merchant_payment_commission_type: serviceCommissionsForm.merchant_type,
        merchant_payment_commission_rate: serviceCommissionsForm.merchant_rate,
        withdrawal_commission_type: serviceCommissionsForm.withdrawal_type,
        withdrawal_commission_rate: serviceCommissionsForm.withdrawal_rate
      }, { headers });
      toast.success('Service commissions updated');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update service commissions');
    } finally {
      setActionLoading(false);
    }
  };

  // Save referral bonuses
  const handleSaveReferralBonuses = async () => {
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.put(`${API_URL}/api/admin/settings/referral-bonuses`, referralForm, { headers });
      toast.success('Referral bonuses updated');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update referral bonuses');
    } finally {
      setActionLoading(false);
    }
  };

  // Create client manually
  const handleCreateClient = async () => {
    if (!newClientForm.full_name || !newClientForm.phone || !newClientForm.username) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      setActionLoading(true);
      const headers = getHeaders();
      const res = await axios.post(`${API_URL}/api/admin/clients/create-manual`, newClientForm, { headers });
      toast.success(`Client created! Temp password: ${res.data.temp_password}`);
      setShowCreateClientModal(false);
      setNewClientForm({ full_name: '', phone: '', username: '', email: '', card_type: '' });
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create client');
    } finally {
      setActionLoading(false);
    }
  };

  // Create merchant manually
  const handleCreateMerchant = async () => {
    if (!newMerchantForm.business_name || !newMerchantForm.owner_name || !newMerchantForm.phone) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      setActionLoading(true);
      const headers = getHeaders();
      const res = await axios.post(`${API_URL}/api/admin/merchants/create-manual`, newMerchantForm, { headers });
      toast.success(`Merchant created! Temp password: ${res.data.temp_password}`);
      setShowCreateMerchantModal(false);
      setNewMerchantForm({ 
        business_name: '', 
        owner_name: '', 
        phone: '', 
        email: '', 
        cashback_rate: 5, 
        city: '', 
        address: '',
        google_maps_url: ''
      });
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create merchant');
    } finally {
      setActionLoading(false);
    }
  };

  // Send bulk SMS
  const handleSendBulkSMS = async () => {
    if (!bulkSMSMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    try {
      setActionLoading(true);
      const headers = getHeaders();
      const endpoint = bulkSMSType === 'clients' ? '/api/admin/bulk-sms/clients' : '/api/admin/bulk-sms/merchants';
      const res = await axios.post(`${API_URL}${endpoint}`, {
        message: bulkSMSMessage,
        recipient_filter: bulkSMSFilter
      }, { headers });
      toast.success(`SMS sent to ${res.data.sent} recipients (${res.data.failed} failed)`);
      setShowBulkSMSModal(false);
      setBulkSMSMessage('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send bulk SMS');
    } finally {
      setActionLoading(false);
    }
  };

  // ============== PHASE 2: SMS ADVANCED FUNCTIONS ==============
  
  // Fetch SMS data
  const fetchSMSData = async () => {
    try {
      const headers = getHeaders();
      const [historyRes, templatesRes, scheduledRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/sms/history`, { headers }),
        axios.get(`${API_URL}/api/admin/sms/templates`, { headers }),
        axios.get(`${API_URL}/api/admin/sms/scheduled`, { headers })
      ]);
      setSmsHistory(historyRes.data.logs || []);
      setSmsTemplates(templatesRes.data.templates || []);
      setScheduledSMS(scheduledRes.data.scheduled || []);
      
      // Also fetch push notification data
      fetchPushData();
    } catch (error) {
      console.error('SMS data fetch error:', error);
    }
  };

  // Create SMS template
  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.message) {
      toast.error('Please fill template name and message');
      return;
    }
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.post(`${API_URL}/api/admin/sms/templates`, newTemplate, { headers });
      toast.success('Template created');
      setShowTemplateModal(false);
      setNewTemplate({ name: '', message: '', category: 'general' });
      fetchSMSData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create template');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete SMS template
  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      const headers = getHeaders();
      await axios.delete(`${API_URL}/api/admin/sms/templates/${templateId}`, { headers });
      toast.success('Template deleted');
      fetchSMSData();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  // Cancel scheduled SMS
  const handleCancelScheduledSMS = async (scheduleId) => {
    if (!window.confirm('Cancel this scheduled SMS?')) return;
    try {
      const headers = getHeaders();
      await axios.delete(`${API_URL}/api/admin/sms/scheduled/${scheduleId}`, { headers });
      toast.success('Scheduled SMS cancelled');
      fetchSMSData();
    } catch (error) {
      toast.error('Failed to cancel scheduled SMS');
    }
  };

  // ============== PUSH NOTIFICATIONS FUNCTIONS ==============
  
  // Fetch push notification data
  const fetchPushData = async () => {
    try {
      const headers = getHeaders();
      const [historyRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/push-notifications/history`, { headers }),
        axios.get(`${API_URL}/api/admin/push-notifications/stats`, { headers })
      ]);
      setPushNotifications(historyRes.data.notifications || []);
      setPushStats(statsRes.data || { subscribers: 0 });
    } catch (error) {
      console.error('Push notification data fetch error:', error);
    }
  };

  // Send push notification
  const handleSendPushNotification = async () => {
    if (!pushForm.title.trim() || !pushForm.message.trim()) {
      toast.error('Please enter notification title and message');
      return;
    }
    try {
      setPushLoading(true);
      const headers = getHeaders();
      const res = await axios.post(`${API_URL}/api/admin/push-notifications/send`, pushForm, { headers });
      toast.success(`Push notification sent to ${res.data.recipients} subscribers`);
      setShowPushModal(false);
      setPushForm({ title: '', message: '', segment: 'All', url: '' });
      fetchPushData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send push notification');
    } finally {
      setPushLoading(false);
    }
  };

  // ============== MERCHANT DEBIT ACCOUNT FUNCTIONS ==============
  
  const fetchMerchantDebitOverview = async () => {
    try {
      setIsLoadingDebit(true);
      const headers = getHeaders();
      const res = await axios.get(`${API_URL}/api/admin/merchants/debit-overview`, { headers });
      setMerchantDebitOverview(res.data);
    } catch (error) {
      console.error('Merchant debit overview fetch error:', error);
    } finally {
      setIsLoadingDebit(false);
    }
  };

  const handleOpenDebitSettings = (merchant) => {
    setSelectedMerchantDebit(merchant);
    setDebitSettingsForm({
      debit_limit: merchant.debit_limit || 0,
      settlement_days: merchant.settlement_days || 0
    });
    setShowDebitSettingsModal(true);
  };

  const handleSaveDebitSettings = async () => {
    if (!selectedMerchantDebit) return;
    try {
      const headers = getHeaders();
      // Use merchant_id from debit overview list OR id from merchant details
      const merchantId = selectedMerchantDebit.merchant_id || selectedMerchantDebit.id;
      await axios.put(
        `${API_URL}/api/admin/merchants/${merchantId}/debit-settings`,
        debitSettingsForm,
        { headers }
      );
      toast.success('Debit settings updated');
      setShowDebitSettingsModal(false);
      fetchMerchantDebitOverview();
      // Also refresh merchant list if viewing a specific merchant
      if (selectedMerchant) {
        const res = await axios.get(`${API_URL}/api/admin/merchants/${merchantId}`, { headers });
        setSelectedMerchant(res.data.merchant);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    }
  };

  const handleUnblockMerchantDebit = async (merchantId) => {
    if (!window.confirm('Unblock this merchant\'s debit account?')) return;
    try {
      const headers = getHeaders();
      await axios.post(`${API_URL}/api/admin/merchants/${merchantId}/unblock-debit`, {}, { headers });
      toast.success('Merchant debit account unblocked');
      fetchMerchantDebitOverview();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to unblock');
    }
  };

  // ============== PHASE 3: SECURITY FUNCTIONS ==============
  
  // Check PIN status
  const checkPinStatus = async () => {
    try {
      const headers = getHeaders();
      const res = await axios.get(`${API_URL}/api/admin/settings/pin-status`, { headers });
      setPinEnabled(res.data.pin_enabled);
      if (!res.data.pin_enabled) {
        setPinVerified(true); // No PIN = auto verified
      }
    } catch (error) {
      console.error('PIN status check error:', error);
      setPinVerified(true); // Default to verified if error
    }
  };

  // Verify PIN
  const handleVerifyPin = async () => {
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.post(`${API_URL}/api/admin/settings/verify-pin`, { pin: pinInput }, { headers });
      setPinVerified(true);
      setShowPinModal(false);
      setPinInput('');
      toast.success('PIN verified');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid PIN');
    } finally {
      setActionLoading(false);
    }
  };

  // Set new PIN
  const handleSetPin = async () => {
    if (newPinInput.length < 4 || newPinInput.length > 6 || !/^\d+$/.test(newPinInput)) {
      toast.error('PIN must be 4-6 digits');
      return;
    }
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.post(`${API_URL}/api/admin/settings/set-pin`, { pin: newPinInput }, { headers });
      toast.success('PIN set successfully');
      setShowSetPinModal(false);
      setNewPinInput('');
      setPinEnabled(true);
      checkPinStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to set PIN');
    } finally {
      setActionLoading(false);
    }
  };

  // Disable PIN
  const handleDisablePin = async () => {
    if (!pinInput) {
      toast.error('Enter current PIN to disable');
      return;
    }
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.post(`${API_URL}/api/admin/settings/disable-pin`, { pin: pinInput }, { headers });
      toast.success('PIN disabled');
      setPinEnabled(false);
      setPinInput('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid PIN');
    } finally {
      setActionLoading(false);
    }
  };

  // Request OTP for password change
  const handleRequestOTP = async () => {
    try {
      setActionLoading(true);
      const headers = getHeaders();
      const res = await axios.post(`${API_URL}/api/admin/settings/request-otp`, {}, { headers });
      setOtpSent(true);
      if (res.data.otp_preview) {
        setOtpPreview(res.data.otp_preview);
        toast.success(`OTP (Test Mode): ${res.data.otp_preview}`);
      } else {
        toast.success('OTP sent to your phone');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setActionLoading(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.post(`${API_URL}/api/admin/settings/change-password`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        otp_code: passwordForm.otp_code,
        otp_method: 'sms'
      }, { headers });
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '', otp_code: '' });
      setOtpSent(false);
      setOtpPreview('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setActionLoading(false);
    }
  };

  // ============== MONTHLY ANALYTICS ==============
  
  const fetchMonthlyStats = async (month) => {
    try {
      setLoadingMonthlyStats(true);
      const headers = getHeaders();
      const res = await axios.get(`${API_URL}/api/admin/analytics/monthly?month=${month}`, { headers });
      setMonthlyStats(res.data);
    } catch (error) {
      console.error('Monthly stats fetch error:', error);
      // Set default empty stats if API not available
      setMonthlyStats({
        month: month,
        transactions: 0,
        volume: 0,
        new_clients: 0,
        new_merchants: 0,
        cashback_distributed: 0,
        card_sales: 0
      });
    } finally {
      setLoadingMonthlyStats(false);
    }
  };

  // Fetch monthly stats when month changes
  useEffect(() => {
    if (token && selectedMonth) {
      fetchMonthlyStats(selectedMonth);
    }
  }, [selectedMonth, token]);

  // ============== ADMIN MANAGEMENT ==============
  
  // Fetch all admins
  const fetchAdmins = async () => {
    try {
      const headers = getHeaders();
      const res = await axios.get(`${API_URL}/api/admin/admins`, { headers });
      setAllAdmins(res.data.admins || []);
    } catch (error) {
      console.error('Admins fetch error:', error);
    }
  };

  // Create new admin
  const handleCreateAdmin = async () => {
    if (!newAdminForm.email || !newAdminForm.password || !newAdminForm.name) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.post(`${API_URL}/api/admin/admins/create`, newAdminForm, { headers });
      toast.success('Admin created successfully');
      setShowAdminModal(false);
      setNewAdminForm({ email: '', password: '', name: '', role: 'admin_support' });
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create admin');
    } finally {
      setActionLoading(false);
    }
  };

  // Update admin status
  const handleToggleAdminStatus = async (adminId, isActive) => {
    try {
      const headers = getHeaders();
      await axios.put(`${API_URL}/api/admin/admins/${adminId}`, { is_active: !isActive }, { headers });
      toast.success(`Admin ${isActive ? 'deactivated' : 'activated'}`);
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update admin');
    }
  };

  // Delete admin
  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm('Delete this admin account?')) return;
    try {
      const headers = getHeaders();
      await axios.delete(`${API_URL}/api/admin/admins/${adminId}`, { headers });
      toast.success('Admin deleted');
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete admin');
    }
  };

  // Load SMS data and check PIN when Settings tab is accessed
  useEffect(() => {
    if (activeTab === 'settings' && token) {
      // Always show PIN modal when entering Settings
      if (!pinVerified) {
        setShowPinModal(true);
      }
      fetchSMSData();
      if (admin?.is_super_admin) {
        fetchAdmins();
      }
    }
  }, [activeTab, token]);

  // Reset PIN verification when leaving Settings
  useEffect(() => {
    if (activeTab !== 'settings') {
      setPinVerified(false);
    }
  }, [activeTab]);

  // Load merchant debit overview - now handled by AdminSettings component
  // Removed: useEffect with settingsTab dependency

  // Handle tab change with PIN check
  const handleTabChange = (tab) => {
    if (tab === 'settings' && !pinVerified) {
      setShowPinModal(true);
      setActiveTab(tab);
    } else {
      setActiveTab(tab);
    }
  };

  // Change PIN (Super Admin only)
  const handleChangePIN = async () => {
    if (newPinInput.length < 4 || !/^\d+$/.test(newPinInput)) {
      toast.error('PIN must be 4-6 digits');
      return;
    }
    try {
      setActionLoading(true);
      const headers = getHeaders();
      await axios.post(`${API_URL}/api/admin/settings/change-pin`, { pin: newPinInput }, { headers });
      toast.success('PIN changed successfully');
      setShowSetPinModal(false);
      setNewPinInput('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change PIN');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/10' },
      pending: { icon: Clock, color: 'text-amber-400 bg-amber-500/10' },
      suspended: { icon: Ban, color: 'text-red-400 bg-red-500/10' },
      blocked: { icon: XCircle, color: 'text-red-600 bg-red-500/20' },
      rejected: { icon: XCircle, color: 'text-orange-400 bg-orange-500/10' },
      deleted: { icon: Trash2, color: 'text-slate-400 bg-slate-500/10' }
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${badge.color}`}>
        <Icon size={12} /> {status}
      </span>
    );
  };

  const filteredClients = clients.filter(c => 
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery) ||
    c.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMerchants = merchants.filter(m => 
    m.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone?.includes(searchQuery) ||
    m.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Login Screen
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-20 h-20 object-contain rounded-2xl mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white">Admin Portal</h1>
            <p className="text-slate-400 mt-2">SDM Rewards Platform Administration</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-slate-300">Email</Label>
                <Input
                  ref={emailRef}
                  type="email"
                  placeholder="admin@sdmrewards.com"
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  data-testid="admin-email-input"
                />
              </div>

              <div>
                <Label className="text-slate-300">Password</Label>
                <div className="relative mt-1">
                  <Input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    className="bg-slate-900 border-slate-700 text-white pr-12"
                    data-testid="admin-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white py-6"
                data-testid="admin-login-btn"
              >
                {loginLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-400" size={48} />
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-10 h-10 object-contain rounded-xl" />
            <div>
              <span className="font-bold text-white block">SDM Admin</span>
              <span className="text-slate-400 text-sm">{admin?.email}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-slate-400 hover:text-white"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'clients', label: 'Clients', icon: Users },
            { id: 'merchants', label: 'Merchants', icon: Store },
            { id: 'seo', label: 'SEO & Analytics', icon: Sparkles },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <AdminOverview
            stats={stats}
            advancedStats={advancedStats}
            clients={clients}
            merchants={merchants}
            token={token}
            getStatusBadge={getStatusBadge}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            monthlyStats={monthlyStats}
            loadingMonthlyStats={loadingMonthlyStats}
            paymentMethods={globalPaymentMethods}
            cashbackEcosystem={cashbackEcosystem}
          />
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <AdminClients
            clients={clients}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredClients={filteredClients}
            getStatusBadge={getStatusBadge}
            handleViewClientTransactions={handleViewClientTransactions}
            setSelectedClient={setSelectedClient}
            setSmsRecipientType={setSmsRecipientType}
            setShowSMSModal={setShowSMSModal}
            handleUpdateClientStatus={handleUpdateClientStatus}
            handleBlockClient={handleBlockClient}
            handleDeleteClient={handleDeleteClient}
            handleOpenResetPassword={handleOpenResetPassword}
          />
        )}

        {/* Merchants Tab */}
        {activeTab === 'merchants' && (
          <AdminMerchants
            merchants={merchants}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredMerchants={filteredMerchants}
            getStatusBadge={getStatusBadge}
            handleViewMerchantTransactions={handleViewMerchantTransactions}
            setSelectedMerchant={setSelectedMerchant}
            setSmsRecipientType={setSmsRecipientType}
            setShowSMSModal={setShowSMSModal}
            setLocationForm={setLocationForm}
            setShowLocationModal={setShowLocationModal}
            handleUpdateMerchantStatus={handleUpdateMerchantStatus}
            handleRejectMerchant={handleRejectMerchant}
            handleBlockMerchant={handleBlockMerchant}
            handleDeleteMerchant={handleDeleteMerchant}
            handleOpenResetPassword={handleOpenResetPassword}
          />
        )}

        {/* SEO & Analytics Tab */}
        {activeTab === 'seo' && (
          <SEODashboard token={token} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <AdminSettings 
            token={token}
            admin={admin}
            pinVerified={pinVerified}
            setPinVerified={setPinVerified}
            setShowPinModal={setShowPinModal}
          />
        )}
      </div>

      {/* CLIENT DETAILS MODAL */}
      {showClientModal && selectedClient && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Users className="text-blue-400" size={24} />
                <div>
                  <h2 className="text-white font-semibold">{selectedClient.full_name}</h2>
                  <p className="text-slate-400 text-sm">@{selectedClient.username}</p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setShowClientModal(false)} className="text-slate-400">
                <XCircle size={24} />
              </Button>
            </div>

            {/* Client Info */}
            <div className="p-4 border-b border-slate-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Phone</p>
                  <p className="text-white">{selectedClient.phone}</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Card Type</p>
                  <p className="text-amber-400 uppercase">{selectedClient.card_type || 'None'}</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Balance</p>
                  <p className="text-emerald-400">GHS {(selectedClient.cashback_balance || 0).toFixed(2)}</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Status</p>
                  {getStatusBadge(selectedClient.status)}
                </div>
              </div>
            </div>

            {/* Transaction Summary */}
            {transactionSummary && (
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <BarChart3 size={18} /> Transaction Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                    <p className="text-emerald-400 text-xl font-bold">GHS {(transactionSummary.cashback_received || 0).toFixed(2)}</p>
                    <p className="text-slate-400 text-xs">Cashback Received</p>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3 text-center">
                    <p className="text-red-400 text-xl font-bold">GHS {(transactionSummary.cashback_spent || 0).toFixed(2)}</p>
                    <p className="text-slate-400 text-xs">Cashback Spent</p>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                    <p className="text-blue-400 text-xl font-bold">GHS {(transactionSummary.payments_made || 0).toFixed(2)}</p>
                    <p className="text-slate-400 text-xs">Payments Made</p>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                    <p className="text-purple-400 text-xl font-bold">{transactionSummary.total_transactions || 0}</p>
                    <p className="text-slate-400 text-xs">Transactions</p>
                  </div>
                  <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                    <p className="text-amber-400 text-xl font-bold">{transactionSummary.referrals_count || 0}</p>
                    <p className="text-slate-400 text-xs">Referrals</p>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction History */}
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <History size={18} /> Transaction History
              </h3>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-400 bg-slate-900 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {clientTransactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="p-2 text-slate-300">{new Date(tx.created_at).toLocaleDateString()}</td>
                        <td className="p-2 text-slate-300 capitalize">{tx.type?.replace('_', ' ')}</td>
                        <td className="p-2 text-right text-emerald-400">GHS {tx.amount?.toFixed(2)}</td>
                        <td className="p-2">{getStatusBadge(tx.status || 'completed')}</td>
                      </tr>
                    ))}
                    {clientTransactions.length === 0 && (
                      <tr><td colSpan="4" className="text-center text-slate-500 py-8">No transactions found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Settings size={18} /> Account Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => { setShowClientModal(false); setSmsRecipientType('client'); setShowSMSModal(true); }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <MessageSquare size={16} className="mr-2" /> Send SMS
                </Button>
                <Button 
                  onClick={() => { setShowClientModal(false); setShowLimitsModal(true); }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Sliders size={16} className="mr-2" /> Manage Limits
                </Button>
                {selectedClient.status === 'active' && (
                  <>
                    <Button 
                      onClick={() => handleUpdateClientStatus(selectedClient.id, 'suspend')}
                      className="bg-amber-600 hover:bg-amber-700"
                      disabled={actionLoading}
                    >
                      <Ban size={16} className="mr-2" /> Suspend
                    </Button>
                    <Button 
                      onClick={() => handleBlockClient(selectedClient.id)}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={actionLoading}
                    >
                      <XCircle size={16} className="mr-2" /> Block
                    </Button>
                  </>
                )}
                {(selectedClient.status === 'suspended' || selectedClient.status === 'blocked') && (
                  <Button 
                    onClick={() => handleUpdateClientStatus(selectedClient.id, 'activate')}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={actionLoading}
                  >
                    <UserCheck size={16} className="mr-2" /> Reactivate
                  </Button>
                )}
                <Button 
                  onClick={() => handleDeleteClient(selectedClient.id)}
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                  disabled={actionLoading}
                >
                  <Trash2 size={16} className="mr-2" /> Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MERCHANT DETAILS MODAL */}
      {showMerchantModal && selectedMerchant && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Store className="text-emerald-400" size={24} />
                <div>
                  <h2 className="text-white font-semibold">{selectedMerchant.business_name}</h2>
                  <p className="text-slate-400 text-sm">{selectedMerchant.owner_name}</p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setShowMerchantModal(false)} className="text-slate-400">
                <XCircle size={24} />
              </Button>
            </div>

            {/* Merchant Info */}
            <div className="p-4 border-b border-slate-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Phone</p>
                  <p className="text-white">{selectedMerchant.phone}</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Cashback Rate</p>
                  <p className="text-amber-400">{selectedMerchant.cashback_rate}%</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Location</p>
                  <p className="text-white">{selectedMerchant.city || 'Not set'}</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Status</p>
                  {getStatusBadge(selectedMerchant.status)}
                </div>
              </div>
              {selectedMerchant.address && (
                <div className="mt-4 bg-slate-900 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Full Address</p>
                  <p className="text-white">{selectedMerchant.address}</p>
                  {selectedMerchant.google_maps_url && (
                    <a href={selectedMerchant.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline">
                      View on Google Maps
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Debit Account Section */}
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Wallet size={18} className="text-amber-400" /> Debit Account (Cash Payments)
              </h3>
              <div className="bg-gradient-to-br from-amber-900/20 to-slate-900 border border-amber-500/30 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-slate-400 text-xs">Current Balance</p>
                    <p className={`text-xl font-bold ${(selectedMerchant.debit_account?.balance || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      GHS {(selectedMerchant.debit_account?.balance || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Debit Limit</p>
                    <p className="text-amber-400 text-xl font-bold">
                      GHS {(selectedMerchant.debit_account?.limit || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Usage</p>
                    <p className="text-white text-xl font-bold">
                      {selectedMerchant.debit_account?.limit > 0 
                        ? ((Math.abs(selectedMerchant.debit_account?.balance || 0) / selectedMerchant.debit_account.limit) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Status</p>
                    {selectedMerchant.debit_account?.is_blocked ? (
                      <span className="text-red-400 font-semibold">Blocked</span>
                    ) : selectedMerchant.debit_account?.limit > 0 ? (
                      <span className="text-emerald-400 font-semibold">Active</span>
                    ) : (
                      <span className="text-slate-500 font-semibold">Not Configured</span>
                    )}
                  </div>
                </div>
                
                {/* Usage Bar */}
                {(selectedMerchant.debit_account?.limit || 0) > 0 && (
                  <div className="mb-4">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          (Math.abs(selectedMerchant.debit_account?.balance || 0) / selectedMerchant.debit_account.limit) >= 1 ? 'bg-red-500' :
                          (Math.abs(selectedMerchant.debit_account?.balance || 0) / selectedMerchant.debit_account.limit) >= 0.75 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (Math.abs(selectedMerchant.debit_account?.balance || 0) / selectedMerchant.debit_account.limit) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Configure Button */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setSelectedMerchantDebit(selectedMerchant);
                      setDebitSettingsForm({
                        debit_limit: selectedMerchant.debit_account?.limit || 0,
                        settlement_days: selectedMerchant.debit_account?.settlement_period_days || 30
                      });
                      setShowDebitSettingsModal(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Settings size={16} className="mr-2" /> Configure Debit Limit
                  </Button>
                  {selectedMerchant.debit_account?.is_blocked && (
                    <Button
                      onClick={() => handleUnblockMerchantDebit(selectedMerchant.id)}
                      disabled={actionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle size={16} className="mr-2" /> Unblock Account
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Transaction Summary */}
            {transactionSummary && (
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <BarChart3 size={18} /> Performance Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                    <p className="text-blue-400 text-xl font-bold">{transactionSummary.total_transactions || 0}</p>
                    <p className="text-slate-400 text-xs">Total Transactions</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                    <p className="text-emerald-400 text-xl font-bold">GHS {(transactionSummary.total_volume || 0).toLocaleString()}</p>
                    <p className="text-slate-400 text-xs">Total Volume</p>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                    <p className="text-purple-400 text-xl font-bold">GHS {(transactionSummary.total_cashback || 0).toLocaleString()}</p>
                    <p className="text-slate-400 text-xs">Cashback Distributed</p>
                  </div>
                  <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                    <p className="text-amber-400 text-xl font-bold">{transactionSummary.unique_clients || 0}</p>
                    <p className="text-slate-400 text-xs">Clients Served</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Methods Breakdown (Cash vs MoMo) */}
            <div className="p-4 border-b border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <CreditCard size={18} className="text-cyan-400" /> Payment Methods Breakdown
                </h3>
                <div className="flex gap-1">
                  {['today', 'week', 'month', 'all'].map((p) => (
                    <button
                      key={p}
                      onClick={() => fetchMerchantPaymentMethodsStats(p)}
                      className={`px-2 py-1 text-xs rounded ${paymentMethodsPeriod === p ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All'}
                    </button>
                  ))}
                </div>
              </div>
              
              {merchantPaymentMethodsStats ? (
                <div className="grid grid-cols-3 gap-3">
                  {/* Cash Stats */}
                  <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900 border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote size={18} className="text-emerald-400" />
                      <span className="text-emerald-400 font-medium text-sm">Cash</span>
                    </div>
                    <p className="text-2xl font-bold text-white">GHS {merchantPaymentMethodsStats.cash?.volume?.toFixed(2) || '0.00'}</p>
                    <p className="text-slate-400 text-sm">{merchantPaymentMethodsStats.cash?.count || 0} transactions</p>
                    {merchantPaymentMethodsStats.total?.volume > 0 && (
                      <div className="mt-2 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${merchantPaymentMethodsStats.cash?.percentage || 0}%` }}
                        />
                      </div>
                    )}
                    <p className="text-emerald-400 text-xs mt-1">{merchantPaymentMethodsStats.cash?.percentage || 0}%</p>
                  </div>
                  
                  {/* MoMo Stats */}
                  <div className="bg-gradient-to-br from-blue-900/30 to-slate-900 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone size={18} className="text-blue-400" />
                      <span className="text-blue-400 font-medium text-sm">MoMo</span>
                    </div>
                    <p className="text-2xl font-bold text-white">GHS {merchantPaymentMethodsStats.momo?.volume?.toFixed(2) || '0.00'}</p>
                    <p className="text-slate-400 text-sm">{merchantPaymentMethodsStats.momo?.count || 0} transactions</p>
                    {merchantPaymentMethodsStats.total?.volume > 0 && (
                      <div className="mt-2 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full transition-all"
                          style={{ width: `${merchantPaymentMethodsStats.momo?.percentage || 0}%` }}
                        />
                      </div>
                    )}
                    <p className="text-blue-400 text-xs mt-1">{merchantPaymentMethodsStats.momo?.percentage || 0}%</p>
                  </div>
                  
                  {/* Total */}
                  <div className="bg-gradient-to-br from-purple-900/30 to-slate-900 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign size={18} className="text-purple-400" />
                      <span className="text-purple-400 font-medium text-sm">Total</span>
                    </div>
                    <p className="text-2xl font-bold text-white">GHS {merchantPaymentMethodsStats.total?.volume?.toFixed(2) || '0.00'}</p>
                    <p className="text-slate-400 text-sm">{merchantPaymentMethodsStats.total?.count || 0} transactions</p>
                    <p className="text-purple-400 text-xs mt-3">Cashback: GHS {merchantPaymentMethodsStats.total?.cashback?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 rounded-lg p-4 text-center text-slate-400">
                  <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                  <p>Loading payment methods stats...</p>
                </div>
              )}
            </div>

            {/* Transaction History */}
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <History size={18} /> Transaction History
              </h3>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-400 bg-slate-900 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Client</th>
                      <th className="text-center p-2">Method</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-right p-2">Cashback</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {merchantTransactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="p-2 text-slate-300">{new Date(tx.created_at).toLocaleDateString()}</td>
                        <td className="p-2 text-slate-300">{tx.client_name || 'Unknown'}</td>
                        <td className="p-2 text-center">
                          {tx.payment_method === 'cash' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <Banknote size={12} /> Cash
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              <Smartphone size={12} /> MoMo
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right text-white">GHS {tx.amount?.toFixed(2)}</td>
                        <td className="p-2 text-right text-purple-400">GHS {tx.cashback_amount?.toFixed(2)}</td>
                        <td className="p-2">{getStatusBadge(tx.status || 'completed')}</td>
                      </tr>
                    ))}
                    {merchantTransactions.length === 0 && (
                      <tr><td colSpan="6" className="text-center text-slate-500 py-8">No transactions found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Settings size={18} /> Account Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => { setShowMerchantModal(false); setSmsRecipientType('merchant'); setShowSMSModal(true); }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <MessageSquare size={16} className="mr-2" /> Send SMS
                </Button>
                <Button 
                  onClick={() => { setShowMerchantModal(false); setShowLocationModal(true); }}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <MapPin size={16} className="mr-2" /> Edit Location
                </Button>
                {selectedMerchant.status === 'pending' && (
                  <>
                    <Button 
                      onClick={() => handleUpdateMerchantStatus(selectedMerchant.id, 'approve')}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={actionLoading}
                    >
                      <CheckCircle size={16} className="mr-2" /> Approve
                    </Button>
                    <Button 
                      onClick={() => handleRejectMerchant(selectedMerchant.id)}
                      className="bg-orange-600 hover:bg-orange-700"
                      disabled={actionLoading}
                    >
                      <XCircle size={16} className="mr-2" /> Reject
                    </Button>
                  </>
                )}
                {selectedMerchant.status === 'active' && (
                  <>
                    <Button 
                      onClick={() => handleUpdateMerchantStatus(selectedMerchant.id, 'suspend')}
                      className="bg-amber-600 hover:bg-amber-700"
                      disabled={actionLoading}
                    >
                      <Ban size={16} className="mr-2" /> Suspend
                    </Button>
                    <Button 
                      onClick={() => handleBlockMerchant(selectedMerchant.id)}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={actionLoading}
                    >
                      <XCircle size={16} className="mr-2" /> Block
                    </Button>
                  </>
                )}
                {(selectedMerchant.status === 'suspended' || selectedMerchant.status === 'blocked' || selectedMerchant.status === 'rejected') && (
                  <Button 
                    onClick={() => handleUpdateMerchantStatus(selectedMerchant.id, 'activate')}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={actionLoading}
                  >
                    <UserCheck size={16} className="mr-2" /> Reactivate
                  </Button>
                )}
                <Button 
                  onClick={() => handleDeleteMerchant(selectedMerchant.id)}
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                  disabled={actionLoading}
                >
                  <Trash2 size={16} className="mr-2" /> Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMS MODAL */}
      {showSMSModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="text-purple-400" size={20} />
              Send SMS to {smsRecipientType === 'client' ? selectedClient?.full_name : selectedMerchant?.business_name}
            </h3>
            <div className="mb-4">
              <Label className="text-slate-300 mb-2 block">Phone</Label>
              <p className="text-white bg-slate-900 rounded-lg p-3">
                {smsRecipientType === 'client' ? selectedClient?.phone : selectedMerchant?.phone}
              </p>
            </div>
            <div className="mb-4">
              <Label className="text-slate-300 mb-2 block">Message</Label>
              <textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white min-h-[100px]"
                placeholder="Type your message here..."
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => { setShowSMSModal(false); setSmsMessage(''); }} variant="outline" className="flex-1 border-slate-600">
                Cancel
              </Button>
              <Button onClick={handleSendSMS} className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <MessageSquare size={16} className="mr-2" />}
                Send SMS
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LIMITS MODAL - Refactored to extracted component */}
      <LimitsModal
        isOpen={showLimitsModal}
        onClose={() => setShowLimitsModal(false)}
        client={selectedClient}
        token={token}
        onSuccess={() => { fetchDashboardData(); }}
      />

      {/* LOCATION MODAL - Refactored to extracted component */}
      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        merchant={selectedMerchant}
        token={token}
        onSuccess={() => { fetchDashboardData(); }}
      />

      {/* RESET PASSWORD MODAL - Refactored to extracted component */}
      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => { setShowResetPasswordModal(false); setResetPasswordTarget(null); }}
        target={resetPasswordTarget}
        token={token}
        onSuccess={() => { fetchDashboardData(); }}
      />

      {/* CREATE CLIENT MODAL - Refactored to extracted component */}
      <CreateClientModal
        isOpen={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
        token={token}
        onSuccess={() => { fetchDashboardData(); }}
      />

      {/* CREATE MERCHANT MODAL - Refactored to extracted component */}
      <CreateMerchantModal
        isOpen={showCreateMerchantModal}
        onClose={() => setShowCreateMerchantModal(false)}
        token={token}
        onSuccess={() => { fetchDashboardData(); }}
      />

      {/* BULK SMS MODAL */}
      {showBulkSMSModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className={bulkSMSType === 'clients' ? 'text-purple-400' : 'text-amber-400'} size={20} />
              Bulk SMS to {bulkSMSType === 'clients' ? 'Clients' : 'Merchants'}
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Recipient Filter</Label>
                <select
                  value={bulkSMSFilter}
                  onChange={(e) => setBulkSMSFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="all">All {bulkSMSType}</option>
                  {bulkSMSType === 'clients' ? (
                    <>
                      <option value="active">Active (with card)</option>
                      <option value="inactive">Inactive (no card)</option>
                      <option value="silver">Silver card holders</option>
                      <option value="gold">Gold card holders</option>
                      <option value="platinum">Platinum card holders</option>
                      <option value="top">Top 10 clients</option>
                    </>
                  ) : (
                    <>
                      <option value="active">Active merchants</option>
                      <option value="pending">Pending approval</option>
                      <option value="inactive">Inactive (no transactions)</option>
                      <option value="top">Top 10 merchants</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Message</Label>
                <textarea
                  value={bulkSMSMessage}
                  onChange={(e) => setBulkSMSMessage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white min-h-[120px]"
                  placeholder="Type your message here..."
                  maxLength={160}
                />
                <p className="text-slate-500 text-xs mt-1">{bulkSMSMessage.length}/160 characters</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-amber-400 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  SMS will be sent to all matching recipients. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => { setShowBulkSMSModal(false); setBulkSMSMessage(''); }} variant="outline" className="flex-1 border-slate-600">
                Cancel
              </Button>
              <Button 
                onClick={handleSendBulkSMS} 
                className={`flex-1 ${bulkSMSType === 'clients' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-amber-600 hover:bg-amber-700'}`} 
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <MessageSquare size={16} className="mr-2" />}
                Send Bulk SMS
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PUSH NOTIFICATION MODAL */}
      {showPushModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Bell className="text-emerald-400" size={20} />
              Send Push Notification
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Title</Label>
                <Input
                  value={pushForm.title}
                  onChange={(e) => setPushForm({...pushForm, title: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="Notification title..."
                  maxLength={50}
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Message</Label>
                <textarea
                  value={pushForm.message}
                  onChange={(e) => setPushForm({...pushForm, message: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white min-h-[100px]"
                  placeholder="Notification message..."
                  maxLength={200}
                />
                <p className="text-slate-500 text-xs mt-1">{pushForm.message.length}/200 characters</p>
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Target Audience</Label>
                <select
                  value={pushForm.segment}
                  onChange={(e) => setPushForm({...pushForm, segment: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="All">All Subscribers</option>
                  <option value="Active Users">Active Users</option>
                  <option value="Inactive Users">Inactive Users</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Link URL (optional)</Label>
                <Input
                  value={pushForm.url}
                  onChange={(e) => setPushForm({...pushForm, url: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="https://sdmrewards.com/..."
                />
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <p className="text-emerald-400 text-sm flex items-center gap-2">
                  <Bell size={16} />
                  Push notification will be sent to {pushStats.subscribers || 0} subscribers
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button 
                onClick={() => { setShowPushModal(false); setPushForm({ title: '', message: '', segment: 'All', url: '' }); }} 
                variant="outline" 
                className="flex-1 border-slate-600"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendPushNotification} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                disabled={pushLoading}
              >
                {pushLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send size={16} className="mr-2" />}
                Send Notification
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MERCHANT DEBIT SETTINGS MODAL */}
      {showDebitSettingsModal && selectedMerchantDebit && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Settings className="text-amber-400" size={20} />
              Debit Account Settings
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Configure debit limit for: <span className="text-white font-medium">{selectedMerchantDebit.merchant?.business_name}</span>
            </p>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Debit Limit (GHS)</Label>
                <Input
                  type="number"
                  value={debitSettingsForm.debit_limit}
                  onChange={(e) => setDebitSettingsForm({...debitSettingsForm, debit_limit: parseFloat(e.target.value) || 0})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="e.g., 1000"
                  min="0"
                />
                <p className="text-slate-500 text-xs mt-1">Maximum amount the merchant can owe in cashback</p>
              </div>
              
              <div>
                <Label className="text-slate-300 mb-2 block">Settlement Period (Days)</Label>
                <Input
                  type="number"
                  value={debitSettingsForm.settlement_days}
                  onChange={(e) => setDebitSettingsForm({...debitSettingsForm, settlement_days: parseInt(e.target.value) || 0})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="e.g., 30"
                  min="0"
                />
                <p className="text-slate-500 text-xs mt-1">Days before payment is due (0 = no deadline)</p>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-amber-400 text-sm">
                  <AlertTriangle size={16} className="inline mr-1" />
                  At 75% usage, merchant receives SMS warning. At 100%, account is blocked.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowDebitSettingsModal(false)}
                variant="outline"
                className="flex-1 border-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDebitSettings}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PIN ENTRY MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-sm p-6 text-center">
            <Shield className="text-purple-400 mx-auto mb-4" size={48} />
            <h3 className="text-white font-semibold text-xl mb-2">Enter PIN</h3>
            <p className="text-slate-400 text-sm mb-6">
              Enter your PIN to access Settings
            </p>
            <div className="space-y-4">
              <Input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="bg-slate-900 border-slate-700 text-white text-center text-3xl tracking-[0.5em] font-mono"
                placeholder="••••"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pinInput.length >= 4) {
                    handleVerifyPin();
                  }
                }}
              />
              <p className="text-slate-500 text-xs">Default PIN: 0000</p>
            </div>
            <div className="flex gap-3 mt-6">
              <Button 
                onClick={() => { setShowPinModal(false); setPinInput(''); setActiveTab('overview'); }} 
                variant="outline" 
                className="flex-1 border-slate-600"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleVerifyPin} 
                className="flex-1 bg-purple-600 hover:bg-purple-700" 
                disabled={actionLoading || pinInput.length < 4}
              >
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Shield size={16} className="mr-2" />}
                Verify
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SMS TEMPLATE MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="text-cyan-400" size={20} />
              Create SMS Template
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Template Name</Label>
                <Input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="Welcome Message"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Category</Label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="general">General</option>
                  <option value="promotion">Promotion</option>
                  <option value="notification">Notification</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Message</Label>
                <textarea
                  value={newTemplate.message}
                  onChange={(e) => setNewTemplate({...newTemplate, message: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white min-h-[100px]"
                  placeholder="Type your template message..."
                  maxLength={160}
                />
                <p className="text-slate-500 text-xs mt-1">{newTemplate.message.length}/160 characters</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => setShowTemplateModal(false)} variant="outline" className="flex-1 border-slate-600">
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate} className="flex-1 bg-cyan-600 hover:bg-cyan-700" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle size={16} className="mr-2" />}
                Save Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PIN MODAL */}
      {showSetPinModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Shield className="text-purple-400" size={20} />
              Change Settings PIN
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Enter a new 4-6 digit PIN to protect Settings access.
            </p>
            <div className="space-y-4">
              <Input
                type="password"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="bg-slate-900 border-slate-700 text-white text-center text-2xl tracking-widest"
                placeholder="New PIN"
                maxLength={6}
              />
              <p className="text-slate-500 text-xs text-center">{newPinInput.length}/6 digits</p>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => { setShowSetPinModal(false); setNewPinInput(''); }} variant="outline" className="flex-1 border-slate-600">
                Cancel
              </Button>
              <Button onClick={handleChangePIN} className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={actionLoading || newPinInput.length < 4}>
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Shield size={16} className="mr-2" />}
                Change PIN
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Eye className="text-blue-400" size={20} />
              Change Password
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Current Password</Label>
                <Input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              
              {!otpSent ? (
                <Button onClick={handleRequestOTP} className="w-full bg-amber-600 hover:bg-amber-700" disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                  Request OTP
                </Button>
              ) : (
                <div>
                  <Label className="text-slate-300 mb-2 block">Enter OTP</Label>
                  <Input
                    type="text"
                    value={passwordForm.otp_code}
                    onChange={(e) => setPasswordForm({...passwordForm, otp_code: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white text-center tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                  />
                  {otpPreview && (
                    <p className="text-amber-400 text-xs mt-2 text-center">Test Mode OTP: {otpPreview}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => { setShowPasswordModal(false); setPasswordForm({ current_password: '', new_password: '', confirm_password: '', otp_code: '' }); setOtpSent(false); setOtpPreview(''); }} variant="outline" className="flex-1 border-slate-600">
                Cancel
              </Button>
              <Button onClick={handleChangePassword} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={actionLoading || !otpSent}>
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle size={16} className="mr-2" />}
                Change Password
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ADMIN MODAL */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <UserPlus className="text-blue-400" size={20} />
              Create Admin Account
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Name *</Label>
                <Input
                  type="text"
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm({...newAdminForm, name: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="Admin Name"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Email *</Label>
                <Input
                  type="email"
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm({...newAdminForm, email: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Password *</Label>
                <Input
                  type="password"
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm({...newAdminForm, password: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="********"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Role</Label>
                <select
                  value={newAdminForm.role}
                  onChange={(e) => setNewAdminForm({...newAdminForm, role: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="admin_support">Admin Support (Clients)</option>
                  <option value="admin_merchants">Admin Merchants</option>
                  <option value="admin_finance">Admin Finance (View only)</option>
                  <option value="admin_readonly">Read-only Admin</option>
                  <option value="super_admin">Super Admin (Full access)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => setShowAdminModal(false)} variant="outline" className="flex-1 border-slate-600">
                Cancel
              </Button>
              <Button onClick={handleCreateAdmin} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <UserPlus size={16} className="mr-2" />}
                Create Admin
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  Key
} from 'lucide-react';

// Admin Components
import ServiceFeesAnalytics from '../components/admin/ServiceFeesAnalytics';
import CardTypesManager from '../components/admin/CardTypesManager';
import AdminOverview from '../components/admin/AdminOverview';
import AdminClients from '../components/admin/AdminClients';
import AdminMerchants from '../components/admin/AdminMerchants';

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
  
  // Settings states
  const [platformConfig, setPlatformConfig] = useState(null);
  const [settingsTab, setSettingsTab] = useState('cards');
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showCreateMerchantModal, setShowCreateMerchantModal] = useState(false);
  const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);
  const [bulkSMSType, setBulkSMSType] = useState('clients');
  const [bulkSMSFilter, setBulkSMSFilter] = useState('all');
  const [bulkSMSMessage, setBulkSMSMessage] = useState('');
  
  // Settings forms
  const [cardPricesForm, setCardPricesForm] = useState({
    silver_price: 25, gold_price: 50, platinum_price: 100,
    silver_benefits: '3% cashback on all purchases', 
    gold_benefits: '5% cashback + Priority support',
    platinum_benefits: '7% cashback + VIP benefits + Exclusive offers',
    silver_duration: 365, gold_duration: 365, platinum_duration: 730,
    silver_welcome_bonus: 1, gold_welcome_bonus: 2, platinum_welcome_bonus: 3
  });
  const [commissionsForm, setCommissionsForm] = useState({
    platform_commission_rate: 5, min_cashback: 1, max_cashback: 20
  });
  const [serviceCommissionsForm, setServiceCommissionsForm] = useState({
    airtime_type: 'percentage', airtime_rate: 2,
    data_type: 'percentage', data_rate: 2,
    ecg_type: 'fixed', ecg_rate: 1,
    merchant_type: 'percentage', merchant_rate: 1,
    withdrawal_type: 'percentage', withdrawal_rate: 1
  });
  const [referralForm, setReferralForm] = useState({ welcome_bonus: 1, referrer_bonus: 3 });
  const [newClientForm, setNewClientForm] = useState({ full_name: '', phone: '', username: '', email: '', card_type: '' });
  const [newMerchantForm, setNewMerchantForm] = useState({ 
    business_name: '', 
    owner_name: '', 
    phone: '', 
    email: '', 
    cashback_rate: 5, 
    city: '', 
    address: '',
    google_maps_url: ''
  });

  // Phase 2 & 3: Advanced features states
  const [smsHistory, setSmsHistory] = useState([]);
  const [smsTemplates, setSmsTemplates] = useState([]);
  const [scheduledSMS, setScheduledSMS] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', message: '', category: 'general' });
  
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
      const headers = getHeaders();
      const res = await axios.get(`${API_URL}/api/admin/merchants/${merchant.id}/transactions`, { headers });
      setMerchantTransactions(res.data.transactions || []);
      setTransactionSummary(res.data.summary || {});
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
                <Input
                  ref={passwordRef}
                  type="password"
                  placeholder="Enter password"
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  data-testid="admin-password-input"
                />
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

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* PIN Required Message if not verified */}
            {!pinVerified ? (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                <Shield className="text-purple-400 mx-auto mb-4" size={48} />
                <h3 className="text-white text-xl font-semibold mb-2">PIN Required</h3>
                <p className="text-slate-400 mb-6">Enter your PIN to access Settings</p>
                <Button onClick={() => setShowPinModal(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Shield size={16} className="mr-2" /> Enter PIN
                </Button>
              </div>
            ) : (
              <>
                {/* Settings Sub-tabs */}
                <div className="flex flex-wrap gap-2 bg-slate-800 p-2 rounded-xl overflow-x-auto">
                  {[
                    { id: 'cards', label: 'Card Prices', icon: CreditCard },
                    { id: 'commissions', label: 'Commissions', icon: Percent },
                    { id: 'services', label: 'Service Fees', icon: Sliders },
                    { id: 'referrals', label: 'Referrals', icon: Gift },
                    { id: 'users', label: 'Add Users', icon: UserPlus },
                    { id: 'sms', label: 'SMS Center', icon: MessageSquare },
                    { id: 'security', label: 'Security', icon: Shield },
                    { id: 'admins', label: 'Admin Users', icon: Users }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSettingsTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
                        settingsTab === tab.id 
                          ? 'bg-blue-600 text-white' 
                          : 'text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Card Prices Settings */}
                {settingsTab === 'cards' && (
                  <div className="space-y-6">
                    {/* Default Cards Configuration */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                      <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                        <CreditCard size={20} className="text-amber-400" /> Default Cards (Price, Duration, Benefits)
                      </h3>
                      <div className="grid md:grid-cols-3 gap-6">
                        {/* Silver Card */}
                        <div className="bg-slate-900 rounded-xl p-4 border border-slate-600">
                          <div className="flex items-center gap-2 mb-4">
                            <Medal className="text-slate-400" size={24} />
                            <h4 className="text-white font-medium">Silver Card</h4>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-slate-400 text-sm">Price (GHS)</Label>
                              <Input
                                type="number"
                                value={cardPricesForm.silver_price}
                                onChange={(e) => setCardPricesForm({...cardPricesForm, silver_price: parseFloat(e.target.value)})}
                                className="bg-slate-800 border-slate-700 text-white mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-slate-400 text-sm">Duration</Label>
                              <select
                                value={cardPricesForm.silver_duration || 365}
                                onChange={(e) => setCardPricesForm({...cardPricesForm, silver_duration: parseInt(e.target.value)})}
                                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                              >
                                <option value={30}>1 month</option>
                                <option value={90}>3 months</option>
                                <option value={180}>6 months</option>
                                <option value={365}>1 year</option>
                                <option value={730}>2 years</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-slate-400 text-sm">Benefits</Label>
                              <textarea
                                value={cardPricesForm.silver_benefits}
                                onChange={(e) => setCardPricesForm({...cardPricesForm, silver_benefits: e.target.value})}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm mt-1 min-h-[60px]"
                              />
                            </div>
                            <div>
                              <Label className="text-slate-400 text-sm">Welcome Bonus (GHS)</Label>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                value={cardPricesForm.silver_welcome_bonus}
                                onChange={(e) => setCardPricesForm({...cardPricesForm, silver_welcome_bonus: parseFloat(e.target.value)})}
                                className="bg-slate-800 border-slate-700 text-white mt-1"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Gold Card */}
                        <div className="bg-gradient-to-br from-amber-900/30 to-slate-900 rounded-xl p-4 border border-amber-700/50">
                          <div className="flex items-center gap-2 mb-4">
                            <Award className="text-amber-400" size={24} />
                            <h4 className="text-amber-400 font-medium">Gold Card</h4>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-slate-400 text-sm">Price (GHS)</Label>
                              <Input
                                type="number"
                                value={cardPricesForm.gold_price}
                                onChange={(e) => setCardPricesForm({...cardPricesForm, gold_price: parseFloat(e.target.value)})}
                                className="bg-slate-800 border-amber-700/50 text-white mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-slate-400 text-sm">Duration</Label>
                              <select
                                value={cardPricesForm.gold_duration || 365}
                                onChange={(e) => setCardPricesForm({...cardPricesForm, gold_duration: parseInt(e.target.value)})}
                                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-amber-700/50 rounded-md text-white"
                              >
                                <option value={30}>1 month</option>
                                <option value={90}>3 months</option>
                                <option value={180}>6 months</option>
                                <option value={365}>1 year</option>
                                <option value={730}>2 years</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-slate-400 text-sm">Benefits</Label>
                              <textarea
                                value={cardPricesForm.gold_benefits}
                                onChange={(e) => setCardPricesForm({...cardPricesForm, gold_benefits: e.target.value})}
                                className="w-full bg-slate-800 border border-amber-700/50 rounded-lg p-2 text-white text-sm mt-1 min-h-[60px]"
                              />
                            </div>
                            <div>
                              <Label className="text-slate-400 text-sm">Welcome Bonus (GHS)</Label>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                value={cardPricesForm.gold_welcome_bonus}
                                onChange={(e) => setCardPricesForm({...cardPricesForm, gold_welcome_bonus: parseFloat(e.target.value)})}
                                className="bg-slate-800 border-amber-700/50 text-white mt-1"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Platinum Card */}
                        <div className="bg-gradient-to-br from-purple-900/30 to-slate-900 rounded-xl p-4 border border-purple-700/50">
                          <div className="flex items-center gap-2 mb-4">
                            <Crown className="text-purple-400" size={24} />
                            <h4 className="text-purple-400 font-medium">Platinum Card</h4>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-slate-400 text-sm">Price (GHS)</Label>
                              <Input
                                type="number"
                                value={cardPricesForm.platinum_price}
                                onChange={(e) => setCardPricesForm({...cardPricesForm, platinum_price: parseFloat(e.target.value)})}
                                className="bg-slate-800 border-purple-700/50 text-white mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-slate-400 text-sm">Duration</Label>
                              <select
                                value={cardPricesForm.platinum_duration || 730}
                                onChange={(e) => setCardPricesForm({...cardPricesForm, platinum_duration: parseInt(e.target.value)})}
                                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-purple-700/50 rounded-md text-white"
                              >
                                <option value={30}>1 month</option>
                                <option value={90}>3 months</option>
                                <option value={180}>6 months</option>
                                <option value={365}>1 year</option>
                                <option value={730}>2 years</option>
                                <option value={1095}>3 ans</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-slate-400 text-sm">Benefits</Label>
                              <textarea
                                value={cardPricesForm.platinum_benefits}
                                onChange={(e) => setCardPricesForm({...cardPricesForm, platinum_benefits: e.target.value})}
                                className="w-full bg-slate-800 border border-purple-700/50 rounded-lg p-2 text-white text-sm mt-1 min-h-[60px]"
                              />
                            </div>
                            <div>
                              <Label className="text-slate-400 text-sm">Welcome Bonus (GHS)</Label>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                value={cardPricesForm.platinum_welcome_bonus}
                                onChange={(e) => setCardPricesForm({...cardPricesForm, platinum_welcome_bonus: parseFloat(e.target.value)})}
                                className="bg-slate-800 border-purple-700/50 text-white mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end">
                        <Button onClick={handleSaveCardPrices} className="bg-blue-600 hover:bg-blue-700" disabled={actionLoading}>
                          {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle size={16} className="mr-2" />}
                          Save
                        </Button>
                      </div>
                    </div>

                    {/* Custom Card Types Manager */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                      <CardTypesManager token={token} onUpdate={fetchDashboardData} />
                    </div>
                  </div>
                )}

            {/* Commission Settings */}
            {settingsTab === 'commissions' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <Percent size={20} className="text-emerald-400" /> Platform Commission on Cashback
                </h3>
                <div className="bg-slate-900 rounded-xl p-6 max-w-md">
                  <p className="text-slate-400 text-sm mb-4">
                    SDM takes a percentage of each cashback distributed to clients. This is deducted from the merchant's cashback allocation.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-300">Platform Commission Rate (%)</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={commissionsForm.platform_commission_rate}
                          onChange={(e) => setCommissionsForm({...commissionsForm, platform_commission_rate: parseFloat(e.target.value)})}
                          className="flex-1"
                        />
                        <span className="text-emerald-400 text-2xl font-bold w-16 text-center">
                          {commissionsForm.platform_commission_rate}%
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-4 mt-4">
                      <p className="text-slate-400 text-sm mb-2">Example Calculation:</p>
                      <div className="text-sm space-y-1">
                        <p className="text-white">Client Purchase: <span className="text-emerald-400">GHS 1,000</span></p>
                        <p className="text-white">Merchant Cashback (10%): <span className="text-amber-400">GHS 100</span></p>
                        <p className="text-white">Client Receives: <span className="text-emerald-400">GHS {(100 - 100 * commissionsForm.platform_commission_rate / 100).toFixed(0)}</span></p>
                        <p className="text-white">SDM Commission: <span className="text-purple-400">GHS {(100 * commissionsForm.platform_commission_rate / 100).toFixed(0)}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveCommissions} className="bg-emerald-600 hover:bg-emerald-700" disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle size={16} className="mr-2" />}
                    Save Commission Settings
                  </Button>
                </div>
              </div>
            )}

            {/* Service Commissions */}
            {settingsTab === 'services' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <Sliders size={20} className="text-cyan-400" /> Service Fee Configuration
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  Configure commissions when clients use their cashback balance for services.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Airtime */}
                  <div className="bg-slate-900 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Phone size={16} className="text-blue-400" /> Airtime Purchase
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-400 text-xs">Type</Label>
                        <select
                          value={serviceCommissionsForm.airtime_type}
                          onChange={(e) => setServiceCommissionsForm({...serviceCommissionsForm, airtime_type: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm mt-1"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed (GHS)</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Rate</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={serviceCommissionsForm.airtime_rate}
                          onChange={(e) => setServiceCommissionsForm({...serviceCommissionsForm, airtime_rate: parseFloat(e.target.value)})}
                          className="bg-slate-800 border-slate-700 text-white mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Data */}
                  <div className="bg-slate-900 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Activity size={16} className="text-purple-400" /> Data Purchase
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-400 text-xs">Type</Label>
                        <select
                          value={serviceCommissionsForm.data_type}
                          onChange={(e) => setServiceCommissionsForm({...serviceCommissionsForm, data_type: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm mt-1"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed (GHS)</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Rate</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={serviceCommissionsForm.data_rate}
                          onChange={(e) => setServiceCommissionsForm({...serviceCommissionsForm, data_rate: parseFloat(e.target.value)})}
                          className="bg-slate-800 border-slate-700 text-white mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ECG */}
                  <div className="bg-slate-900 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <DollarSign size={16} className="text-amber-400" /> ECG / Utilities
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-400 text-xs">Type</Label>
                        <select
                          value={serviceCommissionsForm.ecg_type}
                          onChange={(e) => setServiceCommissionsForm({...serviceCommissionsForm, ecg_type: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm mt-1"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed (GHS)</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Rate</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={serviceCommissionsForm.ecg_rate}
                          onChange={(e) => setServiceCommissionsForm({...serviceCommissionsForm, ecg_rate: parseFloat(e.target.value)})}
                          className="bg-slate-800 border-slate-700 text-white mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Merchant Payment */}
                  <div className="bg-slate-900 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Store size={16} className="text-emerald-400" /> Merchant Payments
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-400 text-xs">Type</Label>
                        <select
                          value={serviceCommissionsForm.merchant_type}
                          onChange={(e) => setServiceCommissionsForm({...serviceCommissionsForm, merchant_type: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm mt-1"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed (GHS)</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Rate</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={serviceCommissionsForm.merchant_rate}
                          onChange={(e) => setServiceCommissionsForm({...serviceCommissionsForm, merchant_rate: parseFloat(e.target.value)})}
                          className="bg-slate-800 border-slate-700 text-white mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* MoMo Withdrawal */}
                  <div className="bg-slate-900 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Banknote size={16} className="text-teal-400" /> MoMo Withdrawal
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-400 text-xs">Type</Label>
                        <select
                          value={serviceCommissionsForm.withdrawal_type}
                          onChange={(e) => setServiceCommissionsForm({...serviceCommissionsForm, withdrawal_type: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm mt-1"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed (GHS)</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Rate</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={serviceCommissionsForm.withdrawal_rate}
                          onChange={(e) => setServiceCommissionsForm({...serviceCommissionsForm, withdrawal_rate: parseFloat(e.target.value)})}
                          className="bg-slate-800 border-slate-700 text-white mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveServiceCommissions} className="bg-cyan-600 hover:bg-cyan-700" disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle size={16} className="mr-2" />}
                    Save Service Fees
                  </Button>
                </div>
              </div>
            )}

            {/* Referral Settings */}
            {settingsTab === 'referrals' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <Gift size={20} className="text-pink-400" /> Referral Bonus Configuration
                </h3>
                <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
                  <div className="bg-slate-900 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-3">Welcome Bonus</h4>
                    <p className="text-slate-400 text-sm mb-3">Amount given to new users who sign up using a referral code.</p>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">GHS</span>
                      <Input
                        type="number"
                        step="0.5"
                        value={referralForm.welcome_bonus}
                        onChange={(e) => setReferralForm({...referralForm, welcome_bonus: parseFloat(e.target.value)})}
                        className="bg-slate-800 border-slate-700 text-white w-24"
                      />
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-3">Referrer Bonus</h4>
                    <p className="text-slate-400 text-sm mb-3">Amount given to users who refer new members.</p>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">GHS</span>
                      <Input
                        type="number"
                        step="0.5"
                        value={referralForm.referrer_bonus}
                        onChange={(e) => setReferralForm({...referralForm, referrer_bonus: parseFloat(e.target.value)})}
                        className="bg-slate-800 border-slate-700 text-white w-24"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveReferralBonuses} className="bg-pink-600 hover:bg-pink-700" disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle size={16} className="mr-2" />}
                    Save Referral Settings
                  </Button>
                </div>
              </div>
            )}

            {/* Add Users */}
            {settingsTab === 'users' && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Add Client */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Users size={20} className="text-blue-400" /> Add Client Manually
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Create a new client account. A temporary password will be generated.
                  </p>
                  <Button onClick={() => setShowCreateClientModal(true)} className="w-full bg-blue-600 hover:bg-blue-700">
                    <UserPlus size={16} className="mr-2" /> Create New Client
                  </Button>
                </div>

                {/* Add Merchant */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Store size={20} className="text-emerald-400" /> Add Merchant Manually
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Create a new merchant account. Account will be pre-approved.
                  </p>
                  <Button onClick={() => setShowCreateMerchantModal(true)} className="w-full bg-emerald-600 hover:bg-emerald-700">
                    <UserPlus size={16} className="mr-2" /> Create New Merchant
                  </Button>
                </div>
              </div>
            )}

            {/* SMS Center (Phase 2) */}
            {settingsTab === 'sms' && (
              <div className="space-y-6">
                {/* Quick Send Actions */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <MessageSquare size={20} className="text-purple-400" /> Bulk SMS to Clients
                    </h3>
                    <Button 
                      onClick={() => { setBulkSMSType('clients'); setShowBulkSMSModal(true); }} 
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      <MessageSquare size={16} className="mr-2" /> Send to Clients
                    </Button>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <MessageSquare size={20} className="text-amber-400" /> Bulk SMS to Merchants
                    </h3>
                    <Button 
                      onClick={() => { setBulkSMSType('merchants'); setShowBulkSMSModal(true); }} 
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      <MessageSquare size={16} className="mr-2" /> Send to Merchants
                    </Button>
                  </div>
                </div>

                {/* SMS Templates */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <CreditCard size={20} className="text-cyan-400" /> SMS Templates
                    </h3>
                    <Button onClick={() => setShowTemplateModal(true)} className="bg-cyan-600 hover:bg-cyan-700" size="sm">
                      <UserPlus size={14} className="mr-1" /> New Template
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {smsTemplates.length > 0 ? smsTemplates.map(template => (
                      <div key={template.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{template.name}</p>
                          <p className="text-slate-400 text-sm truncate max-w-md">{template.message}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setBulkSMSMessage(template.message); setShowBulkSMSModal(true); }}
                            className="text-blue-400 hover:bg-blue-500/10"
                          >
                            Use
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    )) : (
                      <p className="text-slate-500 text-center py-4">No templates yet. Create one to save time!</p>
                    )}
                  </div>
                </div>

                {/* SMS History */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <History size={20} className="text-slate-400" /> Recent SMS History
                  </h3>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="text-slate-400 bg-slate-900 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Recipient</th>
                          <th className="text-left p-2">Message</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {smsHistory.length > 0 ? smsHistory.slice(0, 20).map((log, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            <td className="p-2 text-slate-300">{new Date(log.created_at).toLocaleDateString()}</td>
                            <td className="p-2 text-slate-300">{log.phone}</td>
                            <td className="p-2 text-slate-400 truncate max-w-xs">{log.message?.slice(0, 50)}...</td>
                            <td className="p-2">{getStatusBadge(log.status || 'sent')}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="4" className="text-center text-slate-500 py-8">No SMS sent yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings (Phase 3) */}
            {settingsTab === 'security' && (
              <div className="space-y-6 max-w-2xl">
                {/* PIN Security */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Shield size={20} className="text-purple-400" /> Settings PIN (Default: 0000)
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    The Settings menu is protected by a PIN code. Only the Super Admin (emileparfait2003@gmail.com) can change the PIN.
                  </p>
                  
                  <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg mb-4">
                    <span className="text-emerald-400 flex items-center gap-2">
                      <CheckCircle size={16} /> PIN Protection Active
                    </span>
                  </div>
                  
                  {/* Change PIN (Super Admin only) */}
                  {admin?.email === 'emileparfait2003@gmail.com' && (
                    <Button onClick={() => setShowSetPinModal(true)} className="bg-purple-600 hover:bg-purple-700">
                      <Shield size={16} className="mr-2" /> Change Settings PIN
                    </Button>
                  )}
                  
                  {admin?.email !== 'emileparfait2003@gmail.com' && (
                    <p className="text-slate-500 text-sm">
                      Only the Super Admin (emileparfait2003@gmail.com) can modify the PIN.
                    </p>
                  )}
                </div>

                {/* Password Change */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Eye size={20} className="text-blue-400" /> Change Password
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Change your admin password. Requires OTP verification for security.
                  </p>
                  <Button onClick={() => setShowPasswordModal(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Eye size={16} className="mr-2" /> Change Password
                  </Button>
                </div>

                {/* Current Admin Info */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Users size={20} className="text-slate-400" /> Current Admin
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-slate-900 rounded-lg">
                      <span className="text-slate-400">Email</span>
                      <span className="text-white">{admin?.email}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-900 rounded-lg">
                      <span className="text-slate-400">Name</span>
                      <span className="text-white">{admin?.name || 'Admin'}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-900 rounded-lg">
                      <span className="text-slate-400">Role</span>
                      <span className="text-purple-400 font-medium">
                        {admin?.is_super_admin ? 'Super Admin' : admin?.role || 'Admin'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Users Management (Phase 3) */}
            {settingsTab === 'admins' && (
              <div className="space-y-6">
                {admin?.is_super_admin ? (
                  <>
                    {/* Create Admin Button */}
                    <div className="flex justify-between items-center">
                      <h3 className="text-white font-semibold flex items-center gap-2">
                        <Users size={20} className="text-blue-400" /> Admin Accounts
                      </h3>
                      <Button onClick={() => setShowAdminModal(true)} className="bg-blue-600 hover:bg-blue-700">
                        <UserPlus size={16} className="mr-2" /> Create Admin
                      </Button>
                    </div>

                    {/* Admin List */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-900 text-slate-400 text-sm">
                          <tr>
                            <th className="text-left p-4">Admin</th>
                            <th className="text-left p-4">Role</th>
                            <th className="text-left p-4">Status</th>
                            <th className="text-left p-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {allAdmins.map(adm => (
                            <tr key={adm.id} className="hover:bg-slate-900/50">
                              <td className="p-4">
                                <p className="text-white font-medium">{adm.name || 'Admin'}</p>
                                <p className="text-slate-500 text-sm">{adm.email}</p>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  adm.is_super_admin ? 'bg-purple-500/20 text-purple-400' :
                                  adm.role === 'admin_support' ? 'bg-blue-500/20 text-blue-400' :
                                  adm.role === 'admin_merchants' ? 'bg-emerald-500/20 text-emerald-400' :
                                  adm.role === 'admin_finance' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-slate-500/20 text-slate-400'
                                }`}>
                                  {adm.is_super_admin ? 'Super Admin' : 
                                   adm.role === 'admin_support' ? 'Support' :
                                   adm.role === 'admin_merchants' ? 'Merchants' :
                                   adm.role === 'admin_finance' ? 'Finance' :
                                   adm.role === 'admin_readonly' ? 'Read-only' : 'Admin'}
                                </span>
                              </td>
                              <td className="p-4">
                                {getStatusBadge(adm.is_active ? 'active' : 'suspended')}
                              </td>
                              <td className="p-4">
                                {adm.id !== admin?.id && (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleAdminStatus(adm.id, adm.is_active)}
                                      className={adm.is_active ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}
                                    >
                                      {adm.is_active ? <Ban size={14} /> : <UserCheck size={14} />}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteAdmin(adm.id)}
                                      className="text-red-400 hover:bg-red-500/10"
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Role Descriptions */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                      <h4 className="text-white font-medium mb-4">Admin Roles</h4>
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                          <p className="text-purple-400 font-medium">Super Admin</p>
                          <p className="text-slate-400">Full control over all platform features</p>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                          <p className="text-blue-400 font-medium">Admin Support</p>
                          <p className="text-slate-400">Manage clients, send SMS, view stats</p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-lg">
                          <p className="text-emerald-400 font-medium">Admin Merchants</p>
                          <p className="text-slate-400">Manage merchants, approve partners</p>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-lg">
                          <p className="text-amber-400 font-medium">Admin Finance</p>
                          <p className="text-slate-400">View stats, transactions, commissions</p>
                        </div>
                        <div className="p-3 bg-slate-500/10 rounded-lg">
                          <p className="text-slate-300 font-medium">Read-only Admin</p>
                          <p className="text-slate-400">View-only access to all data</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
                    <AlertCircle className="text-amber-400 mx-auto mb-3" size={32} />
                    <p className="text-amber-400">Only Super Admin can manage admin accounts</p>
                  </div>
                )}
              </div>
            )}
              </>
            )}
          </div>
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
                        <td className="p-2 text-right text-white">GHS {tx.amount?.toFixed(2)}</td>
                        <td className="p-2 text-right text-purple-400">GHS {tx.cashback_amount?.toFixed(2)}</td>
                        <td className="p-2">{getStatusBadge(tx.status || 'completed')}</td>
                      </tr>
                    ))}
                    {merchantTransactions.length === 0 && (
                      <tr><td colSpan="5" className="text-center text-slate-500 py-8">No transactions found</td></tr>
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

      {/* LIMITS MODAL */}
      {showLimitsModal && selectedClient && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Sliders className="text-blue-400" size={20} />
              Manage Limits for {selectedClient.full_name}
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Withdrawal Limit (GHS)</Label>
                <Input
                  type="number"
                  value={limitsForm.withdrawal_limit}
                  onChange={(e) => setLimitsForm({...limitsForm, withdrawal_limit: parseFloat(e.target.value)})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Transaction Limit (GHS)</Label>
                <Input
                  type="number"
                  value={limitsForm.transaction_limit}
                  onChange={(e) => setLimitsForm({...limitsForm, transaction_limit: parseFloat(e.target.value)})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Daily Limit (GHS)</Label>
                <Input
                  type="number"
                  value={limitsForm.daily_limit}
                  onChange={(e) => setLimitsForm({...limitsForm, daily_limit: parseFloat(e.target.value)})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => setShowLimitsModal(false)} variant="outline" className="flex-1 border-slate-600">
                Cancel
              </Button>
              <Button onClick={handleUpdateLimits} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle size={16} className="mr-2" />}
                Save Limits
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LOCATION MODAL */}
      {showLocationModal && selectedMerchant && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <MapPin className="text-cyan-400" size={20} />
              Edit Location for {selectedMerchant.business_name}
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">City</Label>
                <Input
                  type="text"
                  value={locationForm.city}
                  onChange={(e) => setLocationForm({...locationForm, city: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="Accra, Kumasi, Takoradi..."
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Full Address</Label>
                <textarea
                  value={locationForm.address}
                  onChange={(e) => setLocationForm({...locationForm, address: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white min-h-[80px]"
                  placeholder="Spintex Road, Accra, Ghana"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Google Maps URL (optional)</Label>
                <Input
                  type="url"
                  value={locationForm.google_maps_url}
                  onChange={(e) => setLocationForm({...locationForm, google_maps_url: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => setShowLocationModal(false)} variant="outline" className="flex-1 border-slate-600">
                Cancel
              </Button>
              <Button onClick={handleUpdateLocation} className="flex-1 bg-cyan-600 hover:bg-cyan-700" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle size={16} className="mr-2" />}
                Save Location
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetPasswordModal && resetPasswordTarget && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Key className="text-cyan-400" size={20} />
              Reset Password
            </h3>
            <p className="text-slate-400 mb-4">
              Reset password for{' '}
              <span className="text-white font-medium">
                {resetPasswordTarget.data.full_name || resetPasswordTarget.data.business_name}
              </span>
              {' '}({resetPasswordTarget.type})
            </p>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">New Password *</Label>
                <Input
                  type="password"
                  value={resetPasswordForm.new_password}
                  onChange={(e) => setResetPasswordForm({...resetPasswordForm, new_password: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Confirm Password *</Label>
                <Input
                  type="password"
                  value={resetPasswordForm.confirm_password}
                  onChange={(e) => setResetPasswordForm({...resetPasswordForm, confirm_password: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="Confirm new password"
                />
              </div>
              {resetPasswordForm.new_password && resetPasswordForm.confirm_password && (
                <div className={`text-sm ${resetPasswordForm.new_password === resetPasswordForm.confirm_password ? 'text-emerald-400' : 'text-red-400'}`}>
                  {resetPasswordForm.new_password === resetPasswordForm.confirm_password 
                    ? '✓ Passwords match' 
                    : '✗ Passwords do not match'}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => { setShowResetPasswordModal(false); setResetPasswordTarget(null); }}
                className="flex-1 border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={actionLoading || !resetPasswordForm.new_password || resetPasswordForm.new_password !== resetPasswordForm.confirm_password}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
              >
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Key size={16} className="mr-2" />}
                Reset Password
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CLIENT MODAL */}
      {showCreateClientModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <UserPlus className="text-blue-400" size={20} />
              Create New Client
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Full Name *</Label>
                <Input
                  type="text"
                  value={newClientForm.full_name}
                  onChange={(e) => setNewClientForm({...newClientForm, full_name: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Phone Number *</Label>
                <Input
                  type="tel"
                  value={newClientForm.phone}
                  onChange={(e) => setNewClientForm({...newClientForm, phone: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="0241234567"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Username *</Label>
                <Input
                  type="text"
                  value={newClientForm.username}
                  onChange={(e) => setNewClientForm({...newClientForm, username: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="johndoe"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Email (optional)</Label>
                <Input
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) => setNewClientForm({...newClientForm, email: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Card Type (optional)</Label>
                <select
                  value={newClientForm.card_type}
                  onChange={(e) => setNewClientForm({...newClientForm, card_type: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="">No Card</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => setShowCreateClientModal(false)} variant="outline" className="flex-1 border-slate-600">
                Cancel
              </Button>
              <Button onClick={handleCreateClient} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <UserPlus size={16} className="mr-2" />}
                Create Client
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MERCHANT MODAL */}
      {showCreateMerchantModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Store className="text-emerald-400" size={20} />
              Create New Merchant
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Business Name *</Label>
                <Input
                  type="text"
                  value={newMerchantForm.business_name}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, business_name: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="ABC Store"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Owner Name *</Label>
                <Input
                  type="text"
                  value={newMerchantForm.owner_name}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, owner_name: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="John Owner"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Phone Number *</Label>
                <Input
                  type="tel"
                  value={newMerchantForm.phone}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, phone: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="0241234567"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Email (optional)</Label>
                <Input
                  type="email"
                  value={newMerchantForm.email}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, email: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="business@example.com"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Cashback Rate (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  max="20"
                  value={newMerchantForm.cashback_rate}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, cashback_rate: parseFloat(e.target.value)})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">City (optional)</Label>
                <Input
                  type="text"
                  value={newMerchantForm.city}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, city: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="Accra"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Business Address (optional)</Label>
                <Input
                  type="text"
                  value={newMerchantForm.address}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, address: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="123 Main Street, Osu"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Google Maps URL (optional)</Label>
                <Input
                  type="url"
                  value={newMerchantForm.google_maps_url}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, google_maps_url: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => setShowCreateMerchantModal(false)} variant="outline" className="flex-1 border-slate-600">
                Cancel
              </Button>
              <Button onClick={handleCreateMerchant} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Store size={16} className="mr-2" />}
                Create Merchant
              </Button>
            </div>
          </div>
        </div>
      )}

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

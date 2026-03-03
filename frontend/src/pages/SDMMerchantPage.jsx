import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Store, ArrowLeft, Loader2, QrCode, Users, BarChart3,
  Settings, LogOut, DollarSign, TrendingUp, Plus, Trash2,
  Check, X, Edit2, Camera, Calendar, Filter,
  ChevronDown, ChevronUp, Clock, User, Search,
  Eye, EyeOff, Lock, MapPin, Send, Phone, Copy, 
  Code, Book, Key, Shield, Percent, ToggleLeft, ToggleRight, Save,
  CreditCard, Smartphone, Banknote, Wallet, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import OTPInput from '../components/OTPInput';
import { toast } from 'sonner';
import axios from 'axios';
import QRScanner from '../components/QRScanner';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { PaymentMethodSelector, PaymentSplitDisplay } from '../components/PaymentComponents';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "/sdm-logo.png";

export default function SDMMerchantPage() {
  const { t, isRTL } = useLanguage();
  const [step, setStep] = useState('welcome'); // welcome, register, otp, register_form, login, dashboard
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('sdm_merchant_token'));
  const [merchant, setMerchant] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('scan');

  // Register form
  const [registerForm, setRegisterForm] = useState({
    business_name: '',
    business_type: 'restaurant',
    phone: '',
    email: '',
    address: '',
    gps_address: '',
    city: 'Accra',
    cashback_rate: 5,  // 5% default
    password: '',
    // Settlement configuration
    settlement_type: 'momo',  // momo or bank
    momo_number: '',
    momo_provider: 'MTN',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    settlement_mode: 'instant'  // instant or daily
  });
  
  // OTP state
  const [otp, setOtp] = useState('');
  const [otpRequestId, setOtpRequestId] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [ussdCode, setUssdCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login form
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Scan form
  const [scanQR, setScanQR] = useState('');
  const [scanAmount, setScanAmount] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanNotes, setScanNotes] = useState('');
  
  // Payment system
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [momoPhone, setMomoPhone] = useState('');
  const [momoNetwork, setMomoNetwork] = useState('MTN');
  const [merchantQrData, setMerchantQrData] = useState(null);
  const [cashBalance, setCashBalance] = useState(null);
  const [paymentSplit, setPaymentSplit] = useState(null);
  const [showMyQR, setShowMyQR] = useState(false);

  // Staff form
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');

  // Transaction history filters
  const [txnFilter, setTxnFilter] = useState('all'); // all, pending, available
  const [txnSearch, setTxnSearch] = useState('');
  const [txnLimit, setTxnLimit] = useState(50);
  const [showTxnDetails, setShowTxnDetails] = useState(null);

  useEffect(() => {
    if (token) {
      setStep('dashboard');
      fetchMerchantData();
    }
  }, [token]);

  const fetchMerchantData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [profileRes, txnRes, reportRes, qrRes, cashRes] = await Promise.all([
        axios.get(`${API_URL}/api/sdm/merchant/profile`, { headers }),
        axios.get(`${API_URL}/api/sdm/merchant/transactions?limit=${txnLimit}`, { headers }),
        axios.get(`${API_URL}/api/sdm/merchant/report?days=30`, { headers }),
        axios.get(`${API_URL}/api/sdm/merchant/qr-code`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/sdm/merchant/cash-balance`, { headers }).catch(() => ({ data: null }))
      ]);
      setMerchant(profileRes.data);
      setTransactions(txnRes.data);
      setReport(reportRes.data);
      if (qrRes.data) setMerchantQrData(qrRes.data);
      if (cashRes.data) setCashBalance(cashRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleQRScanned = (qrCode) => {
    setScanQR(qrCode);
    setShowScanner(false);
    toast.success(`QR Code scanné: ${qrCode}`);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/sdm/merchant/send-otp`, {
        phone: registerForm.phone
      });
      setOtpRequestId(response.data.request_id);
      if (response.data.is_test_account) {
        setDebugOtp('0000');
      }
      if (response.data.ussd_code) {
        setUssdCode(response.data.ussd_code);
      }
      toast.success(t('sdm_otp_sent'));
      setStep('otp');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('sdm_otp_failed') || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit OTP when received via Web OTP API
  const handleOTPAutoFill = useCallback(async (autoFilledOtp) => {
    if (autoFilledOtp && autoFilledOtp.length === 4) {
      setOtp(autoFilledOtp);
      toast.info('OTP auto-filled from SMS');
      
      // Small delay then auto-submit
      setTimeout(async () => {
        if (!registerForm.password || registerForm.password.length < 6) {
          toast.error('Please enter a password (min 6 characters)');
          return;
        }
        
        setIsLoading(true);
        try {
          const response = await axios.post(`${API_URL}/api/sdm/merchant/register`, {
            ...registerForm,
            otp_code: autoFilledOtp,
            request_id: otpRequestId
          });
          localStorage.setItem('sdm_merchant_token', response.data.access_token);
          setToken(response.data.access_token);
          setMerchant(response.data.merchant);
          toast.success(t('sdm_register_success'));
          setStep('dashboard');
        } catch (error) {
          toast.error(error.response?.data?.detail || t('sdm_register_failed'));
        } finally {
          setIsLoading(false);
        }
      }, 300);
    }
  }, [registerForm, otpRequestId, t]);

  const handleVerifyOTPAndRegister = async (e) => {
    e.preventDefault();
    
    if (!registerForm.password || registerForm.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/sdm/merchant/register`, {
        ...registerForm,
        otp_code: otp,
        request_id: otpRequestId
      });
      localStorage.setItem('sdm_merchant_token', response.data.access_token);
      setToken(response.data.access_token);
      setMerchant(response.data.merchant);
      toast.success(t('sdm_register_success'));
      setStep('dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('sdm_register_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/sdm/merchant/login`,
        { phone: loginPhone, password: loginPassword }
      );
      localStorage.setItem('sdm_merchant_token', response.data.access_token);
      setToken(response.data.access_token);
      setMerchant(response.data.merchant);
      toast.success(t('sdm_login_success'));
      setStep('dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('sdm_invalid_credentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Use new payment system API
      const response = await axios.post(
        `${API_URL}/api/sdm/payments/merchant-initiate`,
        {
          client_qr_code: scanQR,
          amount: parseFloat(scanAmount),
          payment_method: paymentMethod,
          payer_phone: paymentMethod === 'momo' ? momoPhone : undefined,
          payer_network: paymentMethod === 'momo' ? momoNetwork : undefined,
          notes: scanNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        if (response.data.requires_client_confirmation) {
          toast.info(`Cash payment created - Client must confirm. Phone: ${response.data.client_phone}`);
        } else {
          toast.success(`Payment successful! Cashback: GHS ${response.data.split.client_cashback.toFixed(2)}`);
        }
        setScanQR('');
        setScanAmount('');
        setScanNotes('');
        setPaymentSplit(null);
        fetchMerchantData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('sdm_transaction_failed'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate payment split when amount changes
  useEffect(() => {
    if (scanAmount && parseFloat(scanAmount) > 0 && merchant?.cashback_rate) {
      const amount = parseFloat(scanAmount);
      const cashbackRate = paymentMethod === 'cash' 
        ? Math.min(merchant.cashback_rate, merchant.max_cash_cashback_rate || 15)
        : merchant.cashback_rate;
      const totalCashback = amount * (cashbackRate / 100);
      const sdmCommission = totalCashback * 0.10;
      const clientCashback = totalCashback - sdmCommission;
      const merchantAmount = amount - totalCashback;
      
      setPaymentSplit({
        total_cashback: totalCashback,
        sdm_commission: sdmCommission,
        client_cashback: clientCashback,
        merchant_amount: merchantAmount
      });
    } else {
      setPaymentSplit(null);
    }
  }, [scanAmount, paymentMethod, merchant]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/sdm/merchant/staff`,
        { name: newStaffName, phone: newStaffPhone, role: 'cashier' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Staff added!');
      setNewStaffName('');
      setNewStaffPhone('');
      fetchMerchantData();
    } catch (error) {
      toast.error('Failed to add staff');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveStaff = async (staffId) => {
    try {
      await axios.delete(`${API_URL}/api/sdm/merchant/staff/${staffId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Staff removed');
      fetchMerchantData();
    } catch (error) {
      toast.error('Failed to remove staff');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sdm_merchant_token');
    setToken(null);
    setMerchant(null);
    setStep('welcome');
  };

  // Register/Login Screen
  if (step !== 'dashboard') {
    return (
      <div className={`min-h-screen bg-slate-950 px-4 py-8 ${isRTL ? 'rtl' : 'ltr'}`} data-testid="sdm-merchant-auth">
        {/* Language Selector */}
        <div className="absolute top-4 right-4 z-10">
          <LanguageSelector variant="buttons" />
        </div>
        
        <div className="max-w-md mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft size={18} />
            {t('sdm_back')}
          </Link>

          <div className="text-center mb-8">
            <img src={LOGO_URL} alt="SDM Merchant" className="w-20 h-20 mx-auto mb-4 rounded-2xl object-cover" />
            <h1 className="text-2xl font-bold text-white">SDM Merchant</h1>
            <p className="text-slate-400">{t('sdm_merchant_portal')}</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-800">
            
            {/* Welcome Screen */}
            {step === 'welcome' && (
              <div className="space-y-4">
                <p className="text-center text-slate-300 mb-6">{t('sdm_welcome_merchant')}</p>
                <Button
                  onClick={() => setStep('register')}
                  className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold"
                  data-testid="merchant-register-btn"
                >
                  <Store size={18} className="mr-2" />
                  {t('sdm_register_business')}
                </Button>
                <Button
                  onClick={() => setStep('login')}
                  variant="outline"
                  className="w-full h-12 border-slate-600 text-slate-300 hover:bg-slate-800"
                  data-testid="merchant-login-btn"
                >
                  <Lock size={18} className="mr-2" />
                  {t('sdm_login')}
                </Button>
              </div>
            )}

            {/* Register Step 1: Business Info + Phone */}
            {step === 'register' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <h3 className="text-lg font-semibold text-white text-center mb-4">{t('sdm_registration')}</h3>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t('sdm_business_name')} *</label>
                  <Input
                    value={registerForm.business_name}
                    onChange={(e) => setRegisterForm({...registerForm, business_name: e.target.value})}
                    placeholder="My Restaurant"
                    className="bg-slate-800/50 border-slate-700 text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t('sdm_business_type')} *</label>
                  <select
                    value={registerForm.business_type}
                    onChange={(e) => setRegisterForm({...registerForm, business_type: e.target.value})}
                    className="w-full h-10 rounded-lg bg-slate-800/50 border border-slate-700 text-white px-3"
                  >
                    <option value="restaurant">{t('sdm_restaurant')}</option>
                    <option value="salon">{t('sdm_salon')}</option>
                    <option value="spa">{t('sdm_spa')}</option>
                    <option value="hotel">{t('sdm_hotel')}</option>
                    <option value="retail">{t('sdm_retail')}</option>
                    <option value="other">{t('sdm_other')}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t('sdm_phone_number')} *</label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-4 bg-slate-800 rounded-lg text-slate-400">
                      +233
                    </div>
                    <Input
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                      placeholder="XX XXX XXXX"
                      className="flex-1 bg-slate-800/50 border-slate-700 text-white"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t('sdm_email')}</label>
                  <Input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                    placeholder="email@example.com"
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t('sdm_address')}</label>
                  <Input
                    value={registerForm.address}
                    onChange={(e) => setRegisterForm({...registerForm, address: e.target.value})}
                    placeholder={t('sdm_street_area')}
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    <MapPin size={14} className="inline mr-1" />
                    {t('sdm_gps_address')}
                  </label>
                  <Input
                    value={registerForm.gps_address}
                    onChange={(e) => setRegisterForm({...registerForm, gps_address: e.target.value})}
                    placeholder="E.g. 9G8V+QH Accra or 5.6037,-0.1870"
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">{t('sdm_gps_hint')}</p>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t('sdm_city')}</label>
                  <Input
                    value={registerForm.city}
                    onChange={(e) => setRegisterForm({...registerForm, city: e.target.value})}
                    placeholder="Accra"
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t('sdm_cashback_rate')}</label>
                  <Input
                    type="number"
                    value={registerForm.cashback_rate}
                    onChange={(e) => setRegisterForm({...registerForm, cashback_rate: parseFloat(e.target.value) || 5})}
                    min="1"
                    max="20"
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">{t('sdm_between_1_20')}</p>
                </div>
                
                {/* Settlement Configuration */}
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Wallet size={18} className="text-cyan-400" />
                    Payment Settlement *
                  </h4>
                  
                  {/* Settlement Type Selector */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setRegisterForm({...registerForm, settlement_type: 'momo'})}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        registerForm.settlement_type === 'momo' 
                          ? 'border-yellow-500 bg-yellow-500/10' 
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <Smartphone className={`w-6 h-6 mx-auto mb-1 ${
                        registerForm.settlement_type === 'momo' ? 'text-yellow-400' : 'text-slate-400'
                      }`} />
                      <p className={`text-sm font-medium ${
                        registerForm.settlement_type === 'momo' ? 'text-yellow-400' : 'text-slate-400'
                      }`}>Mobile Money</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegisterForm({...registerForm, settlement_type: 'bank'})}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        registerForm.settlement_type === 'bank' 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <CreditCard className={`w-6 h-6 mx-auto mb-1 ${
                        registerForm.settlement_type === 'bank' ? 'text-blue-400' : 'text-slate-400'
                      }`} />
                      <p className={`text-sm font-medium ${
                        registerForm.settlement_type === 'bank' ? 'text-blue-400' : 'text-slate-400'
                      }`}>Bank Account</p>
                    </button>
                  </div>
                  
                  {/* MoMo Details */}
                  {registerForm.settlement_type === 'momo' && (
                    <div className="space-y-3 bg-yellow-900/20 rounded-xl p-4 border border-yellow-700/30">
                      <div>
                        <label className="block text-sm text-slate-300 mb-2">Network *</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['MTN', 'Vodafone', 'AirtelTigo'].map(network => (
                            <button
                              key={network}
                              type="button"
                              onClick={() => setRegisterForm({...registerForm, momo_provider: network})}
                              className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                                registerForm.momo_provider === network 
                                  ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400' 
                                  : 'border-slate-700 text-slate-400'
                              }`}
                            >
                              {network}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">MoMo Number *</label>
                        <Input
                          type="tel"
                          value={registerForm.momo_number}
                          onChange={(e) => setRegisterForm({...registerForm, momo_number: e.target.value})}
                          placeholder="0XX XXX XXXX"
                          className="bg-slate-800/50 border-slate-700 text-white"
                          required={registerForm.settlement_type === 'momo'}
                        />
                        <p className="text-xs text-slate-500 mt-1">Your payments will be sent here</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Bank Details */}
                  {registerForm.settlement_type === 'bank' && (
                    <div className="space-y-3 bg-blue-900/20 rounded-xl p-4 border border-blue-700/30">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Bank Name *</label>
                        <Input
                          value={registerForm.bank_name}
                          onChange={(e) => setRegisterForm({...registerForm, bank_name: e.target.value})}
                          placeholder="e.g., GCB Bank"
                          className="bg-slate-800/50 border-slate-700 text-white"
                          required={registerForm.settlement_type === 'bank'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Account Number *</label>
                        <Input
                          value={registerForm.bank_account_number}
                          onChange={(e) => setRegisterForm({...registerForm, bank_account_number: e.target.value})}
                          placeholder="Account number"
                          className="bg-slate-800/50 border-slate-700 text-white"
                          required={registerForm.settlement_type === 'bank'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Account Name *</label>
                        <Input
                          value={registerForm.bank_account_name}
                          onChange={(e) => setRegisterForm({...registerForm, bank_account_name: e.target.value})}
                          placeholder="Name on account"
                          className="bg-slate-800/50 border-slate-700 text-white"
                          required={registerForm.settlement_type === 'bank'}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Settlement Mode */}
                  <div className="mt-4">
                    <label className="block text-sm text-slate-300 mb-2">Settlement Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRegisterForm({...registerForm, settlement_mode: 'instant'})}
                        className={`p-3 rounded-xl border transition-all text-left ${
                          registerForm.settlement_mode === 'instant' 
                            ? 'border-emerald-500 bg-emerald-500/10' 
                            : 'border-slate-700'
                        }`}
                      >
                        <p className={`text-sm font-medium ${
                          registerForm.settlement_mode === 'instant' ? 'text-emerald-400' : 'text-slate-400'
                        }`}>Instant</p>
                        <p className="text-xs text-slate-500">Receive payment immediately</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegisterForm({...registerForm, settlement_mode: 'daily'})}
                        className={`p-3 rounded-xl border transition-all text-left ${
                          registerForm.settlement_mode === 'daily' 
                            ? 'border-blue-500 bg-blue-500/10' 
                            : 'border-slate-700'
                        }`}
                      >
                        <p className={`text-sm font-medium ${
                          registerForm.settlement_mode === 'daily' ? 'text-blue-400' : 'text-slate-400'
                        }`}>Daily</p>
                        <p className="text-xs text-slate-500">Batched once per day</p>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t('sdm_password')} *</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      placeholder={t('sdm_min_6_chars')}
                      className="bg-slate-800/50 border-slate-700 text-white pl-10 pr-12"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{t('sdm_password_for_future')}</p>
                </div>
                
                <Button
                  type="submit"
                  disabled={isLoading || !registerForm.business_name || !registerForm.phone || registerForm.password.length < 6}
                  className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : (
                    <>
                      <Send size={18} className="mr-2" />
                      {t('sdm_send_otp_code')}
                    </>
                  )}
                </Button>
                
                <button
                  type="button"
                  onClick={() => setStep('welcome')}
                  className="w-full mt-2 text-sm text-slate-400 hover:text-white"
                >
                  {t('sdm_back')}
                </button>
              </form>
            )}

            {/* Register Step 2: OTP Verification Only */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOTPAndRegister} className="space-y-4">
                <h3 className="text-lg font-semibold text-white text-center mb-4">{t('sdm_otp_verification')}</h3>
                <p className="text-slate-400 text-sm text-center mb-4">
                  {t('sdm_code_sent_to_phone')} {registerForm.phone}
                </p>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t('sdm_otp_code')} *</label>
                  <OTPInput
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    onAutoFill={handleOTPAutoFill}
                    length={4}
                    placeholder={t('sdm_enter_4_digit')}
                    disabled={isLoading}
                    testId="sdm-merchant-otp-input"
                  />
                </div>
                
                {debugOtp && (
                  <p className="text-xs text-amber-400 text-center mt-6">
                    {t('sdm_test_code')}: <strong>{debugOtp}</strong>
                  </p>
                )}
                
                {ussdCode && !debugOtp && (
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center mt-6">
                    <p className="text-xs text-slate-400 mb-1">
                      {t('sdm_didnt_receive_sms') || "Didn't receive the SMS? Dial this code:"}
                    </p>
                    <p className="text-lg font-bold text-cyan-400">
                      {ussdCode}
                    </p>
                  </div>
                )}
                
                <Button
                  type="submit"
                  disabled={isLoading || otp.length !== 4}
                  className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : t('sdm_finalize_registration')}
                </Button>
                
                <button
                  type="button"
                  onClick={() => setStep('register')}
                  className="w-full mt-2 text-sm text-slate-400 hover:text-white"
                >
                  {t('sdm_modify_info')}
                </button>
              </form>
            )}

            {/* Login */}
            {step === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <h3 className="text-lg font-semibold text-white text-center mb-4">{t('sdm_connection')}</h3>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t('sdm_phone_number')}</label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-4 bg-slate-800 rounded-lg text-slate-400">
                      +233
                    </div>
                    <Input
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder="XX XXX XXXX"
                      className="flex-1 bg-slate-800/50 border-slate-700 text-white"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t('sdm_password')}</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder={t('sdm_your_password')}
                      className="bg-slate-800/50 border-slate-700 text-white pl-10 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={isLoading || !loginPhone || !loginPassword}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : t('sdm_login')}
                </Button>
                
                <button
                  type="button"
                  onClick={() => setStep('welcome')}
                  className="w-full mt-2 text-sm text-slate-400 hover:text-white"
                >
                  {t('sdm_back')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className={`min-h-screen bg-slate-100 ${isRTL ? 'rtl' : 'ltr'}`} data-testid="sdm-merchant-dashboard">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="SDM" className="w-10 h-10 rounded-lg object-cover" />
            <div>
              <p className="font-semibold">{merchant?.business_name}</p>
              <p className="text-xs text-slate-400">{merchant?.business_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector variant="buttons" className="opacity-90" />
            <button onClick={handleLogout} className="p-2 hover:bg-slate-800 rounded-lg">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-white">
            <DollarSign size={20} className="mb-2 opacity-70" />
            <p className="text-2xl font-bold">GHS {report?.total_amount?.toFixed(0) || 0}</p>
            <p className="text-xs opacity-70">Total Sales (30d)</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-white">
            <TrendingUp size={20} className="mb-2 opacity-70" />
            <p className="text-2xl font-bold">{report?.total_transactions || 0}</p>
            <p className="text-xs opacity-70">Transactions</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-white">
            <Users size={20} className="mb-2 opacity-70" />
            <p className="text-2xl font-bold">{merchant?.cashback_rate?.toFixed(0) || 5}%</p>
            <p className="text-xs opacity-70">Cashback Rate</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex">
          {[
            { id: 'scan', icon: QrCode, label: 'Scan QR' },
            { id: 'transactions', icon: BarChart3, label: 'Transactions' },
            { id: 'staff', icon: Users, label: 'Staff' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 flex flex-col items-center gap-1 text-sm transition-colors ${
                activeTab === tab.id ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        {activeTab === 'scan' && (
          <div className="space-y-4">
            {/* My QR Code Section */}
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">My Payment QR Code</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMyQR(!showMyQR)}
                  className="text-cyan-600 border-cyan-300"
                >
                  <QrCode size={16} className="mr-2" />
                  {showMyQR ? 'Hide' : 'Show'} QR
                </Button>
              </div>
              
              {showMyQR && merchantQrData && (
                <div className="flex flex-col items-center py-4">
                  <img 
                    src={merchantQrData.qr_image} 
                    alt="Merchant QR Code" 
                    className="w-48 h-48 rounded-xl shadow-lg"
                  />
                  <p className="mt-3 text-sm text-slate-500">
                    Customers can scan this to pay you
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    {merchantQrData.qr_code}
                  </p>
                </div>
              )}
              
              {/* Cash Balance Alert */}
              {cashBalance && cashBalance.cash_debit_balance < 0 && (
                <div className="mt-4 bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center gap-3">
                    <Wallet className="text-amber-600" size={20} />
                    <div>
                      <p className="font-medium text-amber-800">Cash Debit Balance</p>
                      <p className="text-2xl font-bold text-amber-700">
                        GHS {Math.abs(cashBalance.cash_debit_balance).toFixed(2)}
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Limit: GHS {cashBalance.cash_debit_limit} | Available: GHS {cashBalance.available_limit?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Create Transaction Form */}
            <div className="bg-white rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Create Transaction</h3>
              <form onSubmit={handleCreateTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Customer QR Code</label>
                  <div className="flex gap-2">
                    <Input
                      value={scanQR}
                      onChange={(e) => setScanQR(e.target.value.toUpperCase())}
                      placeholder="Enter or scan QR code"
                      className="flex-1 h-12 text-lg font-mono uppercase"
                      required
                    />
                    <Button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="h-12 px-4 bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="open-scanner-btn"
                    >
                      <Camera size={20} className="mr-2" />
                      Scan
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amount (GHS)</label>
                  <Input
                    type="number"
                    value={scanAmount}
                    onChange={(e) => setScanAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    className="h-12 text-lg"
                    required
                  />
                </div>
                
                {/* Payment Method Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'cash', label: 'Cash', icon: Banknote, color: 'text-green-600' },
                      { id: 'momo', label: 'MoMo', icon: Smartphone, color: 'text-yellow-600' },
                      { id: 'card', label: 'Card', icon: CreditCard, color: 'text-blue-600' }
                    ].map(method => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          paymentMethod === method.id 
                            ? 'border-cyan-500 bg-cyan-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <method.icon className={`w-6 h-6 mx-auto mb-1 ${
                          paymentMethod === method.id ? 'text-cyan-600' : method.color
                        }`} />
                        <p className={`text-xs font-medium ${
                          paymentMethod === method.id ? 'text-cyan-700' : 'text-slate-600'
                        }`}>{method.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* MoMo Details */}
                {paymentMethod === 'momo' && (
                  <div className="space-y-3 bg-yellow-50 rounded-xl p-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Network</label>
                      <div className="flex gap-2">
                        {['MTN', 'Vodafone', 'AirtelTigo'].map(network => (
                          <button
                            key={network}
                            type="button"
                            onClick={() => setMomoNetwork(network)}
                            className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              momoNetwork === network 
                                ? 'border-yellow-500 bg-yellow-100 text-yellow-700' 
                                : 'border-slate-200 text-slate-600'
                            }`}
                          >
                            {network}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">MoMo Number</label>
                      <Input
                        type="tel"
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value)}
                        placeholder="0XX XXX XXXX"
                        className="h-10"
                      />
                    </div>
                  </div>
                )}
                
                {/* Cash Payment Info */}
                {paymentMethod === 'cash' && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="font-medium text-green-800 text-sm">Cash Payment</p>
                        <p className="text-xs text-green-700 mt-1">
                          Customer will receive a notification to confirm. 
                          Cashback will be debited from your cash account.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes (optional)</label>
                  <Input
                    value={scanNotes}
                    onChange={(e) => setScanNotes(e.target.value)}
                    placeholder="e.g., Table 5, Order #123"
                    className="h-10"
                  />
                </div>
                
                {/* Payment Split Preview */}
                {paymentSplit && (
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <h4 className="font-medium text-slate-700 text-sm">Payment Breakdown</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount</span>
                        <span className="font-semibold">GHS {parseFloat(scanAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>Customer Cashback</span>
                        <span className="font-semibold">+GHS {paymentSplit.client_cashback.toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-1 flex justify-between">
                        <span className="text-slate-500">You Receive</span>
                        <span className="font-bold text-slate-900">GHS {paymentSplit.merchant_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <Button
                  type="submit"
                  disabled={isLoading || !scanQR || !scanAmount || (paymentMethod === 'momo' && !momoPhone)}
                  className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : (
                    <>
                      <Check size={18} className="mr-2" />
                      Confirm {paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'momo' ? 'MoMo' : 'Card'} Payment
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}


        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {/* Filters & Search */}
            <div className="bg-white rounded-2xl p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={txnSearch}
                      onChange={(e) => setTxnSearch(e.target.value)}
                      placeholder="Search by ID or customer..."
                      className="pl-10 h-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  {['all', 'pending', 'available'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTxnFilter(filter)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        txnFilter === filter 
                          ? 'bg-cyan-500 text-slate-900' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            {report && (
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{report.total_transactions}</p>
                  <p className="text-xs text-slate-500">Total Transactions</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">GHS {report.total_amount?.toFixed(0)}</p>
                  <p className="text-xs text-slate-500">Total Sales</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">GHS {report.total_cashback?.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">Cashback Given</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">GHS {report.average_transaction?.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">Avg Transaction</p>
                </div>
              </div>
            )}

            {/* Transaction List */}
            <div className="bg-white rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">
                  Transaction History ({transactions.length})
                </h3>
                <select
                  value={txnLimit}
                  onChange={(e) => {
                    setTxnLimit(parseInt(e.target.value));
                    fetchMerchantData();
                  }}
                  className="text-sm border rounded-lg px-3 py-1"
                >
                  <option value={20}>Last 20</option>
                  <option value={50}>Last 50</option>
                  <option value={100}>Last 100</option>
                  <option value={500}>Last 500</option>
                </select>
              </div>
              
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {transactions
                    .filter(txn => {
                      // Filter by status
                      if (txnFilter !== 'all' && txn.status !== txnFilter) return false;
                      // Filter by search
                      if (txnSearch) {
                        const search = txnSearch.toLowerCase();
                        return txn.transaction_id.toLowerCase().includes(search) ||
                               (txn.notes && txn.notes.toLowerCase().includes(search));
                      }
                      return true;
                    })
                    .map((txn) => (
                      <div 
                        key={txn.id} 
                        className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setShowTxnDetails(showTxnDetails === txn.id ? null : txn.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              txn.status === 'available' ? 'bg-emerald-100' : 'bg-amber-100'
                            }`}>
                              <DollarSign size={18} className={
                                txn.status === 'available' ? 'text-emerald-600' : 'text-amber-600'
                              } />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">GHS {txn.amount.toFixed(2)}</p>
                              <p className="text-xs text-slate-500 font-mono">{txn.transaction_id}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-emerald-600">-GHS {txn.net_cashback.toFixed(2)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              txn.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 
                              txn.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {txn.status}
                            </span>
                          </div>
                        </div>
                        
                        {/* Expanded Details */}
                        {showTxnDetails === txn.id && (
                          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Date & Time</p>
                              <p className="font-medium text-slate-900">
                                {new Date(txn.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Cashback Rate</p>
                              <p className="font-medium text-slate-900">{txn.cashback_rate?.toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Gross Cashback</p>
                              <p className="font-medium text-slate-900">GHS {txn.cashback_amount.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">SDM Commission</p>
                              <p className="font-medium text-slate-900">GHS {txn.sdm_commission.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Available Date</p>
                              <p className="font-medium text-slate-900">
                                {new Date(txn.available_date).toLocaleDateString()}
                              </p>
                            </div>
                            {txn.staff_name && (
                              <div>
                                <p className="text-slate-500">Staff</p>
                                <p className="font-medium text-slate-900">{txn.staff_name}</p>
                              </div>
                            )}
                            {txn.notes && (
                              <div className="col-span-2">
                                <p className="text-slate-500">Notes</p>
                                <p className="font-medium text-slate-900">{txn.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Add Staff Member</h3>
              <form onSubmit={handleAddStaff} className="flex gap-2">
                <Input
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Name"
                  className="flex-1"
                  required
                />
                <Input
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  placeholder="Phone"
                  className="flex-1"
                  required
                />
                <Button type="submit" disabled={isLoading} className="bg-cyan-500 hover:bg-cyan-600 text-slate-900">
                  <Plus size={18} />
                </Button>
              </form>
            </div>

            <div className="bg-white rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Staff List</h3>
              {merchant?.staff?.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No staff added yet</p>
              ) : (
                <div className="space-y-2">
                  {merchant?.staff?.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.phone} • {s.role}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveStaff(s.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Cashback Settings */}
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Percent className="text-emerald-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Cashback Settings</h3>
                  <p className="text-sm text-slate-500">Configure your cashback rewards for customers</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Cashback Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-medium text-slate-900">Enable Cashback</p>
                    <p className="text-sm text-slate-500">When disabled, customers won't earn cashback at your store</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const newState = !(merchant?.cashback_enabled ?? true);
                        await axios.put(`${API_URL}/api/sdm/merchant/settings`, 
                          { cashback_enabled: newState },
                          { headers: { Authorization: `Bearer ${token}` }}
                        );
                        setMerchant({...merchant, cashback_enabled: newState});
                        toast.success(newState ? 'Cashback enabled' : 'Cashback disabled');
                      } catch (error) {
                        toast.error('Failed to update setting');
                      }
                    }}
                    className={`w-14 h-8 rounded-full transition-colors ${
                      (merchant?.cashback_enabled ?? true) ? 'bg-emerald-500' : 'bg-slate-300'
                    } relative`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${
                      (merchant?.cashback_enabled ?? true) ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                
                {/* Cashback Rate Slider */}
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-slate-900">Cashback Rate</p>
                    <span className="text-2xl font-bold text-emerald-600">{merchant?.cashback_rate || 5}%</span>
                  </div>
                  
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={merchant?.cashback_rate || 5}
                    onChange={(e) => setMerchant({...merchant, cashback_rate: parseFloat(e.target.value)})}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>1%</span>
                    <span>5%</span>
                    <span>10%</span>
                    <span>15%</span>
                    <span>20%</span>
                  </div>
                  
                  <Button
                    onClick={async () => {
                      try {
                        setIsLoading(true);
                        await axios.put(`${API_URL}/api/sdm/merchant/settings`, 
                          { cashback_rate: merchant?.cashback_rate || 5 },
                          { headers: { Authorization: `Bearer ${token}` }}
                        );
                        toast.success(`Cashback rate updated to ${merchant?.cashback_rate || 5}%`);
                      } catch (error) {
                        toast.error('Failed to update cashback rate');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} className="mr-2" />}
                    Save Cashback Rate
                  </Button>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    <strong>Tip:</strong> Higher cashback rates attract more customers. The average rate is 5%. 
                    You can adjust this anytime based on your marketing strategy.
                  </p>
                </div>
              </div>
            </div>

            {/* API Credentials */}
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Key className="text-blue-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">API Credentials</h3>
                  <p className="text-sm text-slate-500">Use these to integrate SDM with your systems</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Merchant ID</label>
                  <div className="flex gap-2">
                    <code className="flex-1 p-3 bg-slate-100 rounded-lg text-sm font-mono break-all">
                      {merchant?.id}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {navigator.clipboard.writeText(merchant?.id); toast.success('Copied!')}}
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                  <div className="flex gap-2">
                    <code className="flex-1 p-3 bg-slate-100 rounded-lg text-sm font-mono break-all">
                      {merchant?.api_key}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {navigator.clipboard.writeText(merchant?.api_key); toast.success('Copied!')}}
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">API Secret</label>
                  <div className="flex gap-2">
                    <code className="flex-1 p-3 bg-slate-100 rounded-lg text-sm font-mono break-all">
                      {merchant?.api_secret || 'Not generated'}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {navigator.clipboard.writeText(merchant?.api_secret || ''); toast.success('Copied!')}}
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* API Documentation */}
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Book className="text-purple-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">API Documentation</h3>
                  <p className="text-sm text-slate-500">Integrate SDM with your website or POS system</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Quick Start */}
                <div className="border border-slate-200 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Code size={18} className="text-purple-600" />
                    Quick Start
                  </h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Use the following endpoints to process cashback transactions:
                  </p>
                  <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono text-green-400 overflow-x-auto">
                    <p className="text-slate-400"># Base URL</p>
                    <p className="mb-3">https://sdmrewards.com/api</p>
                    <p className="text-slate-400"># Process a transaction</p>
                    <p>POST /sdm/merchant/transaction</p>
                  </div>
                </div>

                {/* Endpoint: Process Transaction */}
                <div className="border border-slate-200 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">
                    POST /sdm/merchant/transaction
                  </h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Process a cashback transaction when a customer makes a purchase.
                  </p>
                  
                  <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono overflow-x-auto mb-4">
                    <p className="text-slate-400 mb-2">// Request Headers</p>
                    <p className="text-yellow-400">Authorization: Bearer YOUR_API_KEY</p>
                    <p className="text-yellow-400 mb-3">Content-Type: application/json</p>
                    
                    <p className="text-slate-400 mb-2">// Request Body</p>
                    <pre className="text-green-400">{`{
  "customer_phone": "+233XXXXXXXXX",
  "amount": 100.00,
  "reference": "ORDER-12345"
}`}</pre>
                  </div>
                  
                  <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                    <p className="text-slate-400 mb-2">// Success Response (200)</p>
                    <pre className="text-green-400">{`{
  "success": true,
  "transaction_id": "txn_xxxxx",
  "cashback_amount": 5.00,
  "customer_new_balance": 25.00
}`}</pre>
                  </div>
                </div>

                {/* Endpoint: Scan QR Code */}
                <div className="border border-slate-200 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">
                    POST /sdm/merchant/scan-qr
                  </h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Process transaction by scanning customer's QR code.
                  </p>
                  
                  <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                    <pre className="text-green-400">{`{
  "qr_code": "SDM_USER_xxxxx",
  "amount": 50.00
}`}</pre>
                  </div>
                </div>

                {/* Error Codes */}
                <div className="border border-slate-200 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Shield size={18} className="text-red-500" />
                    Error Codes
                  </h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-slate-600">Code</th>
                        <th className="text-left py-2 text-slate-600">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      <tr className="border-b">
                        <td className="py-2 font-mono text-red-600">401</td>
                        <td className="py-2">Invalid or missing API key</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-mono text-red-600">400</td>
                        <td className="py-2">Invalid request (check amount, phone format)</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-mono text-red-600">404</td>
                        <td className="py-2">Customer not found</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-red-600">500</td>
                        <td className="py-2">Server error - contact support</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Support */}
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white">
                  <h4 className="font-semibold mb-2">Need Help?</h4>
                  <p className="text-sm opacity-90 mb-3">
                    Our technical team is available to help you integrate SDM into your systems.
                  </p>
                  <a 
                    href="mailto:support@sdmrewards.com"
                    className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Send size={16} />
                    Contact Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={handleQRScanned}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Store, ArrowLeft, Loader2, QrCode, Users, BarChart3,
  Settings, LogOut, DollarSign, TrendingUp, Plus, Trash2,
  Check, X, CreditCard, Edit2, Camera, Calendar, Filter,
  ChevronDown, ChevronUp, Clock, User, Search
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import QRScanner from '../components/QRScanner';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "/sdm-logo.png";

export default function SDMMerchantPage() {
  const { t, isRTL } = useLanguage();
  const [step, setStep] = useState('register'); // register, login, dashboard
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
    city: 'Accra',
    cashback_rate: 0.05
  });

  // Login form
  const [loginPhone, setLoginPhone] = useState('');
  const [loginApiKey, setLoginApiKey] = useState('');

  // Scan form
  const [scanQR, setScanQR] = useState('');
  const [scanAmount, setScanAmount] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanNotes, setScanNotes] = useState('');

  // Staff form
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');

  // Transaction history filters
  const [txnFilter, setTxnFilter] = useState('all'); // all, pending, available
  const [txnSearch, setTxnSearch] = useState('');
  const [txnLimit, setTxnLimit] = useState(50);
  const [showTxnDetails, setShowTxnDetails] = useState(null);

  // Card types
  const [cardTypes, setCardTypes] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardForm, setCardForm] = useState({
    name: '',
    description: '',
    price: 50,
    validity_days: 365,
    cashback_bonus: 0,
    referral_bonus: 5,
    welcome_bonus: 2
  });

  useEffect(() => {
    if (token) {
      setStep('dashboard');
      fetchMerchantData();
    }
  }, [token]);

  const fetchMerchantData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [profileRes, txnRes, reportRes, cardTypesRes, membershipsRes] = await Promise.all([
        axios.get(`${API_URL}/api/sdm/merchant/profile`, { headers }),
        axios.get(`${API_URL}/api/sdm/merchant/transactions?limit=${txnLimit}`, { headers }),
        axios.get(`${API_URL}/api/sdm/merchant/report?days=30`, { headers }),
        axios.get(`${API_URL}/api/sdm/merchant/card-types`, { headers }),
        axios.get(`${API_URL}/api/sdm/merchant/memberships`, { headers })
      ]);
      setMerchant(profileRes.data);
      setTransactions(txnRes.data);
      setReport(reportRes.data);
      setCardTypes(cardTypesRes.data);
      setMemberships(membershipsRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleQRScanned = (qrCode) => {
    setScanQR(qrCode);
    setShowScanner(false);
    toast.success(`QR Code scanned: ${qrCode}`);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/sdm/merchant/register`, registerForm);
      localStorage.setItem('sdm_merchant_token', response.data.access_token);
      setToken(response.data.access_token);
      toast.success('Registration successful!');
      toast.info(`Your API Key: ${response.data.api_key}`, { duration: 10000 });
      setStep('dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
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
        { phone: loginPhone, api_key: loginApiKey }
      );
      localStorage.setItem('sdm_merchant_token', response.data.access_token);
      setToken(response.data.access_token);
      setMerchant(response.data.merchant);
      toast.success('Login successful!');
      setStep('dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/sdm/merchant/transaction`,
        {
          user_qr_code: scanQR,
          amount: parseFloat(scanAmount)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Cashback GHS ${response.data.cashback_amount} credited to ${response.data.user_name}!`);
      setScanQR('');
      setScanAmount('');
      fetchMerchantData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

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
    setStep('register');
  };

  const handleCreateCardType = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/sdm/merchant/card-types`,
        cardForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Card type created!');
      setShowCardForm(false);
      setCardForm({
        name: '',
        description: '',
        price: 50,
        validity_days: 365,
        cashback_bonus: 0,
        referral_bonus: 5,
        welcome_bonus: 2
      });
      fetchMerchantData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create card type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCardType = async (cardTypeId) => {
    if (!window.confirm('Deactivate this card type?')) return;
    try {
      await axios.delete(`${API_URL}/api/sdm/merchant/card-types/${cardTypeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Card type deactivated');
      fetchMerchantData();
    } catch (error) {
      toast.error('Failed to deactivate card type');
    }
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
            <p className="text-slate-400">Partner Dashboard</p>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 bg-slate-800 rounded-xl p-1">
            <button
              onClick={() => setStep('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                step === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              Register
            </button>
            <button
              onClick={() => setStep('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                step === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              Login
            </button>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-800">
            {step === 'register' ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Business Name *</label>
                  <Input
                    value={registerForm.business_name}
                    onChange={(e) => setRegisterForm({...registerForm, business_name: e.target.value})}
                    placeholder="My Restaurant"
                    className="bg-slate-800/50 border-slate-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Business Type *</label>
                  <select
                    value={registerForm.business_type}
                    onChange={(e) => setRegisterForm({...registerForm, business_type: e.target.value})}
                    className="w-full h-10 rounded-lg bg-slate-800/50 border border-slate-700 text-white px-3"
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="salon">Salon / Barbershop</option>
                    <option value="spa">Spa / Massage</option>
                    <option value="hotel">Hotel</option>
                    <option value="retail">Retail Store</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Phone *</label>
                  <Input
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                    placeholder="024 XXX XXXX"
                    className="bg-slate-800/50 border-slate-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Email</label>
                  <Input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                    placeholder="email@example.com"
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">City</label>
                  <Input
                    value={registerForm.city}
                    onChange={(e) => setRegisterForm({...registerForm, city: e.target.value})}
                    placeholder="Accra"
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Cashback Rate (%)</label>
                  <Input
                    type="number"
                    value={registerForm.cashback_rate * 100}
                    onChange={(e) => setRegisterForm({...registerForm, cashback_rate: parseFloat(e.target.value) / 100})}
                    min="1"
                    max="20"
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Between 1% and 20%</p>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Register Business'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Phone Number</label>
                  <Input
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="024 XXX XXXX"
                    className="bg-slate-800/50 border-slate-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">API Key</label>
                  <Input
                    value={loginApiKey}
                    onChange={(e) => setLoginApiKey(e.target.value)}
                    placeholder="sdk_xxxxxxxx"
                    className="bg-slate-800/50 border-slate-700 text-white"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Login'}
                </Button>
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
            <p className="text-2xl font-bold">{(merchant?.cashback_rate * 100)?.toFixed(0)}%</p>
            <p className="text-xs opacity-70">Cashback Rate</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex">
          {[
            { id: 'scan', icon: QrCode, label: 'Scan QR' },
            { id: 'cards', icon: CreditCard, label: 'Cards' },
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Transaction Amount (GHS)</label>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes (optional)</label>
                <Input
                  value={scanNotes}
                  onChange={(e) => setScanNotes(e.target.value)}
                  placeholder="e.g., Table 5, Order #123"
                  className="h-10"
                />
              </div>
              {scanAmount && (
                <div className="bg-emerald-50 rounded-lg p-4">
                  <p className="text-sm text-emerald-700">
                    Customer will receive: <strong>GHS {(parseFloat(scanAmount) * merchant?.cashback_rate * 0.98).toFixed(2)}</strong> cashback
                  </p>
                </div>
              )}
              <Button
                type="submit"
                disabled={isLoading || !scanQR || !scanAmount}
                className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : (
                  <>
                    <Check size={18} className="mr-2" />
                    Confirm Transaction
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="space-y-4">
            {/* Create Card Type */}
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Membership Card Types</h3>
                <Button
                  onClick={() => setShowCardForm(!showCardForm)}
                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 gap-2"
                  size="sm"
                >
                  <Plus size={16} />
                  New Card Type
                </Button>
              </div>

              {showCardForm && (
                <form onSubmit={handleCreateCardType} className="border-t pt-4 mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Card Name *</label>
                      <Input
                        value={cardForm.name}
                        onChange={(e) => setCardForm({...cardForm, name: e.target.value})}
                        placeholder="VIP Card, Gold Member, etc."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Price (GHS) *</label>
                      <Input
                        type="number"
                        value={cardForm.price}
                        onChange={(e) => setCardForm({...cardForm, price: parseFloat(e.target.value)})}
                        min="1"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Description</label>
                    <Input
                      value={cardForm.description}
                      onChange={(e) => setCardForm({...cardForm, description: e.target.value})}
                      placeholder="Benefits of this card..."
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Validity (days)</label>
                      <Input
                        type="number"
                        value={cardForm.validity_days}
                        onChange={(e) => setCardForm({...cardForm, validity_days: parseInt(e.target.value)})}
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Extra Cashback %</label>
                      <Input
                        type="number"
                        value={cardForm.cashback_bonus * 100}
                        onChange={(e) => setCardForm({...cardForm, cashback_bonus: parseFloat(e.target.value) / 100})}
                        min="0"
                        max="20"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Referral Bonus</label>
                      <Input
                        type="number"
                        value={cardForm.referral_bonus}
                        onChange={(e) => setCardForm({...cardForm, referral_bonus: parseFloat(e.target.value)})}
                        min="0"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Welcome Bonus</label>
                      <Input
                        type="number"
                        value={cardForm.welcome_bonus}
                        onChange={(e) => setCardForm({...cardForm, welcome_bonus: parseFloat(e.target.value)})}
                        min="0"
                        step="0.5"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-cyan-500 hover:bg-cyan-600 text-slate-900"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Create Card Type'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCardForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* Card Types List */}
              {cardTypes.length === 0 && !showCardForm ? (
                <div className="text-center py-8 text-slate-500">
                  <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No card types yet</p>
                  <p className="text-xs mt-1">Create your first membership card type!</p>
                </div>
              ) : (
                <div className="space-y-3 mt-4">
                  {cardTypes.map((ct) => (
                    <div key={ct.id} className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{ct.name}</p>
                        <p className="text-sm text-slate-500">{ct.description || 'No description'}</p>
                        <div className="flex gap-4 mt-2 text-xs text-slate-600">
                          <span>Price: GHS {ct.price}</span>
                          <span>Valid: {ct.validity_days} days</span>
                          <span>Welcome: GHS {ct.welcome_bonus}</span>
                          <span>Referral: GHS {ct.referral_bonus}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteCardType(ct.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Memberships */}
            <div className="bg-white rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Active Members ({memberships.length})</h3>
              {memberships.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No members yet</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {memberships.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{m.user_phone}</p>
                        <p className="text-xs text-slate-500">{m.card_type_name} - {m.card_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600">GHS {m.price_paid}</p>
                        <p className="text-xs text-slate-400">Exp: {new Date(m.expires_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                              <p className="font-medium text-slate-900">{(txn.cashback_rate * 100).toFixed(1)}%</p>
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
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">API Credentials</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1">API Key</label>
                <code className="block p-3 bg-slate-100 rounded-lg text-sm font-mono break-all">
                  {merchant?.api_key}
                </code>
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">API Secret</label>
                <code className="block p-3 bg-slate-100 rounded-lg text-sm font-mono break-all">
                  {merchant?.api_secret}
                </code>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  Use these credentials to integrate SDM with your website or POS system.
                </p>
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

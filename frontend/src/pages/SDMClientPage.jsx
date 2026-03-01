import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Wallet, QrCode, ArrowLeft, Phone, Loader2, 
  Send, History, DollarSign, ArrowDownToLine, CheckCircle2,
  Copy, RefreshCw, Gift, Users, Share2, CreditCard, Award, Store,
  Smartphone, Wifi, Zap, Banknote, ChevronRight, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/ke4bukaf_WhatsApp%20Image%202026-02-28%20at%2014.47.22.jpeg";

export default function SDMClientPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('phone'); // phone, otp, dashboard
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('sdm_user_token'));
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [referralData, setReferralData] = useState(null);
  const [activeTab, setActiveTab] = useState('wallet');
  const [availableCards, setAvailableCards] = useState([]);
  const [userMemberships, setUserMemberships] = useState([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawProvider, setWithdrawProvider] = useState('MTN');

  // Super App Services state
  const [activeService, setActiveService] = useState(null); // null, 'airtime', 'data', 'bill', 'momo'
  const [serviceBalance, setServiceBalance] = useState(null);
  const [dataBundles, setDataBundles] = useState([]);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [isServiceLoading, setIsServiceLoading] = useState(false);
  
  // Service form states
  const [airtimeForm, setAirtimeForm] = useState({ phone: '', amount: '', network: '' });
  const [dataForm, setDataForm] = useState({ phone: '', bundleId: '' });
  const [billForm, setBillForm] = useState({ provider: 'ECG', accountNumber: '', amount: '' });
  const [momoForm, setMomoForm] = useState({ phone: '', amount: '', network: '' });

  useEffect(() => {
    if (token) {
      setStep('dashboard');
      fetchUserData();
    }
  }, [token]);

  const fetchUserData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [profileRes, walletRes, txnRes, referralRes, cardsRes, membershipsRes] = await Promise.all([
        axios.get(`${API_URL}/api/sdm/user/profile`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/wallet`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/transactions`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/referral`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/available-cards`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/memberships`, { headers })
      ]);
      setUser(profileRes.data);
      setWallet(walletRes.data);
      setTransactions(txnRes.data);
      setReferralData(referralRes.data);
      setAvailableCards(cardsRes.data);
      setUserMemberships(membershipsRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = { phone };
      if (referralCode) {
        payload.referral_code = referralCode;
      }
      const response = await axios.post(`${API_URL}/api/sdm/auth/send-otp`, payload);
      setOtpId(response.data.otp_id);
      if (response.data.debug_otp) {
        setDebugOtp(response.data.debug_otp);
      }
      if (response.data.referral_valid === false) {
        toast.warning('Referral code not found, continuing without it');
      }
      toast.success('OTP sent to your phone');
      setStep('otp');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/sdm/auth/verify-otp`, { 
        phone, 
        otp_code: otp 
      });
      localStorage.setItem('sdm_user_token', response.data.access_token);
      setToken(response.data.access_token);
      setUser(response.data.user);
      
      if (response.data.is_new_user && response.data.welcome_bonus > 0) {
        toast.success(`Welcome! You received GHS ${response.data.welcome_bonus} bonus!`, { duration: 5000 });
      } else {
        toast.success('Login successful!');
      }
      setStep('dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/sdm/user/withdraw`,
        {
          amount: parseFloat(withdrawAmount),
          mobile_money_number: withdrawPhone,
          mobile_money_provider: withdrawProvider
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Withdrawal request submitted! Net amount: GHS ${response.data.net_amount}`);
      setWithdrawAmount('');
      setWithdrawPhone('');
      fetchUserData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sdm_user_token');
    setToken(null);
    setUser(null);
    setStep('phone');
  };

  const copyQRCode = () => {
    if (user?.qr_code) {
      navigator.clipboard.writeText(user.qr_code);
      toast.success('QR Code copied!');
    }
  };

  const copyReferralLink = () => {
    if (referralData?.referral_code) {
      const link = `${window.location.origin}/sdm/client?ref=${referralData.referral_code}`;
      navigator.clipboard.writeText(link);
      toast.success('Referral link copied!');
    }
  };

  const shareReferral = () => {
    if (referralData?.referral_code && navigator.share) {
      navigator.share({
        title: 'Join SDM',
        text: `Join SDM and get GHS ${referralData.welcome_bonus_amount} welcome bonus! Use my code: ${referralData.referral_code}`,
        url: `${window.location.origin}/sdm/client?ref=${referralData.referral_code}`
      });
    } else {
      copyReferralLink();
    }
  };

  const handlePurchaseMembership = async (cardTypeId) => {
    setIsPurchasing(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/sdm/user/purchase-membership`,
        { card_type_id: cardTypeId, payment_method: 'wallet' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Membership purchased! Welcome bonus: GHS ${response.data.welcome_bonus}`);
      fetchUserData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  const getReferralLevelColor = (level) => {
    switch (level) {
      case 'gold': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'silver': return 'bg-slate-200 text-slate-700 border-slate-300';
      default: return 'bg-orange-100 text-orange-700 border-orange-300';
    }
  };

  // Login/OTP Screen
  if (step !== 'dashboard') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4" data-testid="sdm-client-login">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]" />
        </div>

        <div className="relative w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft size={18} />
            Back to website
          </Link>

          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <Wallet size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">SDM Wallet</h1>
            <p className="text-slate-400">Smart Development Membership</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-800">
            {step === 'phone' ? (
              <form onSubmit={handleSendOTP}>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number
                </label>
                <div className="flex gap-2 mb-4">
                  <div className="flex items-center px-4 bg-slate-800 rounded-xl text-slate-400">
                    +233
                  </div>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="XX XXX XXXX"
                    className="flex-1 h-12 bg-slate-800/50 border-slate-700 text-white rounded-xl"
                    required
                    data-testid="sdm-phone-input"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Referral Code <span className="text-slate-500">(optional)</span>
                  </label>
                  <Input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="e.g., SDM1A2B3C"
                    className="h-12 bg-slate-800/50 border-slate-700 text-white rounded-xl uppercase"
                    data-testid="sdm-referral-input"
                  />
                  {referralCode && (
                    <p className="text-xs text-emerald-400 mt-1">
                      Get GHS 2 welcome bonus!
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !phone}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  data-testid="sdm-send-otp-btn"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : (
                    <>
                      <Send size={18} className="mr-2" />
                      Send OTP
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP}>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Enter OTP Code
                </label>
                <Input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="h-12 bg-slate-800/50 border-slate-700 text-white rounded-xl text-center text-2xl tracking-widest mb-4"
                  required
                  data-testid="sdm-otp-input"
                />
                {debugOtp && (
                  <p className="text-xs text-amber-400 mb-4 text-center">
                    Debug OTP (SMS not configured): <strong>{debugOtp}</strong>
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  data-testid="sdm-verify-otp-btn"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Verify & Login'}
                </Button>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="w-full mt-4 text-sm text-slate-400 hover:text-white"
                >
                  Change phone number
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
    <div className="min-h-screen bg-slate-100" data-testid="sdm-client-dashboard">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-sm opacity-80">SDM Wallet</p>
                <p className="font-semibold">{user?.first_name || 'Member'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-sm opacity-80 hover:opacity-100">
              Logout
            </button>
          </div>

          {/* Balance Card */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm opacity-80">Available Balance</p>
              {user?.referral_level && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full border capitalize ${getReferralLevelColor(user.referral_level)}`}>
                  <Award size={12} className="inline mr-1" />
                  {user.referral_level}
                </span>
              )}
            </div>
            <p className="text-4xl font-bold mb-4">
              GHS {wallet?.wallet_available?.toFixed(2) || '0.00'}
            </p>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="opacity-60">Pending</p>
                <p className="font-semibold">GHS {wallet?.wallet_pending?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="opacity-60">Total Earned</p>
                <p className="font-semibold">GHS {wallet?.total_earned?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex">
          {[
            { id: 'wallet', icon: QrCode, label: 'My QR' },
            { id: 'membership', icon: CreditCard, label: 'Cards' },
            { id: 'referral', icon: Gift, label: 'Invite' },
            { id: 'withdraw', icon: ArrowDownToLine, label: 'Withdraw' },
            { id: 'history', icon: History, label: 'History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 flex flex-col items-center gap-1 text-sm transition-colors ${
                activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4">
        {activeTab === 'wallet' && user && (
          <div className="bg-white rounded-2xl p-6 text-center">
            <h3 className="font-semibold text-slate-900 mb-4">Your QR Code</h3>
            {user.qr_code_image && (
              <img 
                src={user.qr_code_image} 
                alt="QR Code" 
                className="w-48 h-48 mx-auto mb-4"
              />
            )}
            <p className="text-2xl font-mono font-bold text-blue-600 mb-2">{user.qr_code}</p>
            <p className="text-sm text-slate-500 mb-4">Show this to the merchant to earn cashback</p>
            <Button
              onClick={copyQRCode}
              variant="outline"
              className="gap-2"
            >
              <Copy size={16} />
              Copy Code
            </Button>
          </div>
        )}

        {activeTab === 'membership' && (
          <div className="space-y-4">
            {/* My Memberships */}
            {userMemberships.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">My Membership Cards</h3>
                {userMemberships.map((card) => (
                  <div 
                    key={card.id} 
                    className={`bg-gradient-to-br ${
                      card.status === 'active' 
                        ? 'from-blue-600 to-cyan-500' 
                        : 'from-slate-400 to-slate-500'
                    } rounded-2xl p-5 text-white`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Store size={18} />
                        <span className="font-semibold">{card.merchant_name}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        card.status === 'active' ? 'bg-white/20' : 'bg-red-500/50'
                      }`}>
                        {card.status}
                      </span>
                    </div>
                    <p className="text-lg font-bold mb-1">{card.card_type_name}</p>
                    <p className="text-xs opacity-70 font-mono mb-3">{card.card_number}</p>
                    <div className="flex justify-between text-xs opacity-80">
                      <span>Purchased: {new Date(card.purchased_at).toLocaleDateString()}</span>
                      <span>Expires: {new Date(card.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Available Cards */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">
                {userMemberships.length > 0 ? 'More Cards Available' : 'Available Membership Cards'}
              </h3>
              
              {availableCards.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-500">
                  <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No membership cards available yet</p>
                  <p className="text-xs mt-2">Merchants will create cards soon!</p>
                </div>
              ) : (
                availableCards
                  .filter(card => !userMemberships.some(m => m.merchant_id === card.merchant_id && m.status === 'active'))
                  .map((card) => (
                    <div key={card.id} className="bg-white rounded-2xl p-5 border border-slate-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Store size={16} className="text-slate-400" />
                            <span className="text-sm text-slate-600">{card.merchant_name}</span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-lg">{card.name}</h4>
                          {card.description && (
                            <p className="text-sm text-slate-500 mt-1">{card.description}</p>
                          )}
                        </div>
                        <span className="text-2xl font-bold text-blue-600">GHS {card.price}</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-slate-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-slate-500">Validity</p>
                          <p className="font-semibold text-slate-900">{card.validity_days}d</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-emerald-600">Welcome</p>
                          <p className="font-semibold text-emerald-700">+GHS {card.welcome_bonus}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-blue-600">Referral</p>
                          <p className="font-semibold text-blue-700">+GHS {card.referral_bonus}</p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handlePurchaseMembership(card.id)}
                        disabled={isPurchasing || wallet?.wallet_available < card.price}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isPurchasing ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : wallet?.wallet_available < card.price ? (
                          'Insufficient Balance'
                        ) : (
                          <>
                            <CreditCard size={16} className="mr-2" />
                            Purchase Card
                          </>
                        )}
                      </Button>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'referral' && referralData && (
          <div className="space-y-4">
            {/* Referral Card */}
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Gift size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Invite Friends</h3>
                  <p className="text-sm opacity-80">Earn GHS {referralData.bonus_per_referral} per friend</p>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-xl p-4 mb-4">
                <p className="text-xs opacity-70 mb-1">Your Referral Code</p>
                <p className="text-2xl font-mono font-bold">{referralData.referral_code}</p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={copyReferralLink}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white"
                >
                  <Copy size={16} className="mr-2" />
                  Copy Link
                </Button>
                <Button
                  onClick={shareReferral}
                  className="flex-1 bg-white text-blue-600 hover:bg-white/90"
                >
                  <Share2 size={16} className="mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 text-center">
                <Users size={24} className="mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold text-slate-900">{referralData.total_referrals}</p>
                <p className="text-xs text-slate-500">Friends Invited</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center">
                <DollarSign size={24} className="mx-auto mb-2 text-emerald-600" />
                <p className="text-2xl font-bold text-slate-900">GHS {referralData.total_bonus_earned?.toFixed(2)}</p>
                <p className="text-xs text-slate-500">Bonus Earned</p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-white rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">How it works</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</div>
                  <p className="text-sm text-slate-600">Share your referral code with friends</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</div>
                  <p className="text-sm text-slate-600">They sign up using your code</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">3</div>
                  <p className="text-sm text-slate-600">You get GHS {referralData.bonus_per_referral}, they get GHS {referralData.welcome_bonus_amount}!</p>
                </div>
              </div>
            </div>

            {/* Referral History */}
            {referralData.referrals?.length > 0 && (
              <div className="bg-white rounded-2xl p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Your Referrals</h3>
                <div className="space-y-2">
                  {referralData.referrals.map((ref, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users size={14} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {ref.first_name || ref.last_name ? `${ref.first_name || ''} ${ref.last_name || ''}`.trim() : 'SDM User'}
                          </p>
                          <p className="text-xs text-slate-500">{new Date(ref.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">+GHS {referralData.bonus_per_referral}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'withdraw' && (
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Withdraw to Mobile Money</h3>
            <form onSubmit={handleWithdraw}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Amount (GHS)</label>
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  max={wallet?.wallet_available || 0}
                  className="h-12"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Available: GHS {wallet?.wallet_available?.toFixed(2)}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Money Number</label>
                <Input
                  type="tel"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  placeholder="024 XXX XXXX"
                  className="h-12"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Provider</label>
                <select
                  value={withdrawProvider}
                  onChange={(e) => setWithdrawProvider(e.target.value)}
                  className="w-full h-12 rounded-lg border border-slate-200 px-4"
                >
                  <option value="MTN">MTN Mobile Money</option>
                  <option value="Vodafone">Vodafone Cash</option>
                  <option value="AirtelTigo">AirtelTigo Money</option>
                </select>
              </div>

              <p className="text-xs text-slate-500 mb-4">
                Fee: GHS 1.00 | You'll receive: GHS {Math.max(0, (parseFloat(withdrawAmount) || 0) - 1).toFixed(2)}
              </p>

              <Button
                type="submit"
                disabled={isLoading || !withdrawAmount || !withdrawPhone}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Request Withdrawal'}
              </Button>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Transaction History</h3>
              <button onClick={fetchUserData} className="text-blue-600">
                <RefreshCw size={18} />
              </button>
            </div>
            {transactions.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-500">
                <History size={40} className="mx-auto mb-3 opacity-30" />
                <p>No transactions yet</p>
              </div>
            ) : (
              transactions.map((txn) => (
                <div key={txn.id} className="bg-white rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-900">{txn.merchant_name}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      txn.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                      txn.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {txn.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Spent: GHS {txn.amount.toFixed(2)}</span>
                    <span className="font-semibold text-emerald-600">+GHS {txn.net_cashback.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(txn.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

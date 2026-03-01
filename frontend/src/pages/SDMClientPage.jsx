import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wallet, QrCode, ArrowLeft, Phone, Loader2, 
  Send, History, DollarSign, ArrowDownToLine, CheckCircle2,
  Copy, RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/ke4bukaf_WhatsApp%20Image%202026-02-28%20at%2014.47.22.jpeg";

export default function SDMClientPage() {
  const [step, setStep] = useState('phone'); // phone, otp, dashboard
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('sdm_user_token'));
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('wallet');
  
  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawProvider, setWithdrawProvider] = useState('MTN');

  useEffect(() => {
    if (token) {
      setStep('dashboard');
      fetchUserData();
    }
  }, [token]);

  const fetchUserData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [profileRes, walletRes, txnRes] = await Promise.all([
        axios.get(`${API_URL}/api/sdm/user/profile`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/wallet`, { headers }),
        axios.get(`${API_URL}/api/sdm/user/transactions`, { headers })
      ]);
      setUser(profileRes.data);
      setWallet(walletRes.data);
      setTransactions(txnRes.data);
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
      const response = await axios.post(`${API_URL}/api/sdm/auth/send-otp`, { phone });
      setOtpId(response.data.otp_id);
      if (response.data.debug_otp) {
        setDebugOtp(response.data.debug_otp);
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
      toast.success('Login successful!');
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
                <div className="flex gap-2 mb-6">
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
            <p className="text-sm opacity-80 mb-1">Available Balance</p>
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

import React, { useState, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';

// Merchant Components
import PinModal from '../components/merchant/PinModal';
import ForgotPinModal from '../components/merchant/ForgotPinModal';
import CashierManager from '../components/merchant/CashierManager';
import BusinessInfoEditor from '../components/merchant/BusinessInfoEditor';
import PinSettings from '../components/merchant/PinSettings';
import AdvancedDashboard from '../components/merchant/AdvancedDashboard';

const API_URL = process.env.REACT_APP_BACKEND_URL;
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
    bank_account: ''
  });

  // Settings sub-tabs
  const [settingsTab, setSettingsTab] = useState('cashback');
  
  // PIN Protection states
  const [pinStatus, setPinStatus] = useState({ pin_enabled: false, has_pin: false });
  const [showPinModal, setShowPinModal] = useState(false);
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const token = localStorage.getItem('sdm_merchant_token');

  useEffect(() => {
    if (!token) {
      navigate('/merchant');
      return;
    }
    fetchDashboardData();
    fetchPinStatus();
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
          bank_account: dashRes.data.merchant.bank_account || ''
        });
      }
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
        bank_account: settings.bank_account
      }, { headers });
      
      toast.success('Payment info updated!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update');
    } finally {
      setIsSaving(false);
    }
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
          <div className="space-y-6">
            {/* Payment QR */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <CreditCard size={18} /> Payment QR Code
              </h3>
              <div className="text-center">
                <div className="bg-white rounded-xl p-4 inline-block mb-4">
                  <QrCode size={160} className="text-slate-900" />
                </div>
                <p className="text-slate-400 text-sm mb-2">
                  Customers scan this to pay you
                </p>
                <div className="flex items-center gap-2 justify-center">
                  <code className="text-amber-400 bg-slate-900 px-3 py-1 rounded text-sm">
                    {merchant?.payment_qr_code}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyQRCode(merchant?.payment_qr_code)}
                    className="text-slate-400"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Recruitment QR */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Users size={18} /> Recruitment QR Code
              </h3>
              <div className="text-center">
                <div className="bg-white rounded-xl p-4 inline-block mb-4">
                  <QrCode size={160} className="text-slate-900" />
                </div>
                <p className="text-slate-400 text-sm mb-2">
                  New customers scan this to register via your referral
                </p>
                <div className="flex items-center gap-2 justify-center">
                  <code className="text-emerald-400 bg-slate-900 px-3 py-1 rounded text-sm">
                    {merchant?.recruitment_qr_code}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyQRCode(merchant?.recruitment_qr_code)}
                    className="text-slate-400"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
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
                      {txn.payment_method && (
                        <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                          {txn.payment_method}
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
                { id: 'payment', label: 'Paiement', icon: Wallet },
                { id: 'cashiers', label: 'Caissiers', icon: UserCog },
                { id: 'business', label: 'Commerce', icon: Building },
                { id: 'security', label: 'Sécurité', icon: Shield }
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

            {/* Payment Settings */}
            {settingsTab === 'payment' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Wallet size={18} /> Informations de Paiement
                </h3>
                
                {/* MoMo */}
                <div className="space-y-4 mb-6">
                  <h4 className="text-slate-300 text-sm font-medium">Mobile Money</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400 text-xs">MoMo Number (for receiving payments)</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <Input
                          type="tel"
                          placeholder="0XX XXX XXXX"
                          value={settings.momo_number}
                          onChange={(e) => setSettings({...settings, momo_number: e.target.value})}
                          className="pl-10 bg-slate-900 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Network</Label>
                      <select
                        value={settings.momo_network}
                        onChange={(e) => setSettings({...settings, momo_network: e.target.value})}
                        className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                      >
                        <option value="">Select Network</option>
                        <option value="MTN">MTN MoMo</option>
                        <option value="TELECEL">Telecel (ex-Vodafone)</option>
                        <option value="AIRTELTIGO">AirtelTigo (AT)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bank */}
                <div className="space-y-4">
                  <h4 className="text-slate-300 text-sm font-medium">Bank Account</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400 text-xs">Bank Name</Label>
                      <Input
                        type="text"
                        placeholder="E.g. GCB Bank"
                        value={settings.bank_name}
                        onChange={(e) => setSettings({...settings, bank_name: e.target.value})}
                        className="mt-1 bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Account Number</Label>
                      <Input
                        type="text"
                        placeholder="Account number"
                        value={settings.bank_account}
                        onChange={(e) => setSettings({...settings, bank_account: e.target.value})}
                        className="mt-1 bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSavePaymentInfo}
                  disabled={isSaving}
                  className="mt-6 w-full bg-emerald-500 hover:bg-emerald-600"
                >
                  {isSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                  Sauvegarder
                </Button>
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
    </div>
  );
}

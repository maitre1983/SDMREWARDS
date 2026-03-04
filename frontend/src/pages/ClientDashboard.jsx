import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import QRScanner from '../components/QRScanner';
import { QRCodeSVG } from 'qrcode.react';
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
  MapPin
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  
  // Data states
  const [client, setClient] = useState(null);
  const [card, setCard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [referrals, setReferrals] = useState(null);
  const [availableCards, setAvailableCards] = useState([]);
  
  // Card Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [paymentPhone, setPaymentPhone] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const pollingRef = useRef(null);
  
  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false);
  
  // Merchant Payment modal state
  const [showMerchantPayModal, setShowMerchantPayModal] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [merchantPayAmount, setMerchantPayAmount] = useState('');
  const [merchantPayStatus, setMerchantPayStatus] = useState(null);
  const [merchantPaymentId, setMerchantPaymentId] = useState(null);

  const token = localStorage.getItem('sdm_client_token');

  useEffect(() => {
    if (!token) {
      navigate('/client');
      return;
    }
    fetchDashboardData();
    
    // Check if navigated from Partners page with merchant to pay
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
      
      // Fetch available cards
      const cardsRes = await axios.get(`${API_URL}/api/clients/cards/available`);
      setAvailableCards(cardsRes.data.cards || []);
      
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
        setPaymentStatus('pending');
        
        // In test mode, show confirm button
        if (res.data.test_mode) {
          toast.info('Test mode: Click "Confirm Payment" to simulate MoMo approval');
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
    // Poll every 3 seconds for payment status
    pollingRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/payments/status/${pId}`);
        if (res.data.status === 'success') {
          clearInterval(pollingRef.current);
          setPaymentStatus('success');
          toast.success('Payment successful! Your card is now active.');
          setTimeout(() => {
            setShowPaymentModal(false);
            fetchDashboardData();
          }, 2000);
        } else if (res.data.status === 'failed') {
          clearInterval(pollingRef.current);
          setPaymentStatus('failed');
          toast.error('Payment failed. Please try again.');
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
    
    // Stop polling after 2 minutes
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }, 120000);
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
    
    setIsProcessingPayment(true);
    setMerchantPayStatus('processing');
    
    try {
      const res = await axios.post(`${API_URL}/api/payments/merchant/initiate`, {
        client_phone: client?.phone,
        merchant_qr_code: selectedMerchant?.payment_qr_code,
        amount: amount
      });
      
      if (res.data.success) {
        setMerchantPaymentId(res.data.payment_id);
        setMerchantPayStatus('pending');
        
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
        const res = await axios.get(`${API_URL}/api/payments/status/${pId}`);
        if (res.data.status === 'success') {
          clearInterval(pollingRef.current);
          setMerchantPayStatus('success');
          toast.success('Payment successful! Cashback credited.');
          setTimeout(() => {
            setShowMerchantPayModal(false);
            fetchDashboardData();
          }, 2000);
        } else if (res.data.status === 'failed') {
          clearInterval(pollingRef.current);
          setMerchantPayStatus('failed');
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
    
    setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }, 120000);
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
  
  const closeMerchantPayModal = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setShowMerchantPayModal(false);
    setSelectedMerchant(null);
    setMerchantPayStatus(null);
    setMerchantPaymentId(null);
    setMerchantPayAmount('');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-9 h-9 object-contain rounded-lg" />
            <span className="font-bold text-white">SDM</span>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-white">
            <LogOut size={20} />
          </button>
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
        </div>

        {/* Inactive Account Banner */}
        {!isActive && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <CreditCard className="text-amber-400 shrink-0" size={24} />
              <div>
                <p className="text-amber-300 font-medium">Activate Your Account</p>
                <p className="text-slate-400 text-sm mt-1">
                  Purchase a membership card to start earning cashback rewards!
                </p>
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
                  <p className="text-white/80 text-sm">{card?.card_number}</p>
                  <p className="text-white font-bold text-lg mt-2">{client?.full_name}</p>
                  <p className="text-white/80 text-xs mt-1">@{client?.username}</p>
                </div>
              </div>
            )}

            {/* Buy Card Section */}
            {!isActive && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-4">Choose Your Card</h3>
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
                          <p className="text-amber-400 font-bold">GHS {cardItem.price}</p>
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
                        <p className="text-slate-500 text-xs">
                          {new Date(txn.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className={`font-medium ${
                      txn.type.includes('earned') || txn.type.includes('bonus') 
                        ? 'text-emerald-400' 
                        : 'text-slate-400'
                    }`}>
                      {txn.type.includes('earned') || txn.type.includes('bonus') ? '+' : '-'}
                      GHS {txn.amount?.toFixed(2)}
                    </p>
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

            {/* Referral Code Card */}
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6 text-center">
              <Users className="mx-auto text-purple-400 mb-2" size={32} />
              <p className="text-slate-300 mb-2">Your Referral Code</p>
              <p className="text-2xl font-bold text-white font-mono">{client?.referral_code}</p>
              <p className="text-emerald-400 text-sm mt-2">
                Earn GHS 3 for each friend who joins!
              </p>
            </div>
            
            {/* Share Options */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Share2 size={18} /> Share Your Code
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => shareReferral('whatsapp')}
                  className="flex flex-col items-center gap-2 p-3 bg-emerald-500/20 rounded-xl hover:bg-emerald-500/30 transition-colors"
                  data-testid="share-whatsapp"
                >
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Phone size={18} className="text-white" />
                  </div>
                  <span className="text-slate-300 text-xs">WhatsApp</span>
                </button>
                <button
                  onClick={() => shareReferral('twitter')}
                  className="flex flex-col items-center gap-2 p-3 bg-sky-500/20 rounded-xl hover:bg-sky-500/30 transition-colors"
                  data-testid="share-twitter"
                >
                  <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">𝕏</span>
                  </div>
                  <span className="text-slate-300 text-xs">Twitter</span>
                </button>
                <button
                  onClick={() => shareReferral('facebook')}
                  className="flex flex-col items-center gap-2 p-3 bg-blue-500/20 rounded-xl hover:bg-blue-500/30 transition-colors"
                  data-testid="share-facebook"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">f</span>
                  </div>
                  <span className="text-slate-300 text-xs">Facebook</span>
                </button>
                <button
                  onClick={() => shareReferral('copy')}
                  className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors"
                  data-testid="share-copy"
                >
                  <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                    <Copy size={18} className="text-white" />
                  </div>
                  <span className="text-slate-300 text-xs">Copy Link</span>
                </button>
              </div>
            </div>

            {/* Referrals List */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4">Your Referrals</h3>
              {referrals?.referrals?.length > 0 ? (
                <div className="space-y-3">
                  {referrals.referrals.map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                          <User className="text-slate-400" size={18} />
                        </div>
                        <div>
                          <p className="text-white text-sm">{ref.referred_client?.full_name || 'User'}</p>
                          <p className="text-slate-500 text-xs">
                            {new Date(ref.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {ref.bonuses_paid ? (
                        <span className="text-emerald-400 text-sm flex items-center gap-1">
                          <CheckCircle size={14} /> +GHS 3
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm flex items-center gap-1">
                          <Clock size={14} /> Pending
                        </span>
                      )}
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
            onClick={() => { setActiveTab('qr'); }}
            className={`flex flex-col items-center gap-1 ${activeTab === 'qr' ? 'text-amber-400' : 'text-slate-500'}`}
            disabled={!isActive}
            data-testid="nav-qr"
          >
            <QrCode size={22} />
            <span className="text-xs">QR Code</span>
          </button>
          <button
            onClick={() => { setActiveTab('history'); fetchTransactions(); }}
            className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-amber-400' : 'text-slate-500'}`}
            data-testid="nav-history"
          >
            <History size={22} />
            <span className="text-xs">History</span>
          </button>
          <button
            onClick={() => { setActiveTab('referrals'); fetchReferrals(); }}
            className={`flex flex-col items-center gap-1 ${activeTab === 'referrals' ? 'text-amber-400' : 'text-slate-500'}`}
            data-testid="nav-referrals"
          >
            <Users size={22} />
            <span className="text-xs">Referrals</span>
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
                  <Phone className="text-amber-400 mx-auto mb-4" size={48} />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-ping" />
                </div>
                <p className="text-white text-lg font-semibold">Waiting for Payment</p>
                <p className="text-slate-400 mt-2 text-sm">
                  Please approve the MoMo prompt on your phone
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-amber-400">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="text-sm">Waiting for confirmation...</span>
                </div>
                
                {/* Test Mode Confirm Button */}
                <div className="mt-6 pt-4 border-t border-slate-700">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 relative">
            {/* Close Button */}
            <button
              onClick={closeMerchantPayModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              disabled={isProcessingPayment}
            >
              <X size={20} />
            </button>
            
            {/* Merchant Info Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Store className="text-white" size={32} />
              </div>
              <h3 className="text-white text-xl font-bold">{selectedMerchant.business_name}</h3>
              {selectedMerchant.business_address && (
                <p className="text-slate-400 text-sm flex items-center justify-center gap-1 mt-1">
                  <MapPin size={14} /> {selectedMerchant.business_address}
                </p>
              )}
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full mt-3">
                <Percent size={14} />
                <span className="font-bold">{selectedMerchant.cashback_rate || 5}% Cashback</span>
              </div>
            </div>
            
            {/* Payment Status Display */}
            {merchantPayStatus === 'success' ? (
              <div className="text-center py-8">
                <CheckCircle className="text-emerald-400 mx-auto mb-4" size={64} />
                <p className="text-white text-lg font-semibold">Payment Successful!</p>
                <p className="text-emerald-400 mt-2">
                  Cashback credited to your wallet
                </p>
              </div>
            ) : merchantPayStatus === 'failed' ? (
              <div className="text-center py-8">
                <AlertCircle className="text-red-400 mx-auto mb-4" size={64} />
                <p className="text-white text-lg font-semibold">Payment Failed</p>
                <Button
                  onClick={() => setMerchantPayStatus(null)}
                  className="mt-4 bg-amber-500 hover:bg-amber-600"
                >
                  Try Again
                </Button>
              </div>
            ) : merchantPayStatus === 'pending' ? (
              <div className="text-center py-6">
                <div className="relative inline-block">
                  <Phone className="text-amber-400 mx-auto mb-4" size={48} />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-ping" />
                </div>
                <p className="text-white text-lg font-semibold">Waiting for Payment</p>
                <p className="text-slate-400 mt-2 text-sm">
                  Approve the MoMo prompt on your phone
                </p>
                
                {/* Cashback Preview */}
                <div className="mt-4 bg-slate-900 rounded-lg p-3">
                  <p className="text-slate-400 text-sm">Expected Cashback</p>
                  <p className="text-emerald-400 text-xl font-bold">
                    +GHS {(parseFloat(merchantPayAmount) * (selectedMerchant.cashback_rate || 5) / 100 * 0.95).toFixed(2)}
                  </p>
                </div>
                
                {/* Test Mode Confirm */}
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <p className="text-slate-500 text-xs mb-3">Test Mode</p>
                  <Button
                    onClick={confirmMerchantTestPayment}
                    disabled={isProcessingPayment}
                    className="w-full bg-emerald-500 hover:bg-emerald-600"
                    data-testid="confirm-merchant-payment-btn"
                  >
                    {isProcessingPayment ? (
                      <Loader2 className="animate-spin mr-2" size={16} />
                    ) : (
                      <CheckCircle className="mr-2" size={16} />
                    )}
                    Confirm Payment (Test)
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Amount Input */}
                <div className="mb-6">
                  <label className="text-slate-300 text-sm block mb-2">
                    Payment Amount (GHS)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter amount"
                    value={merchantPayAmount}
                    onChange={(e) => setMerchantPayAmount(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white text-2xl text-center py-6"
                    data-testid="merchant-pay-amount"
                  />
                </div>
                
                {/* Cashback Preview */}
                {merchantPayAmount && parseFloat(merchantPayAmount) >= 1 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-6 text-center">
                    <p className="text-slate-400 text-sm">You'll earn</p>
                    <p className="text-emerald-400 text-2xl font-bold">
                      +GHS {(parseFloat(merchantPayAmount) * (selectedMerchant.cashback_rate || 5) / 100 * 0.95).toFixed(2)}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      ({selectedMerchant.cashback_rate || 5}% cashback)
                    </p>
                  </div>
                )}
                
                {/* Pay Button */}
                <Button
                  onClick={initiateMerchantPayment}
                  disabled={isProcessingPayment || !merchantPayAmount || parseFloat(merchantPayAmount) < 1}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 py-6"
                  data-testid="initiate-merchant-payment-btn"
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
    </div>
  );
}

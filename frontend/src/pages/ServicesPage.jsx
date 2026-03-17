import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Smartphone, 
  Wifi, 
  Zap, 
  Banknote,
  Store,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wallet,
  ChevronLeft,
  Crown,
  ArrowUp,
  CreditCard,
  Phone,
  Gift,
  Search
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// API URL imported from config
import { API_URL } from '@/config/api';

const ServicesPage = ({ balance, onBack, onRefresh, client }) => {
  // Build version for debugging
  const BUILD_VERSION = "2026.03.17.v6";
  const [activeService, setActiveService] = useState(null);
  const [fees, setFees] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [availableCards, setAvailableCards] = useState([]);
  
  // Form states
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [meterNumber, setMeterNumber] = useState('');
  const [bundleCode, setBundleCode] = useState('');
  
  // Data bundle states
  const [dataServices, setDataServices] = useState([]);
  const [selectedDataService, setSelectedDataService] = useState(null);
  const [dataBundlesApi, setDataBundlesApi] = useState([]);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [fetchingBundles, setFetchingBundles] = useState(false);
  const [bundleUserName, setBundleUserName] = useState('');
  
  // Upgrade states
  const [selectedUpgradeCard, setSelectedUpgradeCard] = useState(null);
  const [useUpgradeCashback, setUseUpgradeCashback] = useState(false);
  const [upgradeCashbackAmount, setUpgradeCashbackAmount] = useState('');
  const [upgradePaymentPhone, setUpgradePaymentPhone] = useState('');
  const [upgradeStatus, setUpgradeStatus] = useState(null); // null, 'processing', 'pending', 'success', 'failed'
  const [upgradePaymentId, setUpgradePaymentId] = useState(null);
  const pollingRef = useRef(null);
  
  const token = localStorage.getItem('sdm_client_token');
  
  useEffect(() => {
    fetchFees();
    fetchAvailableCards();
    fetchDataServices();
    
    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);
  
  const fetchFees = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/services/fees`);
      setFees(res.data.fees);
    } catch (error) {
      console.error('Failed to fetch fees:', error);
    }
  };
  
  const fetchAvailableCards = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/public/card-types`);
      setAvailableCards(res.data.card_types || []);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    }
  };
  
  const fetchDataServices = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/services/data/services`);
      setDataServices(res.data.services || []);
    } catch (error) {
      console.error('Failed to fetch data services:', error);
    }
  };
  
  const fetchDataBundles = async (serviceId, phoneNumber) => {
    if (!serviceId || !phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    setFetchingBundles(true);
    setDataBundlesApi([]);
    setSelectedBundle(null);
    setBundleUserName('');
    
    try {
      const res = await axios.get(`${API_URL}/api/services/data/bundles/${serviceId}/${phoneNumber}`);
      if (res.data.success) {
        setDataBundlesApi(res.data.packages || []);
        setBundleUserName(res.data.user_name || '');
        if (res.data.packages?.length === 0) {
          toast.info('No data bundles available for this number');
        }
      }
    } catch (error) {
      console.error('Failed to fetch bundles:', error);
      toast.error(error.response?.data?.detail || 'Failed to fetch data bundles');
    } finally {
      setFetchingBundles(false);
    }
  };
  
  // Get upgrade options based on current card
  const getUpgradeOptions = () => {
    if (!client?.card_type || !availableCards.length) return [];
    
    const cardOrder = ['silver', 'gold', 'platinum', 'diamond', 'business'];
    const currentIndex = cardOrder.indexOf(client.card_type);
    
    return availableCards
      .filter(card => {
        const cardIndex = cardOrder.indexOf(card.type || card.slug);
        return cardIndex > currentIndex && card.is_active !== false;
      })
      .map(card => ({
        ...card,
        type: card.type || card.slug,
        fullPrice: card.price,
        welcomeBonus: card.welcome_bonus || (card.type === 'gold' ? 2 : card.type === 'platinum' ? 3 : 1)
      }))
      .sort((a, b) => a.price - b.price);
  };
  
  // Helper to get fee info
  const getFeeInfo = (serviceName) => {
    const feeConfig = fees[serviceName];
    if (!feeConfig) return { type: 'percentage', rate: 2 };
    if (typeof feeConfig === 'number') return { type: 'percentage', rate: feeConfig };
    return { type: feeConfig.type || 'percentage', rate: feeConfig.rate || 2 };
  };

  const services = [
    {
      id: 'airtime',
      name: 'Airtime',
      description: 'Buy mobile credit',
      icon: Smartphone,
      color: 'from-blue-500 to-cyan-500',
      ...getFeeInfo('airtime')
    },
    {
      id: 'data',
      name: 'Data Bundle',
      description: 'Internet data packages',
      icon: Wifi,
      color: 'from-purple-500 to-pink-500',
      ...getFeeInfo('data_bundle')
    },
    {
      id: 'ecg',
      name: 'ECG Payment',
      description: 'Pay electricity bill',
      icon: Zap,
      color: 'from-amber-500 to-orange-500',
      ...getFeeInfo('ecg_payment')
    },
    {
      id: 'withdrawal',
      name: 'MoMo Withdrawal',
      description: 'Withdraw to mobile money',
      icon: Banknote,
      color: 'from-emerald-500 to-teal-500',
      ...getFeeInfo('withdrawal')
    },
    {
      id: 'upgrade',
      name: 'Upgrade Card',
      description: 'Upgrade to a higher tier',
      icon: Crown,
      color: 'from-amber-500 to-yellow-500',
      type: 'none',
      rate: 0
    }
  ];
  
  // Network to service ID mapping for data bundles
  const networkToServiceId = {
    'MTN': '4a1d6ab2-df53-44fd-b42b-97753ba77508',
    'TELECEL': '205cb30a-f67c-4d4d-983a-19c3da2ebeef',
    'AIRTELTIGO': '442424ef-3eac-4d88-a596-65b5ec7a345f'
  };
  
  const calculateTotal = () => {
    let amt = parseFloat(amount) || 0;
    
    // For data bundles, use selected bundle amount
    if (activeService === 'data' && selectedBundle) {
      amt = selectedBundle.amount;
    }
    
    const service = services.find(s => s.id === activeService);
    if (!service) return { amount: amt, fee: 0, total: amt, feeType: 'none' };
    
    // Calculate fee based on type
    let fee = 0;
    if (service.type === 'fixed') {
      fee = service.rate;  // Fixed GHS amount
    } else if (service.type === 'percentage') {
      fee = amt * service.rate / 100;  // Percentage
    }
    
    return {
      amount: amt,
      fee: Math.round(fee * 100) / 100,
      total: Math.round((amt + fee) * 100) / 100,
      feeType: service.type,
      feeRate: service.rate
    };
  };
  
  // Calculate upgrade payment breakdown
  const calculateUpgradePayment = () => {
    if (!selectedUpgradeCard) return { cashback: 0, momo: 0, total: 0 };
    
    const total = selectedUpgradeCard.fullPrice;
    const maxCashback = balance || 0;
    
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

  // Start polling for payment status
  const startUpgradePolling = (paymentId) => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    // Poll every 3 seconds for payment status
    pollingRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/payments/status/${paymentId}`);
        console.log('Polling upgrade status:', res.data);
        
        if (res.data.status === 'success' || res.data.status === 'completed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setUpgradeStatus('success');
          toast.success('Upgrade successful! Your new card is now active.');
          
          // Wait 2 seconds then refresh and go back
          setTimeout(() => {
            setActiveService(null);
            setSelectedUpgradeCard(null);
            setUpgradeStatus(null);
            setUpgradePaymentId(null);
            if (onRefresh) onRefresh();
          }, 2000);
        } else if (res.data.status === 'failed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setUpgradeStatus('failed');
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
        pollingRef.current = null;
      }
    }, 120000);
  };

  // Check payment status manually ("I have paid" button)
  const checkUpgradePaymentStatus = async () => {
    if (!upgradePaymentId) return;
    
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/payments/check-status/${upgradePaymentId}`);
      console.log('Check status response:', res.data);
      
      if (res.data.status === 'completed' || res.data.status === 'success') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setUpgradeStatus('success');
        toast.success('Upgrade successful! Your new card is now active.');
        setTimeout(() => {
          setActiveService(null);
          setSelectedUpgradeCard(null);
          setUpgradeStatus(null);
          setUpgradePaymentId(null);
          if (onRefresh) onRefresh();
        }, 2000);
      } else if (res.data.status === 'failed') {
        setUpgradeStatus('failed');
        toast.error(res.data.message || 'Payment failed');
      } else {
        toast.info(res.data.message || 'Payment is still processing...');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to check status');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle card upgrade
  const handleUpgrade = async () => {
    if (!selectedUpgradeCard) {
      toast.error('Please select a card to upgrade to');
      return;
    }
    
    const payment = calculateUpgradePayment();
    
    // Validate phone if MoMo payment needed
    if (payment.momo > 0 && (!upgradePaymentPhone || upgradePaymentPhone.length < 10)) {
      toast.error('Please enter a valid phone number for MoMo payment');
      return;
    }
    
    setIsLoading(true);
    setUpgradeStatus('processing');
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/api/clients/cards/upgrade`, {
        new_card_type: selectedUpgradeCard.type,
        payment_phone: upgradePaymentPhone || null,
        use_cashback: useUpgradeCashback,
        cashback_amount: useUpgradeCashback ? (upgradeCashbackAmount ? parseFloat(upgradeCashbackAmount) : null) : null
      }, { headers });
      
      console.log('Upgrade response:', res.data);
      
      if (res.data.success) {
        // Store the payment ID
        if (res.data.payment_id) {
          setUpgradePaymentId(res.data.payment_id);
        }
        
        // If fully paid with cashback
        if (res.data.status === 'completed') {
          setUpgradeStatus('success');
          toast.success(res.data.message || 'Upgrade successful!');
          setTimeout(() => {
            setActiveService(null);
            setSelectedUpgradeCard(null);
            setUpgradeStatus(null);
            setUpgradePaymentId(null);
            if (onRefresh) onRefresh();
          }, 2000);
        } else {
          // MoMo payment needed - start polling
          setUpgradeStatus('pending');
          
          if (res.data.test_mode) {
            toast.info('Test mode: Waiting for confirmation');
          } else {
            toast.success(`MoMo prompt sent for GHS ${res.data.momo_amount || payment.momo}! Approve on your phone.`);
          }
          
          // Start polling for payment status
          if (res.data.payment_id) {
            startUpgradePolling(res.data.payment_id);
          }
        }
      }
    } catch (error) {
      setUpgradeStatus('failed');
      toast.error(error.response?.data?.detail || 'Upgrade failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePurchase = async () => {
    if (!token) {
      toast.error('Please login first');
      return;
    }
    
    const calc = calculateTotal();
    
    // Services are paid with cashback only
    if (calc.total > balance) {
      toast.error(`Insufficient cashback balance. Available: GHS ${balance.toFixed(2)}`);
      return;
    }
    
    setIsLoading(true);
    
    try {
      let endpoint = '';
      let payload = {};
      
      switch (activeService) {
        case 'airtime':
          endpoint = '/api/services/airtime/purchase';
          payload = { phone, amount: parseFloat(amount), network };
          break;
        case 'data':
          if (!selectedBundle) {
            toast.error('Please select a data bundle');
            setIsLoading(false);
            return;
          }
          endpoint = '/api/services/data/purchase';
          payload = { 
            phone, 
            package_id: selectedBundle.id,
            service_id: selectedBundle.service_id,
            network,
            amount: selectedBundle.amount,
            display_name: selectedBundle.display
          };
          break;
        case 'ecg':
          endpoint = '/api/services/ecg/pay';
          payload = { meter_number: meterNumber, amount: parseFloat(amount) };
          break;
        case 'withdrawal':
          endpoint = '/api/services/withdrawal/initiate';
          payload = { phone, amount: parseFloat(amount), network };
          break;
        default:
          throw new Error('Invalid service');
      }
      
      const res = await axios.post(`${API_URL}${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        toast.success(res.data.message);
        resetForm();
        setActiveService(null);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setPhone('');
    setAmount('');
    setNetwork('MTN');
    setMeterNumber('');
    setBundleCode('');
    setSelectedBundle(null);
    setDataBundlesApi([]);
    setBundleUserName('');
  };
  
  // Render the card upgrade form
  const renderUpgradeForm = () => {
    const upgradeOptions = getUpgradeOptions();
    const payment = calculateUpgradePayment();
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setActiveService(null);
              setSelectedUpgradeCard(null);
              setUpgradeStatus(null);
              setUseUpgradeCashback(false);
              setUpgradeCashbackAmount('');
            }}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="text-slate-400" size={20} />
          </button>
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500">
            <Crown className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Upgrade Card</h3>
            <p className="text-slate-400 text-sm">
              Current: {client?.card_type?.toUpperCase() || 'None'}
            </p>
          </div>
        </div>
        
        {/* Success State */}
        {upgradeStatus === 'success' && (
          <div className="text-center py-8">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="text-emerald-400" size={56} />
              </div>
              {/* Celebration sparkles */}
              <div className="absolute -top-2 -left-2 text-2xl animate-bounce" style={{ animationDelay: '0ms' }}>✨</div>
              <div className="absolute -top-2 -right-2 text-2xl animate-bounce" style={{ animationDelay: '100ms' }}>🎉</div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-2xl animate-bounce" style={{ animationDelay: '200ms' }}>🏆</div>
            </div>
            <p className="text-white text-2xl font-bold">Upgrade Successful!</p>
            <p className="text-emerald-400 mt-2 font-medium">Your new card is now active</p>
            <p className="text-slate-400 mt-1 text-sm">Redirecting to your dashboard...</p>
          </div>
        )}
        
        {/* Failed State */}
        {upgradeStatus === 'failed' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-red-400" size={48} />
            </div>
            <p className="text-white text-xl font-bold">Upgrade Failed</p>
            <p className="text-slate-400 mt-2">The payment could not be completed</p>
            <div className="mt-6 space-y-3">
              <Button
                onClick={() => setUpgradeStatus(null)}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                Try Again
              </Button>
              <Button
                onClick={() => {
                  setActiveService(null);
                  setSelectedUpgradeCard(null);
                  setUpgradeStatus(null);
                }}
                variant="ghost"
                className="w-full text-slate-400 hover:text-white"
              >
                Go Back
              </Button>
            </div>
          </div>
        )}
        
        {/* Pending/Processing State - Enhanced Payment Status Indicator */}
        {(upgradeStatus === 'pending' || upgradeStatus === 'processing') && (
          <div className="text-center py-6">
            {/* Animated Phone Icon */}
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Phone className="text-amber-400" size={40} />
              </div>
              {/* Pulse Animation */}
              <div className="absolute inset-0 w-20 h-20 rounded-full bg-amber-500/30 animate-ping" />
              {/* Signal Waves */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                <div className="flex items-center gap-0.5">
                  <div className="w-1 h-3 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-5 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-7 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
            
            {/* Status Title */}
            <p className="text-white text-xl font-bold">
              {upgradeStatus === 'processing' ? 'Processing Payment...' : 'MoMo Prompt Sent!'}
            </p>
            
            {/* Instructions */}
            <div className="mt-3 space-y-2">
              <p className="text-amber-400 font-medium">
                Check your phone for the payment prompt
              </p>
              <p className="text-slate-400 text-sm">
                Enter your MoMo PIN to approve the payment
              </p>
            </div>
            
            {/* Payment Steps Progress */}
            <div className="mt-6 max-w-xs mx-auto">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className={upgradeStatus === 'processing' ? 'text-amber-400' : 'text-emerald-400'}>
                  1. Request Sent
                </span>
                <span className={upgradeStatus === 'pending' ? 'text-amber-400 animate-pulse' : 'text-slate-500'}>
                  2. Awaiting Approval
                </span>
                <span className="text-slate-500">
                  3. Complete
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    upgradeStatus === 'processing' 
                      ? 'w-1/3 bg-amber-500 animate-pulse' 
                      : 'w-2/3 bg-gradient-to-r from-emerald-500 to-amber-500'
                  }`}
                />
              </div>
            </div>
            
            {/* Waiting Animation */}
            <div className="mt-6 flex items-center justify-center gap-3 text-amber-400">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-sm font-medium">Auto-checking every 3 seconds...</span>
            </div>
            
            {/* I Have Paid Button - Only show when pending */}
            {upgradeStatus === 'pending' && upgradePaymentId && (
              <div className="mt-6 space-y-3">
                <Button
                  onClick={checkUpgradePaymentStatus}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3"
                  data-testid="check-upgrade-status-btn"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin mr-2" size={18} />
                  ) : (
                    <CheckCircle className="mr-2" size={18} />
                  )}
                  I Have Approved - Check Now
                </Button>
                
                <Button
                  onClick={() => {
                    if (pollingRef.current) {
                      clearInterval(pollingRef.current);
                      pollingRef.current = null;
                    }
                    setUpgradeStatus(null);
                    setUpgradePaymentId(null);
                  }}
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white"
                >
                  Cancel & Try Again
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Main Form - Only show if not in terminal state */}
        {!upgradeStatus && (
          <>
            {/* No upgrade available */}
            {upgradeOptions.length === 0 ? (
              <div className="text-center py-8">
                <Crown className="text-slate-600 mx-auto mb-4" size={48} />
                <p className="text-white text-lg font-semibold">Already at Top Tier!</p>
                <p className="text-slate-400 mt-2">
                  You already have the highest membership card available.
                </p>
              </div>
            ) : (
              <>
                {/* Card Selection */}
                <div className="space-y-3">
                  <Label className="text-slate-300 text-sm">Select New Card</Label>
                  {upgradeOptions.map((cardOption) => (
                    <button
                      key={cardOption.type}
                      onClick={() => setSelectedUpgradeCard(cardOption)}
                      className={`w-full p-4 rounded-xl border transition-all text-left ${
                        selectedUpgradeCard?.type === cardOption.type
                          ? 'bg-amber-500/20 border-amber-500'
                          : 'bg-slate-900/50 border-slate-700/50 hover:border-slate-600'
                      }`}
                      data-testid={`select-upgrade-${cardOption.type}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ background: cardOption.color }}
                          >
                            <ArrowUp className="text-white" size={18} />
                          </div>
                          <div>
                            <p className="text-white font-medium">{cardOption.name}</p>
                            <p className="text-emerald-400 text-sm">
                              +GHS {cardOption.welcomeBonus} welcome bonus
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-400 font-bold text-lg">
                            GHS {cardOption.fullPrice}
                          </p>
                          <p className="text-slate-500 text-xs">full price</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Payment Options - Show only when card selected */}
                {selectedUpgradeCard && (
                  <>
                    {/* Use Cashback Option */}
                    {balance > 0 && (
                      <div className="space-y-3">
                        <div 
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            useUpgradeCashback
                              ? 'bg-emerald-500/20 border-emerald-500'
                              : 'bg-slate-900/50 border-slate-700/50'
                          }`}
                          onClick={() => setUseUpgradeCashback(!useUpgradeCashback)}
                          data-testid="use-cashback-toggle"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Wallet className={useUpgradeCashback ? 'text-emerald-400' : 'text-slate-400'} size={20} />
                              <div>
                                <p className="text-white font-medium">Use Cashback Balance</p>
                                <p className="text-slate-400 text-sm">
                                  Available: GHS {balance?.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              useUpgradeCashback 
                                ? 'border-emerald-400 bg-emerald-400' 
                                : 'border-slate-500'
                            }`}>
                              {useUpgradeCashback && (
                                <CheckCircle className="text-white" size={12} />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Cashback Amount Input */}
                        {useUpgradeCashback && (
                          <div>
                            <Label className="text-slate-300 text-sm">
                              Cashback Amount (optional - leave empty to use max)
                            </Label>
                            <Input
                              type="number"
                              placeholder={`Max: GHS ${Math.min(balance, selectedUpgradeCard.fullPrice).toFixed(2)}`}
                              value={upgradeCashbackAmount}
                              onChange={(e) => setUpgradeCashbackAmount(e.target.value)}
                              max={Math.min(balance, selectedUpgradeCard.fullPrice)}
                              min="0"
                              step="0.01"
                              className="mt-1.5 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                              data-testid="cashback-amount-input"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* MoMo Phone - Show if MoMo payment needed */}
                    {payment.momo > 0 && (
                      <div>
                        <Label className="text-slate-300 text-sm">MoMo Phone Number</Label>
                        <Input
                          type="tel"
                          placeholder="0XX XXX XXXX"
                          value={upgradePaymentPhone}
                          onChange={(e) => setUpgradePaymentPhone(e.target.value)}
                          className="mt-1.5 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                          data-testid="upgrade-phone-input"
                        />
                      </div>
                    )}
                    
                    {/* Payment Summary */}
                    <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-slate-400 text-sm">
                        <span>Card Price</span>
                        <span>GHS {selectedUpgradeCard.fullPrice.toFixed(2)}</span>
                      </div>
                      {useUpgradeCashback && payment.cashback > 0 && (
                        <div className="flex justify-between text-emerald-400 text-sm">
                          <span>Cashback Applied</span>
                          <span>- GHS {payment.cashback.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-700 pt-2 flex justify-between text-white font-semibold">
                        <span>MoMo Payment</span>
                        <span>GHS {payment.momo.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-400 text-sm mt-2">
                        <Gift size={14} />
                        <span>You'll receive GHS {selectedUpgradeCard.welcomeBonus} welcome bonus!</span>
                      </div>
                    </div>
                    
                    {/* Submit Button */}
                    <Button
                      onClick={handleUpgrade}
                      disabled={isLoading || !selectedUpgradeCard || (payment.momo > 0 && (!upgradePaymentPhone || upgradePaymentPhone.length < 10))}
                      className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 rounded-xl font-semibold"
                      data-testid="confirm-upgrade-btn"
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin mr-2" size={18} />
                      ) : (
                        <Crown className="mr-2" size={18} />
                      )}
                      {isLoading ? 'Processing...' : payment.momo > 0 
                        ? `Pay GHS ${payment.momo.toFixed(2)} & Upgrade`
                        : 'Upgrade with Cashback'
                      }
                    </Button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const renderServiceForm = () => {
    // Handle upgrade service separately
    if (activeService === 'upgrade') {
      return renderUpgradeForm();
    }
    
    const service = services.find(s => s.id === activeService);
    if (!service) return null;
    
    const calc = calculateTotal();
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveService(null)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="text-slate-400" size={20} />
          </button>
          <div className={`p-3 rounded-xl bg-gradient-to-r ${service.color}`}>
            <service.icon className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">{service.name}</h3>
            <p className="text-slate-400 text-sm">
              {service.type === 'fixed' 
                ? `GHS ${service.rate} service fee` 
                : service.type === 'none' 
                  ? 'No service fee'
                  : `${service.rate}% service fee`}
            </p>
          </div>
        </div>
        
        {/* Form Fields */}
        <div className="space-y-4">
          {/* Payment Method Banner - CASHBACK ONLY for services */}
          {['airtime', 'data', 'ecg'].includes(activeService) && (
            <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Wallet className="text-amber-400" size={20} />
                </div>
                <div>
                  <p className="text-amber-400 font-semibold">Paid from Cashback Balance</p>
                  <p className="text-amber-200/70 text-sm">Available: GHS {balance?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Network Selection (ONLY for withdrawal - uses MoMo) */}
          {activeService === 'withdrawal' && (
            <div>
              <Label className="text-slate-300 text-sm">Network</Label>
              <Select value={network} onValueChange={setNetwork}>
                <SelectTrigger className="mt-1.5 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl">
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="MTN">MTN MoMo</SelectItem>
                  <SelectItem value="TELECEL">Telecel (ex-Vodafone)</SelectItem>
                  <SelectItem value="AIRTELTIGO">AirtelTigo (AT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Phone Number (for airtime, data, withdrawal) */}
          {['airtime', 'data', 'withdrawal'].includes(activeService) && (
            <div>
              <Label className="text-slate-300 text-sm">Phone Number</Label>
              <Input
                type="tel"
                placeholder="0XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                data-testid="service-phone"
              />
            </div>
          )}
          
          {/* Meter Number (for ECG) */}
          {activeService === 'ecg' && (
            <div>
              <Label className="text-slate-300 text-sm">Meter Number</Label>
              <Input
                type="text"
                placeholder="Enter meter number"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                className="mt-1.5 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                data-testid="meter-number"
              />
            </div>
          )}
          
          {/* Data Bundle Selection */}
          {activeService === 'data' && (
            <div className="space-y-4">
              {/* Step 1: Fetch Bundles Button */}
              {dataBundlesApi.length === 0 && (
                <div>
                  <Button
                    onClick={() => fetchDataBundles(networkToServiceId[network], phone)}
                    disabled={fetchingBundles || !phone || phone.length < 10}
                    className="w-full h-12 bg-purple-600 hover:bg-purple-700 rounded-xl"
                    data-testid="fetch-bundles-btn"
                  >
                    {fetchingBundles ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Fetching Bundles...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2" size={18} />
                        Fetch Available Bundles
                      </>
                    )}
                  </Button>
                  {phone && phone.length < 10 && (
                    <p className="text-amber-400 text-xs mt-2">Enter a complete phone number to fetch bundles</p>
                  )}
                </div>
              )}
              
              {/* Step 2: Show User Name if found */}
              {bundleUserName && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                  <p className="text-emerald-400 text-sm">
                    <CheckCircle className="inline mr-2" size={14} />
                    Recipient: <span className="font-semibold">{bundleUserName}</span>
                  </p>
                </div>
              )}
              
              {/* Step 3: Bundle List */}
              {dataBundlesApi.length > 0 && (
                <div>
                  <Label className="text-slate-300 text-sm mb-2 block">Select Data Bundle</Label>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {dataBundlesApi.map(bundle => {
                      const isSelected = selectedBundle?.id === bundle.id;
                      const canAfford = bundle.amount * (1 + (fees.data_bundle || 3) / 100) <= balance;
                      
                      return (
                        <button
                          key={bundle.id}
                          onClick={() => {
                            setSelectedBundle(bundle);
                            setAmount(bundle.amount.toString());
                          }}
                          disabled={!canAfford}
                          className={`w-full p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-purple-500/20 border-purple-500'
                              : canAfford
                                ? 'bg-slate-900/50 border-slate-700/50 hover:border-slate-600'
                                : 'bg-slate-900/30 border-slate-800/50 opacity-50 cursor-not-allowed'
                          }`}
                          data-testid={`bundle-${bundle.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium text-sm">{bundle.display}</p>
                              {!canAfford && (
                                <p className="text-red-400 text-xs mt-0.5">Insufficient balance</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${isSelected ? 'text-purple-400' : 'text-amber-400'}`}>
                                GHS {bundle.amount.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Reset Bundles Button */}
                  <Button
                    onClick={() => {
                      setDataBundlesApi([]);
                      setSelectedBundle(null);
                      setBundleUserName('');
                      setAmount('');
                    }}
                    variant="ghost"
                    className="mt-2 text-slate-400 hover:text-white text-sm"
                    data-testid="reset-bundles-btn"
                  >
                    <ChevronLeft size={14} className="mr-1" />
                    Change Number / Network
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Amount (for airtime, ecg, withdrawal) */}
          {['airtime', 'ecg', 'withdrawal'].includes(activeService) && (
            <div>
              <Label className="text-slate-300 text-sm">Amount (GHS)</Label>
              <Input
                type="number"
                placeholder="0.00"
                min="2"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl text-lg"
                data-testid="service-amount"
              />
            </div>
          )}
        </div>
        
        {/* Cost Summary - Services are paid with Cashback only */}
        {(amount || selectedBundle) && (() => {
          const calc = calculateTotal();
          return (
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-slate-400 text-sm">
                <span>Amount</span>
                <span>GHS {calc.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-sm">
                <span>Service Fee {calc.feeType === 'fixed' ? '(Fixed)' : `(${calc.feeRate}%)`}</span>
                <span>GHS {calc.fee.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between text-white font-semibold">
                <span>Total</span>
                <span>GHS {calc.total.toFixed(2)}</span>
              </div>
              
              {/* Payment Method Info */}
              <div className="border-t border-slate-700 pt-2 mt-2">
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <Wallet size={14} />
                  <span>Paid from Cashback Balance</span>
                </div>
              </div>
              
              {calc.total > balance && (
                <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
                  <AlertCircle size={14} />
                  <span>Insufficient cashback balance (Available: GHS {balance.toFixed(2)})</span>
                </div>
              )}
            </div>
          );
        })()}
        
        {/* Submit Button */}
        {(() => {
          const calc = calculateTotal();
          const currentBalance = balance || 0;
          const isInsufficientBalance = calc.total > currentBalance;
          const isFormIncomplete = 
            (['airtime', 'withdrawal'].includes(activeService) && (!phone || !amount || parseFloat(amount) <= 0)) ||
            (activeService === 'ecg' && (!meterNumber || !amount || parseFloat(amount) <= 0)) ||
            (activeService === 'data' && (!phone || !selectedBundle));
          
          return (
            <Button
              onClick={handlePurchase}
              disabled={isLoading || isInsufficientBalance || isFormIncomplete}
              className={`w-full h-12 bg-gradient-to-r ${service.color} hover:opacity-90 rounded-xl font-semibold ${
                (isInsufficientBalance || isFormIncomplete) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              data-testid="service-submit"
            >
              {isLoading ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : (
                <CheckCircle className="mr-2" size={18} />
              )}
              {isLoading ? 'Processing...' : `Pay GHS ${calc.total.toFixed(2)}`}
            </Button>
          );
        })()}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="text-slate-400" size={20} />
          </button>
          <h1 className="text-white text-xl font-bold">Services</h1>
        </div>
        
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <Wallet className="text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-amber-200 text-sm">Available Cashback</p>
              <p className="text-white text-2xl font-bold">GHS {balance?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
          {balance < 2 && (
            <p className="text-amber-400/80 text-xs mt-3">
              Minimum GHS 2.00 required to use services
            </p>
          )}
          {/* Build version for debugging */}
          <p className="text-slate-600 text-xs mt-2 text-right">v{BUILD_VERSION}</p>
        </div>
        
        {activeService ? (
          renderServiceForm()
        ) : (
          /* Service Grid */
          <div className="grid grid-cols-2 gap-4">
            {services.map(service => (
              <button
                key={service.id}
                onClick={() => {
                  setActiveService(service.id);
                  // Initialize upgrade phone with client's phone
                  if (service.id === 'upgrade' && client?.phone) {
                    setUpgradePaymentPhone(client.phone);
                  }
                }}
                disabled={balance < 2 && service.id !== 'upgrade'}
                className={`p-4 bg-slate-900/50 border border-slate-700/50 rounded-2xl text-left hover:border-slate-600 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed`}
                data-testid={`service-${service.id}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${service.color} flex items-center justify-center mb-3`}>
                  <service.icon className="text-white" size={24} />
                </div>
                <h3 className="text-white font-semibold">{service.name}</h3>
                <p className="text-slate-400 text-sm">{service.description}</p>
                <div className="flex items-center gap-1 mt-2 text-slate-500 text-xs">
                  {service.id === 'upgrade' ? (
                    <span>Pay full price</span>
                  ) : service.type === 'fixed' ? (
                    <span>GHS {service.rate} fee</span>
                  ) : (
                    <span>{service.rate}% fee</span>
                  )}
                  <ArrowRight size={12} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesPage;

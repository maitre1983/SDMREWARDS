import React, { useState, useEffect } from 'react';
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
  Gift
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

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ServicesPage = ({ balance, onBack, onRefresh, client }) => {
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
  
  // Upgrade states
  const [selectedUpgradeCard, setSelectedUpgradeCard] = useState(null);
  const [useUpgradeCashback, setUseUpgradeCashback] = useState(false);
  const [upgradeCashbackAmount, setUpgradeCashbackAmount] = useState('');
  const [upgradePaymentPhone, setUpgradePaymentPhone] = useState('');
  const [upgradeStatus, setUpgradeStatus] = useState(null); // null, 'processing', 'pending', 'success', 'failed'
  
  const token = localStorage.getItem('sdm_client_token');
  
  useEffect(() => {
    fetchFees();
    fetchAvailableCards();
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
  
  const services = [
    {
      id: 'airtime',
      name: 'Airtime',
      description: 'Buy mobile credit',
      icon: Smartphone,
      color: 'from-blue-500 to-cyan-500',
      fee: fees.airtime || 2
    },
    {
      id: 'data',
      name: 'Data Bundle',
      description: 'Internet data packages',
      icon: Wifi,
      color: 'from-purple-500 to-pink-500',
      fee: fees.data_bundle || 3
    },
    {
      id: 'ecg',
      name: 'ECG Payment',
      description: 'Pay electricity bill',
      icon: Zap,
      color: 'from-amber-500 to-orange-500',
      fee: fees.ecg_payment || 1.5
    },
    {
      id: 'withdrawal',
      name: 'MoMo Withdrawal',
      description: 'Withdraw to mobile money',
      icon: Banknote,
      color: 'from-emerald-500 to-teal-500',
      fee: fees.withdrawal || 1
    },
    {
      id: 'upgrade',
      name: 'Upgrade Card',
      description: 'Upgrade to a higher tier',
      icon: Crown,
      color: 'from-amber-500 to-yellow-500',
      fee: 0
    }
  ];
  
  const dataBundles = {
    MTN: [
      { code: '1GB', name: '1GB Data', price: 10 },
      { code: '2GB', name: '2GB Data', price: 18 },
      { code: '5GB', name: '5GB Data', price: 40 },
    ],
    TELECEL: [
      { code: '1GB', name: '1GB Data', price: 9 },
      { code: '2GB', name: '2GB Data', price: 16 },
    ],
    AIRTELTIGO: [
      { code: '1GB', name: '1GB Data', price: 8 },
      { code: '2GB', name: '2GB Data', price: 15 },
    ]
  };
  
  const calculateTotal = () => {
    const amt = parseFloat(amount) || 0;
    const service = services.find(s => s.id === activeService);
    if (!service) return { amount: amt, fee: 0, total: amt };
    
    const fee = amt * service.fee / 100;
    return {
      amount: amt,
      fee: Math.round(fee * 100) / 100,
      total: Math.round((amt + fee) * 100) / 100
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
      
      if (res.data.success) {
        // If fully paid with cashback
        if (res.data.status === 'completed') {
          setUpgradeStatus('success');
          toast.success(res.data.message || 'Upgrade successful!');
          setTimeout(() => {
            setActiveService(null);
            setSelectedUpgradeCard(null);
            setUpgradeStatus(null);
            if (onRefresh) onRefresh();
          }, 2000);
        } else {
          // MoMo payment needed
          setUpgradeStatus('pending');
          if (res.data.test_mode) {
            toast.info('Test mode: Waiting for confirmation');
          } else {
            toast.success(`MoMo prompt sent for GHS ${res.data.momo_amount}! Approve on your phone.`);
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
    
    if (calc.total > balance) {
      toast.error(`Insufficient balance. Available: GHS ${balance.toFixed(2)}`);
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
          endpoint = '/api/services/data/purchase';
          payload = { phone, bundle_code: bundleCode, network };
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
            <CheckCircle className="text-emerald-400 mx-auto mb-4" size={64} />
            <p className="text-white text-lg font-semibold">Upgrade Successful!</p>
            <p className="text-slate-400 mt-2">Your new card is now active</p>
          </div>
        )}
        
        {/* Failed State */}
        {upgradeStatus === 'failed' && (
          <div className="text-center py-8">
            <AlertCircle className="text-red-400 mx-auto mb-4" size={64} />
            <p className="text-white text-lg font-semibold">Upgrade Failed</p>
            <p className="text-slate-400 mt-2">Please try again</p>
            <Button
              onClick={() => setUpgradeStatus(null)}
              className="mt-4 bg-amber-500 hover:bg-amber-600"
            >
              Try Again
            </Button>
          </div>
        )}
        
        {/* Pending/Processing State */}
        {(upgradeStatus === 'pending' || upgradeStatus === 'processing') && (
          <div className="text-center py-6">
            <div className="relative inline-block">
              <Phone className="text-amber-400 mx-auto mb-4" size={48} />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-ping" />
            </div>
            <p className="text-white text-lg font-semibold">
              {upgradeStatus === 'processing' ? 'Processing...' : 'Waiting for Payment'}
            </p>
            <p className="text-slate-400 mt-2 text-sm">
              Please approve the MoMo prompt on your phone
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-amber-400">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-sm">Waiting for confirmation...</span>
            </div>
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
            <p className="text-slate-400 text-sm">{service.fee}% service fee</p>
          </div>
        </div>
        
        {/* Form Fields */}
        <div className="space-y-4">
          {/* Network Selection (for airtime, data, withdrawal) */}
          {['airtime', 'data', 'withdrawal'].includes(activeService) && (
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
            <div>
              <Label className="text-slate-300 text-sm">Data Bundle</Label>
              <Select value={bundleCode} onValueChange={(val) => {
                setBundleCode(val);
                const bundle = dataBundles[network]?.find(b => b.code === val);
                if (bundle) setAmount(bundle.price.toString());
              }}>
                <SelectTrigger className="mt-1.5 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl">
                  <SelectValue placeholder="Select bundle" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {dataBundles[network]?.map(bundle => (
                    <SelectItem key={bundle.code} value={bundle.code}>
                      {bundle.name} - GHS {bundle.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        
        {/* Cost Summary */}
        {(amount || bundleCode) && (
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>Amount</span>
              <span>GHS {calc.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-sm">
              <span>Service Fee ({service.fee}%)</span>
              <span>GHS {calc.fee.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-700 pt-2 flex justify-between text-white font-semibold">
              <span>Total</span>
              <span>GHS {calc.total.toFixed(2)}</span>
            </div>
            
            {calc.total > balance && (
              <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
                <AlertCircle size={14} />
                <span>Insufficient balance</span>
              </div>
            )}
          </div>
        )}
        
        {/* Submit Button */}
        <Button
          onClick={handlePurchase}
          disabled={isLoading || !amount || calc.total > balance || 
            (['airtime', 'data', 'withdrawal'].includes(activeService) && !phone) ||
            (activeService === 'ecg' && !meterNumber) ||
            (activeService === 'data' && !bundleCode)
          }
          className={`w-full h-12 bg-gradient-to-r ${service.color} hover:opacity-90 rounded-xl font-semibold`}
          data-testid="service-submit"
        >
          {isLoading ? (
            <Loader2 className="animate-spin mr-2" size={18} />
          ) : (
            <CheckCircle className="mr-2" size={18} />
          )}
          {isLoading ? 'Processing...' : `Pay GHS ${calc.total.toFixed(2)}`}
        </Button>
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
                  ) : (
                    <span>{service.fee}% fee</span>
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

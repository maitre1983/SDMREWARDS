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
  ChevronLeft
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

const ServicesPage = ({ balance, onBack, onRefresh }) => {
  const [activeService, setActiveService] = useState(null);
  const [fees, setFees] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [meterNumber, setMeterNumber] = useState('');
  const [bundleCode, setBundleCode] = useState('');
  
  const token = localStorage.getItem('sdm_client_token');
  
  useEffect(() => {
    fetchFees();
  }, []);
  
  const fetchFees = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/services/fees`);
      setFees(res.data.fees);
    } catch (error) {
      console.error('Failed to fetch fees:', error);
    }
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
  
  const renderServiceForm = () => {
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
                  <SelectItem value="MTN">MTN</SelectItem>
                  <SelectItem value="TELECEL">Telecel (Vodafone)</SelectItem>
                  <SelectItem value="AIRTELTIGO">AirtelTigo</SelectItem>
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
                onClick={() => setActiveService(service.id)}
                disabled={balance < 2}
                className={`p-4 bg-slate-900/50 border border-slate-700/50 rounded-2xl text-left hover:border-slate-600 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed`}
                data-testid={`service-${service.id}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${service.color} flex items-center justify-center mb-3`}>
                  <service.icon className="text-white" size={24} />
                </div>
                <h3 className="text-white font-semibold">{service.name}</h3>
                <p className="text-slate-400 text-sm">{service.description}</p>
                <div className="flex items-center gap-1 mt-2 text-slate-500 text-xs">
                  <span>{service.fee}% fee</span>
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

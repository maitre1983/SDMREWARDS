import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Smartphone, Banknote, QrCode, Loader2, 
  Check, X, AlertCircle, ArrowRight, Clock
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Payment Method Selection Component
export const PaymentMethodSelector = ({ selected, onChange, disabled }) => {
  const methods = [
    { id: 'momo', label: 'Mobile Money', icon: Smartphone, color: 'bg-yellow-500' },
    { id: 'card', label: 'Card', icon: CreditCard, color: 'bg-blue-500' },
    { id: 'cash', label: 'Cash', icon: Banknote, color: 'bg-green-500' }
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {methods.map(method => (
        <button
          key={method.id}
          type="button"
          onClick={() => !disabled && onChange(method.id)}
          disabled={disabled}
          className={`p-4 rounded-xl border-2 transition-all ${
            selected === method.id 
              ? 'border-cyan-500 bg-cyan-50' 
              : 'border-slate-200 hover:border-slate-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <method.icon className={`w-8 h-8 mx-auto mb-2 ${
            selected === method.id ? 'text-cyan-600' : 'text-slate-400'
          }`} />
          <p className={`text-sm font-medium ${
            selected === method.id ? 'text-cyan-700' : 'text-slate-600'
          }`}>{method.label}</p>
        </button>
      ))}
    </div>
  );
};

// Payment Split Display
export const PaymentSplitDisplay = ({ split, amount }) => {
  if (!split) return null;
  
  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
      <h4 className="font-medium text-slate-700">Payment Breakdown</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Amount Paid</span>
          <span className="font-semibold">GHS {amount?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-emerald-600">
          <span>Customer Cashback</span>
          <span className="font-semibold">+GHS {split.client_cashback?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-400 text-xs">
          <span>SDM Commission</span>
          <span>GHS {split.sdm_commission?.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between">
          <span className="text-slate-500">Merchant Receives</span>
          <span className="font-semibold">GHS {split.merchant_amount?.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

// Pending Cash Payment Card (for client to confirm)
export const PendingCashPaymentCard = ({ payment, onConfirm, onReject, isLoading }) => {
  const expiresAt = new Date(payment.expires_at);
  const now = new Date();
  const timeLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const [countdown, setCountdown] = useState(timeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (countdown === 0) {
    return (
      <div className="bg-red-50 rounded-xl p-4 border border-red-200">
        <p className="text-red-600 text-center">Payment request expired</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-amber-300 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
          <Banknote className="text-amber-600" size={20} />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Cash Payment Request</p>
          <p className="text-sm text-slate-500">{payment.merchant_name}</p>
        </div>
      </div>
      
      <div className="bg-slate-50 rounded-lg p-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Amount</span>
          <span className="text-2xl font-bold text-slate-900">GHS {payment.amount?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-slate-600">Your Cashback</span>
          <span className="text-lg font-semibold text-emerald-600">+GHS {payment.cashback_amount?.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4 text-amber-600">
        <Clock size={16} />
        <span className="text-sm">Expires in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</span>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onReject}
          disabled={isLoading}
          variant="outline"
          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
        >
          <X size={18} className="mr-2" />
          Reject
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} className="mr-2" />}
          Confirm
        </Button>
      </div>
    </div>
  );
};

// MoMo Details Input
export const MoMoInput = ({ phone, setPhone, network, setNetwork, disabled }) => {
  const networks = [
    { id: 'MTN', label: 'MTN', color: 'bg-yellow-400' },
    { id: 'Vodafone', label: 'Vodafone', color: 'bg-red-500' },
    { id: 'AirtelTigo', label: 'AirtelTigo', color: 'bg-blue-500' }
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Network</label>
        <div className="flex gap-2">
          {networks.map(n => (
            <button
              key={n.id}
              type="button"
              onClick={() => !disabled && setNetwork(n.id)}
              disabled={disabled}
              className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                network === n.id 
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-700' 
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              } ${disabled ? 'opacity-50' : ''}`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Money Number</label>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0XX XXX XXXX"
          disabled={disabled}
          className="h-12"
        />
      </div>
    </div>
  );
};

// Main Payment Form Component
export const PaymentForm = ({ 
  merchantQrCode, 
  merchantName, 
  cashbackRate = 5,
  token,
  onSuccess,
  onCancel 
}) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const [momoPhone, setMomoPhone] = useState('');
  const [momoNetwork, setMomoNetwork] = useState('MTN');
  const [isLoading, setIsLoading] = useState(false);
  const [split, setSplit] = useState(null);
  const [notes, setNotes] = useState('');

  // Calculate split when amount changes
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      const total = parseFloat(amount);
      const totalCashback = total * (cashbackRate / 100);
      const sdmCommission = totalCashback * 0.10;
      const clientCashback = totalCashback - sdmCommission;
      const merchantAmount = total - totalCashback;
      
      setSplit({
        total_cashback: totalCashback,
        sdm_commission: sdmCommission,
        client_cashback: clientCashback,
        merchant_amount: merchantAmount
      });
    } else {
      setSplit(null);
    }
  }, [amount, cashbackRate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'momo' && (!momoPhone || !momoNetwork)) {
      toast.error('Please enter MoMo details');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/sdm/payments/initiate`,
        {
          merchant_qr_code: merchantQrCode,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          payer_phone: paymentMethod === 'momo' ? momoPhone : undefined,
          payer_network: paymentMethod === 'momo' ? momoNetwork : undefined,
          notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        if (paymentMethod === 'cash' && response.data.requires_client_confirmation) {
          toast.info('Cash payment created - awaiting confirmation');
        } else {
          toast.success(`Payment successful! Cashback: GHS ${response.data.split.client_cashback.toFixed(2)}`);
        }
        onSuccess?.(response.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Merchant Info */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-4 text-white">
        <p className="text-sm opacity-80">Paying to</p>
        <p className="text-xl font-bold">{merchantName || 'Merchant'}</p>
        <p className="text-sm opacity-80 mt-1">{cashbackRate}% Cashback</p>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Amount (GHS)</label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="1"
          step="0.01"
          className="h-14 text-2xl font-bold text-center"
          required
        />
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
        <PaymentMethodSelector
          selected={paymentMethod}
          onChange={setPaymentMethod}
          disabled={isLoading}
        />
      </div>

      {/* MoMo Details */}
      {paymentMethod === 'momo' && (
        <MoMoInput
          phone={momoPhone}
          setPhone={setMomoPhone}
          network={momoNetwork}
          setNetwork={setMomoNetwork}
          disabled={isLoading}
        />
      )}

      {/* Cash Info */}
      {paymentMethod === 'cash' && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-amber-800">Cash Payment</p>
              <p className="text-sm text-amber-700 mt-1">
                You'll need to confirm this payment in your app to receive cashback.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Notes (optional)</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Order #123"
          disabled={isLoading}
        />
      </div>

      {/* Split Preview */}
      <PaymentSplitDisplay split={split} amount={parseFloat(amount)} />

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="flex-1"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-cyan-600 hover:bg-cyan-700"
          disabled={isLoading || !amount}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              Pay GHS {amount || '0.00'}
              <ArrowRight size={18} className="ml-2" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default PaymentForm;

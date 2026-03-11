import React, { useState, useEffect } from 'react';
import { 
  X, Store, MapPin, Percent, CheckCircle, AlertCircle, 
  Phone, Loader2, CreditCard, Banknote, Wallet, AlertTriangle, Smartphone
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export default function MerchantPayModal({
  merchant,
  amount,
  setAmount,
  phone,
  setPhone,
  network,
  setNetwork,
  status,
  setStatus,
  isProcessing,
  isTestMode,
  onClose,
  onInitiatePayment,
  onCheckStatus,
  onConfirmTest,
  onCashPayment,
  onCashbackPayment,  // New: for cashback payments
  clientCashbackBalance = 0  // New: client's cashback balance
}) {
  // Check if cash payment is available for this merchant
  const cashPaymentInfo = merchant?.cash_payment || {};
  const isCashAvailable = cashPaymentInfo.available !== false; // Default to true if not specified
  const cashUnavailableReason = cashPaymentInfo.reason;
  
  // Check if cashback payment is possible (client has enough balance)
  const parsedAmount = parseFloat(amount) || 0;
  const isCashbackSufficient = clientCashbackBalance >= parsedAmount;
  
  // Default to 'momo'
  const [paymentMethod, setPaymentMethod] = useState('momo');
  
  // For hybrid payment
  const [hybridMomoPhone, setHybridMomoPhone] = useState('');
  
  // Calculate payment breakdown for hybrid
  const calculateHybridBreakdown = () => {
    const total = parsedAmount;
    const cashbackToUse = Math.min(clientCashbackBalance, total);
    const momoToUse = Math.max(0, total - cashbackToUse);
    return { cashbackToUse, momoToUse, total };
  };
  
  // Reset to momo if cash becomes unavailable
  useEffect(() => {
    if (!isCashAvailable && paymentMethod === 'cash') {
      setPaymentMethod('momo');
    }
  }, [isCashAvailable, paymentMethod]);
  
  if (!merchant) return null;

  const cashbackAmount = (parseFloat(amount) * (merchant.cashback_rate || 5) / 100 * 0.95).toFixed(2);

  const handlePayment = () => {
    if (paymentMethod === 'cash' && onCashPayment) {
      onCashPayment();
    } else if (paymentMethod === 'cashback' && onCashbackPayment) {
      onCashbackPayment({ paymentMethod: 'cashback', cashbackToUse: parsedAmount, momoToUse: 0 });
    } else if (paymentMethod === 'hybrid' && onCashbackPayment) {
      const breakdown = calculateHybridBreakdown();
      onCashbackPayment({ 
        paymentMethod: 'hybrid', 
        cashbackToUse: breakdown.cashbackToUse, 
        momoToUse: breakdown.momoToUse,
        momoPhone: hybridMomoPhone
      });
    } else {
      onInitiatePayment();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
          disabled={isProcessing}
        >
          <X size={20} />
        </button>
        
        {/* Merchant Info Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Store className="text-white" size={32} />
          </div>
          <h3 className="text-white text-xl font-bold">{merchant.business_name}</h3>
          {merchant.business_address && (
            <p className="text-slate-400 text-sm flex items-center justify-center gap-1 mt-1">
              <MapPin size={14} /> {merchant.business_address}
            </p>
          )}
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full mt-3">
            <Percent size={14} />
            <span className="font-bold">{merchant.cashback_rate || 5}% Cashback</span>
          </div>
        </div>
        
        {/* Payment Status Display */}
        {status === 'success' ? (
          <div className="text-center py-8">
            <CheckCircle className="text-emerald-400 mx-auto mb-4" size={64} />
            <p className="text-white text-lg font-semibold">Payment Successful!</p>
            <p className="text-emerald-400 mt-2">Cashback credited to your wallet</p>
          </div>
        ) : status === 'cash_success' ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Banknote className="text-orange-400" size={40} />
            </div>
            <p className="text-white text-lg font-semibold">Cash Payment Pending</p>
            <p className="text-orange-400 mt-2">Awaiting merchant confirmation</p>
            <p className="text-slate-400 text-sm mt-2">Please pay GHS {amount} in cash to the merchant</p>
            <div className="mt-4 p-3 bg-slate-800 rounded-lg">
              <p className="text-slate-400 text-sm">Potential Cashback:</p>
              <p className="text-purple-400 font-bold text-lg">GHS {cashbackAmount}</p>
              <p className="text-slate-500 text-xs mt-1">Will be credited once merchant confirms receipt</p>
            </div>
          </div>
        ) : status === 'failed' ? (
          <div className="text-center py-8">
            <AlertCircle className="text-red-400 mx-auto mb-4" size={64} />
            <p className="text-white text-lg font-semibold">Payment Failed</p>
            <Button
              onClick={() => setStatus(null)}
              className="mt-4 bg-amber-500 hover:bg-amber-600"
            >
              Try Again
            </Button>
          </div>
        ) : status === 'pending' ? (
          <div className="text-center py-6">
            <div className="relative inline-block">
              <Phone className="text-amber-400 mx-auto mb-4" size={48} />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-ping" />
            </div>
            <p className="text-white text-lg font-semibold">Waiting for Payment</p>
            <p className="text-slate-400 mt-2 text-sm">Approve the MoMo prompt on your phone</p>
            
            {/* Cashback Preview */}
            <div className="mt-4 bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-sm">Expected Cashback</p>
              <p className="text-emerald-400 text-xl font-bold">+GHS {cashbackAmount}</p>
            </div>

            {/* Check Status Button */}
            <div className="mt-6 pt-4 border-t border-slate-700">
              <Button
                onClick={onCheckStatus}
                disabled={isProcessing}
                variant="outline"
                className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                data-testid="check-merchant-payment-btn"
              >
                {isProcessing ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle className="mr-2" size={16} />}
                I Have Paid - Check Status
              </Button>
            </div>
            
            {/* Test Mode Button */}
            {isTestMode && (
              <div className="mt-4">
                <p className="text-slate-500 text-xs mb-3">Test Mode</p>
                <Button
                  onClick={onConfirmTest}
                  disabled={isProcessing}
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                  data-testid="confirm-merchant-test-btn"
                >
                  {isProcessing ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle className="mr-2" size={16} />}
                  Confirm Payment (Test)
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Payment Method Selector */}
            <div className="mb-5">
              <label className="text-slate-300 text-sm block mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {/* MoMo */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('momo')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    paymentMethod === 'momo'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                  data-testid="payment-method-momo"
                >
                  <Smartphone size={18} />
                  <span className="font-medium text-sm">MoMo</span>
                </button>
                
                {/* Cash */}
                <button
                  type="button"
                  onClick={() => isCashAvailable && setPaymentMethod('cash')}
                  disabled={!isCashAvailable}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    !isCashAvailable
                      ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      : paymentMethod === 'cash'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                  data-testid="payment-method-cash"
                >
                  <Banknote size={18} />
                  <span className="font-medium text-sm">Cash</span>
                </button>
                
                {/* Cashback */}
                <button
                  type="button"
                  onClick={() => isCashbackSufficient && setPaymentMethod('cashback')}
                  disabled={!isCashbackSufficient || parsedAmount <= 0}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    !isCashbackSufficient || parsedAmount <= 0
                      ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      : paymentMethod === 'cashback'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                  data-testid="payment-method-cashback"
                >
                  <Wallet size={18} />
                  <span className="font-medium text-sm">Cashback</span>
                </button>
                
                {/* Hybrid */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('hybrid')}
                  disabled={parsedAmount <= 0 || clientCashbackBalance <= 0}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    parsedAmount <= 0 || clientCashbackBalance <= 0
                      ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      : paymentMethod === 'hybrid'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                  data-testid="payment-method-hybrid"
                >
                  <div className="flex items-center gap-0.5">
                    <Wallet size={14} />
                    <span>+</span>
                    <Smartphone size={14} />
                  </div>
                  <span className="font-medium text-sm">Hybrid</span>
                </button>
              </div>
              
              {/* Cashback Balance Display */}
              <div className="mt-3 bg-slate-900 rounded-lg p-2 flex justify-between items-center">
                <span className="text-slate-400 text-xs">Your Cashback Balance</span>
                <span className="text-amber-400 font-bold text-sm">GHS {clientCashbackBalance.toFixed(2)}</span>
              </div>
              
              {/* Cash unavailable warning */}
              {!isCashAvailable && (
                <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
                  <p className="text-amber-400 text-xs">
                    {cashUnavailableReason || "Cash payment not available for this merchant"}
                  </p>
                </div>
              )}
              
              {/* Hybrid Payment Breakdown */}
              {paymentMethod === 'hybrid' && parsedAmount > 0 && (
                <div className="mt-3 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 space-y-2">
                  <p className="text-purple-400 text-xs font-medium">Payment Breakdown:</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-400 flex items-center gap-1"><Wallet size={14} /> Cashback</span>
                    <span className="text-amber-400">GHS {calculateHybridBreakdown().cashbackToUse.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-400 flex items-center gap-1"><Smartphone size={14} /> MoMo</span>
                    <span className="text-blue-400">GHS {calculateHybridBreakdown().momoToUse.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="text-slate-300 text-sm block mb-2">Amount to Pay</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">GHS</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-14 bg-slate-900 border-slate-700 text-white text-xl font-bold"
                  data-testid="merchant-pay-amount"
                />
              </div>
            </div>
            
            {/* MoMo-specific fields */}
            {paymentMethod === 'momo' && (
              <>
                {/* Phone Input */}
                <div className="mb-4">
                  <label className="text-slate-300 text-sm block mb-2">Your MoMo Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="tel"
                      placeholder="+233 XX XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                      data-testid="merchant-pay-phone"
                    />
                  </div>
                </div>

                {/* Network Selector */}
                <div className="mb-6">
                  <label className="text-slate-300 text-sm block mb-2">Network</label>
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                    data-testid="merchant-pay-network"
                  >
                    <option value="MTN">MTN MoMo</option>
                    <option value="TELECEL">Telecel (ex-Vodafone)</option>
                    <option value="AIRTELTIGO">AirtelTigo (AT)</option>
                  </select>
                </div>
              </>
            )}
            
            {/* Hybrid-specific fields (MoMo for remaining amount) */}
            {paymentMethod === 'hybrid' && calculateHybridBreakdown().momoToUse > 0 && (
              <>
                {/* Phone Input for Hybrid */}
                <div className="mb-4">
                  <label className="text-slate-300 text-sm block mb-2">MoMo Number (for GHS {calculateHybridBreakdown().momoToUse.toFixed(2)})</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="tel"
                      placeholder="+233 XX XXX XXXX"
                      value={hybridMomoPhone}
                      onChange={(e) => setHybridMomoPhone(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                      data-testid="hybrid-pay-phone"
                    />
                  </div>
                </div>
              </>
            )}
            
            {/* Cashback Payment Info */}
            {paymentMethod === 'cashback' && (
              <div className={`mb-6 ${isCashbackSufficient ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'} border rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <Wallet className={`${isCashbackSufficient ? 'text-amber-400' : 'text-red-400'} shrink-0 mt-0.5`} size={20} />
                  <div>
                    <p className={`${isCashbackSufficient ? 'text-amber-400' : 'text-red-400'} font-medium text-sm`}>
                      {isCashbackSufficient ? 'Pay with Cashback' : 'Insufficient Cashback Balance'}
                    </p>
                    {isCashbackSufficient ? (
                      <>
                        <p className="text-slate-400 text-xs mt-1">
                          GHS {parsedAmount.toFixed(2)} will be deducted from your cashback balance.
                        </p>
                        <p className="text-amber-400 text-xs mt-1">
                          Balance after: GHS {(clientCashbackBalance - parsedAmount).toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-400 text-xs mt-1">
                        You need GHS {(parsedAmount - clientCashbackBalance).toFixed(2)} more. Try Hybrid payment instead.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Cash Payment Info */}
            {paymentMethod === 'cash' && (
              <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Wallet className="text-emerald-400 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-emerald-400 font-medium text-sm">Cash Payment</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Pay cash directly to the merchant. Your cashback will be credited instantly to your wallet.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Cashback Preview */}
            {amount && parseFloat(amount) > 0 && paymentMethod !== 'cashback' && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">You'll earn</span>
                  <span className="text-emerald-400 text-xl font-bold">
                    +GHS {cashbackAmount}
                  </span>
                </div>
              </div>
            )}
            
            {/* Pay Button */}
            <Button
              onClick={handlePayment}
              disabled={
                isProcessing || 
                !amount || 
                parseFloat(amount) <= 0 || 
                (paymentMethod === 'momo' && !phone) ||
                (paymentMethod === 'cashback' && !isCashbackSufficient) ||
                (paymentMethod === 'hybrid' && calculateHybridBreakdown().momoToUse > 0 && hybridMomoPhone.length < 10)
              }
              className={`w-full py-6 ${
                paymentMethod === 'cash'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600'
                  : paymentMethod === 'cashback'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600'
                    : paymentMethod === 'hybrid'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
              }`}
              data-testid="merchant-pay-submit"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : paymentMethod === 'cash' ? (
                <Banknote className="mr-2" size={18} />
              ) : paymentMethod === 'cashback' ? (
                <Wallet className="mr-2" size={18} />
              ) : paymentMethod === 'hybrid' ? (
                <div className="flex items-center mr-2"><Wallet size={16} /><span className="mx-1">+</span><Smartphone size={16} /></div>
              ) : (
                <Smartphone className="mr-2" size={18} />
              )}
              {paymentMethod === 'cash' 
                ? 'Record Cash Payment' 
                : paymentMethod === 'cashback'
                  ? 'Pay with Cashback'
                  : paymentMethod === 'hybrid'
                    ? `Pay (GHS ${calculateHybridBreakdown().cashbackToUse.toFixed(2)} CB + GHS ${calculateHybridBreakdown().momoToUse.toFixed(2)} MoMo)`
                    : 'Pay with MoMo'
              }
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { 
  X, Wallet, Phone, Building2, CheckCircle, AlertCircle, 
  Loader2, Send, Settings, ArrowDownLeft
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export default function WithdrawalModal({
  isOpen,
  balance,
  phone,
  setPhone,
  amount,
  setAmount,
  network,
  setNetwork,
  method,
  setMethod,
  status,
  setStatus,
  isProcessing,
  isTestMode,
  paymentSettings,
  withdrawalFee = { type: 'fixed', rate: 0 },
  onClose,
  onInitiate,
  onCheckStatus,
  onConfirmTest,
  onOpenPaymentSettings
}) {
  if (!isOpen) return null;

  const maxAmount = Math.min(balance || 0, 1000);
  const quickAmounts = [5, 10, 20, 50].filter(a => a <= balance);
  
  // Calculate fee and net amount
  const amountNum = parseFloat(amount) || 0;
  const feeAmount = withdrawalFee.type === 'percentage' 
    ? amountNum * (withdrawalFee.rate / 100) 
    : withdrawalFee.rate;
  const netAmount = Math.max(0, amountNum - feeAmount);

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
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ArrowDownLeft className="text-white" size={32} />
          </div>
          <h3 className="text-white text-xl font-bold">Withdraw Cashback</h3>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Wallet className="text-amber-400" size={16} />
            <span className="text-amber-400 font-semibold">GHS {balance?.toFixed(2) || '0.00'}</span>
            <span className="text-slate-500">available</span>
          </div>
        </div>
        
        {/* Status Display */}
        {status === 'success' ? (
          <div className="text-center py-8">
            <CheckCircle className="text-emerald-400 mx-auto mb-4" size={64} />
            <p className="text-white text-lg font-semibold">Withdrawal Successful!</p>
            <p className="text-slate-400 mt-2">Funds sent to your {method === 'bank' ? 'bank account' : 'MoMo'}</p>
          </div>
        ) : status === 'failed' ? (
          <div className="text-center py-8">
            <AlertCircle className="text-red-400 mx-auto mb-4" size={64} />
            <p className="text-white text-lg font-semibold">Withdrawal Failed</p>
            <Button onClick={() => setStatus(null)} className="mt-4 bg-amber-500 hover:bg-amber-600">
              Try Again
            </Button>
          </div>
        ) : status === 'pending' ? (
          <div className="text-center py-6">
            <div className="relative inline-block">
              <Phone className="text-amber-400 mx-auto mb-4" size={48} />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-ping" />
            </div>
            <p className="text-white text-lg font-semibold">Processing Withdrawal</p>
            <p className="text-slate-400 mt-2 text-sm">Please wait...</p>
            
            <div className="mt-6 pt-4 border-t border-slate-700">
              <Button
                onClick={onCheckStatus}
                disabled={isProcessing}
                variant="outline"
                className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                data-testid="check-withdrawal-status-btn"
              >
                {isProcessing ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle className="mr-2" size={16} />}
                Check Status
              </Button>
            </div>
            
            {isTestMode && (
              <div className="mt-4">
                <p className="text-slate-500 text-xs mb-3">Test Mode</p>
                <Button
                  onClick={onConfirmTest}
                  disabled={isProcessing}
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                  data-testid="confirm-test-withdrawal-btn"
                >
                  {isProcessing ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle className="mr-2" size={16} />}
                  Confirm (Test)
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Method Selection */}
            <div className="mb-6">
              <label className="text-slate-300 text-sm block mb-3">Choose Withdrawal Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod('momo')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    method === 'momo'
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                  }`}
                  data-testid="withdrawal-method-momo"
                >
                  <Phone className={`mx-auto mb-2 ${method === 'momo' ? 'text-amber-400' : 'text-slate-400'}`} size={24} />
                  <p className={`text-sm font-medium ${method === 'momo' ? 'text-white' : 'text-slate-400'}`}>Mobile Money</p>
                  <p className="text-xs text-slate-500 mt-1">Instant</p>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('bank')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    method === 'bank'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                  }`}
                  data-testid="withdrawal-method-bank"
                >
                  <Building2 className={`mx-auto mb-2 ${method === 'bank' ? 'text-blue-400' : 'text-slate-400'}`} size={24} />
                  <p className={`text-sm font-medium ${method === 'bank' ? 'text-white' : 'text-slate-400'}`}>Bank Account</p>
                  <p className="text-xs text-slate-500 mt-1">1-3 days</p>
                </button>
              </div>
            </div>
            
            {/* MoMo Details */}
            {method === 'momo' && (
              <>
                <div className="mb-4">
                  <label className="text-slate-300 text-sm block mb-2">MoMo Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="tel"
                      placeholder="0XX XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                      data-testid="withdrawal-phone"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="text-slate-300 text-sm block mb-2">Network</label>
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2"
                    data-testid="withdrawal-network"
                  >
                    <option value="">Select Network</option>
                    <option value="MTN">MTN MoMo</option>
                    <option value="TELECEL">Telecel (ex-Vodafone)</option>
                    <option value="AIRTELTIGO">AirtelTigo (AT)</option>
                  </select>
                </div>
              </>
            )}
            
            {/* Bank Details */}
            {method === 'bank' && (
              <div className="mb-4 bg-slate-900 rounded-xl p-4">
                {paymentSettings?.bank_name && paymentSettings?.bank_account ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <Building2 className="text-blue-400" size={20} />
                      <div>
                        <p className="text-white font-medium">{paymentSettings.bank_name}</p>
                        <p className="text-slate-400 text-sm">{paymentSettings.bank_account}</p>
                        {paymentSettings.bank_branch && (
                          <p className="text-slate-500 text-xs">{paymentSettings.bank_branch}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenPaymentSettings}
                      className="text-amber-400 text-sm hover:underline"
                    >
                      Change bank account
                    </button>
                  </>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-slate-400 text-sm mb-3">No bank account configured</p>
                    <Button
                      onClick={onOpenPaymentSettings}
                      variant="outline"
                      className="border-amber-500/50 text-amber-400"
                    >
                      <Settings className="mr-2" size={16} />
                      Configure Bank Account
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Amount */}
            <div className="mb-6">
              <label className="text-slate-300 text-sm block mb-2">
                Amount (GHS) - Min: 5, Max: {maxAmount.toFixed(0)}
              </label>
              <Input
                type="number"
                min="5"
                max={maxAmount}
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white text-2xl text-center py-6"
                data-testid="withdrawal-amount"
              />
            </div>
            
            {/* Quick Amounts */}
            <div className="flex gap-2 mb-4">
              {quickAmounts.map(amt => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt.toString())}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm"
                >
                  {amt}
                </button>
              ))}
              {balance >= 5 && (
                <button
                  onClick={() => setAmount(balance.toFixed(2))}
                  className="flex-1 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm"
                >
                  All
                </button>
              )}
            </div>
            
            {/* Fee Display */}
            {amountNum >= 5 && (withdrawalFee.rate > 0) && (
              <div className="bg-slate-900 rounded-xl p-4 mb-4 space-y-2" data-testid="withdrawal-fee-display">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Amount</span>
                  <span className="text-white">GHS {amountNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    Fee ({withdrawalFee.type === 'percentage' ? `${withdrawalFee.rate}%` : `GHS ${withdrawalFee.rate}`})
                  </span>
                  <span className="text-amber-400">- GHS {feeAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between">
                  <span className="text-white font-medium">You Receive</span>
                  <span className="text-emerald-400 font-bold">GHS {netAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
            
            {/* Withdraw Button */}
            <Button
              onClick={onInitiate}
              disabled={isProcessing || !amount || parseFloat(amount) < 5}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 py-6"
              data-testid="initiate-withdrawal-btn"
            >
              {isProcessing ? <Loader2 className="animate-spin mr-2" size={18} /> : <Send className="mr-2" size={18} />}
              Withdraw GHS {amount || '0'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { Button } from '../../ui/button';
import { 
  Store, XCircle, Wallet, Settings, Ban, UserCheck, 
  Trash2, Key, History, Send, Unlock, MapPin
} from 'lucide-react';

export default function MerchantDetailsModal({
  merchant,
  onClose,
  onSuspend,
  onBlock,
  onActivate,
  onDelete,
  onResetPassword,
  onViewHistory,
  onSendSMS,
  onConfigureDebit,
  onUnblockDebit,
  getStatusBadge,
  actionLoading
}) {
  if (!merchant) return null;

  const debitAccount = merchant.debit_account || {};
  const debitUsagePercent = debitAccount.limit > 0 
    ? (Math.abs(debitAccount.balance || 0) / debitAccount.limit) * 100
    : 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Store className="text-emerald-400" size={24} />
            <div>
              <h2 className="text-white font-semibold">{merchant.business_name}</h2>
              <p className="text-slate-400 text-sm">{merchant.owner_name}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-400">
            <XCircle size={24} />
          </Button>
        </div>

        {/* Merchant Info */}
        <div className="p-4 border-b border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs">Phone</p>
              <p className="text-white">{merchant.phone}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs">Cashback Rate</p>
              <p className="text-amber-400">{merchant.cashback_rate}%</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs">Location</p>
              <p className="text-white">{merchant.city || 'Not set'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs">Status</p>
              {getStatusBadge(merchant.status)}
            </div>
          </div>
          {merchant.address && (
            <div className="mt-4 bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs">Full Address</p>
              <p className="text-white">{merchant.address}</p>
              {merchant.google_maps_url && (
                <a href={merchant.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline flex items-center gap-1 mt-1">
                  <MapPin size={14} /> View on Google Maps
                </a>
              )}
            </div>
          )}
        </div>

        {/* Debit Account Section */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <Wallet size={18} className="text-amber-400" /> Debit Account (Cash Payments)
          </h3>
          <div className="bg-gradient-to-br from-amber-900/20 to-slate-900 border border-amber-500/30 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-slate-400 text-xs">Current Balance</p>
                <p className={`text-xl font-bold ${(debitAccount.balance || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  GHS {(debitAccount.balance || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Debit Limit</p>
                <p className="text-amber-400 text-xl font-bold">
                  GHS {(debitAccount.limit || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Usage</p>
                <p className="text-white text-xl font-bold">{debitUsagePercent.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Status</p>
                {debitAccount.is_blocked ? (
                  <span className="text-red-400 font-semibold">Blocked</span>
                ) : debitAccount.limit > 0 ? (
                  <span className="text-emerald-400 font-semibold">Active</span>
                ) : (
                  <span className="text-slate-500 font-semibold">Not Configured</span>
                )}
              </div>
            </div>
            
            {/* Usage Bar */}
            {(debitAccount.limit || 0) > 0 && (
              <div className="mb-4">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      debitUsagePercent >= 100 ? 'bg-red-500' :
                      debitUsagePercent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, debitUsagePercent)}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Configure Button */}
            <div className="flex gap-2">
              <Button
                onClick={() => onConfigureDebit(merchant)}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Settings size={16} className="mr-2" /> Configure Debit Limit
              </Button>
              {debitAccount.is_blocked && (
                <Button
                  onClick={() => onUnblockDebit(merchant.id)}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Unlock size={16} className="mr-2" /> Unblock Debit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-900 rounded-b-xl flex flex-wrap gap-2 justify-end">
          <Button 
            onClick={() => onViewHistory(merchant)}
            variant="outline"
            className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
          >
            <History size={16} className="mr-2" /> Transaction History
          </Button>
          <Button 
            onClick={() => onSendSMS(merchant)}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
          >
            <Send size={16} className="mr-2" /> Send SMS
          </Button>
          <Button 
            onClick={() => onResetPassword('merchant', merchant)}
            variant="outline"
            className="border-amber-500 text-amber-400 hover:bg-amber-500/10"
            disabled={actionLoading}
          >
            <Key size={16} className="mr-2" /> Reset Password
          </Button>
          {merchant.status === 'active' && (
            <>
              <Button 
                onClick={() => onSuspend(merchant.id)}
                variant="outline"
                className="border-amber-500 text-amber-400 hover:bg-amber-500/10"
                disabled={actionLoading}
              >
                <Ban size={16} className="mr-2" /> Suspend
              </Button>
              <Button 
                onClick={() => onBlock(merchant.id)}
                variant="outline"
                className="border-red-500 text-red-400 hover:bg-red-500/10"
                disabled={actionLoading}
              >
                <Ban size={16} className="mr-2" /> Block
              </Button>
            </>
          )}
          {(merchant.status === 'suspended' || merchant.status === 'blocked') && (
            <Button 
              onClick={() => onActivate(merchant.id)}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={actionLoading}
            >
              <UserCheck size={16} className="mr-2" /> Reactivate
            </Button>
          )}
          <Button 
            onClick={() => onDelete(merchant.id)}
            variant="outline"
            className="border-red-500 text-red-400 hover:bg-red-500/10"
            disabled={actionLoading}
          >
            <Trash2 size={16} className="mr-2" /> Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}

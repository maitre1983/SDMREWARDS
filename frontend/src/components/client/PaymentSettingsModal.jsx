import React from 'react';
import { X, Settings, Phone, Building2, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export default function PaymentSettingsModal({
  isOpen,
  settings,
  setSettings,
  defaultMethod,
  setDefaultMethod,
  isSaving,
  onClose,
  onSave
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={24} />
        </button>
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="text-amber-400" size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">Payment Settings</h3>
          <p className="text-slate-400 text-sm mt-1">
            Configure where you receive your withdrawals
          </p>
        </div>
        
        {/* Mobile Money Section */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <Phone size={18} className="text-amber-400" />
            Mobile Money
          </h4>
          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Phone Number</label>
              <Input
                type="tel"
                placeholder="0XX XXX XXXX"
                value={settings.momo_number || ''}
                onChange={(e) => setSettings({...settings, momo_number: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
                data-testid="settings-momo-number"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Network</label>
              <select
                value={settings.momo_network || 'MTN'}
                onChange={(e) => setSettings({...settings, momo_network: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2"
                data-testid="settings-momo-network"
              >
                <option value="MTN">MTN MoMo</option>
                <option value="TELECEL">Telecel (ex-Vodafone)</option>
                <option value="AIRTELTIGO">AirtelTigo (AT)</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Bank Account Section */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <Building2 size={18} className="text-blue-400" />
            Bank Account
          </h4>
          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Bank Name</label>
              <Input
                type="text"
                placeholder="E.g. GCB Bank, Ecobank..."
                value={settings.bank_name || ''}
                onChange={(e) => setSettings({...settings, bank_name: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
                data-testid="settings-bank-name"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Account Number</label>
              <Input
                type="text"
                placeholder="Your account number"
                value={settings.bank_account || ''}
                onChange={(e) => setSettings({...settings, bank_account: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
                data-testid="settings-bank-account"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Branch (Optional)</label>
              <Input
                type="text"
                placeholder="E.g. Accra Main Branch"
                value={settings.bank_branch || ''}
                onChange={(e) => setSettings({...settings, bank_branch: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
                data-testid="settings-bank-branch"
              />
            </div>
          </div>
        </div>
        
        {/* Default Method */}
        <div className="mb-6">
          <label className="text-slate-400 text-xs block mb-2">Default Withdrawal Method</label>
          <div className="flex gap-3">
            <button
              onClick={() => setDefaultMethod('momo')}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                defaultMethod === 'momo'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-900 hover:border-slate-600'
              }`}
              data-testid="default-method-momo"
            >
              <Phone className={`mx-auto mb-1 ${defaultMethod === 'momo' ? 'text-amber-400' : 'text-slate-400'}`} size={20} />
              <p className={`text-xs ${defaultMethod === 'momo' ? 'text-white' : 'text-slate-400'}`}>MoMo</p>
            </button>
            <button
              onClick={() => setDefaultMethod('bank')}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                defaultMethod === 'bank'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-900 hover:border-slate-600'
              }`}
              data-testid="default-method-bank"
            >
              <Building2 className={`mx-auto mb-1 ${defaultMethod === 'bank' ? 'text-blue-400' : 'text-slate-400'}`} size={20} />
              <p className={`text-xs ${defaultMethod === 'bank' ? 'text-white' : 'text-slate-400'}`}>Bank</p>
            </button>
          </div>
        </div>
        
        {/* Save Button */}
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="w-full bg-amber-500 hover:bg-amber-600"
          data-testid="save-payment-settings-btn"
        >
          {isSaving ? (
            <Loader2 className="animate-spin mr-2" size={18} />
          ) : (
            <CheckCircle className="mr-2" size={18} />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

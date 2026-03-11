import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Shield, CreditCard, Gift, Banknote, UserPlus,
  MessageSquare, Users, Sliders, Loader2, Settings
} from 'lucide-react';

// Import settings sub-components
import SettingsCards from './settings/SettingsCards';
import SettingsServices from './settings/SettingsServices';
import SettingsReferrals from './settings/SettingsReferrals';
import SettingsDebit from './settings/SettingsDebit';
import SettingsUsers from './settings/SettingsUsers';
import SettingsSMS from './settings/SettingsSMS';
import SettingsSecurity from './settings/SettingsSecurity';
import SettingsAdmins from './settings/SettingsAdmins';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminSettings({ token, admin, pinVerified, setPinVerified, setShowPinModal }) {
  const [settingsTab, setSettingsTab] = useState('cards');
  const [isLoading, setIsLoading] = useState(true);
  const [platformConfig, setPlatformConfig] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (pinVerified) {
      fetchPlatformConfig();
    }
  }, [pinVerified]);

  const fetchPlatformConfig = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/api/admin/platform-config`, { headers });
      setPlatformConfig(res.data);
    } catch (error) {
      console.error('Error fetching platform config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const settingsTabs = [
    { id: 'cards', label: 'Card Prices', icon: CreditCard },
    { id: 'services', label: 'Service Fees', icon: Sliders },
    { id: 'referrals', label: 'Referrals', icon: Gift },
    { id: 'debit', label: 'Merchant Debit', icon: Banknote },
    { id: 'users', label: 'Add Users', icon: UserPlus },
    { id: 'sms', label: 'SMS Center', icon: MessageSquare },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'admins', label: 'Admin Users', icon: Users }
  ];

  // Show PIN prompt if not verified
  if (!pinVerified) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
        <Shield className="text-purple-400 mx-auto mb-4" size={48} />
        <h3 className="text-white text-xl font-semibold mb-2">PIN Required</h3>
        <p className="text-slate-400 mb-6">Enter your PIN to access Settings</p>
        <Button 
          onClick={() => setShowPinModal(true)} 
          className="bg-purple-600 hover:bg-purple-700"
          data-testid="enter-pin-btn"
        >
          <Shield size={16} className="mr-2" /> Enter PIN
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Sub-tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-800 p-2 rounded-xl overflow-x-auto">
        {settingsTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSettingsTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
              settingsTab === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:bg-slate-700'
            }`}
            data-testid={`settings-tab-${tab.id}`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Card Prices Settings */}
      {settingsTab === 'cards' && (
        <SettingsCards 
          token={token} 
          platformConfig={platformConfig}
          onConfigUpdate={fetchPlatformConfig}
        />
      )}

      {/* Service Fees Settings */}
      {settingsTab === 'services' && (
        <SettingsServices 
          token={token}
          platformConfig={platformConfig}
          onConfigUpdate={fetchPlatformConfig}
        />
      )}

      {/* Referrals Settings */}
      {settingsTab === 'referrals' && (
        <SettingsReferrals 
          token={token}
          platformConfig={platformConfig}
          onConfigUpdate={fetchPlatformConfig}
        />
      )}

      {/* Merchant Debit Settings */}
      {settingsTab === 'debit' && (
        <SettingsDebit token={token} />
      )}

      {/* Add Users Settings */}
      {settingsTab === 'users' && (
        <SettingsUsers token={token} />
      )}

      {/* SMS Center Settings */}
      {settingsTab === 'sms' && (
        <SettingsSMS token={token} />
      )}

      {/* Security Settings */}
      {settingsTab === 'security' && (
        <SettingsSecurity token={token} admin={admin} />
      )}

      {/* Admin Users Management */}
      {settingsTab === 'admins' && (
        <SettingsAdmins token={token} currentAdmin={admin} />
      )}
    </div>
  );
}

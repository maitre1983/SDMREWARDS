import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { 
  Shield, Key, Lock, Loader2, CheckCircle, AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SettingsSecurity({ token, admin }) {
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [pinForm, setPinForm] = useState({ current_pin: '', new_pin: '', confirm_pin: '' });
  const [passwordForm, setPasswordForm] = useState({ 
    current_password: '', new_password: '', confirm_password: '' 
  });

  const headers = { Authorization: `Bearer ${token}` };

  const handleChangePIN = async () => {
    if (pinForm.new_pin !== pinForm.confirm_pin) {
      toast.error('New PINs do not match');
      return;
    }
    if (pinForm.new_pin.length < 4 || pinForm.new_pin.length > 6) {
      toast.error('PIN must be 4-6 digits');
      return;
    }

    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/api/admin/security/change-pin`, {
        current_pin: pinForm.current_pin,
        new_pin: pinForm.new_pin
      }, { headers });
      
      toast.success('PIN changed successfully');
      setShowChangePinModal(false);
      setPinForm({ current_pin: '', new_pin: '', confirm_pin: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change PIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/api/admin/security/change-password`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      }, { headers });
      
      toast.success('Password changed successfully');
      setShowChangePasswordModal(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
          <Shield size={20} className="text-purple-400" /> Security Settings
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Change PIN */}
          <div className="bg-slate-900 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Key className="text-purple-400" size={20} />
              </div>
              <div>
                <h4 className="text-white font-medium">Settings PIN</h4>
                <p className="text-slate-400 text-sm">Protect your admin settings</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowChangePinModal(true)}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Key size={16} className="mr-2" /> Change PIN
            </Button>
          </div>

          {/* Change Password */}
          <div className="bg-slate-900 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Lock className="text-blue-400" size={20} />
              </div>
              <div>
                <h4 className="text-white font-medium">Account Password</h4>
                <p className="text-slate-400 text-sm">Change your login password</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowChangePasswordModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Lock size={16} className="mr-2" /> Change Password
            </Button>
          </div>
        </div>

        {/* Security Info */}
        <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-400" /> Security Recommendations
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              Use a unique PIN different from common patterns (1234, 0000)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              Change your password regularly
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              Never share your admin credentials
            </li>
          </ul>
        </div>
      </div>

      {/* Change PIN Modal */}
      {showChangePinModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold text-lg mb-4">Change Settings PIN</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Current PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinForm.current_pin}
                  onChange={(e) => setPinForm({...pinForm, current_pin: e.target.value.replace(/\D/g, '')})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white text-center tracking-widest"
                  placeholder="****"
                />
              </div>
              <div>
                <Label className="text-slate-400">New PIN (4-6 digits)</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinForm.new_pin}
                  onChange={(e) => setPinForm({...pinForm, new_pin: e.target.value.replace(/\D/g, '')})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white text-center tracking-widest"
                  placeholder="****"
                />
              </div>
              <div>
                <Label className="text-slate-400">Confirm New PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinForm.confirm_pin}
                  onChange={(e) => setPinForm({...pinForm, confirm_pin: e.target.value.replace(/\D/g, '')})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white text-center tracking-widest"
                  placeholder="****"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => { setShowChangePinModal(false); setPinForm({ current_pin: '', new_pin: '', confirm_pin: '' }); }}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePIN}
                disabled={isLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Key className="mr-2" size={16} />}
                Change PIN
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold text-lg mb-4">Change Password</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Current Password</Label>
                <Input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-400">New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-400">Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => { setShowChangePasswordModal(false); setPasswordForm({ current_password: '', new_password: '', confirm_password: '' }); }}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Lock className="mr-2" size={16} />}
                Change Password
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

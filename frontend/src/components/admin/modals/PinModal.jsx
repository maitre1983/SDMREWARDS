import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { XCircle, Shield, Loader2, Eye, EyeOff } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PinModal({ 
  isOpen, 
  onClose, 
  token,
  onSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (pin.length !== 4) {
      toast.error('PIN must be 4 digits');
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await axios.post(
        `${API_URL}/api/admin/verify-pin`,
        { pin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.success) {
        toast.success('PIN verified successfully');
        setPin('');
        onSuccess?.();
        onClose();
      } else {
        toast.error('Invalid PIN');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-sm">
        {/* Header */}
        <div className="border-b border-slate-700 p-4 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-3">
            <Shield className="text-purple-400" size={32} />
          </div>
          <h2 className="text-white font-semibold text-lg">Enter PIN</h2>
          <p className="text-slate-400 text-sm mt-1">Enter your PIN to access Settings</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <div className="relative">
              <Input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-center text-2xl tracking-widest bg-slate-900 border-slate-700 text-white"
                placeholder="••••"
                maxLength={4}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-slate-500 text-xs text-center mt-2">Default PIN: 0000</p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setPin(''); onClose(); }}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || pin.length !== 4}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Verify
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SetPinModal({ 
  isOpen, 
  onClose, 
  token,
  onSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [form, setForm] = useState({
    current_pin: '',
    new_pin: '',
    confirm_pin: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.new_pin !== form.confirm_pin) {
      toast.error('PINs do not match');
      return;
    }
    
    if (form.new_pin.length !== 4) {
      toast.error('PIN must be 4 digits');
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.post(
        `${API_URL}/api/admin/change-pin`,
        { current_pin: form.current_pin, new_pin: form.new_pin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('PIN changed successfully');
      setForm({ current_pin: '', new_pin: '', confirm_pin: '' });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-sm">
        {/* Header */}
        <div className="border-b border-slate-700 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="text-purple-400" size={20} />
            <h2 className="text-white font-semibold">Change PIN</h2>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            <XCircle size={20} />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <Label className="text-slate-300">Current PIN</Label>
            <Input
              type={showPin ? 'text' : 'password'}
              value={form.current_pin}
              onChange={(e) => setForm({ ...form, current_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className="mt-1 text-center tracking-widest bg-slate-900 border-slate-700 text-white"
              placeholder="••••"
              maxLength={4}
            />
          </div>

          <div>
            <Label className="text-slate-300">New PIN</Label>
            <Input
              type={showPin ? 'text' : 'password'}
              value={form.new_pin}
              onChange={(e) => setForm({ ...form, new_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className="mt-1 text-center tracking-widest bg-slate-900 border-slate-700 text-white"
              placeholder="••••"
              maxLength={4}
            />
          </div>

          <div>
            <Label className="text-slate-300">Confirm New PIN</Label>
            <Input
              type={showPin ? 'text' : 'password'}
              value={form.confirm_pin}
              onChange={(e) => setForm({ ...form, confirm_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className="mt-1 text-center tracking-widest bg-slate-900 border-slate-700 text-white"
              placeholder="••••"
              maxLength={4}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showPin"
              checked={showPin}
              onChange={(e) => setShowPin(e.target.checked)}
              className="rounded border-slate-600"
            />
            <label htmlFor="showPin" className="text-slate-400 text-sm">Show PIN</label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Change PIN
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { XCircle, Key, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function ResetPasswordModal({ 
  isOpen, 
  onClose, 
  target, // { type: 'client' | 'merchant', data: {...} }
  token,
  onSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    new_password: '',
    confirm_password: ''
  });

  if (!isOpen || !target) return null;

  const { type, data } = target;
  const name = type === 'client' ? data.full_name : data.business_name;
  const phone = data.phone;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.new_password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (form.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const endpoint = type === 'client' 
        ? `/api/admin/clients/${data.id}/reset-password`
        : `/api/admin/merchants/${data.id}/reset-password`;
        
      await axios.post(
        `${API_URL}${endpoint}`,
        { new_password: form.new_password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Password reset successfully for ${name}`);
      setForm({ new_password: '', confirm_password: '' });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="border-b border-slate-700 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Key className="text-cyan-400" size={20} />
            <h2 className="text-white font-semibold">Reset Password</h2>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            <XCircle size={20} />
          </Button>
        </div>

        {/* User Info */}
        <div className="p-4 bg-slate-900/50 border-b border-slate-700">
          <p className="text-white font-medium">{name}</p>
          <p className="text-slate-400 text-sm">{phone}</p>
          <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
            type === 'client' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {type === 'client' ? 'Client' : 'Merchant'}
          </span>
        </div>

        {/* Warning */}
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
          <p className="text-amber-400 text-sm">
            This will immediately reset the user's password. They will need to use the new password to log in.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <Label className="text-slate-300">New Password</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                className="pr-10 bg-slate-900 border-slate-700 text-white"
                placeholder="Enter new password"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Confirm Password</Label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              className="mt-1 bg-slate-900 border-slate-700 text-white"
              placeholder="Confirm new password"
              minLength={6}
              required
            />
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
              disabled={loading || form.new_password.length < 6}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Reset Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

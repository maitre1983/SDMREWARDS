import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { XCircle, UserPlus, Loader2, Phone, User, Mail, CreditCard } from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function CreateClientModal({ 
  isOpen, 
  onClose, 
  token,
  onSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    username: '',
    email: '',
    card_type: '',
    password: '000000'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.full_name || !form.phone) {
      toast.error('Full name and phone are required');
      return;
    }
    
    setLoading(true);
    
    try {
      // Auto-generate username from full_name if not provided
      const username = form.username || form.full_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString().slice(-4);
      
      await axios.post(
        `${API_URL}/api/admin/clients/create-manual`,
        { ...form, username },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Client created successfully');
      setForm({ full_name: '', phone: '', username: '', email: '', card_type: '', password: '000000' });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <UserPlus className="text-blue-400" size={20} />
            <h2 className="text-white font-semibold">Create New Client</h2>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            <XCircle size={20} />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <Label className="text-slate-300">Full Name *</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <Input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="pl-9 bg-slate-900 border-slate-700 text-white"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Phone Number *</Label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="pl-9 bg-slate-900 border-slate-700 text-white"
                placeholder="+233 XXX XXX XXX"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Username</Label>
            <Input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="mt-1 bg-slate-900 border-slate-700 text-white"
              placeholder="johndoe"
            />
            <p className="text-slate-500 text-xs mt-1">Auto-generated if left empty</p>
          </div>

          <div>
            <Label className="text-slate-300">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="pl-9 bg-slate-900 border-slate-700 text-white"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Card Type</Label>
            <div className="relative mt-1">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <select
                value={form.card_type}
                onChange={(e) => setForm({ ...form, card_type: e.target.value })}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
              >
                <option value="">No Card</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-slate-400 text-sm">
              Default password: <span className="text-amber-400 font-mono">000000</span>
            </p>
            <p className="text-slate-500 text-xs mt-1">
              The client can change this after their first login.
            </p>
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
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Create Client
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

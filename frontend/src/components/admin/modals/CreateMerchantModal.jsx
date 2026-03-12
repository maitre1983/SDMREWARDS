import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { XCircle, Store, Loader2, Phone, User, Mail, MapPin, Building } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function CreateMerchantModal({ 
  isOpen, 
  onClose, 
  token,
  onSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    business_name: '',
    owner_name: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    business_type: '',
    password: '000000'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.business_name || !form.phone || !form.owner_name) {
      toast.error('Business name, owner name, and phone are required');
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.post(
        `${API_URL}/api/admin/merchants/create`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Merchant created successfully');
      setForm({
        business_name: '',
        owner_name: '',
        phone: '',
        email: '',
        city: '',
        address: '',
        business_type: '',
        password: '000000'
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create merchant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Store className="text-emerald-400" size={20} />
            <h2 className="text-white font-semibold">Create New Merchant</h2>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            <XCircle size={20} />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-slate-300">Business Name *</Label>
              <div className="relative mt-1">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <Input
                  type="text"
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  className="pl-9 bg-slate-900 border-slate-700 text-white"
                  placeholder="ABC Store"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Owner Name *</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <Input
                  type="text"
                  value={form.owner_name}
                  onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
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
              <Label className="text-slate-300">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-9 bg-slate-900 border-slate-700 text-white"
                  placeholder="store@example.com"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Business Type</Label>
              <select
                value={form.business_type}
                onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
              >
                <option value="">Select type</option>
                <option value="retail">Retail</option>
                <option value="restaurant">Restaurant</option>
                <option value="supermarket">Supermarket</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="fuel_station">Fuel Station</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <Label className="text-slate-300">City</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <Input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="pl-9 bg-slate-900 border-slate-700 text-white"
                  placeholder="Accra"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Address</Label>
              <Input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 bg-slate-900 border-slate-700 text-white"
                placeholder="123 Main Street"
              />
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-slate-400 text-sm">
              Default password: <span className="text-amber-400 font-mono">000000</span>
            </p>
            <p className="text-slate-500 text-xs mt-1">
              The merchant can change this after their first login.
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
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Create Merchant
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

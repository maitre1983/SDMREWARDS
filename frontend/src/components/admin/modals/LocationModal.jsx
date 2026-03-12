import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { XCircle, MapPin, Loader2, Link2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function LocationModal({ 
  isOpen, 
  onClose, 
  merchant, 
  token,
  onSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    address: merchant?.address || '',
    google_maps_url: merchant?.google_maps_url || '',
    city: merchant?.city || ''
  });

  if (!isOpen || !merchant) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.put(
        `${API_URL}/api/admin/merchants/${merchant.id}/location`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Merchant location updated successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update location');
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
            <MapPin className="text-emerald-400" size={20} />
            <h2 className="text-white font-semibold">Update Location</h2>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            <XCircle size={20} />
          </Button>
        </div>

        {/* Merchant Info */}
        <div className="p-4 bg-slate-900/50 border-b border-slate-700">
          <p className="text-white font-medium">{merchant.business_name}</p>
          <p className="text-slate-400 text-sm">{merchant.phone}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <Label className="text-slate-300">City</Label>
            <Input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="mt-1 bg-slate-900 border-slate-700 text-white"
              placeholder="e.g., Accra"
            />
          </div>

          <div>
            <Label className="text-slate-300">Full Address</Label>
            <Input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 bg-slate-900 border-slate-700 text-white"
              placeholder="e.g., 123 Main Street, East Legon"
            />
          </div>

          <div>
            <Label className="text-slate-300">Google Maps URL</Label>
            <div className="relative mt-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <Input
                type="url"
                value={form.google_maps_url}
                onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })}
                className="pl-9 bg-slate-900 border-slate-700 text-white"
                placeholder="https://maps.google.com/..."
              />
            </div>
            <p className="text-slate-500 text-xs mt-1">Paste the Google Maps link to this location</p>
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
              Save Location
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Store, Save, Loader2, MapPin, Globe, Building, 
  Phone, AlertCircle, Map
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function BusinessInfoEditor({ token, merchant, onUpdate }) {
  const [formData, setFormData] = useState({
    business_name: merchant?.business_name || '',
    business_type: merchant?.business_type || '',
    business_address: merchant?.business_address || '',
    city: merchant?.city || '',
    gps_coordinates: merchant?.gps_coordinates || '',
    google_maps_url: merchant?.google_maps_url || '',
    business_description: merchant?.business_description || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.business_name) {
      toast.error('Business name is required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await axios.put(
        `${API_URL}/api/merchants/settings/business-info`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Business info updated successfully');
      if (onUpdate) onUpdate(res.data.merchant);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error saving business info');
    } finally {
      setIsSaving(false);
    }
  };

  const businessTypes = [
    'Restaurant',
    'Supermarket',
    'Boutique',
    'Pharmacy',
    'Gas Station',
    'Hotel',
    'Salon',
    'Bakery',
    'Electronics',
    'Other'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Store className="text-emerald-400" size={20} />
        <h3 className="text-white font-semibold">Business Information</h3>
      </div>

      {/* Phone Notice */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
        <AlertCircle className="text-amber-400 mt-0.5" size={18} />
        <div>
          <p className="text-amber-400 text-sm font-medium">Phone Number</p>
          <p className="text-slate-400 text-sm">
            The number <span className="text-white font-mono">{merchant?.phone}</span> can only be changed by SDM Admin.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-400">Business Name *</Label>
            <div className="relative mt-1">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <Input
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="My Business"
                className="pl-10 bg-slate-900 border-slate-700 text-white"
                data-testid="business-name-input"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-400">Business Type</Label>
            <select
              value={formData.business_type}
              onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
              data-testid="business-type-select"
            >
              <option value="">Select...</option>
              {businessTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label className="text-slate-400">Full Address</Label>
          <div className="relative mt-1">
            <MapPin className="absolute left-3 top-3 text-slate-500" size={16} />
            <textarea
              value={formData.business_address}
              onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
              placeholder="Street, neighborhood, city..."
              rows={2}
              className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder:text-slate-500 resize-none"
              data-testid="business-address-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-400">City</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Accra, Kumasi, Takoradi..."
              className="mt-1 bg-slate-900 border-slate-700 text-white"
              data-testid="city-input"
            />
          </div>

          <div>
            <Label className="text-slate-400">GPS Coordinates</Label>
            <div className="relative mt-1">
              <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <Input
                value={formData.gps_coordinates}
                onChange={(e) => setFormData({ ...formData, gps_coordinates: e.target.value })}
                placeholder="5.6037, -0.1870"
                className="pl-10 bg-slate-900 border-slate-700 text-white"
                data-testid="gps-input"
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-slate-400">Google Maps URL (optional)</Label>
          <div className="relative mt-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <Input
              value={formData.google_maps_url}
              onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
              placeholder="https://maps.google.com/..."
              className="pl-10 bg-slate-900 border-slate-700 text-white"
              data-testid="google-maps-input"
            />
          </div>
          <p className="text-slate-500 text-xs mt-1">Clients will be able to see your location on Google Maps</p>
        </div>

        <div>
          <Label className="text-slate-400">Business Description</Label>
          <textarea
            value={formData.business_description}
            onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
            placeholder="Describe your business in a few words..."
            rows={3}
            className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder:text-slate-500 resize-none"
            data-testid="business-description-input"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-emerald-500 hover:bg-emerald-600"
          data-testid="save-business-info-btn"
        >
          {isSaving ? (
            <Loader2 className="animate-spin mr-2" size={18} />
          ) : (
            <Save className="mr-2" size={18} />
          )}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

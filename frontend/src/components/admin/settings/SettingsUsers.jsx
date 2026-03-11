import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { 
  UserPlus, Users, Store, Loader2, X, CheckCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SettingsUsers({ token }) {
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showCreateMerchantModal, setShowCreateMerchantModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [newClientForm, setNewClientForm] = useState({ 
    full_name: '', phone: '', username: '', email: '', card_type: 'silver' 
  });
  
  const [newMerchantForm, setNewMerchantForm] = useState({ 
    business_name: '', owner_name: '', phone: '', email: '', 
    cashback_rate: 5, city: '', address: '', google_maps_url: ''
  });

  const headers = { Authorization: `Bearer ${token}` };

  const handleCreateClient = async () => {
    if (!newClientForm.full_name || !newClientForm.phone) {
      toast.error('Full name and phone are required');
      return;
    }

    try {
      setIsLoading(true);
      const res = await axios.post(`${API_URL}/api/admin/clients`, newClientForm, { headers });
      toast.success(`Client created! Temp password: ${res.data.temp_password}`);
      setShowCreateClientModal(false);
      setNewClientForm({ full_name: '', phone: '', username: '', email: '', card_type: 'silver' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create client');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMerchant = async () => {
    if (!newMerchantForm.business_name || !newMerchantForm.phone) {
      toast.error('Business name and phone are required');
      return;
    }

    try {
      setIsLoading(true);
      const res = await axios.post(`${API_URL}/api/admin/merchants`, newMerchantForm, { headers });
      toast.success(`Merchant created! Temp password: ${res.data.temp_password}`);
      setShowCreateMerchantModal(false);
      setNewMerchantForm({ 
        business_name: '', owner_name: '', phone: '', email: '', 
        cashback_rate: 5, city: '', address: '', google_maps_url: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create merchant');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Add Client */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Users size={20} className="text-blue-400" /> Add Client Manually
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Create a new client account. A temporary password will be generated.
          </p>
          <Button 
            onClick={() => setShowCreateClientModal(true)} 
            className="w-full bg-blue-600 hover:bg-blue-700"
            data-testid="create-client-btn"
          >
            <UserPlus size={16} className="mr-2" /> Create New Client
          </Button>
        </div>

        {/* Add Merchant */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Store size={20} className="text-emerald-400" /> Add Merchant Manually
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Create a new merchant account. Account will be pre-approved.
          </p>
          <Button 
            onClick={() => setShowCreateMerchantModal(true)} 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            data-testid="create-merchant-btn"
          >
            <UserPlus size={16} className="mr-2" /> Create New Merchant
          </Button>
        </div>
      </div>

      {/* Create Client Modal */}
      {showCreateClientModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Create New Client</h3>
              <button 
                onClick={() => setShowCreateClientModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Full Name *</Label>
                <Input
                  value={newClientForm.full_name}
                  onChange={(e) => setNewClientForm({...newClientForm, full_name: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label className="text-slate-400">Phone *</Label>
                <Input
                  value={newClientForm.phone}
                  onChange={(e) => setNewClientForm({...newClientForm, phone: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="+233541008285"
                />
              </div>
              <div>
                <Label className="text-slate-400">Email</Label>
                <Input
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) => setNewClientForm({...newClientForm, email: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <Label className="text-slate-400">Card Type</Label>
                <select
                  value={newClientForm.card_type}
                  onChange={(e) => setNewClientForm({...newClientForm, card_type: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                >
                  <option value="">No card</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowCreateClientModal(false)}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateClient}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : (
                  <CheckCircle className="mr-2" size={16} />
                )}
                Create Client
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Merchant Modal */}
      {showCreateMerchantModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Create New Merchant</h3>
              <button 
                onClick={() => setShowCreateMerchantModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Business Name *</Label>
                <Input
                  value={newMerchantForm.business_name}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, business_name: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="Shop Name"
                />
              </div>
              <div>
                <Label className="text-slate-400">Owner Name</Label>
                <Input
                  value={newMerchantForm.owner_name}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, owner_name: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label className="text-slate-400">Phone *</Label>
                <Input
                  value={newMerchantForm.phone}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, phone: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="+233541008285"
                />
              </div>
              <div>
                <Label className="text-slate-400">Email</Label>
                <Input
                  type="email"
                  value={newMerchantForm.email}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, email: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-400">Cashback Rate (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={newMerchantForm.cashback_rate}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, cashback_rate: parseFloat(e.target.value)})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-400">City</Label>
                <Input
                  value={newMerchantForm.city}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, city: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="Accra"
                />
              </div>
              <div>
                <Label className="text-slate-400">Address</Label>
                <Input
                  value={newMerchantForm.address}
                  onChange={(e) => setNewMerchantForm({...newMerchantForm, address: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="Business address"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowCreateMerchantModal(false)}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateMerchant}
                disabled={isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : (
                  <CheckCircle className="mr-2" size={16} />
                )}
                Create Merchant
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

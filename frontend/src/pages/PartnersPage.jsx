import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Store,
  Search,
  MapPin,
  Percent,
  ArrowLeft,
  Star,
  QrCode,
  Phone,
  Loader2,
  Filter,
  ChevronRight,
  ExternalLink,
  Navigation,
  Copy,
  CheckCircle
} from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function PartnersPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [merchants, setMerchants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const token = localStorage.getItem('sdm_client_token');

  const copyPhone = (phone) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      // Public endpoint to get active merchants
      const res = await axios.get(`${API_URL}/api/merchants/partners`);
      setMerchants(res.data.merchants || []);
    } catch (error) {
      console.error('Failed to fetch merchants:', error);
      // Try alternative endpoint
      try {
        const res = await axios.get(`${API_URL}/api/clients/merchants/list`);
        setMerchants(res.data.merchants || []);
      } catch (e) {
        toast.error('Could not load partners');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All', icon: Store },
    { id: 'restaurant', name: 'Food', icon: Store },
    { id: 'retail', name: 'Retail', icon: Store },
    { id: 'services', name: 'Services', icon: Store },
  ];

  const filteredMerchants = merchants.filter(m => {
    const matchesSearch = 
      m.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.business_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.business_address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      m.business_type?.toLowerCase().includes(selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  const handleSelectMerchant = (merchant) => {
    setSelectedMerchant(merchant);
  };

  const handlePayMerchant = (merchant) => {
    // Navigate back to dashboard with merchant QR code
    navigate('/client/dashboard', { 
      state: { 
        payMerchant: true, 
        merchantQR: merchant.payment_qr_code,
        merchantName: merchant.business_name,
        cashbackRate: merchant.cashback_rate
      } 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-400" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-white font-bold text-lg">Partner Merchants</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <Input
            type="text"
            placeholder="Search merchants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
            data-testid="merchant-search"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <cat.icon size={16} />
              {cat.name}
            </button>
          ))}
        </div>

        {/* Stats Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active Partners</p>
              <p className="text-white text-2xl font-bold">{merchants.length}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm">Avg Cashback</p>
              <p className="text-amber-400 text-2xl font-bold">
                {merchants.length > 0 
                  ? Math.round(merchants.reduce((sum, m) => sum + (m.cashback_rate || 5), 0) / merchants.length)
                  : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Merchants List */}
        <div className="space-y-3">
          {filteredMerchants.length > 0 ? (
            filteredMerchants.map((merchant) => (
              <div
                key={merchant.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition-colors cursor-pointer"
                onClick={() => handleSelectMerchant(merchant)}
                data-testid={`merchant-card-${merchant.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
                      <Store className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{merchant.business_name}</h3>
                      <p className="text-slate-400 text-sm">{merchant.business_type || 'General'}</p>
                      {merchant.business_address && (
                        <p className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                          <MapPin size={12} /> {merchant.business_address}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold">
                      {merchant.cashback_rate || 5}%
                    </div>
                    <p className="text-slate-500 text-xs mt-1">cashback</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">
                      <QrCode size={14} className="inline mr-1" />
                      {merchant.payment_qr_code}
                    </span>
                  </div>
                  <ChevronRight className="text-slate-500" size={18} />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Store className="text-slate-600 mx-auto mb-4" size={48} />
              <p className="text-slate-400">No merchants found</p>
              <p className="text-slate-500 text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </main>

      {/* Merchant Detail Modal */}
      {selectedMerchant && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-slate-800 border-t border-slate-700 rounded-t-3xl w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            {/* Handle bar */}
            <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-6" />
            
            {/* Merchant Info */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Store className="text-white" size={40} />
              </div>
              <h2 className="text-white text-xl font-bold">{selectedMerchant.business_name}</h2>
              <p className="text-slate-400">{selectedMerchant.business_type || 'General Merchant'}</p>
            </div>

            {/* Contact & Location Section */}
            <div className="bg-slate-900/50 rounded-xl p-4 mb-4 space-y-3">
              <h3 className="text-slate-300 font-semibold text-sm uppercase tracking-wide mb-3">Contact & Location</h3>
              
              {/* Phone Number */}
              {selectedMerchant.phone && (
                <div className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <Phone className="text-emerald-400" size={18} />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Phone Number</p>
                      <p className="text-white font-medium">{selectedMerchant.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyPhone(selectedMerchant.phone)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Copy number"
                    >
                      {copiedPhone ? (
                        <CheckCircle className="text-emerald-400" size={18} />
                      ) : (
                        <Copy className="text-slate-400" size={18} />
                      )}
                    </button>
                    <a
                      href={`tel:${selectedMerchant.phone}`}
                      className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
                      title="Call"
                    >
                      <Phone className="text-white" size={18} />
                    </a>
                  </div>
                </div>
              )}

              {/* Address */}
              {selectedMerchant.business_address && (
                <div className="flex items-start gap-3 bg-slate-800 rounded-lg p-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                    <MapPin className="text-blue-400" size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-400 text-xs">Address</p>
                    <p className="text-white">{selectedMerchant.business_address}</p>
                    {selectedMerchant.city && (
                      <p className="text-slate-500 text-sm">{selectedMerchant.city}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Google Maps Link */}
              {selectedMerchant.google_maps_url && (
                <a
                  href={selectedMerchant.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-3 hover:from-blue-500/30 hover:to-cyan-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <Navigation className="text-white" size={18} />
                    </div>
                    <div>
                      <p className="text-white font-medium">View on Google Maps</p>
                      <p className="text-slate-400 text-xs">Get directions to this location</p>
                    </div>
                  </div>
                  <ExternalLink className="text-blue-400" size={20} />
                </a>
              )}

              {/* No location info message */}
              {!selectedMerchant.phone && !selectedMerchant.business_address && !selectedMerchant.google_maps_url && (
                <div className="text-center py-4">
                  <MapPin className="text-slate-600 mx-auto mb-2" size={24} />
                  <p className="text-slate-500 text-sm">No contact information available</p>
                </div>
              )}
            </div>

            {/* Cashback Highlight */}
            <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl p-4 mb-4 text-center">
              <p className="text-slate-400 text-sm">Earn Cashback</p>
              <p className="text-emerald-400 text-4xl font-bold">{selectedMerchant.cashback_rate || 5}%</p>
              <p className="text-slate-500 text-xs mt-1">on every purchase</p>
            </div>

            {/* QR Code */}
            <div className="bg-slate-900 rounded-xl p-4 mb-6 text-center">
              <p className="text-slate-400 text-sm mb-2">Payment QR Code</p>
              <code className="text-amber-400 text-lg font-mono">{selectedMerchant.payment_qr_code}</code>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={() => handlePayMerchant(selectedMerchant)}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 py-6"
                data-testid="pay-merchant-btn"
              >
                <QrCode className="mr-2" size={18} />
                Pay This Merchant
              </Button>
              <Button
                onClick={() => setSelectedMerchant(null)}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Users, Store, Search, Loader2, CheckCircle, XCircle, 
  Phone, Mail, Calendar, MapPin, RefreshCw, Eye
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function UsersAndMerchantsPanel({ token }) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, merchantsRes] = await Promise.all([
        axios.get(`${API_URL}/api/sdm/admin/users?limit=100`, { headers }),
        axios.get(`${API_URL}/api/sdm/admin/merchants`, { headers })
      ]);
      setUsers(usersRes.data || []);
      setMerchants(merchantsRes.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerifyMerchant = async (merchantId, verify) => {
    try {
      await axios.put(`${API_URL}/api/sdm/admin/merchants/${merchantId}/verify`, 
        { is_verified: verify },
        { headers }
      );
      toast.success(verify ? 'Merchant verified' : 'Merchant unverified');
      fetchData();
    } catch (error) {
      toast.error('Failed to update merchant');
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm)
  );

  const filteredMerchants = merchants.filter(m => 
    m.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone?.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="users-merchants-panel">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'users' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
            }`}
          >
            <Users size={16} />
            Clients ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('merchants')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'merchants' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
            }`}
          >
            <Store size={16} />
            Marchands ({merchants.length})
          </button>
        </div>
        
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={activeTab === 'users' ? 'Search clients...' : 'Search merchants...'}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Phone</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">VIP Tier</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Balance</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Total Earned</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Referrals</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No clients found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users size={14} className="text-blue-600" />
                          </div>
                          <span className="font-medium">{user.full_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{user.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.vip_tier === 'PLATINUM' ? 'bg-slate-200 text-slate-800' :
                          user.vip_tier === 'GOLD' ? 'bg-yellow-100 text-yellow-800' :
                          user.vip_tier === 'SILVER' ? 'bg-slate-100 text-slate-600' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {user.vip_tier || 'BRONZE'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">
                        GHS {user.balance?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        GHS {user.total_earned?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-4 py-3 text-center">{user.referral_count || 0}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Merchants List */}
      {activeTab === 'merchants' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Business</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Phone</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Category</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Location</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Cashback %</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No merchants found
                    </td>
                  </tr>
                ) : (
                  filteredMerchants.map((merchant) => (
                    <tr key={merchant.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                            <Store size={14} className="text-cyan-600" />
                          </div>
                          <span className="font-medium">{merchant.business_name || merchant.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{merchant.phone}</td>
                      <td className="px-4 py-3">{merchant.business_category || 'General'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[150px] truncate">
                        {merchant.gps_location || merchant.city || 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">
                        {merchant.cashback_rate || 5}%
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 w-fit ${
                          merchant.is_verified 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {merchant.is_verified ? (
                            <>
                              <CheckCircle size={12} />
                              Verified
                            </>
                          ) : (
                            <>
                              <XCircle size={12} />
                              Pending
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!merchant.is_verified ? (
                          <Button 
                            size="sm" 
                            onClick={() => handleVerifyMerchant(merchant.id, true)}
                            className="h-7 text-xs gap-1"
                          >
                            <CheckCircle size={12} />
                            Verify
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleVerifyMerchant(merchant.id, false)}
                            className="h-7 text-xs gap-1"
                          >
                            <XCircle size={12} />
                            Unverify
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <Users className="w-8 h-8 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-blue-900">{users.length}</p>
          <p className="text-sm text-blue-600">Total Clients</p>
        </div>
        <div className="bg-cyan-50 rounded-xl p-4">
          <Store className="w-8 h-8 text-cyan-600 mb-2" />
          <p className="text-2xl font-bold text-cyan-900">{merchants.length}</p>
          <p className="text-sm text-cyan-600">Total Marchands</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <CheckCircle className="w-8 h-8 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-emerald-900">
            {merchants.filter(m => m.is_verified).length}
          </p>
          <p className="text-sm text-emerald-600">Marchands Vérifiés</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <XCircle className="w-8 h-8 text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-amber-900">
            {merchants.filter(m => !m.is_verified).length}
          </p>
          <p className="text-sm text-amber-600">En Attente</p>
        </div>
      </div>
    </div>
  );
}

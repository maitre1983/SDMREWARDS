import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Shield, 
  Users, 
  Store, 
  CreditCard,
  TrendingUp,
  DollarSign,
  LogOut,
  Loader2,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Ban,
  UserCheck,
  Trash2,
  Settings,
  BarChart3,
  Activity,
  Percent,
  Gift,
  RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('sdm_admin_token'));
  const [admin, setAdmin] = useState(null);
  
  // Login refs (for Playwright compatibility)
  const emailRef = useRef();
  const passwordRef = useRef();
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Data states
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setIsLoading(false);
      setShowLogin(true);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.type === 'admin') {
        setAdmin(res.data.user);
        setShowLogin(false);
        fetchDashboardData();
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      handleLogout();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = emailRef.current?.value;
    const password = passwordRef.current?.value;
    
    if (!email || !password) {
      toast.error('Please fill all fields');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/admin/login`, {
        email,
        password
      });
      
      const newToken = res.data.access_token;
      localStorage.setItem('sdm_admin_token', newToken);
      setToken(newToken);
      setAdmin(res.data.admin);
      setShowLogin(false);
      
      toast.success('Login successful!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sdm_admin_token');
    setToken(null);
    setAdmin(null);
    setShowLogin(true);
    setIsLoading(false);
  };

  const getHeaders = () => {
    const t = token || localStorage.getItem('sdm_admin_token');
    return { Authorization: `Bearer ${t}` };
  };

  const fetchDashboardData = async () => {
    try {
      const headers = getHeaders();
      
      // Fetch clients
      const clientsRes = await axios.get(`${API_URL}/api/admin/clients`, { headers });
      setClients(clientsRes.data.clients || []);
      
      // Fetch merchants
      const merchantsRes = await axios.get(`${API_URL}/api/admin/merchants`, { headers });
      setMerchants(merchantsRes.data.merchants || []);
      
      // Calculate stats
      const totalClients = clientsRes.data.clients?.length || 0;
      const activeClients = clientsRes.data.clients?.filter(c => c.status === 'active').length || 0;
      const totalMerchants = merchantsRes.data.merchants?.length || 0;
      const activeMerchants = merchantsRes.data.merchants?.filter(m => m.status === 'active').length || 0;
      
      setStats({
        total_clients: totalClients,
        active_clients: activeClients,
        total_merchants: totalMerchants,
        active_merchants: activeMerchants,
        pending_merchants: merchantsRes.data.merchants?.filter(m => m.status === 'pending').length || 0
      });
      
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateClientStatus = async (clientId, action) => {
    try {
      const headers = getHeaders();
      await axios.put(`${API_URL}/api/admin/clients/${clientId}/status`, {
        action
      }, { headers });
      
      toast.success(`Client ${action} successfully`);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    }
  };

  const handleUpdateMerchantStatus = async (merchantId, action) => {
    try {
      const headers = getHeaders();
      await axios.put(`${API_URL}/api/admin/merchants/${merchantId}/status`, {
        action
      }, { headers });
      
      toast.success(`Merchant ${action} successfully`);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/10' },
      pending: { icon: Clock, color: 'text-amber-400 bg-amber-500/10' },
      suspended: { icon: Ban, color: 'text-red-400 bg-red-500/10' },
      deleted: { icon: Trash2, color: 'text-slate-400 bg-slate-500/10' }
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${badge.color}`}>
        <Icon size={12} /> {status}
      </span>
    );
  };

  const filteredClients = clients.filter(c => 
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery) ||
    c.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMerchants = merchants.filter(m => 
    m.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone?.includes(searchQuery) ||
    m.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Login Screen
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-20 h-20 object-contain rounded-2xl mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white">Admin Portal</h1>
            <p className="text-slate-400 mt-2">SDM Rewards Platform Administration</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-slate-300">Email</Label>
                <Input
                  ref={emailRef}
                  type="email"
                  placeholder="admin@sdmrewards.com"
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  data-testid="admin-email-input"
                />
              </div>

              <div>
                <Label className="text-slate-300">Password</Label>
                <Input
                  ref={passwordRef}
                  type="password"
                  placeholder="Enter password"
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  data-testid="admin-password-input"
                />
              </div>

              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white py-6"
                data-testid="admin-login-btn"
              >
                {loginLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-400" size={48} />
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-10 h-10 object-contain rounded-xl" />
            <div>
              <span className="font-bold text-white block">SDM Admin</span>
              <span className="text-slate-400 text-sm">{admin?.email}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-slate-400 hover:text-white"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'clients', label: 'Clients', icon: Users },
            { id: 'merchants', label: 'Merchants', icon: Store },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <Users className="text-blue-400 mb-2" size={24} />
                <p className="text-slate-400 text-sm">Total Clients</p>
                <p className="text-white text-2xl font-bold">{stats?.total_clients || 0}</p>
                <p className="text-emerald-400 text-xs mt-1">
                  {stats?.active_clients || 0} active
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <Store className="text-emerald-400 mb-2" size={24} />
                <p className="text-slate-400 text-sm">Total Merchants</p>
                <p className="text-white text-2xl font-bold">{stats?.total_merchants || 0}</p>
                <p className="text-amber-400 text-xs mt-1">
                  {stats?.pending_merchants || 0} pending
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <CreditCard className="text-amber-400 mb-2" size={24} />
                <p className="text-slate-400 text-sm">Active Members</p>
                <p className="text-white text-2xl font-bold">{stats?.active_clients || 0}</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <Activity className="text-purple-400 mb-2" size={24} />
                <p className="text-slate-400 text-sm">Active Partners</p>
                <p className="text-white text-2xl font-bold">{stats?.active_merchants || 0}</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Clients */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Users size={18} /> Recent Clients
                </h3>
                <div className="space-y-3">
                  {clients.slice(0, 5).map(client => (
                    <div key={client.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <div>
                        <p className="text-white text-sm">{client.full_name}</p>
                        <p className="text-slate-500 text-xs">@{client.username}</p>
                      </div>
                      {getStatusBadge(client.status)}
                    </div>
                  ))}
                  {clients.length === 0 && (
                    <p className="text-slate-500 text-center py-4">No clients yet</p>
                  )}
                </div>
              </div>

              {/* Recent Merchants */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Store size={18} /> Recent Merchants
                </h3>
                <div className="space-y-3">
                  {merchants.slice(0, 5).map(merchant => (
                    <div key={merchant.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <div>
                        <p className="text-white text-sm">{merchant.business_name}</p>
                        <p className="text-slate-500 text-xs">{merchant.owner_name}</p>
                      </div>
                      {getStatusBadge(merchant.status)}
                    </div>
                  ))}
                  {merchants.length === 0 && (
                    <p className="text-slate-500 text-center py-4">No merchants yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <Input
                type="text"
                placeholder="Search by name, phone, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* Clients List */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 text-slate-400 text-sm">
                    <tr>
                      <th className="text-left p-4">Client</th>
                      <th className="text-left p-4">Phone</th>
                      <th className="text-left p-4">Card</th>
                      <th className="text-left p-4">Balance</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredClients.map(client => (
                      <tr key={client.id} className="hover:bg-slate-900/50">
                        <td className="p-4">
                          <p className="text-white font-medium">{client.full_name}</p>
                          <p className="text-slate-500 text-sm">@{client.username}</p>
                        </td>
                        <td className="p-4 text-slate-300">{client.phone}</td>
                        <td className="p-4">
                          {client.card_type ? (
                            <span className={`px-2 py-1 rounded text-xs ${
                              client.card_type === 'platinum' ? 'bg-slate-600 text-white' :
                              client.card_type === 'gold' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-slate-500/20 text-slate-300'
                            }`}>
                              {client.card_type.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm">None</span>
                          )}
                        </td>
                        <td className="p-4 text-emerald-400">
                          GHS {(client.cashback_balance || 0).toFixed(2)}
                        </td>
                        <td className="p-4">{getStatusBadge(client.status)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {client.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateClientStatus(client.id, 'suspend')}
                                className="text-amber-400 hover:bg-amber-500/10"
                              >
                                <Ban size={14} />
                              </Button>
                            )}
                            {client.status === 'suspended' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateClientStatus(client.id, 'activate')}
                                className="text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <UserCheck size={14} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredClients.length === 0 && (
                <p className="text-slate-500 text-center py-8">No clients found</p>
              )}
            </div>
          </div>
        )}

        {/* Merchants Tab */}
        {activeTab === 'merchants' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <Input
                type="text"
                placeholder="Search by business name, phone, or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* Merchants List */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 text-slate-400 text-sm">
                    <tr>
                      <th className="text-left p-4">Business</th>
                      <th className="text-left p-4">Phone</th>
                      <th className="text-left p-4">Cashback</th>
                      <th className="text-left p-4">Transactions</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredMerchants.map(merchant => (
                      <tr key={merchant.id} className="hover:bg-slate-900/50">
                        <td className="p-4">
                          <p className="text-white font-medium">{merchant.business_name}</p>
                          <p className="text-slate-500 text-sm">{merchant.owner_name}</p>
                        </td>
                        <td className="p-4 text-slate-300">{merchant.phone}</td>
                        <td className="p-4 text-amber-400">{merchant.cashback_rate}%</td>
                        <td className="p-4 text-slate-300">{merchant.total_transactions || 0}</td>
                        <td className="p-4">{getStatusBadge(merchant.status)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {merchant.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateMerchantStatus(merchant.id, 'activate')}
                                className="text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <CheckCircle size={14} />
                              </Button>
                            )}
                            {merchant.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateMerchantStatus(merchant.id, 'suspend')}
                                className="text-amber-400 hover:bg-amber-500/10"
                              >
                                <Ban size={14} />
                              </Button>
                            )}
                            {merchant.status === 'suspended' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateMerchantStatus(merchant.id, 'activate')}
                                className="text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <UserCheck size={14} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredMerchants.length === 0 && (
                <p className="text-slate-500 text-center py-8">No merchants found</p>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Platform Config */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                <Settings size={20} /> Platform Configuration
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Card Prices */}
                <div className="space-y-4">
                  <h4 className="text-slate-300 font-medium flex items-center gap-2">
                    <CreditCard size={16} /> Membership Card Prices
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <span className="text-slate-400">Silver Card</span>
                      <span className="text-white font-medium">GHS 25</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <span className="text-slate-400">Gold Card</span>
                      <span className="text-amber-400 font-medium">GHS 50</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <span className="text-slate-400">Platinum Card</span>
                      <span className="text-slate-300 font-medium">GHS 100</span>
                    </div>
                  </div>
                </div>

                {/* Commission Settings */}
                <div className="space-y-4">
                  <h4 className="text-slate-300 font-medium flex items-center gap-2">
                    <Percent size={16} /> Commission Settings
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <span className="text-slate-400">Platform Commission</span>
                      <span className="text-white font-medium">5%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <span className="text-slate-400">Min Cashback Rate</span>
                      <span className="text-white font-medium">1%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <span className="text-slate-400">Max Cashback Rate</span>
                      <span className="text-white font-medium">20%</span>
                    </div>
                  </div>
                </div>

                {/* Referral Bonuses */}
                <div className="space-y-4">
                  <h4 className="text-slate-300 font-medium flex items-center gap-2">
                    <Gift size={16} /> Referral Bonuses
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <span className="text-slate-400">Welcome Bonus</span>
                      <span className="text-emerald-400 font-medium">GHS 1</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <span className="text-slate-400">Referrer Bonus</span>
                      <span className="text-emerald-400 font-medium">GHS 3</span>
                    </div>
                  </div>
                </div>

                {/* Languages */}
                <div className="space-y-4">
                  <h4 className="text-slate-300 font-medium">Supported Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">English</span>
                    <span className="px-3 py-1 bg-slate-700 text-slate-400 rounded-full text-sm">French</span>
                    <span className="px-3 py-1 bg-slate-700 text-slate-400 rounded-full text-sm">Chinese</span>
                    <span className="px-3 py-1 bg-slate-700 text-slate-400 rounded-full text-sm">Arabic</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Info */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Shield size={20} /> Admin Account
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email</span>
                  <span className="text-white">{admin?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Name</span>
                  <span className="text-white">{admin?.name || 'Admin'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Role</span>
                  <span className="text-purple-400">
                    {admin?.is_super_admin ? 'Super Admin' : 'Admin'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

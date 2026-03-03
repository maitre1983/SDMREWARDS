import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, LogOut, Inbox, CheckCircle, MessageSquare, 
  Trash2, Send, RefreshCw, Clock, User, Building2, Phone,
  ChevronRight, X, BarChart3, Globe, Monitor, Smartphone, Tablet,
  CreditCard, Wallet, Users, Store, Shield, Gift, ArrowRightLeft, DollarSign
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import SDMConfigPanel from '../components/admin/SDMConfigPanel';
import FintechDashboard from '../components/admin/FintechDashboard';
import UsersAndMerchantsPanel from '../components/admin/UsersAndMerchantsPanel';
import AdminManagementPanel from '../components/admin/AdminManagementPanel';
import ReferralHistoryPanel from '../components/admin/ReferralHistoryPanel';
import MessagesPanel from '../components/admin/MessagesPanel';
import TransactionHistoryPanel from '../components/admin/TransactionHistoryPanel';
import SDMCommissionsPanel from '../components/admin/SDMCommissionsPanel';
import LanguageSelector from '../components/LanguageSelector';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "/sdm-logo.png";

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const { token, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ total_messages: 0, unread_messages: 0, replied_messages: 0, read_messages: 0, total_visits: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');
  const [currentAdmin, setCurrentAdmin] = useState(null);

  // Create headers dynamically - read from context or localStorage as fallback
  const getHeaders = () => {
    const authToken = token || localStorage.getItem('sds_admin_token');
    return { Authorization: `Bearer ${authToken}` };
  };

  useEffect(() => {
    // Check both context auth and localStorage token (for immediate post-login)
    const hasToken = isAuthenticated || localStorage.getItem('sds_admin_token');
    if (!hasToken) {
      navigate('/admin');
    }
  }, [isAuthenticated, navigate]);

  // Fetch current admin profile
  const fetchAdminProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/profile`, { headers: getHeaders() });
      setCurrentAdmin(response.data);
    } catch (error) {
      console.error('Failed to fetch admin profile:', error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch admin profile FIRST to ensure role is available
      await fetchAdminProfile();
      
      const [messagesRes, statsRes, analyticsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/messages`, { headers: getHeaders() }),
        axios.get(`${API_URL}/api/admin/stats`, { headers: getHeaders() }),
        axios.get(`${API_URL}/api/admin/analytics`, { headers: getHeaders() }),
      ]);
      setMessages(messagesRes.data);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      // Only logout if we get 401 AND there's no valid token in localStorage
      // This prevents logout race condition during initial login
      const hasStoredToken = localStorage.getItem('sds_admin_token');
      if (error.response?.status === 401 && !hasStoredToken) {
        console.log('401 error and no token, logging out');
        logout();
        navigate('/admin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`${API_URL}/api/admin/messages/${id}/read`, {}, { headers: getHeaders() });
      toast.success('Marked as read');
      fetchData();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    setIsSending(true);
    try {
      await axios.put(
        `${API_URL}/api/admin/messages/${selectedMessage.id}/reply`,
        { reply: replyText },
        { headers: getHeaders() }
      );
      toast.success('Reply saved');
      setReplyText('');
      setSelectedMessage(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/messages/${id}`, { headers: getHeaders() });
      toast.success('Message deleted');
      if (selectedMessage?.id === id) setSelectedMessage(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'unread': return 'bg-blue-500';
      case 'read': return 'bg-amber-500';
      case 'replied': return 'bg-emerald-500';
      default: return 'bg-slate-500';
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthenticated) return null;

  const getDeviceIcon = (device) => {
    switch (device) {
      case 'mobile': return <Smartphone size={16} />;
      case 'tablet': return <Tablet size={16} />;
      default: return <Monitor size={16} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100" data-testid="admin-dashboard">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-slate-950 text-white z-30">
        <div className="p-6 border-b border-slate-800">
          <img 
            src={LOGO_URL} 
            alt="Smart Digital Solutions" 
            className="h-12 w-auto object-contain bg-white rounded-lg p-1"
          />
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => setActiveTab('messages')}
            className={`w-full admin-sidebar-item rounded-lg ${activeTab === 'messages' ? 'active' : ''}`}
          >
            <Mail size={18} />
            <span>{t('admin_messages')}</span>
            {stats.unread_messages > 0 && (
              <span className="ml-auto bg-blue-600 text-xs px-2 py-0.5 rounded-full">
                {stats.unread_messages}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full admin-sidebar-item rounded-lg ${activeTab === 'analytics' ? 'active' : ''}`}
          >
            <BarChart3 size={18} />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('sdm')}
            className={`w-full admin-sidebar-item rounded-lg ${activeTab === 'sdm' ? 'active' : ''}`}
          >
            <CreditCard size={18} />
            <span>SDM Platform</span>
          </button>
          <button
            onClick={() => setActiveTab('users-merchants')}
            className={`w-full admin-sidebar-item rounded-lg ${activeTab === 'users-merchants' ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Clients & Marchands</span>
          </button>
          <button
            onClick={() => setActiveTab('admin-management')}
            className={`w-full admin-sidebar-item rounded-lg ${activeTab === 'admin-management' ? 'active' : ''}`}
          >
            <Shield size={18} />
            <span>Admin & Security</span>
          </button>
          <button
            onClick={() => setActiveTab('fintech')}
            className={`w-full admin-sidebar-item rounded-lg ${activeTab === 'fintech' ? 'active' : ''}`}
          >
            <Wallet size={18} />
            <span>Fintech Ledger</span>
          </button>
          
          <button
            onClick={() => setActiveTab('transactions')}
            data-testid="transactions-tab"
            className={`w-full admin-sidebar-item rounded-lg ${activeTab === 'transactions' ? 'active' : ''}`}
          >
            <ArrowRightLeft size={18} />
            <span>Transactions</span>
          </button>
          
          <button
            onClick={() => setActiveTab('referrals')}
            data-testid="referrals-tab"
            className={`w-full admin-sidebar-item rounded-lg ${activeTab === 'referrals' ? 'active' : ''}`}
          >
            <Gift size={18} />
            <span>Referral History</span>
          </button>
          
          {/* SDM Commissions - Only visible to super_admin */}
          {currentAdmin?.role === 'super_admin' && (
            <button
              onClick={() => setActiveTab('sdm-commissions')}
              data-testid="sdm-commissions-tab"
              className={`w-full admin-sidebar-item rounded-lg ${activeTab === 'sdm-commissions' ? 'active' : ''}`}
            >
              <DollarSign size={18} />
              <span>Commissions SDM</span>
            </button>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
            data-testid="admin-logout-button"
          >
            <LogOut size={18} />
            <span>{t('admin_logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">{t('admin_dashboard')}</h1>
            <div className="flex items-center gap-4">
              <LanguageSelector />
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={isLoading}
                className="gap-2"
                data-testid="refresh-button"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-6 mb-8">
            {[
              { key: 'total', value: stats.total_messages, icon: Inbox, color: 'bg-slate-100 text-slate-600' },
              { key: 'unread', value: stats.unread_messages, icon: Mail, color: 'bg-blue-100 text-blue-600' },
              { key: 'read', value: stats.read_messages, icon: CheckCircle, color: 'bg-amber-100 text-amber-600' },
              { key: 'replied', value: stats.replied_messages, icon: MessageSquare, color: 'bg-emerald-100 text-emerald-600' },
              { key: 'visits', value: stats.total_visits || 0, icon: Globe, color: 'bg-violet-100 text-violet-600', label: 'Total Visits' },
            ].map((stat) => (
              <div 
                key={stat.key}
                className="bg-white rounded-xl p-6 border border-slate-200"
                data-testid={`stat-${stat.key}`}
              >
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-4`}>
                  <stat.icon size={20} />
                </div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label || t(`admin_${stat.key}`)}</p>
              </div>
            ))}
          </div>

          {activeTab === 'analytics' && analytics && (
            <div className="space-y-6 mb-8">
              {/* Analytics Grid */}
              <div className="grid grid-cols-3 gap-6">
                {/* Devices */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Monitor size={18} /> Devices
                  </h3>
                  <div className="space-y-3">
                    {analytics.devices.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(d.name)}
                          <span className="text-sm text-slate-600 capitalize">{d.name}</span>
                        </div>
                        <span className="font-semibold text-slate-900">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Browsers */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Globe size={18} /> Browsers
                  </h3>
                  <div className="space-y-3">
                    {analytics.browsers.map((b, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{b.name}</span>
                        <span className="font-semibold text-slate-900">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OS */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Operating Systems</h3>
                  <div className="space-y-3">
                    {analytics.os_stats.map((o, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{o.name}</span>
                        <span className="font-semibold text-slate-900">{o.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Visits */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Recent Visits</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-slate-600 font-medium">Time</th>
                        <th className="px-4 py-3 text-left text-slate-600 font-medium">Page</th>
                        <th className="px-4 py-3 text-left text-slate-600 font-medium">Device</th>
                        <th className="px-4 py-3 text-left text-slate-600 font-medium">Browser</th>
                        <th className="px-4 py-3 text-left text-slate-600 font-medium">OS</th>
                        <th className="px-4 py-3 text-left text-slate-600 font-medium">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analytics.recent_visits.slice(0, 10).map((visit, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500">{formatDate(visit.timestamp)}</td>
                          <td className="px-4 py-3 text-slate-900">{visit.page}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-slate-600 capitalize">
                              {getDeviceIcon(visit.device_type)} {visit.device_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{visit.browser}</td>
                          <td className="px-4 py-3 text-slate-600">{visit.os}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{visit.ip_address}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pages */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Top Pages</h3>
                <div className="space-y-3">
                  {analytics.pages.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{p.name}</span>
                      <span className="font-semibold text-slate-900">{p.count} visits</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <MessagesPanel token={token} />
          )}

          {activeTab === 'sdm' && (
            <SDMConfigPanel token={token} />
          )}

          {activeTab === 'users-merchants' && (
            <UsersAndMerchantsPanel token={token} />
          )}

          {activeTab === 'admin-management' && (
            <AdminManagementPanel token={token} currentAdmin={currentAdmin} />
          )}

          {activeTab === 'fintech' && (
            <FintechDashboard token={token} />
          )}

          {activeTab === 'transactions' && (
            <TransactionHistoryPanel token={token} />
          )}

          {activeTab === 'referrals' && (
            <ReferralHistoryPanel token={token} />
          )}

          {activeTab === 'sdm-commissions' && (
            <SDMCommissionsPanel token={token} currentAdmin={currentAdmin} />
          )}
        </div>
      </main>
    </div>
  );
}

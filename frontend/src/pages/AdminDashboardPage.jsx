import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, LogOut, Inbox, CheckCircle, MessageSquare, 
  Trash2, Send, RefreshCw, Clock, User, Building2, Phone,
  ChevronRight, X, BarChart3, Globe, Monitor, Smartphone, Tablet,
  CreditCard, Wallet, Users, Store, Shield, Gift
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

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, navigate]);

  // Fetch current admin profile
  const fetchAdminProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/profile`, { headers });
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
        axios.get(`${API_URL}/api/admin/messages`, { headers }),
        axios.get(`${API_URL}/api/admin/stats`, { headers }),
        axios.get(`${API_URL}/api/admin/analytics`, { headers }),
      ]);
      setMessages(messagesRes.data);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      if (error.response?.status === 401) {
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
      await axios.put(`${API_URL}/api/admin/messages/${id}/read`, {}, { headers });
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
        { headers }
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
      await axios.delete(`${API_URL}/api/admin/messages/${id}`, { headers });
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
            onClick={() => setActiveTab('referrals')}
            data-testid="referrals-tab"
            className={`w-full admin-sidebar-item rounded-lg ${activeTab === 'referrals' ? 'active' : ''}`}
          >
            <Gift size={18} />
            <span>Referral History</span>
          </button>
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
          <>
          {/* Messages list */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">{t('admin_messages')}</h2>
              </div>
              
              {messages.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Inbox size={48} className="mx-auto mb-4 text-slate-300" />
                  <p>{t('admin_no_messages')}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedMessage(msg)}
                      className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedMessage?.id === msg.id ? 'bg-blue-50' : ''
                      } ${msg.status === 'unread' ? 'border-l-4 border-blue-500' : ''}`}
                      data-testid={`message-item-${msg.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(msg.status)}`} />
                          <span className="font-medium text-slate-900">{msg.name}</span>
                        </div>
                        <span className="text-xs text-slate-500">{formatDate(msg.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-600 truncate">{msg.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{msg.email}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message detail */}
            {selectedMessage ? (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">Message Details</h2>
                  <button 
                    onClick={() => setSelectedMessage(null)}
                    className="p-1 hover:bg-slate-100 rounded"
                  >
                    <X size={18} className="text-slate-500" />
                  </button>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                      <User size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{selectedMessage.name}</p>
                      <p className="text-sm text-slate-500">{selectedMessage.email}</p>
                    </div>
                    <span className={`ml-auto px-3 py-1 text-xs font-medium rounded-full ${
                      selectedMessage.status === 'unread' ? 'bg-blue-100 text-blue-700' :
                      selectedMessage.status === 'replied' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {selectedMessage.status}
                    </span>
                  </div>

                  <div className="space-y-4 mb-6">
                    {selectedMessage.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone size={16} className="text-slate-400" />
                        <span className="text-slate-600">{selectedMessage.phone}</span>
                      </div>
                    )}
                    {selectedMessage.company && (
                      <div className="flex items-center gap-3 text-sm">
                        <Building2 size={16} className="text-slate-400" />
                        <span className="text-slate-600">{selectedMessage.company}</span>
                      </div>
                    )}
                    {selectedMessage.service_type && (
                      <div className="flex items-center gap-3 text-sm">
                        <ChevronRight size={16} className="text-slate-400" />
                        <span className="text-slate-600">Service: {selectedMessage.service_type}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      <Clock size={16} className="text-slate-400" />
                      <span className="text-slate-600">{formatDate(selectedMessage.created_at)}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 mb-6">
                    <p className="text-sm font-medium text-slate-700 mb-2">Message:</p>
                    <p className="text-slate-600 whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>

                  {selectedMessage.admin_reply && (
                    <div className="bg-emerald-50 rounded-xl p-4 mb-6">
                      <p className="text-sm font-medium text-emerald-700 mb-2">Your Reply:</p>
                      <p className="text-emerald-600 whitespace-pre-wrap">{selectedMessage.admin_reply}</p>
                      <p className="text-xs text-emerald-500 mt-2">
                        Replied: {formatDate(selectedMessage.replied_at)}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 mb-6">
                    {selectedMessage.status === 'unread' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsRead(selectedMessage.id)}
                        className="gap-2"
                        data-testid="mark-read-button"
                      >
                        <CheckCircle size={16} />
                        {t('admin_mark_read')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(selectedMessage.id)}
                      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid="delete-button"
                    >
                      <Trash2 size={16} />
                      {t('admin_delete')}
                    </Button>
                  </div>

                  {/* Reply form */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('admin_reply')}
                    </label>
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={t('admin_reply_placeholder')}
                      rows={4}
                      className="mb-4 resize-none"
                      data-testid="reply-textarea"
                    />
                    <Button
                      onClick={handleReply}
                      disabled={!replyText.trim() || isSending}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                      data-testid="send-reply-button"
                    >
                      <Send size={16} />
                      {isSending ? 'Sending...' : t('admin_send_reply')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center p-12">
                <div className="text-center text-slate-400">
                  <Mail size={48} className="mx-auto mb-4" />
                  <p>Select a message to view details</p>
                </div>
              </div>
            )}
          </div>
          </>
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

          {activeTab === 'referrals' && (
            <ReferralHistoryPanel token={token} />
          )}
        </div>
      </main>
    </div>
  );
}

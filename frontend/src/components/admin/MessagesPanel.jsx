import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Mail, Inbox, CheckCircle, MessageSquare, Trash2, Send, RefreshCw, 
  Clock, User, Building2, Phone, X, Bell, Gift, Plus, ToggleLeft, ToggleRight,
  Calendar, Percent, Tag, AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function MessagesPanel({ token }) {
  const [activeSubTab, setActiveSubTab] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ total_messages: 0, unread_messages: 0, replied_messages: 0, read_messages: 0 });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Promotions state
  const [promotions, setPromotions] = useState([]);
  const [showNewPromoForm, setShowNewPromoForm] = useState(false);
  const [newPromo, setNewPromo] = useState({
    title: '',
    description: '',
    discount_percent: 0,
    promo_code: '',
    start_date: '',
    end_date: '',
    is_active: true
  });

  // Notifications state
  const [notifications, setNotifications] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchMessages = async () => {
    try {
      const [messagesRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/messages`, { headers }),
        axios.get(`${API_URL}/api/admin/stats`, { headers })
      ]);
      setMessages(messagesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Messages fetch error:', error);
    }
  };

  const fetchPromotions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/promotions`, { headers });
      setPromotions(res.data.promotions || []);
    } catch (error) {
      console.error('Promotions error:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sdm/admin/notifications`, { headers });
      setNotifications(res.data);
    } catch (error) {
      console.error('Notifications error:', error);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    if (activeSubTab === 'inbox') {
      fetchMessages().finally(() => setIsLoading(false));
    } else if (activeSubTab === 'promotions') {
      fetchPromotions().finally(() => setIsLoading(false));
    } else if (activeSubTab === 'notifications') {
      fetchNotifications().finally(() => setIsLoading(false));
    }
  }, [activeSubTab]);

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`${API_URL}/api/admin/messages/${id}/read`, {}, { headers });
      fetchMessages();
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      await axios.post(
        `${API_URL}/api/admin/messages/${selectedMessage.id}/reply`,
        { reply: replyText },
        { headers }
      );
      toast.success('Reply sent');
      setReplyText('');
      fetchMessages();
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/messages/${id}`, { headers });
      toast.success('Message deleted');
      setSelectedMessage(null);
      fetchMessages();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleCreatePromo = async () => {
    try {
      await axios.post(`${API_URL}/api/sdm/admin/promotions`, newPromo, { headers });
      toast.success('Promotion créée!');
      setShowNewPromoForm(false);
      setNewPromo({
        title: '',
        description: '',
        discount_percent: 0,
        promo_code: '',
        start_date: '',
        end_date: '',
        is_active: true
      });
      fetchPromotions();
    } catch (error) {
      toast.error('Failed to create promotion');
    }
  };

  const handleTogglePromo = async (promoId) => {
    try {
      await axios.put(`${API_URL}/api/sdm/admin/promotions/${promoId}/toggle`, {}, { headers });
      toast.success('Promotion status updated');
      fetchPromotions();
    } catch (error) {
      toast.error('Failed to update promotion');
    }
  };

  const handleDeletePromo = async (promoId) => {
    if (!window.confirm('Delete this promotion?')) return;
    try {
      await axios.delete(`${API_URL}/api/sdm/admin/promotions/${promoId}`, { headers });
      toast.success('Promotion deleted');
      fetchPromotions();
    } catch (error) {
      toast.error('Failed to delete promotion');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
        {[
          { id: 'inbox', label: 'Inbox', icon: Inbox, badge: stats.unread_messages },
          { id: 'promotions', label: 'Promos', icon: Gift },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeSubTab === tab.id 
                ? 'bg-white shadow text-blue-600' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.badge > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Inbox Tab */}
          {activeSubTab === 'inbox' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Messages List */}
              <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Messages</h3>
                  <Button variant="ghost" size="sm" onClick={fetchMessages}>
                    <RefreshCw size={16} />
                  </Button>
                </div>
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Inbox size={48} className="mx-auto mb-2 opacity-50" />
                      <p>No messages</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => {
                          setSelectedMessage(msg);
                          if (!msg.is_read) handleMarkAsRead(msg.id);
                        }}
                        className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                          selectedMessage?.id === msg.id ? 'bg-blue-50' : ''
                        } ${!msg.is_read ? 'border-l-4 border-blue-500' : ''}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.user_type === 'client' ? (
                            <User size={14} className="text-blue-600" />
                          ) : (
                            <Building2 size={14} className="text-cyan-600" />
                          )}
                          <span className="font-medium text-sm truncate">{msg.name}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{msg.message}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                          <Clock size={12} />
                          {new Date(msg.created_at).toLocaleDateString()}
                          {msg.is_replied && (
                            <span className="ml-auto text-emerald-600 flex items-center gap-1">
                              <CheckCircle size={12} /> Replied
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Message Detail */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
                {selectedMessage ? (
                  <div className="h-full flex flex-col">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{selectedMessage.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Phone size={12} />
                            {selectedMessage.phone || selectedMessage.email}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            selectedMessage.user_type === 'client' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-cyan-100 text-cyan-700'
                          }`}>
                            {selectedMessage.user_type}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMessage(selectedMessage.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto">
                      <div className="bg-slate-50 rounded-lg p-4 mb-4">
                        <p className="text-slate-700 whitespace-pre-wrap">{selectedMessage.message}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(selectedMessage.created_at).toLocaleString()}
                        </p>
                      </div>

                      {selectedMessage.admin_reply && (
                        <div className="bg-blue-50 rounded-lg p-4 ml-8">
                          <p className="text-sm font-medium text-blue-700 mb-1">Your Reply:</p>
                          <p className="text-slate-700">{selectedMessage.admin_reply}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {new Date(selectedMessage.replied_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {!selectedMessage.is_replied && (
                      <div className="p-4 border-t border-slate-200">
                        <Textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply..."
                          rows={3}
                          className="mb-3"
                        />
                        <Button onClick={handleReply} className="gap-2">
                          <Send size={16} />
                          Send Reply
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Select a message to view</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Promotions Tab */}
          {activeSubTab === 'promotions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Promotions</h3>
                <Button onClick={() => setShowNewPromoForm(true)} className="gap-2">
                  <Plus size={16} />
                  New Promotion
                </Button>
              </div>

              {showNewPromoForm && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-900">Create New Promotion</h4>
                    <Button variant="ghost" size="sm" onClick={() => setShowNewPromoForm(false)}>
                      <X size={16} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                      <Input
                        value={newPromo.title}
                        onChange={(e) => setNewPromo({...newPromo, title: e.target.value})}
                        placeholder="Summer Sale"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Promo Code</label>
                      <Input
                        value={newPromo.promo_code}
                        onChange={(e) => setNewPromo({...newPromo, promo_code: e.target.value.toUpperCase()})}
                        placeholder="SUMMER2024"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <Textarea
                        value={newPromo.description}
                        onChange={(e) => setNewPromo({...newPromo, description: e.target.value})}
                        placeholder="Get extra cashback on all purchases..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Discount %</label>
                      <Input
                        type="number"
                        value={newPromo.discount_percent}
                        onChange={(e) => setNewPromo({...newPromo, discount_percent: parseFloat(e.target.value) || 0})}
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                      <Input
                        type="date"
                        value={newPromo.start_date}
                        onChange={(e) => setNewPromo({...newPromo, start_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                      <Input
                        type="date"
                        value={newPromo.end_date}
                        onChange={(e) => setNewPromo({...newPromo, end_date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowNewPromoForm(false)}>Cancel</Button>
                    <Button onClick={handleCreatePromo}>Create Promotion</Button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Promotion</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Discount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {promotions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          <Gift size={32} className="mx-auto mb-2 opacity-50" />
                          No promotions yet
                        </td>
                      </tr>
                    ) : (
                      promotions.map((promo) => (
                        <tr key={promo.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-slate-900">{promo.title}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[200px]">{promo.description}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-slate-100 rounded font-mono text-sm">
                              {promo.promo_code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-emerald-600 font-semibold">
                            {promo.discount_percent}%
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {promo.start_date} - {promo.end_date}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              promo.is_active 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {promo.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTogglePromo(promo.id)}
                              >
                                {promo.is_active ? <ToggleRight size={18} className="text-emerald-600" /> : <ToggleLeft size={18} />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePromo(promo.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeSubTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">System Notifications</h3>
                <Button variant="outline" onClick={fetchNotifications} className="gap-2">
                  <RefreshCw size={16} />
                  Refresh
                </Button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Bell size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                    {notifications.map((notif, index) => (
                      <div key={index} className="p-4 hover:bg-slate-50">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            notif.type === 'warning' ? 'bg-amber-100' :
                            notif.type === 'error' ? 'bg-red-100' :
                            notif.type === 'success' ? 'bg-emerald-100' :
                            'bg-blue-100'
                          }`}>
                            {notif.type === 'warning' ? <AlertCircle size={20} className="text-amber-600" /> :
                             notif.type === 'error' ? <AlertCircle size={20} className="text-red-600" /> :
                             notif.type === 'success' ? <CheckCircle size={20} className="text-emerald-600" /> :
                             <Bell size={20} className="text-blue-600" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{notif.title}</p>
                            <p className="text-sm text-slate-600">{notif.message}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(notif.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

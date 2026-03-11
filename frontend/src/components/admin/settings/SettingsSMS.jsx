import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { 
  MessageSquare, Bell, Send, Loader2, Users, Store,
  RefreshCw, History, Clock
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SettingsSMS({ token }) {
  const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);
  const [bulkSMSType, setBulkSMSType] = useState('clients');
  const [bulkSMSFilter, setBulkSMSFilter] = useState('all');
  const [bulkSMSMessage, setBulkSMSMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [smsHistory, setSmsHistory] = useState([]);
  
  // Push notification states
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushForm, setPushForm] = useState({ title: '', message: '', segment: 'All', url: '' });
  const [pushStats, setPushStats] = useState({ subscribers: 0 });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchSMSHistory();
    fetchPushStats();
  }, []);

  const fetchSMSHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/sms/history?limit=10`, { headers });
      setSmsHistory(res.data.messages || []);
    } catch (error) {
      console.error('Error fetching SMS history:', error);
    }
  };

  const fetchPushStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/push/stats`, { headers });
      setPushStats(res.data);
    } catch (error) {
      console.error('Error fetching push stats:', error);
    }
  };

  const handleSendBulkSMS = async () => {
    if (!bulkSMSMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/api/admin/sms/bulk`, {
        recipient_type: bulkSMSType,
        filter: bulkSMSFilter,
        message: bulkSMSMessage
      }, { headers });
      
      toast.success('Bulk SMS sent successfully');
      setShowBulkSMSModal(false);
      setBulkSMSMessage('');
      fetchSMSHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send SMS');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPush = async () => {
    if (!pushForm.title || !pushForm.message) {
      toast.error('Title and message are required');
      return;
    }

    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/api/admin/push/send`, pushForm, { headers });
      toast.success('Push notification sent');
      setShowPushModal(false);
      setPushForm({ title: '', message: '', segment: 'All', url: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send notification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Send Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-purple-400" /> Bulk SMS to Clients
          </h3>
          <Button 
            onClick={() => { setBulkSMSType('clients'); setShowBulkSMSModal(true); }} 
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <MessageSquare size={16} className="mr-2" /> Send to Clients
          </Button>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-amber-400" /> Bulk SMS to Merchants
          </h3>
          <Button 
            onClick={() => { setBulkSMSType('merchants'); setShowBulkSMSModal(true); }} 
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            <MessageSquare size={16} className="mr-2" /> Send to Merchants
          </Button>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Bell size={20} className="text-emerald-400" /> Push Notifications
          </h3>
          <p className="text-slate-400 text-sm mb-3">
            {pushStats.subscribers || 0} subscribers
          </p>
          <Button 
            onClick={() => setShowPushModal(true)} 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <Bell size={16} className="mr-2" /> Send Push
          </Button>
        </div>
      </div>

      {/* SMS History */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <History size={20} className="text-blue-400" /> Recent SMS History
          </h3>
          <Button onClick={fetchSMSHistory} variant="outline" size="sm" className="border-slate-600">
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>
        
        <div className="space-y-3">
          {smsHistory.length > 0 ? (
            smsHistory.map((sms, idx) => (
              <div key={idx} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(sms.created_at).toLocaleString()}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    sms.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {sms.status}
                  </span>
                </div>
                <p className="text-white text-sm">{sms.message?.slice(0, 100)}...</p>
                <p className="text-slate-500 text-xs mt-1">
                  To: {sms.recipient_count || 0} {sms.recipient_type}
                </p>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-4">No SMS history</p>
          )}
        </div>
      </div>

      {/* Bulk SMS Modal */}
      {showBulkSMSModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold text-lg mb-4">
              Send Bulk SMS to {bulkSMSType === 'clients' ? 'Clients' : 'Merchants'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Filter Recipients</Label>
                <select
                  value={bulkSMSFilter}
                  onChange={(e) => setBulkSMSFilter(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                >
                  <option value="all">All {bulkSMSType}</option>
                  <option value="active">Active only</option>
                  {bulkSMSType === 'clients' && (
                    <>
                      <option value="silver">Silver card holders</option>
                      <option value="gold">Gold card holders</option>
                      <option value="platinum">Platinum card holders</option>
                    </>
                  )}
                </select>
              </div>
              
              <div>
                <Label className="text-slate-400">Message</Label>
                <textarea
                  value={bulkSMSMessage}
                  onChange={(e) => setBulkSMSMessage(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white min-h-[120px]"
                  placeholder="Enter your message..."
                  maxLength={160}
                />
                <p className="text-slate-500 text-xs mt-1">{bulkSMSMessage.length}/160 characters</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowBulkSMSModal(false)}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendBulkSMS}
                disabled={isLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send className="mr-2" size={16} />}
                Send SMS
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Push Modal */}
      {showPushModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold text-lg mb-4">Send Push Notification</h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Title</Label>
                <Input
                  value={pushForm.title}
                  onChange={(e) => setPushForm({...pushForm, title: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="Notification title"
                />
              </div>
              <div>
                <Label className="text-slate-400">Message</Label>
                <textarea
                  value={pushForm.message}
                  onChange={(e) => setPushForm({...pushForm, message: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white min-h-[80px]"
                  placeholder="Notification message"
                />
              </div>
              <div>
                <Label className="text-slate-400">Segment</Label>
                <select
                  value={pushForm.segment}
                  onChange={(e) => setPushForm({...pushForm, segment: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                >
                  <option value="All">All subscribers</option>
                  <option value="Active Users">Active users</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowPushModal(false)}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendPush}
                disabled={isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Bell className="mr-2" size={16} />}
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

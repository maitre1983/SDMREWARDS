import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { XCircle, Send, Loader2, MessageSquare, Users, Store } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SendSMSModal({
  isOpen,
  onClose,
  recipient, // Can be client, merchant, or null for bulk
  recipientType, // 'client', 'merchant', 'bulk'
  token
}) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [bulkFilter, setBulkFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [targetGroup, setTargetGroup] = useState('clients'); // 'clients', 'merchants', 'both'

  if (!isOpen) return null;

  const headers = { Authorization: `Bearer ${token}` };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSending(true);
    try {
      if (recipientType === 'bulk') {
        // Bulk SMS
        await axios.post(
          `${API_URL}/api/admin/sms/bulk`,
          {
            message: message.trim(),
            target: targetGroup,
            filter: bulkFilter
          },
          { headers }
        );
        toast.success('Bulk SMS sent successfully!');
      } else {
        // Single recipient
        const phone = recipient?.phone;
        if (!phone) {
          toast.error('No phone number found');
          return;
        }
        
        await axios.post(
          `${API_URL}/api/admin/sms/send`,
          {
            phone: phone,
            message: message.trim()
          },
          { headers }
        );
        toast.success('SMS sent successfully!');
      }
      
      setMessage('');
      onClose();
    } catch (error) {
      console.error('SMS error:', error);
      toast.error(error.response?.data?.detail || 'Failed to send SMS');
    } finally {
      setIsSending(false);
    }
  };

  const getRecipientInfo = () => {
    if (recipientType === 'bulk') {
      return {
        icon: <Users className="text-purple-400" size={24} />,
        title: 'Bulk SMS',
        subtitle: 'Send to multiple recipients'
      };
    }
    if (recipientType === 'client') {
      return {
        icon: <Users className="text-blue-400" size={24} />,
        title: recipient?.full_name || recipient?.username || 'Client',
        subtitle: recipient?.phone
      };
    }
    return {
      icon: <Store className="text-emerald-400" size={24} />,
      title: recipient?.business_name || 'Merchant',
      subtitle: recipient?.phone
    };
  };

  const info = getRecipientInfo();

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="border-b border-slate-700 p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {info.icon}
            <div>
              <h2 className="text-white font-semibold">{info.title}</h2>
              <p className="text-slate-400 text-sm">{info.subtitle}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-400">
            <XCircle size={24} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Bulk Options */}
          {recipientType === 'bulk' && (
            <>
              <div>
                <Label className="text-slate-300">Target Group</Label>
                <div className="flex gap-2 mt-2">
                  {[
                    { id: 'clients', label: 'Clients', icon: Users },
                    { id: 'merchants', label: 'Merchants', icon: Store },
                    { id: 'both', label: 'Both', icon: Users }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setTargetGroup(opt.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm transition-all ${
                        targetGroup === opt.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <opt.icon size={16} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Filter</Label>
                <div className="flex gap-2 mt-2">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'active', label: 'Active' },
                    { id: 'inactive', label: 'Inactive' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setBulkFilter(opt.id)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                        bulkFilter === opt.id
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Message Input */}
          <div>
            <Label className="text-slate-300">Message</Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full mt-2 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 resize-none h-32 focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={160}
            />
            <p className="text-slate-500 text-xs mt-1 text-right">
              {message.length}/160 characters
            </p>
          </div>

          {/* Quick Templates */}
          <div>
            <Label className="text-slate-400 text-xs">Quick Templates</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                'Welcome to SDM REWARDS!',
                'Your account has been updated.',
                'New promotion available!'
              ].map((template, i) => (
                <button
                  key={i}
                  onClick={() => setMessage(template)}
                  className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded hover:bg-slate-600 transition-colors"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSending ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Send size={16} />
            )}
            <span className="ml-2">{isSending ? 'Sending...' : 'Send SMS'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

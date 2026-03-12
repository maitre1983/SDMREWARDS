import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { XCircle, Sliders, Loader2, DollarSign } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function LimitsModal({ 
  isOpen, 
  onClose, 
  client, 
  token,
  onSuccess 
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    withdrawal_limit: client?.withdrawal_limit || 500,
    transaction_limit: client?.transaction_limit || 1000,
    daily_limit: client?.daily_limit || 2000
  });

  if (!isOpen || !client) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.put(
        `${API_URL}/api/admin/clients/${client.id}/limits`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Client limits updated successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update limits');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="border-b border-slate-700 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sliders className="text-blue-400" size={20} />
            <h2 className="text-white font-semibold">Manage Limits</h2>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            <XCircle size={20} />
          </Button>
        </div>

        {/* Client Info */}
        <div className="p-4 bg-slate-900/50 border-b border-slate-700">
          <p className="text-white font-medium">{client.full_name}</p>
          <p className="text-slate-400 text-sm">{client.phone}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <Label className="text-slate-300">Withdrawal Limit (GHS)</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <Input
                type="number"
                value={form.withdrawal_limit}
                onChange={(e) => setForm({ ...form, withdrawal_limit: parseFloat(e.target.value) })}
                className="pl-9 bg-slate-900 border-slate-700 text-white"
                min={0}
                step={0.01}
              />
            </div>
            <p className="text-slate-500 text-xs mt-1">Maximum amount per withdrawal</p>
          </div>

          <div>
            <Label className="text-slate-300">Transaction Limit (GHS)</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <Input
                type="number"
                value={form.transaction_limit}
                onChange={(e) => setForm({ ...form, transaction_limit: parseFloat(e.target.value) })}
                className="pl-9 bg-slate-900 border-slate-700 text-white"
                min={0}
                step={0.01}
              />
            </div>
            <p className="text-slate-500 text-xs mt-1">Maximum amount per transaction</p>
          </div>

          <div>
            <Label className="text-slate-300">Daily Limit (GHS)</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <Input
                type="number"
                value={form.daily_limit}
                onChange={(e) => setForm({ ...form, daily_limit: parseFloat(e.target.value) })}
                className="pl-9 bg-slate-900 border-slate-700 text-white"
                min={0}
                step={0.01}
              />
            </div>
            <p className="text-slate-500 text-xs mt-1">Maximum total transactions per day</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Save Limits
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

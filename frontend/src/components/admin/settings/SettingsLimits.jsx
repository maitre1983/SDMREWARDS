import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Gauge, Save, Loader2, Smartphone, Building2, AlertCircle, Info } from 'lucide-react';

import { API_URL } from '@/config/api';

export default function SettingsLimits({ token }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [limitsForm, setLimitsForm] = useState({
    momo_max_per_tx: 500,
    momo_daily: 1000,
    momo_weekly: 5000,
    momo_monthly: 20000,
    bank_max_per_tx: 2000,
    bank_daily: 5000,
    bank_weekly: 20000,
    bank_monthly: 100000
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/api/admin/withdrawal-limits`, { headers });
      
      if (res.data.limits) {
        const { momo, bank } = res.data.limits;
        setLimitsForm({
          momo_max_per_tx: momo?.max_per_tx || 500,
          momo_daily: momo?.daily || 1000,
          momo_weekly: momo?.weekly || 5000,
          momo_monthly: momo?.monthly || 20000,
          bank_max_per_tx: bank?.max_per_tx || 2000,
          bank_daily: bank?.daily || 5000,
          bank_weekly: bank?.weekly || 20000,
          bank_monthly: bank?.monthly || 100000
        });
      }
    } catch (error) {
      console.error('Error fetching withdrawal limits:', error);
      toast.error('Failed to load withdrawal limits');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLimits = async () => {
    try {
      setIsSaving(true);
      
      const payload = {
        momo_max_per_tx: parseFloat(limitsForm.momo_max_per_tx) || 500,
        momo_daily: parseFloat(limitsForm.momo_daily) || 1000,
        momo_weekly: parseFloat(limitsForm.momo_weekly) || 5000,
        momo_monthly: parseFloat(limitsForm.momo_monthly) || 20000,
        bank_max_per_tx: parseFloat(limitsForm.bank_max_per_tx) || 2000,
        bank_daily: parseFloat(limitsForm.bank_daily) || 5000,
        bank_weekly: parseFloat(limitsForm.bank_weekly) || 20000,
        bank_monthly: parseFloat(limitsForm.bank_monthly) || 100000
      };
      
      await axios.put(`${API_URL}/api/admin/withdrawal-limits`, payload, { headers });
      toast.success('Withdrawal limits updated successfully');
    } catch (error) {
      console.error('Error saving withdrawal limits:', error);
      toast.error(error.response?.data?.detail || 'Failed to update withdrawal limits');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setLimitsForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const LimitInput = ({ label, field, icon }) => (
    <div className="space-y-1">
      <Label className="text-slate-400 text-xs flex items-center gap-1">
        {icon}
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">GHS</span>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={limitsForm[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className="pl-12 bg-slate-800 border-slate-700 text-white"
          data-testid={`limit-input-${field}`}
        />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4 flex items-start gap-3">
        <Info className="text-blue-400 mt-0.5 flex-shrink-0" size={20} />
        <div>
          <h4 className="text-blue-300 font-medium">How Global Limits Work</h4>
          <p className="text-blue-200/70 text-sm mt-1">
            These limits apply to all clients. The effective limit for any withdrawal is calculated as:<br/>
            <code className="bg-blue-900/50 px-2 py-0.5 rounded text-blue-100 text-xs">
              Effective Limit = MIN(Global Limit, Individual User Limit)
            </code>
          </p>
        </div>
      </div>

      {/* MoMo Limits Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
          <Smartphone size={20} className="text-yellow-400" />
          Mobile Money (MoMo) Limits
        </h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <LimitInput 
            label="Max Per Transaction" 
            field="momo_max_per_tx"
            icon={<AlertCircle size={12} className="text-yellow-400" />}
          />
          <LimitInput 
            label="Daily Limit" 
            field="momo_daily"
            icon={<span className="text-xs">24h</span>}
          />
          <LimitInput 
            label="Weekly Limit" 
            field="momo_weekly"
            icon={<span className="text-xs">7d</span>}
          />
          <LimitInput 
            label="Monthly Limit" 
            field="momo_monthly"
            icon={<span className="text-xs">30d</span>}
          />
        </div>
      </div>

      {/* Bank Limits Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
          <Building2 size={20} className="text-green-400" />
          Bank Transfer Limits
        </h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <LimitInput 
            label="Max Per Transaction" 
            field="bank_max_per_tx"
            icon={<AlertCircle size={12} className="text-green-400" />}
          />
          <LimitInput 
            label="Daily Limit" 
            field="bank_daily"
            icon={<span className="text-xs">24h</span>}
          />
          <LimitInput 
            label="Weekly Limit" 
            field="bank_weekly"
            icon={<span className="text-xs">7d</span>}
          />
          <LimitInput 
            label="Monthly Limit" 
            field="bank_monthly"
            icon={<span className="text-xs">30d</span>}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveLimits}
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-700"
          data-testid="save-withdrawal-limits-btn"
        >
          {isSaving ? (
            <Loader2 className="animate-spin mr-2" size={16} />
          ) : (
            <Save className="mr-2" size={16} />
          )}
          {isSaving ? 'Saving...' : 'Save Withdrawal Limits'}
        </Button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Sliders, Save, Loader2, Percent, DollarSign } from 'lucide-react';
import ServiceFeesAnalytics from '../ServiceFeesAnalytics';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function SettingsServices({ token, platformConfig, onConfigUpdate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [serviceCommissionsForm, setServiceCommissionsForm] = useState({
    airtime_type: 'percentage', airtime_rate: 2,
    data_type: 'percentage', data_rate: 2,
    ecg_type: 'fixed', ecg_rate: 1,
    merchant_type: 'percentage', merchant_rate: 1,
    withdrawal_type: 'percentage', withdrawal_rate: 1
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (platformConfig) {
      setServiceCommissionsForm({
        airtime_type: platformConfig.service_fees?.airtime_type || 'percentage',
        airtime_rate: platformConfig.service_fees?.airtime_rate || 2,
        data_type: platformConfig.service_fees?.data_type || 'percentage',
        data_rate: platformConfig.service_fees?.data_rate || 2,
        ecg_type: platformConfig.service_fees?.ecg_type || 'fixed',
        ecg_rate: platformConfig.service_fees?.ecg_rate || 1,
        merchant_type: platformConfig.service_fees?.merchant_type || 'percentage',
        merchant_rate: platformConfig.service_fees?.merchant_rate || 1,
        withdrawal_type: platformConfig.service_fees?.withdrawal_type || 'percentage',
        withdrawal_rate: platformConfig.service_fees?.withdrawal_rate || 1
      });
    }
  }, [platformConfig]);

  const handleSaveServiceFees = async () => {
    try {
      setIsLoading(true);
      await axios.put(`${API_URL}/api/admin/platform-config`, {
        service_fees: serviceCommissionsForm
      }, { headers });
      toast.success('Service fees updated');
      onConfigUpdate?.();
    } catch (error) {
      toast.error('Failed to update service fees');
    } finally {
      setIsLoading(false);
    }
  };

  const ServiceFeeInput = ({ label, typeKey, rateKey, icon }) => (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-white font-medium">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-slate-400 text-xs">Type</Label>
          <select
            value={serviceCommissionsForm[typeKey]}
            onChange={(e) => setServiceCommissionsForm({
              ...serviceCommissionsForm, 
              [typeKey]: e.target.value
            })}
            className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>
        <div>
          <Label className="text-slate-400 text-xs">
            Rate {serviceCommissionsForm[typeKey] === 'percentage' ? '(%)' : '(GHS)'}
          </Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={serviceCommissionsForm[rateKey]}
            onChange={(e) => setServiceCommissionsForm({
              ...serviceCommissionsForm, 
              [rateKey]: parseFloat(e.target.value)
            })}
            className="mt-1 bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Service Fees Analytics */}
      <ServiceFeesAnalytics token={token} />

      {/* Service Fees Configuration */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
          <Sliders size={20} className="text-blue-400" />
          Service Commission Rates
        </h3>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ServiceFeeInput 
            label="Airtime" 
            typeKey="airtime_type" 
            rateKey="airtime_rate"
            icon={<span className="text-xl">📱</span>}
          />
          <ServiceFeeInput 
            label="Data Bundles" 
            typeKey="data_type" 
            rateKey="data_rate"
            icon={<span className="text-xl">📶</span>}
          />
          <ServiceFeeInput 
            label="ECG Bills" 
            typeKey="ecg_type" 
            rateKey="ecg_rate"
            icon={<span className="text-xl">⚡</span>}
          />
          <ServiceFeeInput 
            label="Merchant Payments" 
            typeKey="merchant_type" 
            rateKey="merchant_rate"
            icon={<span className="text-xl">🏪</span>}
          />
          <ServiceFeeInput 
            label="Cashback Withdrawal" 
            typeKey="withdrawal_type" 
            rateKey="withdrawal_rate"
            icon={<span className="text-xl">💸</span>}
          />
        </div>

        <Button 
          onClick={handleSaveServiceFees}
          disabled={isLoading}
          className="mt-6 bg-blue-600 hover:bg-blue-700"
          data-testid="save-service-fees-btn"
        >
          {isLoading ? (
            <Loader2 className="animate-spin mr-2" size={16} />
          ) : (
            <Save className="mr-2" size={16} />
          )}
          {isLoading ? 'Saving...' : 'Save Service Fees'}
        </Button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  Percent, TrendingUp, Smartphone, Wifi, Zap, Store, 
  Loader2, DollarSign, BarChart3
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ServiceFeesAnalytics({ token, advancedStats }) {
  const [isLoading, setIsLoading] = useState(false);

  if (!advancedStats?.service_fees) {
    return null;
  }

  const { service_fees, financial_stats } = advancedStats;

  const serviceIcons = {
    airtime: Smartphone,
    data_bundle: Wifi,
    ecg_payment: Zap,
    merchant_payment: Store
  };

  const formatCurrency = (value) => `GHS ${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium mb-1">{label}</p>
          <p className="text-emerald-400 text-sm">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* SDM Commissions Card */}
      <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Percent className="text-amber-400" size={24} />
          </div>
          <div>
            <h3 className="text-white font-semibold">SDM Cashback Commissions</h3>
            <p className="text-slate-400 text-sm">Total commissions collected</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-slate-400 text-xs">Total (All Time)</p>
            <p className="text-amber-400 text-2xl font-bold">{formatCurrency(financial_stats?.total_sdm_commissions)}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-slate-500 text-xs">Today</p>
            <p className="text-white font-medium">{formatCurrency(financial_stats?.sdm_commission_by_period?.day)}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-slate-500 text-xs">This Week</p>
            <p className="text-white font-medium">{formatCurrency(financial_stats?.sdm_commission_by_period?.week)}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-slate-500 text-xs">This Month</p>
            <p className="text-white font-medium">{formatCurrency(financial_stats?.sdm_commission_by_period?.month)}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <p className="text-slate-500 text-xs">This Year</p>
            <p className="text-white font-medium">{formatCurrency(financial_stats?.sdm_commission_by_period?.year)}</p>
          </div>
        </div>
      </div>

      {/* Service Fees Analytics */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <BarChart3 className="text-emerald-400" size={24} />
            </div>
            <div>
              <h3 className="text-white font-semibold">Service Fees Analytics</h3>
              <p className="text-slate-400 text-sm">Fees collected by service</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">Total Fees</p>
            <p className="text-emerald-400 text-xl font-bold">{formatCurrency(service_fees?.total_fees)}</p>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Object.entries(service_fees?.by_service || {}).map(([key, service]) => {
            const Icon = serviceIcons[key] || DollarSign;
            return (
              <div key={key} className="bg-slate-900 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="text-slate-400" size={18} />
                  <span className="text-slate-300 text-sm font-medium">{service.label}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Transactions</span>
                    <span className="text-white text-sm">{service.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Volume</span>
                    <span className="text-white text-sm">{formatCurrency(service.volume)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Fees</span>
                    <span className="text-emerald-400 text-sm font-medium">{formatCurrency(service.fees)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Services Ranking */}
        <div className="mb-6">
          <h4 className="text-slate-300 text-sm font-medium mb-3">Top Services (by usage)</h4>
          <div className="space-y-2">
            {service_fees?.top_services?.filter(s => s.count > 0).slice(0, 4).map((service, index) => {
              const Icon = serviceIcons[service.service] || DollarSign;
              const maxCount = Math.max(...service_fees.top_services.map(s => s.count)) || 1;
              const percentage = (service.count / maxCount) * 100;
              
              return (
                <div key={service.service} className="flex items-center gap-3">
                  <span className="text-slate-500 text-sm w-6">#{index + 1}</span>
                  <Icon className="text-slate-400" size={16} />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-300 text-sm">{service_fees.by_service[service.service]?.label}</span>
                      <span className="text-white text-sm">{service.count} txn</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {service_fees?.top_services?.every(s => s.count === 0) && (
              <p className="text-slate-500 text-center py-4">No service transactions recorded</p>
            )}
          </div>
        </div>

        {/* Monthly Fees Chart */}
        {service_fees?.monthly_chart && service_fees.monthly_chart.some(m => m.fees > 0) && (
          <div>
            <h4 className="text-slate-300 text-sm font-medium mb-3">Fees per month</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={service_fees.monthly_chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="fees" name="Fees (GHS)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

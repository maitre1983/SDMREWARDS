import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, 
  Users, Calculator, Calendar, BarChart3, Loader2,
  ArrowUpRight, ArrowDownRight, Minus, Banknote, CreditCard
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdvancedDashboard({ token, basicStats, merchant }) {
  const [period, setPeriod] = useState('day');
  const [advancedStats, setAdvancedStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [paymentMethodsData, setPaymentMethodsData] = useState(null);
  const [chartType, setChartType] = useState('daily');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, [period, chartType]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [statsRes, summaryRes, chartRes, paymentMethodsRes] = await Promise.all([
        axios.get(`${API_URL}/api/merchants/dashboard/advanced-stats?period=${period}`, { headers }),
        axios.get(`${API_URL}/api/merchants/dashboard/summary`, { headers }),
        axios.get(`${API_URL}/api/merchants/dashboard/chart-data?chart_type=${chartType}`, { headers }),
        axios.get(`${API_URL}/api/merchants/dashboard/payment-methods?chart_type=${chartType}`, { headers })
      ]);
      
      setAdvancedStats(statsRes.data);
      setSummary(summaryRes.data);
      setChartData(chartRes.data);
      setPaymentMethodsData(paymentMethodsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `GHS ${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const GrowthIndicator = ({ value }) => {
    if (value > 0) {
      return (
        <span className="flex items-center text-emerald-400 text-sm">
          <ArrowUpRight size={16} />
          +{value}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="flex items-center text-red-400 text-sm">
          <ArrowDownRight size={16} />
          {value}%
        </span>
      );
    }
    return (
      <span className="flex items-center text-slate-400 text-sm">
        <Minus size={16} />
        0%
      </span>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading && !advancedStats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'day', label: 'Aujourd\'hui' },
          { id: 'week', label: 'Semaine' },
          { id: 'month', label: 'Mois' },
          { id: 'year', label: 'Année' }
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === p.id
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            data-testid={`period-${p.id}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Volume */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="text-emerald-400" size={20} />
            </div>
            <GrowthIndicator value={advancedStats?.growth?.volume} />
          </div>
          <p className="text-slate-400 text-sm">Ventes</p>
          <p className="text-white text-xl font-bold">
            {formatCurrency(advancedStats?.current?.volume)}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            vs {formatCurrency(advancedStats?.previous?.volume)}
          </p>
        </div>

        {/* Transactions */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ShoppingCart className="text-blue-400" size={20} />
            </div>
            <GrowthIndicator value={advancedStats?.growth?.transactions} />
          </div>
          <p className="text-slate-400 text-sm">Transactions</p>
          <p className="text-white text-xl font-bold">
            {advancedStats?.current?.transactions || 0}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            vs {advancedStats?.previous?.transactions || 0}
          </p>
        </div>

        {/* Cashback */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <TrendingUp className="text-amber-400" size={20} />
            </div>
            <GrowthIndicator value={advancedStats?.growth?.cashback} />
          </div>
          <p className="text-slate-400 text-sm">Cashback distribué</p>
          <p className="text-white text-xl font-bold">
            {formatCurrency(advancedStats?.current?.cashback)}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            vs {formatCurrency(advancedStats?.previous?.cashback)}
          </p>
        </div>

        {/* Average Transaction */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Calculator className="text-purple-400" size={20} />
            </div>
            <GrowthIndicator value={advancedStats?.growth?.average_transaction} />
          </div>
          <p className="text-slate-400 text-sm">Panier moyen</p>
          <p className="text-white text-xl font-bold">
            {formatCurrency(advancedStats?.current?.average_transaction)}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            vs {formatCurrency(advancedStats?.previous?.average_transaction)}
          </p>
        </div>
      </div>

      {/* Mini Accounting Summary */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Calculator size={18} /> Mini Comptabilité
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-slate-400 text-sm">Total ventes (depuis inscription)</p>
            <p className="text-white text-2xl font-bold">
              {formatCurrency(summary?.all_time?.total_volume)}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Total cashback distribué</p>
            <p className="text-amber-400 text-2xl font-bold">
              {formatCurrency(summary?.all_time?.total_cashback)}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Total transactions</p>
            <p className="text-white text-2xl font-bold">
              {summary?.all_time?.total_transactions || 0}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Clients uniques</p>
            <p className="text-emerald-400 text-2xl font-bold flex items-center gap-2">
              <Users size={20} />
              {summary?.all_time?.unique_clients || 0}
            </p>
          </div>
        </div>

        {/* Period breakdown */}
        <div className="mt-6 pt-6 border-t border-slate-700">
          <h4 className="text-slate-300 text-sm font-medium mb-3">Ventes par période</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'day', label: 'Aujourd\'hui' },
              { key: 'week', label: 'Semaine' },
              { key: 'month', label: 'Mois' },
              { key: 'year', label: 'Année' }
            ].map((p) => (
              <div key={p.key} className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">{p.label}</p>
                <p className="text-white font-medium">
                  {formatCurrency(summary?.by_period?.[p.key]?.volume)}
                </p>
                <p className="text-slate-400 text-xs">
                  {summary?.by_period?.[p.key]?.transactions || 0} txn
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <BarChart3 size={18} /> Évolution des ventes
          </h3>
          <div className="flex gap-2">
            {[
              { id: 'daily', label: '7 jours' },
              { id: 'weekly', label: '4 sem.' },
              { id: 'monthly', label: '6 mois' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setChartType(t.id)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  chartType === t.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
                data-testid={`chart-${t.id}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {chartData?.data && chartData.data.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="label" 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ color: '#94a3b8' }}
                  formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
                />
                <Bar 
                  dataKey="volume" 
                  name="Ventes (GHS)" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="cashback" 
                  name="Cashback (GHS)" 
                  fill="#f59e0b" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500">
            Pas de données pour cette période
          </div>
        )}

        {/* Chart Totals */}
        {chartData?.totals && (
          <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-slate-400 text-xs">Total ventes</p>
              <p className="text-emerald-400 font-bold">{formatCurrency(chartData.totals.volume)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Total cashback</p>
              <p className="text-amber-400 font-bold">{formatCurrency(chartData.totals.cashback)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Transactions</p>
              <p className="text-white font-bold">{chartData.totals.transactions}</p>
            </div>
          </div>
        )}
      </div>

      {/* Cash vs MoMo Revenue Chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Banknote size={18} className="text-amber-400" /> Revenus: Cash vs MoMo
          </h3>
        </div>

        {/* Summary Cards */}
        {paymentMethodsData?.totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* MoMo Stats */}
            <div className="bg-gradient-to-br from-blue-900/30 to-slate-900 rounded-xl p-4 border border-blue-500/30">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="text-blue-400" size={18} />
                <span className="text-blue-400 text-sm font-medium">MoMo</span>
              </div>
              <p className="text-white text-xl font-bold">
                {formatCurrency(paymentMethodsData.totals.momo_volume)}
              </p>
              <p className="text-slate-400 text-xs">
                {paymentMethodsData.totals.momo_count} transactions
              </p>
              {paymentMethodsData.totals.momo_percentage > 0 && (
                <div className="mt-2 bg-blue-500/20 rounded-full px-2 py-0.5 inline-block">
                  <span className="text-blue-400 text-xs font-medium">
                    {paymentMethodsData.totals.momo_percentage}%
                  </span>
                </div>
              )}
            </div>

            {/* Cash Stats */}
            <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900 rounded-xl p-4 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="text-emerald-400" size={18} />
                <span className="text-emerald-400 text-sm font-medium">Cash</span>
              </div>
              <p className="text-white text-xl font-bold">
                {formatCurrency(paymentMethodsData.totals.cash_volume)}
              </p>
              <p className="text-slate-400 text-xs">
                {paymentMethodsData.totals.cash_count} transactions
              </p>
              {paymentMethodsData.totals.cash_percentage > 0 && (
                <div className="mt-2 bg-emerald-500/20 rounded-full px-2 py-0.5 inline-block">
                  <span className="text-emerald-400 text-xs font-medium">
                    {paymentMethodsData.totals.cash_percentage}%
                  </span>
                </div>
              )}
            </div>

            {/* Total Volume */}
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="text-amber-400" size={18} />
                <span className="text-slate-300 text-sm font-medium">Total</span>
              </div>
              <p className="text-white text-xl font-bold">
                {formatCurrency(paymentMethodsData.totals.total_volume)}
              </p>
              <p className="text-slate-400 text-xs">
                {paymentMethodsData.totals.total_count} transactions
              </p>
            </div>

            {/* Total Cashback */}
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-purple-400" size={18} />
                <span className="text-slate-300 text-sm font-medium">Cashback</span>
              </div>
              <p className="text-purple-400 text-xl font-bold">
                {formatCurrency(paymentMethodsData.totals.total_cashback)}
              </p>
              <p className="text-slate-400 text-xs">
                distribué aux clients
              </p>
            </div>
          </div>
        )}

        {/* Stacked Bar Chart: Cash vs MoMo */}
        {paymentMethodsData?.data && paymentMethodsData.data.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethodsData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="label" 
                  stroke="#94a3b8" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
                          <p className="text-white font-medium mb-2">{label}</p>
                          {payload.map((entry, index) => (
                            <p key={index} style={{ color: entry.color }} className="text-sm">
                              {entry.name}: {formatCurrency(entry.value)}
                            </p>
                          ))}
                          <div className="mt-2 pt-2 border-t border-slate-600">
                            <p className="text-slate-300 text-sm">
                              Total: {formatCurrency(
                                (payload.find(p => p.dataKey === 'momo_volume')?.value || 0) +
                                (payload.find(p => p.dataKey === 'cash_volume')?.value || 0)
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: '#94a3b8' }}
                  formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
                />
                <Bar 
                  dataKey="momo_volume" 
                  name="MoMo (GHS)" 
                  stackId="a"
                  fill="#3b82f6" 
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="cash_volume" 
                  name="Cash (GHS)" 
                  stackId="a"
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <Banknote size={48} className="mb-3 opacity-50" />
            <p>Pas de données pour cette période</p>
            <p className="text-sm">Les ventes cash et MoMo apparaîtront ici</p>
          </div>
        )}
      </div>

      {/* Cashback Rate Info */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-emerald-400 font-medium">Taux de cashback actuel</p>
          <p className="text-slate-400 text-sm">
            Membre depuis {summary?.member_since ? new Date(summary.member_since).toLocaleDateString('fr-FR') : 'N/A'}
          </p>
        </div>
        <div className="text-3xl font-bold text-emerald-400">
          {merchant?.cashback_rate || summary?.cashback_rate || 5}%
        </div>
      </div>
    </div>
  );
}

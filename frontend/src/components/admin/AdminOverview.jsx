import React from 'react';
import { 
  Users, Store, CreditCard, Activity, TrendingUp, Gift, UserPlus,
  Medal, Award, Crown, DollarSign, Star, BarChart3, Loader2,
  Banknote, Smartphone
} from 'lucide-react';
import ServiceFeesAnalytics from './ServiceFeesAnalytics';

export default function AdminOverview({
  stats,
  advancedStats,
  clients,
  merchants,
  token,
  getStatusBadge,
  selectedMonth,
  setSelectedMonth,
  monthlyStats,
  loadingMonthlyStats,
  paymentMethods  // New prop for payment methods stats
}) {
  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <Users className="text-blue-400 mb-2" size={24} />
          <p className="text-slate-400 text-sm">Total Clients</p>
          <p className="text-white text-2xl font-bold">{stats?.total_clients || 0}</p>
          <p className="text-emerald-400 text-xs mt-1">
            {stats?.active_clients || 0} active
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <Store className="text-emerald-400 mb-2" size={24} />
          <p className="text-slate-400 text-sm">Total Merchants</p>
          <p className="text-white text-2xl font-bold">{stats?.total_merchants || 0}</p>
          <p className="text-amber-400 text-xs mt-1">
            {stats?.pending_merchants || 0} pending
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <CreditCard className="text-amber-400 mb-2" size={24} />
          <p className="text-slate-400 text-sm">Active Members</p>
          <p className="text-white text-2xl font-bold">{stats?.active_clients || 0}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <Activity className="text-purple-400 mb-2" size={24} />
          <p className="text-slate-400 text-sm">Active Partners</p>
          <p className="text-white text-2xl font-bold">{stats?.active_merchants || 0}</p>
        </div>
      </div>

      {/* Membership Card Statistics */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <CreditCard size={20} className="text-amber-400" />
          Membership Card Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-4 text-center">
            <Medal className="text-slate-300 mx-auto mb-2" size={28} />
            <p className="text-slate-300 text-sm">Silver Cards</p>
            <p className="text-white text-2xl font-bold">{advancedStats?.card_stats?.silver || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-700 to-amber-800 rounded-xl p-4 text-center">
            <Award className="text-amber-300 mx-auto mb-2" size={28} />
            <p className="text-amber-200 text-sm">Gold Cards</p>
            <p className="text-white text-2xl font-bold">{advancedStats?.card_stats?.gold || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-700 to-purple-800 rounded-xl p-4 text-center">
            <Crown className="text-purple-300 mx-auto mb-2" size={28} />
            <p className="text-purple-200 text-sm">Platinum Cards</p>
            <p className="text-white text-2xl font-bold">{advancedStats?.card_stats?.platinum || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-700 to-cyan-800 rounded-xl p-4 text-center">
            <Star className="text-cyan-300 mx-auto mb-2" size={28} />
            <p className="text-cyan-200 text-sm">Diamond Cards</p>
            <p className="text-white text-2xl font-bold">{advancedStats?.card_stats?.diamond || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-700 to-blue-800 rounded-xl p-4 text-center">
            <CreditCard className="text-blue-300 mx-auto mb-2" size={28} />
            <p className="text-blue-200 text-sm">Total Cards</p>
            <p className="text-white text-2xl font-bold">{advancedStats?.card_stats?.total || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-700 to-emerald-800 rounded-xl p-4 text-center">
            <DollarSign className="text-emerald-300 mx-auto mb-2" size={28} />
            <p className="text-emerald-200 text-sm">Card Revenue</p>
            <p className="text-white text-2xl font-bold">GHS {(advancedStats?.card_stats?.revenue || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Financial Statistics */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 border border-emerald-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="text-emerald-400" size={32} />
            <span className="text-emerald-400 text-sm bg-emerald-500/20 px-2 py-1 rounded-full">GMV</span>
          </div>
          <p className="text-slate-400 text-sm">Total Transaction Volume</p>
          <p className="text-white text-3xl font-bold mt-1">GHS {(advancedStats?.financial_stats?.total_gmv || 0).toLocaleString()}</p>
          <p className="text-emerald-400 text-xs mt-2">Gross Merchandise Volume</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Gift className="text-purple-400" size={32} />
            <span className="text-purple-400 text-sm bg-purple-500/20 px-2 py-1 rounded-full">Rewards</span>
          </div>
          <p className="text-slate-400 text-sm">Total Cashback Distributed</p>
          <p className="text-white text-3xl font-bold mt-1">GHS {(advancedStats?.financial_stats?.total_cashback_distributed || 0).toLocaleString()}</p>
          <p className="text-purple-400 text-xs mt-2">To all clients</p>
        </div>
        
        <div className="bg-gradient-to-br from-amber-900/50 to-amber-800/30 border border-amber-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <UserPlus className="text-amber-400" size={32} />
            <span className="text-amber-400 text-sm bg-amber-500/20 px-2 py-1 rounded-full">Referrals</span>
          </div>
          <p className="text-slate-400 text-sm">Referral Bonuses Paid</p>
          <p className="text-white text-3xl font-bold mt-1">GHS {(advancedStats?.financial_stats?.total_referral_bonuses || 0).toLocaleString()}</p>
          <p className="text-amber-400 text-xs mt-2">{advancedStats?.referral_stats?.successful_referrals || 0} successful referrals</p>
        </div>
      </div>

      {/* Payment Methods Breakdown (Global Cash vs MoMo) */}
      {paymentMethods && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-cyan-400" />
            Payment Methods (Cash vs MoMo)
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Today's Stats */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
              <h4 className="text-slate-300 text-sm font-medium mb-3 flex items-center gap-2">
                Today's Breakdown
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote size={18} className="text-emerald-400" />
                    <span className="text-emerald-400 font-medium text-sm">Cash</span>
                  </div>
                  <p className="text-2xl font-bold text-white">GHS {paymentMethods.today?.cash?.volume?.toLocaleString() || '0'}</p>
                  <p className="text-slate-400 text-sm">{paymentMethods.today?.cash?.count || 0} transactions</p>
                  <div className="mt-2 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${paymentMethods.today?.cash?.percentage || 0}%` }}
                    />
                  </div>
                  <p className="text-emerald-400 text-xs mt-1">{paymentMethods.today?.cash?.percentage || 0}%</p>
                </div>
                <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone size={18} className="text-blue-400" />
                    <span className="text-blue-400 font-medium text-sm">MoMo</span>
                  </div>
                  <p className="text-2xl font-bold text-white">GHS {paymentMethods.today?.momo?.volume?.toLocaleString() || '0'}</p>
                  <p className="text-slate-400 text-sm">{paymentMethods.today?.momo?.count || 0} transactions</p>
                  <div className="mt-2 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all"
                      style={{ width: `${paymentMethods.today?.momo?.percentage || 0}%` }}
                    />
                  </div>
                  <p className="text-blue-400 text-xs mt-1">{paymentMethods.today?.momo?.percentage || 0}%</p>
                </div>
              </div>
            </div>
            
            {/* All-Time Stats */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
              <h4 className="text-slate-300 text-sm font-medium mb-3 flex items-center gap-2">
                All-Time Breakdown
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote size={18} className="text-emerald-400" />
                    <span className="text-emerald-400 font-medium text-sm">Cash</span>
                  </div>
                  <p className="text-2xl font-bold text-white">GHS {paymentMethods.all_time?.cash?.volume?.toLocaleString() || '0'}</p>
                  <p className="text-slate-400 text-sm">{paymentMethods.all_time?.cash?.count || 0} transactions</p>
                  <div className="mt-2 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${paymentMethods.all_time?.cash?.percentage || 0}%` }}
                    />
                  </div>
                  <p className="text-emerald-400 text-xs mt-1">{paymentMethods.all_time?.cash?.percentage || 0}%</p>
                </div>
                <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone size={18} className="text-blue-400" />
                    <span className="text-blue-400 font-medium text-sm">MoMo</span>
                  </div>
                  <p className="text-2xl font-bold text-white">GHS {paymentMethods.all_time?.momo?.volume?.toLocaleString() || '0'}</p>
                  <p className="text-slate-400 text-sm">{paymentMethods.all_time?.momo?.count || 0} transactions</p>
                  <div className="mt-2 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all"
                      style={{ width: `${paymentMethods.all_time?.momo?.percentage || 0}%` }}
                    />
                  </div>
                  <p className="text-blue-400 text-xs mt-1">{paymentMethods.all_time?.momo?.percentage || 0}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SDM Commissions & Service Fees Analytics */}
      <ServiceFeesAnalytics token={token} advancedStats={advancedStats} />

      {/* Top Performers Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Performing Merchants */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Star className="text-amber-400" size={20} />
            Top Performing Merchants
          </h3>
          {advancedStats?.top_merchants?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="text-left py-2 px-2">Merchant</th>
                    <th className="text-right py-2 px-2">Txns</th>
                    <th className="text-right py-2 px-2">Revenue</th>
                    <th className="text-right py-2 px-2">Cashback</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedStats.top_merchants.map((merchant, idx) => (
                    <tr key={merchant.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-amber-500 text-white' : 
                            idx === 1 ? 'bg-slate-400 text-white' : 
                            idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-600 text-slate-300'
                          }`}>{idx + 1}</span>
                          <span className="text-white">{merchant.business_name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 text-slate-300">{merchant.transactions}</td>
                      <td className="text-right py-3 px-2 text-emerald-400">GHS {merchant.revenue.toLocaleString()}</td>
                      <td className="text-right py-3 px-2 text-purple-400">GHS {merchant.cashback_given.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No merchant transactions yet</p>
          )}
        </div>

        {/* Top Active Clients */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Award className="text-purple-400" size={20} />
            Top Active Clients
          </h3>
          {advancedStats?.top_clients?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="text-left py-2 px-2">Client</th>
                    <th className="text-right py-2 px-2">Txns</th>
                    <th className="text-right py-2 px-2">Spent</th>
                    <th className="text-right py-2 px-2">Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedStats.top_clients.map((client, idx) => (
                    <tr key={client.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-amber-500 text-white' : 
                            idx === 1 ? 'bg-slate-400 text-white' : 
                            idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-600 text-slate-300'
                          }`}>{idx + 1}</span>
                          <div>
                            <span className="text-white block">{client.full_name}</span>
                            <span className="text-slate-500 text-xs">@{client.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 text-slate-300">{client.transactions}</td>
                      <td className="text-right py-3 px-2 text-emerald-400">GHS {client.total_spent.toLocaleString()}</td>
                      <td className="text-right py-3 px-2 text-purple-400">GHS {client.cashback_earned.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No client transactions yet</p>
          )}
        </div>
      </div>

      {/* Referral Performance */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="text-pink-400" size={20} />
          Referral Program Performance
        </h3>
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-sm">Total Referrals</p>
            <p className="text-white text-2xl font-bold">{advancedStats?.referral_stats?.total_referrals || 0}</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-sm">Successful</p>
            <p className="text-emerald-400 text-2xl font-bold">{advancedStats?.referral_stats?.successful_referrals || 0}</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-sm">Conversion Rate</p>
            <p className="text-amber-400 text-2xl font-bold">{advancedStats?.referral_stats?.conversion_rate || 0}%</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-sm">Bonuses Paid</p>
            <p className="text-purple-400 text-2xl font-bold">GHS {(advancedStats?.financial_stats?.total_referral_bonuses || 0).toLocaleString()}</p>
          </div>
        </div>
        
        {/* Top Referrers */}
        {advancedStats?.referral_stats?.top_referrers?.length > 0 && (
          <div>
            <h4 className="text-slate-400 text-sm font-medium mb-3">Top Referrers</h4>
            <div className="grid md:grid-cols-5 gap-3">
              {advancedStats.referral_stats.top_referrers.map((referrer, idx) => (
                <div key={referrer.id} className="bg-slate-900 rounded-xl p-3 text-center">
                  <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {idx + 1}
                  </div>
                  <p className="text-white text-sm font-medium truncate">{referrer.full_name}</p>
                  <p className="text-pink-400 text-lg font-bold">{referrer.referrals}</p>
                  <p className="text-slate-500 text-xs">referrals</p>
                  <p className="text-emerald-400 text-xs mt-1">+GHS {referrer.bonus_earned}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Monthly Analytics with Month Selector */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <BarChart3 className="text-blue-400" size={20} />
            Monthly Analytics
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
              className="bg-slate-900 border border-slate-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="month-selector"
            />
          </div>
        </div>
        
        {loadingMonthlyStats ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-400" size={32} />
          </div>
        ) : monthlyStats ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-900 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Activity className="text-blue-400" size={24} />
              </div>
              <p className="text-2xl font-bold text-white">{monthlyStats.transactions || 0}</p>
              <p className="text-slate-400 text-sm">Transactions</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <DollarSign className="text-emerald-400" size={24} />
              </div>
              <p className="text-2xl font-bold text-emerald-400">
                GHS {monthlyStats.volume > 1000 ? `${(monthlyStats.volume / 1000).toFixed(1)}K` : monthlyStats.volume || 0}
              </p>
              <p className="text-slate-400 text-sm">Volume</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <UserPlus className="text-purple-400" size={24} />
              </div>
              <p className="text-2xl font-bold text-purple-400">{monthlyStats.new_clients || 0}</p>
              <p className="text-slate-400 text-sm">New Clients</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Store className="text-amber-400" size={24} />
              </div>
              <p className="text-2xl font-bold text-amber-400">{monthlyStats.new_merchants || 0}</p>
              <p className="text-slate-400 text-sm">New Merchants</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Gift className="text-pink-400" size={24} />
              </div>
              <p className="text-2xl font-bold text-pink-400">GHS {monthlyStats.cashback_distributed || 0}</p>
              <p className="text-slate-400 text-sm">Cashback Paid</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CreditCard className="text-cyan-400" size={24} />
              </div>
              <p className="text-2xl font-bold text-cyan-400">{monthlyStats.card_sales || 0}</p>
              <p className="text-slate-400 text-sm">Card Sales</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="text-slate-600 mx-auto mb-4" size={48} />
            <p className="text-slate-400">Select a month to view analytics</p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Clients */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Users size={18} /> Recent Clients
          </h3>
          <div className="space-y-3">
            {clients.slice(0, 5).map(client => (
              <div key={client.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                <div>
                  <p className="text-white text-sm">{client.full_name}</p>
                  <p className="text-slate-500 text-xs">@{client.username}</p>
                </div>
                {getStatusBadge(client.status)}
              </div>
            ))}
            {clients.length === 0 && (
              <p className="text-slate-500 text-center py-4">No clients yet</p>
            )}
          </div>
        </div>

        {/* Recent Merchants */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Store size={18} /> Recent Merchants
          </h3>
          <div className="space-y-3">
            {merchants.slice(0, 5).map(merchant => (
              <div key={merchant.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                <div>
                  <p className="text-white text-sm">{merchant.business_name}</p>
                  <p className="text-slate-500 text-xs">{merchant.owner_name}</p>
                </div>
                {getStatusBadge(merchant.status)}
              </div>
            ))}
            {merchants.length === 0 && (
              <p className="text-slate-500 text-center py-4">No merchants yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

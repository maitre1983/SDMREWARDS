import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { 
  Sparkles, 
  CreditCard, 
  History, 
  Users, 
  QrCode,
  Settings,
  LogOut,
  Wallet,
  TrendingUp,
  Gift,
  Share2,
  Copy,
  CheckCircle,
  Clock,
  Store,
  Loader2,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  
  // Data states
  const [client, setClient] = useState(null);
  const [card, setCard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [referrals, setReferrals] = useState(null);
  const [availableCards, setAvailableCards] = useState([]);

  const token = localStorage.getItem('sdm_client_token');

  useEffect(() => {
    if (!token) {
      navigate('/client');
      return;
    }
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch dashboard
      const dashRes = await axios.get(`${API_URL}/api/clients/me`, { headers });
      setClient(dashRes.data.client);
      setCard(dashRes.data.card);
      setTransactions(dashRes.data.recent_transactions || []);
      
      // Fetch available cards
      const cardsRes = await axios.get(`${API_URL}/api/clients/cards/available`);
      setAvailableCards(cardsRes.data.cards || []);
      
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('sdm_client_token');
        navigate('/client');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/clients/transactions?limit=50`, { headers });
      setTransactions(res.data.transactions || []);
    } catch (error) {
      console.error('Transactions fetch error:', error);
    }
  };

  const fetchReferrals = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/clients/referrals`, { headers });
      setReferrals(res.data);
    } catch (error) {
      console.error('Referrals fetch error:', error);
    }
  };

  const handlePurchaseCard = async (cardType) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/api/clients/cards/purchase`, {
        card_type: cardType,
        payment_method: 'momo'
      }, { headers });
      
      toast.success(res.data.message || 'Card purchased successfully!');
      if (res.data.welcome_bonus) {
        toast.success(`Welcome bonus: +GHS ${res.data.welcome_bonus}`);
      }
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Purchase failed');
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(client?.referral_code || '');
    toast.success('Referral code copied!');
  };

  const handleLogout = () => {
    localStorage.removeItem('sdm_client_token');
    localStorage.removeItem('sdm_client_data');
    navigate('/client');
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'cashback_earned': return <ArrowDownLeft className="text-emerald-400" size={18} />;
      case 'payment': return <ShoppingBag className="text-blue-400" size={18} />;
      case 'welcome_bonus': return <Gift className="text-amber-400" size={18} />;
      case 'referral_bonus': return <Users className="text-purple-400" size={18} />;
      case 'card_purchase': return <CreditCard className="text-orange-400" size={18} />;
      default: return <ArrowUpRight className="text-slate-400" size={18} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-400" size={48} />
      </div>
    );
  }

  const isActive = client?.status === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
              <Sparkles className="text-white" size={16} />
            </div>
            <span className="font-bold text-white">SDM</span>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-white">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-amber-100 text-sm">Cashback Balance</p>
              <p className="text-3xl font-bold">GHS {(client?.cashback_balance || 0).toFixed(2)}</p>
            </div>
            {isActive && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                client?.card_type === 'platinum' ? 'bg-slate-700' :
                client?.card_type === 'gold' ? 'bg-amber-700' : 'bg-slate-500'
              }`}>
                {client?.card_type?.toUpperCase()} MEMBER
              </div>
            )}
          </div>
          
          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-amber-200">Total Earned</p>
              <p className="font-semibold">GHS {(client?.total_earned || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-amber-200">Total Spent</p>
              <p className="font-semibold">GHS {(client?.total_spent || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Inactive Account Banner */}
        {!isActive && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <CreditCard className="text-amber-400 shrink-0" size={24} />
              <div>
                <p className="text-amber-300 font-medium">Activate Your Account</p>
                <p className="text-slate-400 text-sm mt-1">
                  Purchase a membership card to start earning cashback rewards!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            {isActive && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <TrendingUp className="text-emerald-400 mb-2" size={24} />
                  <p className="text-slate-400 text-sm">Referrals</p>
                  <p className="text-white text-xl font-bold">{client?.referral_count || 0}</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <Gift className="text-amber-400 mb-2" size={24} />
                  <p className="text-slate-400 text-sm">Bonus Earned</p>
                  <p className="text-white text-xl font-bold">GHS {(client?.total_earned || 0).toFixed(0)}</p>
                </div>
              </div>
            )}

            {/* My Card */}
            {isActive && card && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <CreditCard size={18} /> My Card
                </h3>
                <div className={`rounded-xl p-4 ${
                  client?.card_type === 'platinum' ? 'bg-gradient-to-br from-slate-600 to-slate-500' :
                  client?.card_type === 'gold' ? 'bg-gradient-to-br from-amber-500 to-yellow-400' :
                  'bg-gradient-to-br from-slate-400 to-slate-300'
                }`}>
                  <p className="text-white/80 text-sm">{card?.card_number}</p>
                  <p className="text-white font-bold text-lg mt-2">{client?.full_name}</p>
                  <p className="text-white/80 text-xs mt-1">@{client?.username}</p>
                </div>
              </div>
            )}

            {/* Buy Card Section */}
            {!isActive && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-4">Choose Your Card</h3>
                <div className="space-y-3">
                  {availableCards.map((cardItem) => (
                    <div 
                      key={cardItem.type}
                      className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg"
                          style={{ background: cardItem.color }}
                        />
                        <div>
                          <p className="text-white font-medium">{cardItem.name}</p>
                          <p className="text-amber-400 font-bold">GHS {cardItem.price}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handlePurchaseCard(cardItem.type)}
                        className="bg-gradient-to-r from-amber-500 to-orange-500"
                        data-testid={`buy-${cardItem.type}-btn`}
                      >
                        Buy
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <History size={18} /> Recent Activity
              </h3>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(txn.type)}
                        <div>
                          <p className="text-white text-sm">{txn.description || txn.type}</p>
                          <p className="text-slate-500 text-xs">
                            {new Date(txn.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className={`font-medium ${
                        txn.type.includes('earned') || txn.type.includes('bonus') 
                          ? 'text-emerald-400' 
                          : 'text-slate-400'
                      }`}>
                        {txn.type.includes('earned') || txn.type.includes('bonus') ? '+' : ''}
                        GHS {txn.amount?.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No transactions yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'qr' && isActive && (
          <div className="space-y-6">
            {/* My QR Code */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
              <h3 className="text-white font-semibold mb-4">My QR Code</h3>
              <div className="bg-white rounded-xl p-4 inline-block">
                <QrCode size={160} className="text-slate-900" />
              </div>
              <p className="text-slate-400 text-sm mt-4">
                Show this to merchants to earn cashback
              </p>
              <p className="text-amber-400 font-mono mt-2">{client?.qr_code}</p>
            </div>

            {/* Referral Code */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Share2 size={18} /> Referral Code
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-900 rounded-lg p-3 font-mono text-amber-400 text-lg">
                  {client?.referral_code}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyReferralCode}
                  className="border-amber-500/50 text-amber-400"
                >
                  <Copy size={18} />
                </Button>
              </div>
              <p className="text-slate-400 text-sm mt-3">
                Share this code and earn GHS 3 for each friend who joins!
              </p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4">Transaction History</h3>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(txn.type)}
                      <div>
                        <p className="text-white text-sm">{txn.description || txn.type.replace('_', ' ')}</p>
                        <p className="text-slate-500 text-xs">
                          {new Date(txn.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className={`font-medium ${
                      txn.type.includes('earned') || txn.type.includes('bonus') 
                        ? 'text-emerald-400' 
                        : 'text-slate-400'
                    }`}>
                      {txn.type.includes('earned') || txn.type.includes('bonus') ? '+' : '-'}
                      GHS {txn.amount?.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No transactions yet</p>
            )}
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{referrals?.total_referrals || 0}</p>
                <p className="text-slate-400 text-xs">Total</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{referrals?.active_referrals || 0}</p>
                <p className="text-slate-400 text-xs">Active</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">GHS {referrals?.total_bonus_earned || 0}</p>
                <p className="text-slate-400 text-xs">Earned</p>
              </div>
            </div>

            {/* Referral Code Card */}
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6 text-center">
              <Users className="mx-auto text-purple-400 mb-2" size={32} />
              <p className="text-slate-300 mb-2">Your Referral Code</p>
              <p className="text-2xl font-bold text-white font-mono">{client?.referral_code}</p>
              <Button
                onClick={copyReferralCode}
                className="mt-4 bg-purple-500 hover:bg-purple-600"
              >
                <Copy className="mr-2" size={16} /> Copy Code
              </Button>
            </div>

            {/* Referrals List */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-4">Your Referrals</h3>
              {referrals?.referrals?.length > 0 ? (
                <div className="space-y-3">
                  {referrals.referrals.map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                          <User className="text-slate-400" size={18} />
                        </div>
                        <div>
                          <p className="text-white text-sm">{ref.referred_client?.full_name || 'User'}</p>
                          <p className="text-slate-500 text-xs">
                            {new Date(ref.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {ref.bonuses_paid ? (
                        <span className="text-emerald-400 text-sm flex items-center gap-1">
                          <CheckCircle size={14} /> +GHS 3
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm flex items-center gap-1">
                          <Clock size={14} /> Pending
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">
                  No referrals yet. Share your code to earn!
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700">
        <div className="max-w-lg mx-auto flex justify-around py-3">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-amber-400' : 'text-slate-500'}`}
          >
            <Wallet size={22} />
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => { setActiveTab('qr'); }}
            className={`flex flex-col items-center gap-1 ${activeTab === 'qr' ? 'text-amber-400' : 'text-slate-500'}`}
            disabled={!isActive}
          >
            <QrCode size={22} />
            <span className="text-xs">QR Code</span>
          </button>
          <button
            onClick={() => { setActiveTab('history'); fetchTransactions(); }}
            className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-amber-400' : 'text-slate-500'}`}
          >
            <History size={22} />
            <span className="text-xs">History</span>
          </button>
          <button
            onClick={() => { setActiveTab('referrals'); fetchReferrals(); }}
            className={`flex flex-col items-center gap-1 ${activeTab === 'referrals' ? 'text-amber-400' : 'text-slate-500'}`}
          >
            <Users size={22} />
            <span className="text-xs">Referrals</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

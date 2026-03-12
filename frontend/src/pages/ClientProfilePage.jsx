import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar,
  ArrowLeft,
  Save,
  Loader2,
  History,
  Wallet,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard
} from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';
const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function ClientProfilePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile data
  const [client, setClient] = useState(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  
  // Withdrawal history
  const [withdrawals, setWithdrawals] = useState([]);

  const token = localStorage.getItem('sdm_client_token');

  useEffect(() => {
    if (!token) {
      navigate('/client');
      return;
    }
    fetchProfileData();
  }, [token]);

  const fetchProfileData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Get client data
      const profileRes = await axios.get(`${API_URL}/api/clients/me`, { headers });
      const clientData = profileRes.data.client;
      setClient(clientData);
      setFullName(clientData.full_name || '');
      setEmail(clientData.email || '');
      setBirthday(clientData.birthday || '');
      setMomoNumber(clientData.preferred_momo || clientData.phone || '');
      
      // Get withdrawal history
      try {
        const withdrawalsRes = await axios.get(`${API_URL}/api/clients/withdrawals`, { headers });
        setWithdrawals(withdrawalsRes.data.withdrawals || []);
      } catch (e) {
        // Withdrawals endpoint might not exist yet
        setWithdrawals([]);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('sdm_client_token');
        navigate('/client');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/clients/profile`, {
        full_name: fullName,
        email: email || null,
        birthday: birthday || null,
        preferred_momo: momoNumber
      }, { headers });
      
      toast.success('Profile updated successfully!');
      fetchProfileData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full">
            <CheckCircle size={12} /> Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full">
            <Clock size={12} /> Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full">
            <XCircle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/10 text-slate-400 text-xs rounded-full">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-400" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => navigate('/client/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <img src={SDM_LOGO_URL} alt="SDM" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-white">Profile</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Profile Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
              <User className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{client?.full_name}</h1>
              <p className="text-slate-400">@{client?.username}</p>
              <p className="text-amber-400 text-sm">{client?.card_type?.toUpperCase() || 'No Card'} Member</p>
            </div>
          </div>
          
          {/* Balance */}
          <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Cashback Balance</p>
              <p className="text-amber-400 text-2xl font-bold">GHS {(client?.cashback_balance || 0).toFixed(2)}</p>
            </div>
            <Wallet className="text-amber-400" size={32} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'profile' 
                ? 'bg-amber-500 text-white' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <User size={18} className="inline mr-2" />
            Edit Profile
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'withdrawals' 
                ? 'bg-amber-500 text-white' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <History size={18} className="inline mr-2" />
            Withdrawals
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
            <div>
              <Label className="text-slate-300">Full Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white"
                  data-testid="profile-fullname"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Email (Optional)</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-10 bg-slate-900 border-slate-700 text-white"
                  data-testid="profile-email"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Birthday (Optional)</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <Input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white"
                  data-testid="profile-birthday"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Preferred MoMo Number</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <Input
                  type="tel"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                  placeholder="0XX XXX XXXX"
                  className="pl-10 bg-slate-900 border-slate-700 text-white"
                  data-testid="profile-momo"
                />
              </div>
              <p className="text-slate-500 text-xs mt-1">Used for cashback withdrawals</p>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 py-6"
                data-testid="save-profile-btn"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin mr-2" size={18} />
                ) : (
                  <Save className="mr-2" size={18} />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <History size={18} />
              Withdrawal History
            </h3>
            
            {withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="text-slate-600 mx-auto mb-4" size={48} />
                <p className="text-slate-400">No withdrawals yet</p>
                <p className="text-slate-500 text-sm mt-1">
                  Your withdrawal history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div 
                    key={w.id} 
                    className="bg-slate-900 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-medium">GHS {w.amount?.toFixed(2)}</p>
                      <p className="text-slate-500 text-sm">
                        To: {w.destination_phone} ({w.network})
                      </p>
                      <p className="text-slate-600 text-xs mt-1">
                        {new Date(w.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {getStatusBadge(w.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

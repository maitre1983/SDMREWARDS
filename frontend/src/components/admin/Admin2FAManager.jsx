import React, { useState, useEffect } from 'react';
import { Shield, ShieldOff, Search, Loader2, AlertTriangle, User, Store, UserCog } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Admin2FAManager({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [disabling, setDisabling] = useState(null);
  const [confirmDisable, setConfirmDisable] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const typeParam = filter !== 'all' ? `?user_type=${filter}` : '';
      const res = await fetch(`${API_URL}/api/2fa/admin/users-list${typeParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (user) => {
    setDisabling(user.id);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/2fa/admin/disable-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.id,
          user_type: user.user_type,
          reason: reason || 'Admin override'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`2FA disabled for ${user.full_name || user.business_name || user.name || user.email}`);
        setConfirmDisable(null);
        setReason('');
        fetchUsers();
      } else {
        setError(data.detail || 'Failed to disable 2FA');
      }
    } catch (err) {
      setError('Failed to disable 2FA');
    } finally {
      setDisabling(null);
    }
  };

  const getUserIcon = (type) => {
    switch (type) {
      case 'client': return <User className="w-4 h-4" />;
      case 'merchant': return <Store className="w-4 h-4" />;
      case 'admin': return <UserCog className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getUserName = (user) => {
    return user.full_name || user.business_name || user.name || user.email || 'Unknown';
  };

  const filteredUsers = users.filter(user => {
    const name = getUserName(user).toLowerCase();
    const phone = (user.phone || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const searchLower = search.toLowerCase();
    return name.includes(searchLower) || phone.includes(searchLower) || email.includes(searchLower);
  });

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-amber-500" />
          <h3 className="text-lg font-semibold text-white">2FA User Management</h3>
        </div>
        <span className="text-slate-400 text-sm">{users.length} users with 2FA enabled</span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          {['all', 'client', 'merchant', 'admin'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === type
                  ? 'bg-amber-500 text-black'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No users with 2FA enabled</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={`${user.user_type}-${user.id}`}
              className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  user.user_type === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                  user.user_type === 'merchant' ? 'bg-green-500/20 text-green-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {getUserIcon(user.user_type)}
                </div>
                <div>
                  <p className="text-white font-medium">{getUserName(user)}</p>
                  <p className="text-slate-400 text-sm">
                    {user.phone || user.email} • {user.user_type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-xs">
                  Enabled: {new Date(user.two_factor_enabled_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => setConfirmDisable(user)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  title="Disable 2FA"
                >
                  <ShieldOff className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDisable && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-lg">Disable 2FA</h4>
                <p className="text-slate-400 text-sm mt-1">
                  Are you sure you want to disable 2FA for <strong className="text-white">{getUserName(confirmDisable)}</strong>?
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-slate-300 text-sm mb-2">Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., User lost phone"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmDisable(null);
                  setReason('');
                }}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDisable(confirmDisable)}
                disabled={disabling === confirmDisable.id}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {disabling === confirmDisable.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Disable 2FA'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

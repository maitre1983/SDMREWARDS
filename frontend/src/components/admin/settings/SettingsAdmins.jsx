import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { 
  Users, UserPlus, Trash2, Shield, Loader2, X, CheckCircle, Crown
} from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function SettingsAdmins({ token, currentAdmin }) {
  const [allAdmins, setAllAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({ 
    email: '', password: '', name: '', role: 'admin_support' 
  });
  const [isCreating, setIsCreating] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/api/admin/admins`, { headers });
      setAllAdmins(res.data.admins || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminForm.email || !newAdminForm.password || !newAdminForm.name) {
      toast.error('All fields are required');
      return;
    }

    try {
      setIsCreating(true);
      await axios.post(`${API_URL}/api/admin/admins`, newAdminForm, { headers });
      toast.success('Admin created successfully');
      setShowAdminModal(false);
      setNewAdminForm({ email: '', password: '', name: '', role: 'admin_support' });
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create admin');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;

    try {
      await axios.delete(`${API_URL}/api/admin/admins/${adminId}`, { headers });
      toast.success('Admin deleted');
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete admin');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400 flex items-center gap-1">
            <Crown size={12} /> Super Admin
          </span>
        );
      case 'admin':
        return <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">Admin</span>;
      case 'admin_support':
        return <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">Support</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-400">{role}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Users size={20} className="text-purple-400" /> Admin Users
          </h3>
          {currentAdmin?.role === 'super_admin' && (
            <Button 
              onClick={() => setShowAdminModal(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <UserPlus size={16} className="mr-2" /> Add Admin
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {allAdmins.map((admin, idx) => (
            <div 
              key={idx} 
              className="bg-slate-900 rounded-lg p-4 border border-slate-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Users className="text-purple-400" size={20} />
                </div>
                <div>
                  <p className="text-white font-medium">{admin.name || admin.email}</p>
                  <p className="text-slate-400 text-sm">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getRoleBadge(admin.role)}
                {currentAdmin?.role === 'super_admin' && admin.role !== 'super_admin' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAdmin(admin.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Create New Admin</h3>
              <button 
                onClick={() => setShowAdminModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Name</Label>
                <Input
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm({...newAdminForm, name: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="Admin name"
                />
              </div>
              <div>
                <Label className="text-slate-400">Email</Label>
                <Input
                  type="email"
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm({...newAdminForm, email: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <Label className="text-slate-400">Password</Label>
                <Input
                  type="password"
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm({...newAdminForm, password: e.target.value})}
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <Label className="text-slate-400">Role</Label>
                <select
                  value={newAdminForm.role}
                  onChange={(e) => setNewAdminForm({...newAdminForm, role: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                >
                  <option value="admin_support">Support</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowAdminModal(false)}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAdmin}
                disabled={isCreating}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {isCreating ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : (
                  <CheckCircle className="mr-2" size={16} />
                )}
                Create Admin
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

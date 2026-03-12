import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, Key, Loader2, Plus, Trash2, Edit2,
  Eye, EyeOff, X, Check, AlertCircle, Crown, UserCog
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import axios from 'axios';

// API URL imported from config
import { API_URL } from '@/config/api';

const ROLE_LABELS = {
  super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700', icon: Crown },
  admin: { label: 'Admin', color: 'bg-blue-100 text-blue-700', icon: Shield },
  viewer: { label: 'Viewer', color: 'bg-slate-100 text-slate-700', icon: Eye }
};

export default function AdminManagementPanel({ token, currentAdmin }) {
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  
  // Create admin form
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'admin'
  });
  
  // Change password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const headers = { Authorization: `Bearer ${token}` };
  const isSuperAdmin = currentAdmin?.role === 'super_admin';

  const fetchAdmins = async () => {
    // Wait for currentAdmin to be loaded
    if (!currentAdmin) {
      return;
    }
    
    if (currentAdmin.role !== 'super_admin') {
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/api/admin/list`, { headers });
      setAdmins(response.data.admins || []);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Re-fetch when currentAdmin changes
    if (currentAdmin) {
      fetchAdmins();
    }
  }, [currentAdmin]);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!createForm.username || !createForm.email || !createForm.password) {
      toast.error('All fields are required');
      return;
    }
    
    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/api/admin/create`, createForm, { headers });
      toast.success('Admin created successfully');
      setShowCreateModal(false);
      setCreateForm({ username: '', email: '', password: '', role: 'admin' });
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create admin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      setIsLoading(true);
      const payload = {
        new_password: passwordForm.new_password
      };
      
      // If changing own password, include current password
      if (!selectedAdmin || selectedAdmin.id === currentAdmin?.id) {
        payload.current_password = passwordForm.current_password;
      } else {
        payload.target_admin_id = selectedAdmin.id;
      }
      
      await axios.post(`${API_URL}/api/admin/change-password`, payload, { headers });
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setSelectedAdmin(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeRole = async (adminId, newRole) => {
    try {
      await axios.put(`${API_URL}/api/admin/${adminId}/role`, { role: newRole }, { headers });
      toast.success('Role updated');
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/${adminId}`, { headers });
      toast.success('Admin deleted');
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete admin');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Admin Profile */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <UserCog className="text-white" size={28} />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">{currentAdmin?.username || currentAdmin?.email}</h3>
              <div className="flex items-center gap-2 mt-1">
                {currentAdmin?.role && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_LABELS[currentAdmin.role]?.color || ROLE_LABELS.admin.color}`}>
                    {ROLE_LABELS[currentAdmin.role]?.label || currentAdmin.role}
                  </span>
                )}
                <span className="text-sm text-slate-500">{currentAdmin?.email}</span>
              </div>
            </div>
          </div>
          
          <Button
            onClick={() => { setSelectedAdmin(null); setShowPasswordModal(true); }}
            variant="outline"
            className="gap-2"
          >
            <Key size={16} />
            Change My Password
          </Button>
        </div>
      </div>

      {/* Admin Management (Super Admin Only) */}
      {isSuperAdmin && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-slate-900">Admin Accounts</h3>
              <p className="text-sm text-slate-500">Manage admin users and their roles</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus size={16} />
              Create Admin
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Admin</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Role</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Created</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No other admins found
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => {
                    const roleInfo = ROLE_LABELS[admin.role] || ROLE_LABELS.admin;
                    const RoleIcon = roleInfo.icon;
                    const isCurrentUser = admin.id === currentAdmin?.id;
                    
                    return (
                      <tr key={admin.id} className={isCurrentUser ? 'bg-blue-50/50' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${roleInfo.color}`}>
                              <RoleIcon size={14} />
                            </div>
                            <span className="font-medium">{admin.username}</span>
                            {isCurrentUser && <span className="text-xs text-blue-600">(You)</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{admin.email}</td>
                        <td className="px-4 py-3">
                          {isCurrentUser || admin.role === 'super_admin' ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                              {roleInfo.label}
                            </span>
                          ) : (
                            <select
                              value={admin.role}
                              onChange={(e) => handleChangeRole(admin.id, e.target.value)}
                              className="px-2 py-1 rounded-lg border border-slate-200 text-sm"
                            >
                              <option value="admin">Admin</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          {!isCurrentUser && admin.role !== 'super_admin' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setSelectedAdmin(admin); setShowPasswordModal(true); }}
                                className="h-7 text-xs gap-1"
                              >
                                <Key size={12} />
                                Reset Password
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteAdmin(admin.id)}
                                className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Non-super admin message */}
      {!isSuperAdmin && (
        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-amber-600" size={24} />
            <div>
              <p className="font-medium text-amber-800">Limited Access</p>
              <p className="text-sm text-amber-600">Only Super Admins can manage other admin accounts.</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Create New Admin</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <Input
                  value={createForm.username}
                  onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                  placeholder="admin_username"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                  placeholder="admin@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="admin">Admin - Can manage users & merchants</option>
                  <option value="viewer">Viewer - Read-only access</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Create Admin'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {selectedAdmin ? `Reset Password for ${selectedAdmin.username}` : 'Change My Password'}
              </h3>
              <button onClick={() => { setShowPasswordModal(false); setSelectedAdmin(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Only show current password field when changing own password */}
              {(!selectedAdmin || selectedAdmin.id === currentAdmin?.id) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                    placeholder="Minimum 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <Input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowPasswordModal(false); setSelectedAdmin(null); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Update Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

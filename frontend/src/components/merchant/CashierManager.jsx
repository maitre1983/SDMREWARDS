import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Users, Plus, Edit2, Trash2, X, Loader2, 
  CheckCircle, XCircle, Save, UserCog, Hash
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function CashierManager({ token }) {
  const [cashiers, setCashiers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCashier, setEditingCashier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    register_number: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchCashiers();
  }, []);

  const fetchCashiers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/merchants/cashiers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCashiers(res.data.cashiers || []);
    } catch (error) {
      console.error('Error fetching cashiers:', error);
      toast.error('Error loading cashiers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (cashier = null) => {
    if (cashier) {
      setEditingCashier(cashier);
      setFormData({
        name: cashier.name,
        code: cashier.code,
        register_number: cashier.register_number || ''
      });
    } else {
      setEditingCashier(null);
      setFormData({ name: '', code: '', register_number: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      toast.error('Please fill in name and code');
      return;
    }

    setIsSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingCashier) {
        await axios.put(
          `${API_URL}/api/merchants/cashiers/${editingCashier.id}`,
          formData,
          { headers }
        );
        toast.success('Cashier updated');
      } else {
        await axios.post(
          `${API_URL}/api/merchants/cashiers`,
          formData,
          { headers }
        );
        toast.success('Cashier created');
      }
      
      setShowModal(false);
      fetchCashiers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (cashier) => {
    try {
      await axios.put(
        `${API_URL}/api/merchants/cashiers/${cashier.id}`,
        { is_active: !cashier.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(cashier.is_active ? 'Cashier deactivated' : 'Cashier activated');
      fetchCashiers();
    } catch (error) {
      toast.error('Error updating');
    }
  };

  const handleDelete = async (cashierId) => {
    try {
      await axios.delete(
        `${API_URL}/api/merchants/cashiers/${cashierId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Cashier deleted');
      setShowDeleteConfirm(null);
      fetchCashiers();
    } catch (error) {
      toast.error('Error deleting');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="text-emerald-400" size={20} />
          <h3 className="text-white font-semibold">Cashier Management</h3>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-emerald-500 hover:bg-emerald-600"
          size="sm"
          data-testid="add-cashier-btn"
        >
          <Plus size={16} className="mr-1" /> Add
        </Button>
      </div>

      {/* Cashiers List */}
      {cashiers.length === 0 ? (
        <div className="text-center py-8 bg-slate-900 rounded-xl border border-slate-700">
          <UserCog className="mx-auto text-slate-500 mb-3" size={48} />
          <p className="text-slate-400">No cashiers configured</p>
          <p className="text-slate-500 text-sm">Add cashiers to manage your registers</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cashiers.map((cashier) => (
            <div
              key={cashier.id}
              className={`p-4 rounded-xl border ${
                cashier.is_active 
                  ? 'bg-slate-900 border-slate-700' 
                  : 'bg-slate-900/50 border-slate-700/50 opacity-60'
              }`}
              data-testid={`cashier-${cashier.code}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    cashier.is_active ? 'bg-emerald-500/10' : 'bg-slate-700/50'
                  }`}>
                    <UserCog className={cashier.is_active ? 'text-emerald-400' : 'text-slate-500'} size={20} />
                  </div>
                  <div>
                    <p className="text-white font-medium">{cashier.name}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-amber-400 font-mono">{cashier.code}</span>
                      {cashier.register_number && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400 flex items-center gap-1">
                            <Hash size={12} /> {cashier.register_number}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    cashier.is_active 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {cashier.is_active ? 'Active' : 'Inactive'}
                  </span>
                  
                  <button
                    onClick={() => handleToggleActive(cashier)}
                    className={`p-2 rounded-lg transition-colors ${
                      cashier.is_active 
                        ? 'text-amber-400 hover:bg-amber-500/10' 
                        : 'text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                    title={cashier.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {cashier.is_active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                  </button>
                  
                  <button
                    onClick={() => handleOpenModal(cashier)}
                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  
                  <button
                    onClick={() => setShowDeleteConfirm(cashier.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Transactions</p>
                  <p className="text-white font-medium">{cashier.total_transactions || 0}</p>
                </div>
                <div>
                  <p className="text-slate-500">Volume</p>
                  <p className="text-white font-medium">GHS {(cashier.total_volume || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">
                {editingCashier ? 'Edit Cashier' : 'New Cashier'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Cashier Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: John Doe"
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  data-testid="cashier-name-input"
                />
              </div>

              <div>
                <Label className="text-slate-400">Register Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: REGISTER1"
                  className="mt-1 bg-slate-900 border-slate-700 text-white font-mono"
                  data-testid="cashier-code-input"
                />
                <p className="text-slate-500 text-xs mt-1">Unique identifier for this register</p>
              </div>

              <div>
                <Label className="text-slate-400">Register Number</Label>
                <Input
                  value={formData.register_number}
                  onChange={(e) => setFormData({ ...formData, register_number: e.target.value })}
                  placeholder="Ex: 01"
                  className="mt-1 bg-slate-900 border-slate-700 text-white"
                  data-testid="cashier-register-input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowModal(false)}
                  variant="outline"
                  className="flex-1 border-slate-700 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  data-testid="save-cashier-btn"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin mr-2" size={18} />
                  ) : (
                    <Save className="mr-2" size={18} />
                  )}
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold mb-4">Delete Cashier?</h3>
            <p className="text-slate-400 text-sm mb-6">
              This action is irreversible. The cashier's statistics will be lost.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDeleteConfirm(null)}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600"
                data-testid="confirm-delete-btn"
              >
                <Trash2 className="mr-2" size={18} />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

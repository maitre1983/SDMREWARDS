import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  CreditCard, Plus, Edit2, Trash2, X, Loader2, Save, 
  Clock, DollarSign, CheckCircle, XCircle, Palette, Star
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DURATION_PRESETS = [
  { days: 30, label: '1 month' },
  { days: 90, label: '3 months' },
  { days: 180, label: '6 months' },
  { days: 365, label: '1 year' },
  { days: 730, label: '2 years' },
  { days: 1095, label: '3 years' }
];

const COLORS = [
  { value: '#94a3b8', name: 'Silver' },
  { value: '#f59e0b', name: 'Gold' },
  { value: '#6366f1', name: 'Indigo' },
  { value: '#06b6d4', name: 'Cyan' },
  { value: '#ec4899', name: 'Pink' },
  { value: '#10b981', name: 'Emerald' },
  { value: '#ef4444', name: 'Red' },
  { value: '#8b5cf6', name: 'Violet' }
];

export default function CardTypesManager({ token, onUpdate }) {
  const [cardTypes, setCardTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    price: '',
    duration_days: 365,
    benefits: '',
    color: '#6366f1',
    icon: 'credit-card',
    sort_order: 0
  });

  useEffect(() => {
    fetchCardTypes();
  }, []);

  const fetchCardTypes = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/settings/card-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCardTypes(res.data.card_types || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des cartes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (card = null) => {
    if (card && !card.is_default) {
      setEditingCard(card);
      setFormData({
        name: card.name,
        slug: card.slug,
        price: card.price,
        duration_days: card.duration_days,
        benefits: card.benefits,
        color: card.color,
        icon: card.icon || 'credit-card',
        sort_order: card.sort_order
      });
    } else {
      setEditingCard(null);
      setFormData({
        name: '',
        slug: '',
        price: '',
        duration_days: 365,
        benefits: '',
        color: '#6366f1',
        icon: 'credit-card',
        sort_order: cardTypes.length + 1
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.price) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingCard) {
        await axios.put(
          `${API_URL}/api/admin/settings/card-types/${editingCard.id}`,
          {
            name: formData.name,
            price: parseFloat(formData.price),
            duration_days: parseInt(formData.duration_days),
            benefits: formData.benefits,
            color: formData.color,
            icon: formData.icon,
            sort_order: parseInt(formData.sort_order)
          },
          { headers }
        );
        toast.success('Carte mise à jour');
      } else {
        await axios.post(
          `${API_URL}/api/admin/settings/card-types`,
          {
            name: formData.name,
            slug: formData.slug.toLowerCase().replace(/\s+/g, '_'),
            price: parseFloat(formData.price),
            duration_days: parseInt(formData.duration_days),
            benefits: formData.benefits,
            color: formData.color,
            icon: formData.icon,
            sort_order: parseInt(formData.sort_order),
            is_active: true
          },
          { headers }
        );
        toast.success('New card created');
      }
      
      setShowModal(false);
      fetchCardTypes();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error saving card');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cardId) => {
    try {
      await axios.delete(`${API_URL}/api/admin/settings/card-types/${cardId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Card deleted');
      setShowDeleteConfirm(null);
      fetchCardTypes();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error deleting card');
    }
  };

  const handleUpdateDefaultCard = async (cardType, field, value) => {
    try {
      const payload = {};
      payload[`${cardType}_${field}`] = value;
      
      await axios.put(
        `${API_URL}/api/admin/settings/card-prices`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Card updated');
      fetchCardTypes();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Error updating card');
    }
  };

  const formatDuration = (days) => {
    if (days >= 730) return `${Math.floor(days / 365)} years`;
    if (days >= 365) return '1 year';
    if (days >= 30) return `${Math.floor(days / 30)} months`;
    return `${days} days`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-amber-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="text-amber-400" size={24} />
          <div>
            <h3 className="text-white font-semibold">Card Types</h3>
            <p className="text-slate-400 text-sm">Manage your loyalty cards</p>
          </div>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-amber-500 hover:bg-amber-600 text-black"
          data-testid="add-card-type-btn"
        >
          <Plus size={18} className="mr-2" />
          New Card
        </Button>
      </div>

      {/* Card Types List */}
      <div className="grid gap-4">
        {cardTypes.map((card) => (
          <div
            key={card.id}
            className="bg-slate-900 border border-slate-700 rounded-xl p-4"
            style={{ borderLeftColor: card.color, borderLeftWidth: '4px' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${card.color}20` }}
                >
                  <CreditCard style={{ color: card.color }} size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-medium">{card.name}</h4>
                    {card.is_default && (
                      <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
                        Par défaut
                      </span>
                    )}
                    {!card.is_active && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                        Inactif
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm">{card.slug}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-slate-500 text-xs">Prix</p>
                  <p className="text-white font-bold">GHS {card.price}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500 text-xs">Durée</p>
                  <p className="text-amber-400 font-medium">{formatDuration(card.duration_days)}</p>
                </div>
                
                {!card.is_default ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(card)}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(card.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenModal(card)}
                    className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg"
                    title="Configurer via Card Prices"
                    disabled
                  >
                    <Edit2 size={18} />
                  </button>
                )}
              </div>
            </div>

            {card.benefits && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                <p className="text-slate-400 text-sm">{card.benefits}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">
                {editingCard ? 'Edit Card' : 'New Card'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">Card Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Diamond"
                    className="mt-1 bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-400">Slug (identifier) *</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                    placeholder="Ex: diamond"
                    className="mt-1 bg-slate-900 border-slate-700 text-white"
                    disabled={!!editingCard}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">Price (GHS) *</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <Input
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="100"
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-slate-400">Duration *</Label>
                  <select
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                  >
                    {DURATION_PRESETS.map((preset) => (
                      <option key={preset.days} value={preset.days}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-slate-400">Benefits</Label>
                <textarea
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  placeholder="10% cashback, VIP support, etc."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white resize-none"
                />
              </div>

              <div>
                <Label className="text-slate-400">Color</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        formData.color === color.value 
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' 
                          : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-slate-400">Sort Order</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  className="mt-1 bg-slate-900 border-slate-700 text-white w-24"
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
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {isSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
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
            <h3 className="text-white font-semibold mb-4">Delete this card?</h3>
            <p className="text-slate-400 text-sm mb-6">
              This action is irreversible. Make sure no client is using this card.
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

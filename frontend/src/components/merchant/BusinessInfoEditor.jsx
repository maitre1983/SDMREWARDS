import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Store, Save, Loader2, MapPin, Globe, Building, 
  Phone, AlertCircle, Map
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function BusinessInfoEditor({ token, merchant, onUpdate }) {
  const [formData, setFormData] = useState({
    business_name: merchant?.business_name || '',
    business_type: merchant?.business_type || '',
    business_address: merchant?.business_address || '',
    city: merchant?.city || '',
    gps_coordinates: merchant?.gps_coordinates || '',
    google_maps_url: merchant?.google_maps_url || '',
    business_description: merchant?.business_description || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.business_name) {
      toast.error('Le nom du commerce est requis');
      return;
    }

    setIsSaving(true);
    try {
      const res = await axios.put(
        `${API_URL}/api/merchants/settings/business-info`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Informations mises à jour');
      if (onUpdate) onUpdate(res.data.merchant);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const businessTypes = [
    'Restaurant',
    'Supermarché',
    'Boutique',
    'Pharmacie',
    'Station service',
    'Hôtel',
    'Salon de coiffure',
    'Boulangerie',
    'Autre'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Store className="text-emerald-400" size={20} />
        <h3 className="text-white font-semibold">Informations du Commerce</h3>
      </div>

      {/* Phone Notice */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
        <AlertCircle className="text-amber-400 mt-0.5" size={18} />
        <div>
          <p className="text-amber-400 text-sm font-medium">Numéro de téléphone</p>
          <p className="text-slate-400 text-sm">
            Le numéro <span className="text-white font-mono">{merchant?.phone}</span> ne peut être modifié que par l'administrateur SDM.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-400">Nom du commerce *</Label>
            <div className="relative mt-1">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <Input
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="Mon Commerce"
                className="pl-10 bg-slate-900 border-slate-700 text-white"
                data-testid="business-name-input"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-400">Type d'activité</Label>
            <select
              value={formData.business_type}
              onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
              data-testid="business-type-select"
            >
              <option value="">Sélectionner...</option>
              {businessTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label className="text-slate-400">Adresse complète</Label>
          <div className="relative mt-1">
            <MapPin className="absolute left-3 top-3 text-slate-500" size={16} />
            <textarea
              value={formData.business_address}
              onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
              placeholder="Rue, quartier, ville..."
              rows={2}
              className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder:text-slate-500 resize-none"
              data-testid="business-address-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-400">Ville</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Accra, Kumasi, Takoradi..."
              className="mt-1 bg-slate-900 border-slate-700 text-white"
              data-testid="city-input"
            />
          </div>

          <div>
            <Label className="text-slate-400">Coordonnées GPS</Label>
            <div className="relative mt-1">
              <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <Input
                value={formData.gps_coordinates}
                onChange={(e) => setFormData({ ...formData, gps_coordinates: e.target.value })}
                placeholder="5.6037, -0.1870"
                className="pl-10 bg-slate-900 border-slate-700 text-white"
                data-testid="gps-input"
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-slate-400">Lien Google Maps (optionnel)</Label>
          <div className="relative mt-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <Input
              value={formData.google_maps_url}
              onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
              placeholder="https://maps.google.com/..."
              className="pl-10 bg-slate-900 border-slate-700 text-white"
              data-testid="google-maps-input"
            />
          </div>
        </div>

        <div>
          <Label className="text-slate-400">Description du commerce</Label>
          <textarea
            value={formData.business_description}
            onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
            placeholder="Décrivez votre commerce en quelques mots..."
            rows={3}
            className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder:text-slate-500 resize-none"
            data-testid="business-description-input"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-emerald-500 hover:bg-emerald-600"
          data-testid="save-business-info-btn"
        >
          {isSaving ? (
            <Loader2 className="animate-spin mr-2" size={18} />
          ) : (
            <Save className="mr-2" size={18} />
          )}
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
        </Button>
      </div>
    </div>
  );
}

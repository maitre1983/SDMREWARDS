import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Lock, Shield, Key, ToggleLeft, ToggleRight, 
  Loader2, CheckCircle, AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PinSettings({ token, pinStatus, onPinStatusChange }) {
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [showEnableForm, setShowEnableForm] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [showChangeForm, setShowChangeForm] = useState(false);
  
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPinForChange, setNewPinForChange] = useState('');

  const handleEnablePin = async () => {
    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      toast.error('Le PIN doit contenir 4 à 6 chiffres');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('Les codes PIN ne correspondent pas');
      return;
    }

    setIsEnabling(true);
    try {
      await axios.post(
        `${API_URL}/api/merchants/settings/pin/enable`,
        { pin: newPin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Protection PIN activée');
      onPinStatusChange({ pin_enabled: true, has_pin: true });
      setShowEnableForm(false);
      setNewPin('');
      setConfirmPin('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'activation');
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisablePin = async () => {
    if (!currentPin) {
      toast.error('Entrez votre PIN actuel');
      return;
    }

    setIsDisabling(true);
    try {
      await axios.post(
        `${API_URL}/api/merchants/settings/pin/disable`,
        { pin: currentPin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Protection PIN désactivée');
      onPinStatusChange({ pin_enabled: false, has_pin: true });
      setShowDisableForm(false);
      setCurrentPin('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'PIN incorrect');
    } finally {
      setIsDisabling(false);
    }
  };

  const handleChangePin = async () => {
    if (!currentPin) {
      toast.error('Entrez votre PIN actuel');
      return;
    }
    if (newPinForChange.length < 4 || newPinForChange.length > 6 || !/^\d+$/.test(newPinForChange)) {
      toast.error('Le nouveau PIN doit contenir 4 à 6 chiffres');
      return;
    }

    setIsChanging(true);
    try {
      await axios.post(
        `${API_URL}/api/merchants/settings/pin/change`,
        null,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { current_pin: currentPin, new_pin: newPinForChange }
        }
      );
      toast.success('PIN modifié avec succès');
      setShowChangeForm(false);
      setCurrentPin('');
      setNewPinForChange('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du changement');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="text-amber-400" size={20} />
        <h3 className="text-white font-semibold">Sécurité PIN</h3>
      </div>

      {/* Status Card */}
      <div className={`p-4 rounded-xl border ${
        pinStatus?.pin_enabled 
          ? 'bg-emerald-500/5 border-emerald-500/30' 
          : 'bg-slate-900 border-slate-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              pinStatus?.pin_enabled ? 'bg-emerald-500/10' : 'bg-slate-800'
            }`}>
              <Lock className={pinStatus?.pin_enabled ? 'text-emerald-400' : 'text-slate-500'} size={20} />
            </div>
            <div>
              <p className="text-white font-medium">PIN Protection</p>
              <p className="text-slate-400 text-sm">
                {pinStatus?.pin_enabled 
                  ? 'Your Settings menu is protected' 
                  : 'Settings access is open'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {pinStatus?.pin_enabled ? (
              <CheckCircle className="text-emerald-400" size={20} />
            ) : (
              <AlertCircle className="text-slate-500" size={20} />
            )}
            <span className={`text-sm font-medium ${
              pinStatus?.pin_enabled ? 'text-emerald-400' : 'text-slate-500'
            }`}>
              {pinStatus?.pin_enabled ? 'Activé' : 'Désactivé'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {!pinStatus?.pin_enabled && !showEnableForm && (
        <Button
          onClick={() => setShowEnableForm(true)}
          className="w-full bg-emerald-500 hover:bg-emerald-600"
          data-testid="enable-pin-btn"
        >
          <ToggleRight className="mr-2" size={18} />
          Activer la protection PIN
        </Button>
      )}

      {pinStatus?.pin_enabled && !showDisableForm && !showChangeForm && (
        <div className="flex gap-3">
          <Button
            onClick={() => setShowChangeForm(true)}
            variant="outline"
            className="flex-1 border-slate-700 text-slate-300"
            data-testid="change-pin-btn"
          >
            <Key className="mr-2" size={18} />
            Changer le PIN
          </Button>
          <Button
            onClick={() => setShowDisableForm(true)}
            variant="outline"
            className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
            data-testid="disable-pin-btn"
          >
            <ToggleLeft className="mr-2" size={18} />
            Désactiver
          </Button>
        </div>
      )}

      {/* Enable PIN Form */}
      {showEnableForm && (
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-4">
          <h4 className="text-white font-medium">Créer un code PIN</h4>
          
          <div>
            <Label className="text-slate-400">Nouveau PIN (4-6 chiffres)</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="****"
              className="mt-1 bg-slate-800 border-slate-700 text-white text-center text-lg tracking-widest"
              data-testid="new-pin-input"
            />
          </div>

          <div>
            <Label className="text-slate-400">Confirmer le PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="****"
              className="mt-1 bg-slate-800 border-slate-700 text-white text-center text-lg tracking-widest"
              data-testid="confirm-pin-input"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowEnableForm(false);
                setNewPin('');
                setConfirmPin('');
              }}
              variant="outline"
              className="flex-1 border-slate-700 text-slate-300"
            >
              Annuler
            </Button>
            <Button
              onClick={handleEnablePin}
              disabled={isEnabling || newPin.length < 4}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              data-testid="confirm-enable-pin-btn"
            >
              {isEnabling ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              {isEnabling ? 'Activation...' : 'Activer'}
            </Button>
          </div>
        </div>
      )}

      {/* Disable PIN Form */}
      {showDisableForm && (
        <div className="p-4 bg-slate-900 border border-red-500/30 rounded-xl space-y-4">
          <h4 className="text-white font-medium">Désactiver la protection PIN</h4>
          <p className="text-slate-400 text-sm">
            Entrez votre PIN actuel pour confirmer la désactivation.
          </p>
          
          <div>
            <Label className="text-slate-400">PIN actuel</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              placeholder="****"
              className="mt-1 bg-slate-800 border-slate-700 text-white text-center text-lg tracking-widest"
              data-testid="current-pin-disable-input"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowDisableForm(false);
                setCurrentPin('');
              }}
              variant="outline"
              className="flex-1 border-slate-700 text-slate-300"
            >
              Annuler
            </Button>
            <Button
              onClick={handleDisablePin}
              disabled={isDisabling || currentPin.length < 4}
              className="flex-1 bg-red-500 hover:bg-red-600"
              data-testid="confirm-disable-pin-btn"
            >
              {isDisabling ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              {isDisabling ? 'Désactivation...' : 'Désactiver'}
            </Button>
          </div>
        </div>
      )}

      {/* Change PIN Form */}
      {showChangeForm && (
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-4">
          <h4 className="text-white font-medium">Changer le code PIN</h4>
          
          <div>
            <Label className="text-slate-400">PIN actuel</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              placeholder="****"
              className="mt-1 bg-slate-800 border-slate-700 text-white text-center text-lg tracking-widest"
              data-testid="current-pin-change-input"
            />
          </div>

          <div>
            <Label className="text-slate-400">Nouveau PIN (4-6 chiffres)</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPinForChange}
              onChange={(e) => setNewPinForChange(e.target.value.replace(/\D/g, ''))}
              placeholder="****"
              className="mt-1 bg-slate-800 border-slate-700 text-white text-center text-lg tracking-widest"
              data-testid="new-pin-change-input"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowChangeForm(false);
                setCurrentPin('');
                setNewPinForChange('');
              }}
              variant="outline"
              className="flex-1 border-slate-700 text-slate-300"
            >
              Annuler
            </Button>
            <Button
              onClick={handleChangePin}
              disabled={isChanging || currentPin.length < 4 || newPinForChange.length < 4}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
              data-testid="confirm-change-pin-btn"
            >
              {isChanging ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              {isChanging ? 'Changement...' : 'Changer'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

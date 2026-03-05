import React, { useState } from 'react';
import { KeyRound, X, Loader2, Mail, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export default function ForgotPinModal({ isOpen, onClose, onRequestOTP, onResetPin, merchantPhone, merchantEmail }) {
  const [step, setStep] = useState('choose'); // choose, verify, success
  const [method, setMethod] = useState(null);
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [testOtp, setTestOtp] = useState(null);

  const handleRequestOTP = async (selectedMethod) => {
    setIsLoading(true);
    setError('');
    setMethod(selectedMethod);
    
    try {
      const result = await onRequestOTP(selectedMethod);
      if (result.test_mode && result.otp) {
        setTestOtp(result.otp);
      }
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi de l\'OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (newPin !== confirmPin) {
      setError('Les codes PIN ne correspondent pas');
      return;
    }
    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      setError('Le PIN doit contenir 4 à 6 chiffres');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onResetPin(otp, newPin);
      setStep('success');
    } catch (err) {
      setError(err.message || 'OTP invalide ou expiré');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('choose');
    setMethod(null);
    setOtp('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setTestOtp(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <KeyRound className="text-amber-400" size={24} />
            </div>
            <div>
              <h3 className="text-white font-semibold">Réinitialiser le PIN</h3>
              <p className="text-slate-400 text-sm">
                {step === 'choose' && 'Choisissez une méthode'}
                {step === 'verify' && 'Entrez le code OTP'}
                {step === 'success' && 'PIN réinitialisé'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-400" size={18} />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {step === 'choose' && (
          <div className="space-y-3">
            <p className="text-slate-300 text-sm mb-4">
              Nous vous enverrons un code OTP pour vérifier votre identité.
            </p>
            
            <button
              onClick={() => handleRequestOTP('sms')}
              disabled={isLoading}
              className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl flex items-center gap-4 hover:border-emerald-500/50 transition-all"
              data-testid="forgot-pin-sms-btn"
            >
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Phone className="text-emerald-400" size={20} />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-medium">SMS</p>
                <p className="text-slate-400 text-sm">
                  {merchantPhone ? `***${merchantPhone.slice(-4)}` : 'Numéro enregistré'}
                </p>
              </div>
            </button>

            <button
              onClick={() => handleRequestOTP('email')}
              disabled={isLoading || !merchantEmail}
              className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl flex items-center gap-4 hover:border-blue-500/50 transition-all disabled:opacity-50"
              data-testid="forgot-pin-email-btn"
            >
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Mail className="text-blue-400" size={20} />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-medium">Email</p>
                <p className="text-slate-400 text-sm">
                  {merchantEmail ? `***${merchantEmail.slice(-10)}` : 'Non disponible'}
                </p>
              </div>
            </button>

            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="animate-spin text-amber-400" size={24} />
              </div>
            )}
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            {testOtp && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-amber-400 text-sm">
                  <strong>Test Mode:</strong> Your OTP is <code className="bg-slate-900 px-2 py-1 rounded">{testOtp}</code>
                </p>
              </div>
            )}

            <div>
              <label className="text-slate-400 text-sm block mb-2">OTP Code</label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="bg-slate-900 border-slate-700 text-white text-center text-lg tracking-widest"
                data-testid="otp-input"
              />
            </div>

            <div>
              <label className="text-slate-400 text-sm block mb-2">Nouveau PIN (4-6 chiffres)</label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="bg-slate-900 border-slate-700 text-white text-center text-lg tracking-widest"
                data-testid="new-pin-input"
              />
            </div>

            <div>
              <label className="text-slate-400 text-sm block mb-2">Confirmer le PIN</label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="bg-slate-900 border-slate-700 text-white text-center text-lg tracking-widest"
                data-testid="confirm-pin-input"
              />
            </div>

            <Button
              onClick={handleResetPin}
              disabled={isLoading || otp.length !== 6 || newPin.length < 4}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              data-testid="reset-pin-btn"
            >
              {isLoading ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : (
                <KeyRound className="mr-2" size={18} />
              )}
              {isLoading ? 'Réinitialisation...' : 'Réinitialiser le PIN'}
            </Button>

            <button
              onClick={() => setStep('choose')}
              className="w-full text-slate-400 hover:text-white text-sm"
            >
              Retour
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
            <h4 className="text-white font-semibold mb-2">PIN Reset!</h4>
            <p className="text-slate-400 text-sm mb-6">
              Your new PIN code has been configured successfully.
            </p>
            <Button
              onClick={handleClose}
              className="bg-emerald-500 hover:bg-emerald-600"
              data-testid="close-success-btn"
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

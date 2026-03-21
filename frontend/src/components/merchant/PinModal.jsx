import React, { useState, useRef, useEffect } from 'react';
import { Lock, X, Loader2, KeyRound, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

export default function PinModal({ isOpen, onClose, onVerify, isLoading, error }) {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
    if (isOpen) {
      setPin(['', '', '', '', '', '']);
    }
  }, [isOpen]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete (4-6 digits)
    const fullPin = newPin.join('');
    if (fullPin.length >= 4 && newPin.slice(0, fullPin.length).every(d => d !== '')) {
      // Wait a bit for UX
      setTimeout(() => {
        if (fullPin.length >= 4) {
          onVerify(fullPin);
        }
      }, 200);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const fullPin = pin.join('');
      if (fullPin.length >= 4) {
        onVerify(fullPin);
      }
    }
  };

  const handleSubmit = () => {
    const fullPin = pin.join('');
    if (fullPin.length >= 4) {
      onVerify(fullPin);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Lock className="text-amber-400" size={24} />
            </div>
            <div>
              <h3 className="text-white font-semibold">Code PIN requis</h3>
              <p className="text-slate-400 text-sm">Enter your PIN code</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-400" size={18} />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-center gap-2 mb-6">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading}
              className="w-12 h-14 text-center text-2xl font-bold bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all disabled:opacity-50"
              data-testid={`pin-input-${index}`}
            />
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isLoading || pin.join('').length < 4}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          data-testid="pin-submit-btn"
        >
          {isLoading ? (
            <Loader2 className="animate-spin mr-2" size={18} />
          ) : (
            <KeyRound className="mr-2" size={18} />
          )}
          {isLoading ? 'Verifying...' : 'Verify'}
        </Button>

        <button
          onClick={() => onClose('forgot')}
          className="w-full mt-3 text-amber-400 hover:text-amber-300 text-sm"
          data-testid="forgot-pin-btn"
        >
          PIN oublié ?
        </button>
      </div>
    </div>
  );
}

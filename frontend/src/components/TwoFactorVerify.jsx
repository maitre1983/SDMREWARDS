import React, { useState } from 'react';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function TwoFactorVerify({ userId, userType, onSuccess, onCancel }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackup, setUseBackup] = useState(false);

  const handleVerify = async () => {
    if (code.length < 6) {
      setError('Please enter a valid code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/complete-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          user_type: userType,
          code: code.replace(/[- ]/g, '')
        })
      });

      const data = await res.json();

      if (data.success && data.access_token) {
        onSuccess(data);
      } else {
        setError(data.detail || 'Invalid code. Please try again.');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && code.length >= 6) {
      handleVerify();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Two-Factor Authentication</h2>
            <p className="text-slate-400">
              {useBackup 
                ? 'Enter one of your backup codes'
                : 'Enter the 6-digit code from your authenticator app'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Code Input */}
          <div className="mb-6">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                const val = useBackup 
                  ? e.target.value.toUpperCase().slice(0, 9)
                  : e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(val);
              }}
              onKeyPress={handleKeyPress}
              placeholder={useBackup ? 'XXXX-XXXX' : '000000'}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-6 py-4 text-white text-center text-2xl tracking-[0.3em] font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              autoFocus
              autoComplete="one-time-code"
            />
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={code.length < 6 || loading}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify & Sign In'
            )}
          </button>

          {/* Toggle Backup Code */}
          <button
            onClick={() => {
              setUseBackup(!useBackup);
              setCode('');
              setError('');
            }}
            className="w-full mt-4 py-3 text-slate-400 hover:text-white transition-colors text-sm"
          >
            {useBackup ? 'Use authenticator app instead' : 'Use a backup code instead'}
          </button>

          {/* Cancel */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full mt-2 py-3 text-slate-500 hover:text-slate-300 transition-colors text-sm"
            >
              ← Back to login
            </button>
          )}
        </div>

        {/* Help Text */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Open your authenticator app (Google Authenticator, Authy, etc.) to get your verification code.
        </p>
      </div>
    </div>
  );
}

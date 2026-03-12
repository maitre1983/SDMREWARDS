import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, Copy, Check, Loader2, Key, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function TwoFactorSettings({ userType = 'client', token }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/2fa/${userType}/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError('Failed to load 2FA status');
    } finally {
      setLoading(false);
    }
  };

  const startSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/2fa/${userType}/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        setSetupData(data);
        setBackupCodes(data.backup_codes || []);
      } else {
        setError(data.detail || 'Setup failed');
      }
    } catch (err) {
      setError('Failed to start 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/2fa/${userType}/verify-setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verifyCode })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('2FA enabled successfully!');
        setSetupData(null);
        setShowBackupCodes(true);
        fetchStatus();
      } else {
        setError(data.detail || 'Verification failed');
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/2fa/${userType}/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: disableCode })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('2FA disabled successfully');
        setDisableCode('');
        fetchStatus();
      } else {
        setError(data.detail || 'Failed to disable 2FA');
      }
    } catch (err) {
      setError('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(setupData?.secret || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !setupData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-amber-500" />
        <h3 className="text-lg font-semibold text-white">Two-Factor Authentication</h3>
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

      {/* Status Display */}
      {status && !setupData && (
        <div className="mb-6">
          <div className={`flex items-center gap-2 p-4 rounded-lg ${
            status.enabled 
              ? 'bg-green-500/20 border border-green-500/50' 
              : 'bg-slate-700/50 border border-slate-600'
          }`}>
            {status.enabled ? (
              <>
                <ShieldCheck className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">2FA Enabled</span>
                <span className="text-slate-400 text-sm ml-2">
                  ({status.backup_codes_remaining} backup codes remaining)
                </span>
              </>
            ) : (
              <>
                <ShieldOff className="w-5 h-5 text-slate-400" />
                <span className="text-slate-400">2FA Not Enabled</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Setup Flow */}
      {setupData && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-slate-300 mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="inline-block p-4 bg-white rounded-xl">
              <QRCodeSVG value={setupData.uri} size={180} />
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-2">Or enter this code manually:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-800 px-3 py-2 rounded text-amber-400 font-mono text-sm">
                {setupData.secret}
              </code>
              <button
                onClick={copySecret}
                className="p-2 hover:bg-slate-600 rounded transition-colors"
              >
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-slate-400" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-2">
              Enter the 6-digit code from your app to verify:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-center text-xl tracking-widest font-mono"
                maxLength={6}
              />
              <button
                onClick={verifySetup}
                disabled={verifyCode.length !== 6 || loading}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
              </button>
            </div>
          </div>

          <button
            onClick={() => setSetupData(null)}
            className="w-full py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel Setup
          </button>
        </div>
      )}

      {/* Backup Codes Display */}
      {showBackupCodes && backupCodes.length > 0 && (
        <div className="mt-6 p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-amber-400 font-medium">Save Your Backup Codes</h4>
              <p className="text-slate-300 text-sm mt-1">
                Store these codes in a safe place. You can use them to access your account if you lose your phone.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {backupCodes.map((code, i) => (
              <code key={i} className="bg-slate-800 px-3 py-2 rounded text-center font-mono text-slate-300">
                {code}
              </code>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyBackupCodes}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-white"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copy All
            </button>
            <button
              onClick={() => setShowBackupCodes(false)}
              className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
            >
              I've Saved Them
            </button>
          </div>
        </div>
      )}

      {/* Enable/Disable Buttons */}
      {!setupData && (
        <div className="mt-6">
          {!status?.enabled ? (
            <button
              onClick={startSetup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 text-black font-medium rounded-lg transition-colors"
            >
              <Key className="w-5 h-5" />
              Enable Two-Factor Authentication
            </button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <label className="block text-slate-300 text-sm mb-2">
                  Enter your 2FA code to disable:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white text-center tracking-widest font-mono"
                    maxLength={6}
                  />
                  <button
                    onClick={disable2FA}
                    disabled={disableCode.length !== 6 || loading}
                    className="px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Disable 2FA'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-slate-500 text-xs">
        Two-factor authentication adds an extra layer of security to your account by requiring a code from your authenticator app in addition to your password.
      </p>
    </div>
  );
}

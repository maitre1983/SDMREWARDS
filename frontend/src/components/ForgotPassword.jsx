import React, { useState } from 'react';
import { KeyRound, Phone, Mail, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ForgotPassword({ userType = 'client', onBack, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Enter phone/email, 2: Enter OTP, 3: New password
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form data
  const [identifier, setIdentifier] = useState(''); // phone or email
  const [requestId, setRequestId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isAdmin = userType === 'admin';
  const identifierLabel = isAdmin ? 'Email' : 'Phone Number';
  const identifierPlaceholder = isAdmin ? 'your@email.com' : '+233 XXX XXX XXX';
  const identifierType = isAdmin ? 'email' : 'tel';

  // Step 1: Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      toast.error(`Please enter your ${identifierLabel.toLowerCase()}`);
      return;
    }
    
    setLoading(true);
    
    try {
      let endpoint, body;
      
      if (isAdmin) {
        endpoint = '/api/auth/admin/forgot-password';
        body = { email: identifier };
      } else {
        endpoint = '/api/auth/otp/send';
        body = { phone: identifier };
      }
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (data.success || res.ok) {
        setRequestId(data.request_id);
        setMaskedPhone(data.masked_phone || identifier.slice(0, 4) + '****' + identifier.slice(-2));
        setStep(2);
        toast.success('OTP sent! Check your phone.');
      } else {
        toast.error(data.detail || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 & 3: Reset Password with OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (otpCode.length < 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      let endpoint, body;
      
      if (isAdmin) {
        endpoint = '/api/auth/admin/reset-password';
        body = {
          email: identifier,
          otp_code: otpCode,
          request_id: requestId,
          new_password: newPassword
        };
      } else {
        endpoint = `/api/auth/${userType}/reset-password`;
        body = {
          phone: identifier,
          otp_code: otpCode,
          request_id: requestId,
          new_password: newPassword
        };
      }
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Password reset successfully!');
        onSuccess?.();
      } else {
        toast.error(data.detail || 'Failed to reset password');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setOtpCode('');
    await handleRequestOTP({ preventDefault: () => {} });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 shadow-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
          <p className="text-slate-400">
            {step === 1 && `Enter your ${identifierLabel.toLowerCase()} to receive a verification code`}
            {step === 2 && `Enter the OTP sent to ${maskedPhone}`}
          </p>
        </div>

        {/* Step 1: Enter Phone/Email */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div>
              <Label className="text-slate-300">{identifierLabel}</Label>
              <div className="relative mt-2">
                {isAdmin ? (
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                ) : (
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                )}
                <Input
                  type={identifierType}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={identifierPlaceholder}
                  className="pl-10 bg-slate-900 border-slate-700 text-white"
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !identifier.trim()}
              className="w-full py-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Sending OTP...
                </>
              ) : (
                'Send OTP Code'
              )}
            </Button>
          </form>
        )}

        {/* Step 2: Enter OTP and New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* OTP Input */}
            <div>
              <Label className="text-slate-300">Verification Code</Label>
              <div className="relative mt-2">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <Input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="pl-10 bg-slate-900 border-slate-700 text-white text-center text-xl tracking-widest font-mono"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleResendOTP}
                className="text-amber-500 hover:text-amber-400 text-sm mt-2"
                disabled={loading}
              >
                Didn't receive code? Resend
              </button>
            </div>

            {/* New Password */}
            <div>
              <Label className="text-slate-300">New Password</Label>
              <div className="relative mt-2">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pl-10 pr-10 bg-slate-900 border-slate-700 text-white"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <Label className="text-slate-300">Confirm Password</Label>
              <div className="relative mt-2">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pl-10 bg-slate-900 border-slate-700 text-white"
                  minLength={6}
                />
              </div>
              {confirmPassword && newPassword && (
                <p className={`text-sm mt-1 ${newPassword === confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                  {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || otpCode.length < 6 || newPassword.length < 6 || newPassword !== confirmPassword}
              className="w-full py-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Resetting Password...
                </>
              ) : (
                <>
                  <CheckCircle size={18} className="mr-2" />
                  Reset Password
                </>
              )}
            </Button>
          </form>
        )}

        {/* Back Button */}
        <button
          onClick={() => step === 1 ? onBack?.() : setStep(1)}
          className="w-full mt-4 py-3 text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} />
          {step === 1 ? 'Back to Login' : 'Change Phone/Email'}
        </button>
      </div>
    </div>
  );
}

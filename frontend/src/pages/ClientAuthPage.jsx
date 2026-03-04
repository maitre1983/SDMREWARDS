import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Sparkles, 
  Phone, 
  Lock, 
  User, 
  Mail, 
  Calendar,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Gift,
  CheckCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function ClientAuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // login, register, otp
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  // OTP states
  const [otpCode, setOtpCode] = useState('');
  const [requestId, setRequestId] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  const normalizePhone = (p) => {
    let normalized = p.replace(/\s/g, '').replace(/-/g, '');
    if (normalized.startsWith('0')) {
      normalized = '+233' + normalized.slice(1);
    } else if (normalized.startsWith('233')) {
      normalized = '+' + normalized;
    } else if (!normalized.startsWith('+')) {
      normalized = '+233' + normalized;
    }
    return normalized;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error('Please fill all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/client/login`, {
        phone: normalizePhone(phone),
        password
      });

      localStorage.setItem('sdm_client_token', response.data.access_token);
      localStorage.setItem('sdm_client_data', JSON.stringify(response.data.client));
      
      toast.success('Login successful!');
      navigate('/client/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phone) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/otp/send`, {
        phone: normalizePhone(phone)
      });

      setRequestId(response.data.request_id);
      setMode('otp');
      toast.success('OTP sent to your phone!');
      
      if (response.data.test_mode) {
        toast.info('Test mode: Use code 123456');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode) {
      toast.error('Please enter the OTP code');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/otp/verify`, {
        phone: normalizePhone(phone),
        otp_code: otpCode,
        request_id: requestId
      });

      setOtpVerified(true);
      toast.success('Phone verified!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!fullName || !username || !password) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!otpVerified && !requestId.startsWith('TEST_')) {
      toast.error('Please verify your phone number first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/client/register`, {
        full_name: fullName,
        username: username.toLowerCase(),
        phone: normalizePhone(phone),
        email: email || null,
        password,
        birthday: birthday || null,
        referral_code: referralCode || null,
        otp_code: otpCode || '123456',
        request_id: requestId || 'TEST_' + phone
      });

      localStorage.setItem('sdm_client_token', response.data.access_token);
      localStorage.setItem('sdm_client_data', JSON.stringify(response.data.client));
      
      toast.success(response.data.message || 'Registration successful!');
      navigate('/client/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-9 h-9 object-contain rounded-lg" />
            <span className="font-bold text-white">SDM</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {mode === 'login' ? 'Welcome Back' : mode === 'otp' ? 'Verify Phone' : 'Create Account'}
            </h1>
            <p className="text-slate-400">
              {mode === 'login' 
                ? 'Sign in to access your cashback rewards' 
                : mode === 'otp'
                  ? 'Enter the code sent to your phone'
                  : 'Join SDM Rewards and start earning'}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="text-slate-300">Phone Number</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="tel"
                      placeholder="0XX XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                      data-testid="login-phone-input"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                      data-testid="login-password-input"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-6"
                  data-testid="login-submit-btn"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
                </Button>
              </form>
            )}

            {/* OTP Verification */}
            {mode === 'otp' && (
              <div className="space-y-4">
                <div className="text-center p-4 bg-slate-900 rounded-xl">
                  <Phone className="mx-auto text-amber-400 mb-2" size={32} />
                  <p className="text-slate-300">Code sent to</p>
                  <p className="text-white font-bold">{normalizePhone(phone)}</p>
                </div>

                {!otpVerified ? (
                  <>
                    <div>
                      <Label className="text-slate-300">Enter OTP Code</Label>
                      <Input
                        type="text"
                        placeholder="XXXXXX"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="mt-1 bg-slate-900 border-slate-700 text-white text-center text-2xl tracking-widest"
                        maxLength={6}
                        data-testid="otp-input"
                      />
                    </div>

                    <Button
                      onClick={handleVerifyOTP}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-6"
                      data-testid="verify-otp-btn"
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : 'Verify Code'}
                    </Button>

                    <button
                      onClick={handleSendOTP}
                      className="w-full text-amber-400 text-sm hover:underline"
                    >
                      Resend Code
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="mx-auto text-emerald-400 mb-2" size={48} />
                    <p className="text-emerald-400 font-medium">Phone Verified!</p>
                    <Button
                      onClick={() => setMode('register')}
                      className="mt-4 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                    >
                      Continue Registration <ArrowRight className="ml-2" size={18} />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Register Form */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Phone (already verified) */}
                {otpVerified && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <CheckCircle className="text-emerald-400" size={18} />
                    <span className="text-emerald-300 text-sm">Phone verified: {normalizePhone(phone)}</span>
                  </div>
                )}

                {!otpVerified && (
                  <div>
                    <Label className="text-slate-300">Phone Number *</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <Input
                        type="tel"
                        placeholder="0XX XXX XXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10 bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-slate-300">Full Name *</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                      data-testid="register-fullname-input"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Username *</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">@</span>
                    <Input
                      type="text"
                      placeholder="johndoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                      data-testid="register-username-input"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Email (optional)</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Password *</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="password"
                      placeholder="Create password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                      data-testid="register-password-input"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Birthday (optional)</Label>
                  <div className="relative mt-1">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Referral Code (optional)</Label>
                  <div className="relative mt-1">
                    <Gift className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="text"
                      placeholder="SDMXXXXXX"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Have a referral code? Enter it to earn bonus!</p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-6"
                  data-testid="register-submit-btn"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}
                </Button>
              </form>
            )}

            {/* Toggle Login/Register */}
            <div className="mt-6 pt-6 border-t border-slate-700 text-center">
              {mode === 'login' ? (
                <p className="text-slate-400">
                  Don't have an account?{' '}
                  <button 
                    onClick={() => {
                      setMode('register');
                      setOtpVerified(false);
                    }}
                    className="text-amber-400 hover:underline font-medium"
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p className="text-slate-400">
                  Already have an account?{' '}
                  <button 
                    onClick={() => setMode('login')}
                    className="text-amber-400 hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* OTP Button for Register */}
          {mode === 'register' && !otpVerified && phone && (
            <div className="mt-4">
              <Button
                onClick={handleSendOTP}
                disabled={isLoading}
                variant="outline"
                className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Phone className="mr-2" size={18} />}
                Verify Phone Number First
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

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
  Store,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  Building2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function MerchantAuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // login, register, otp
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  
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
      const response = await axios.post(`${API_URL}/api/auth/merchant/login`, {
        phone: normalizePhone(phone),
        password
      });

      localStorage.setItem('sdm_merchant_token', response.data.access_token);
      localStorage.setItem('sdm_merchant_data', JSON.stringify(response.data.merchant));
      
      toast.success('Login successful!');
      navigate('/merchant/dashboard');
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
    
    if (!businessName || !ownerName || !password) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/merchant/register`, {
        business_name: businessName,
        owner_name: ownerName,
        phone: normalizePhone(phone),
        email: email || null,
        password,
        business_type: businessType || null,
        business_address: businessAddress || null,
        otp_code: otpCode || '123456',
        request_id: requestId || 'TEST_' + phone
      });

      localStorage.setItem('sdm_merchant_token', response.data.access_token);
      localStorage.setItem('sdm_merchant_data', JSON.stringify(response.data.merchant));
      
      toast.success(response.data.message || 'Registration successful!');
      navigate('/merchant/dashboard');
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
            <span className="font-bold text-white">Merchant</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {mode === 'login' ? 'Merchant Login' : mode === 'otp' ? 'Verify Phone' : 'Partner with SDM'}
            </h1>
            <p className="text-slate-400">
              {mode === 'login' 
                ? 'Access your merchant dashboard' 
                : mode === 'otp'
                  ? 'Enter the code sent to your phone'
                  : 'Register your business and attract customers'}
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
                      data-testid="merchant-login-phone"
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
                      data-testid="merchant-login-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-6"
                  data-testid="merchant-login-btn"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
                </Button>
              </form>
            )}

            {/* OTP Verification */}
            {mode === 'otp' && (
              <div className="space-y-4">
                <div className="text-center p-4 bg-slate-900 rounded-xl">
                  <Phone className="mx-auto text-emerald-400 mb-2" size={32} />
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
                      />
                    </div>

                    <Button
                      onClick={handleVerifyOTP}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-6"
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : 'Verify Code'}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="mx-auto text-emerald-400 mb-2" size={48} />
                    <p className="text-emerald-400 font-medium">Phone Verified!</p>
                    <Button
                      onClick={() => setMode('register')}
                      className="mt-4 w-full bg-gradient-to-r from-emerald-500 to-teal-500"
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
                  <Label className="text-slate-300">Business Name *</Label>
                  <div className="relative mt-1">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="text"
                      placeholder="Your Business Name"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                      data-testid="merchant-business-name"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Owner Name *</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="text"
                      placeholder="Your Full Name"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                      data-testid="merchant-owner-name"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Email (optional)</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="email"
                      placeholder="business@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Business Type (optional)</Label>
                  <div className="relative mt-1">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="text"
                      placeholder="e.g. Restaurant, Retail, Services"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Business Address (optional)</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="text"
                      placeholder="Street, City"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
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
                      data-testid="merchant-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-6"
                  data-testid="merchant-register-btn"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Register Business'}
                </Button>
              </form>
            )}

            {/* Toggle Login/Register */}
            <div className="mt-6 pt-6 border-t border-slate-700 text-center">
              {mode === 'login' ? (
                <p className="text-slate-400">
                  New merchant?{' '}
                  <button 
                    onClick={() => setMode('register')}
                    className="text-emerald-400 hover:underline font-medium"
                  >
                    Register Business
                  </button>
                </p>
              ) : (
                <p className="text-slate-400">
                  Already registered?{' '}
                  <button 
                    onClick={() => setMode('login')}
                    className="text-emerald-400 hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* OTP Button */}
          {mode === 'register' && !otpVerified && phone && (
            <div className="mt-4">
              <Button
                onClick={handleSendOTP}
                disabled={isLoading}
                variant="outline"
                className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
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

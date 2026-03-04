import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  ArrowLeft, 
  Phone, 
  Lock, 
  User, 
  Mail, 
  Store,
  MapPin,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  TrendingUp,
  Users,
  CheckCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";
const MERCHANT_AUTH_BG = "https://static.prod-images.emergentagent.com/jobs/2b0d7634-108c-4eb1-b22d-82f976c95531/images/d2e4f27e2dd3b2de36587426228761cdbb5a04ac05cfdc00de630a55fb37f563.png";
const MERCHANT_HERO_IMG = "https://static.prod-images.emergentagent.com/jobs/2b0d7634-108c-4eb1-b22d-82f976c95531/images/c834226229fbb437ca2fce6db6411ff2a5e0e20058d7d43e564336da8fbe55f6.png";

export default function MerchantAuthPage() {
  const navigate = useNavigate();
  
  // Mode: 'login', 'register', 'otp'
  const [mode, setMode] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  
  // OTP states
  const [otpCode, setOtpCode] = useState('');
  const [requestId, setRequestId] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('sdm_merchant_token');
    if (token) {
      navigate('/merchant/dashboard');
    }
  }, [navigate]);

  const normalizePhone = (phone) => {
    let cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '+233' + cleaned.slice(1);
    } else if (cleaned.startsWith('233')) {
      cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+233' + cleaned;
    }
    return cleaned;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error('Please enter phone and password');
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
      
      toast.success('Welcome back!');
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

    if (!otpVerified) {
      toast.error('Please verify your phone number with OTP first');
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
        otp_code: otpCode,
        request_id: requestId
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

  const businessTypes = [
    { value: 'retail', label: 'Retail Store' },
    { value: 'restaurant', label: 'Restaurant / Food' },
    { value: 'fashion', label: 'Fashion / Clothing' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'pharmacy', label: 'Pharmacy / Health' },
    { value: 'services', label: 'Services' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="min-h-screen bg-[#0A0E17] flex">
      {/* Left Side - Image/Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${mode === 'login' ? MERCHANT_AUTH_BG : MERCHANT_HERO_IMG})` }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E17] via-[#0A0E17]/80 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 max-w-xl">
          {/* Logo */}
          <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-20 h-20 rounded-2xl mb-8 shadow-2xl" />
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Grow Your Business<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
              With SDM Rewards
            </span>
          </h1>
          
          <p className="text-slate-400 text-lg mb-8">
            Partner with us to attract more customers, increase sales, and build loyalty through our cashback program.
          </p>
          
          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: Users, text: "Access to thousands of customers" },
              { icon: TrendingUp, text: "Increase your sales volume" },
              { icon: Shield, text: "Secure payment processing" }
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <feature.icon className="text-emerald-400" size={20} />
                </div>
                <span className="text-slate-300">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden p-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
        </header>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Logo (Mobile) */}
            <div className="lg:hidden text-center mb-8">
              <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-16 h-16 rounded-xl mx-auto mb-4 shadow-xl" />
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {mode === 'login' ? 'Merchant Login' : mode === 'otp' ? 'Verify Phone' : 'Partner with SDM'}
              </h2>
              <p className="text-slate-400">
                {mode === 'login' 
                  ? 'Access your merchant dashboard'
                  : mode === 'otp'
                  ? 'Enter the code sent to your phone'
                  : 'Register your business with SDM Rewards'}
              </p>
            </div>

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <Label className="text-slate-300 text-sm">Phone Number</Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="tel"
                      placeholder="0XX XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-11 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20"
                      data-testid="login-phone"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300 text-sm">Password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20"
                      data-testid="login-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      data-testid="toggle-password"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25"
                  data-testid="login-submit"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
                </Button>

                <div className="text-center">
                  <p className="text-slate-400">
                    New merchant?{' '}
                    <button 
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Register business
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* OTP Verification */}
            {mode === 'otp' && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Phone className="text-emerald-400" size={28} />
                  </div>
                  <p className="text-slate-400 mb-2">Code sent to</p>
                  <p className="text-white font-medium">{phone}</p>
                </div>

                {!otpVerified ? (
                  <>
                    <div>
                      <Label className="text-slate-300 text-sm">Enter OTP Code</Label>
                      <Input
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="mt-1.5 h-14 text-center text-2xl tracking-[0.5em] bg-slate-900/50 border-slate-700/50 text-white rounded-xl focus:border-emerald-500"
                        data-testid="otp-code"
                      />
                    </div>

                    <Button
                      onClick={handleVerifyOTP}
                      disabled={isLoading || otpCode.length < 6}
                      className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl"
                      data-testid="verify-otp"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Verify Code'}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="text-emerald-400" size={32} />
                    </div>
                    <p className="text-emerald-400 font-medium mb-4">Phone Verified!</p>
                    <Button
                      onClick={() => setMode('register')}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl"
                    >
                      Continue to Registration
                    </Button>
                  </div>
                )}

                <button 
                  onClick={() => setMode('register')}
                  className="w-full text-slate-400 hover:text-white text-sm"
                >
                  Back to registration
                </button>
              </div>
            )}

            {/* Registration Form */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Phone & OTP Status */}
                <div>
                  <Label className="text-slate-300 text-sm">Phone Number</Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="tel"
                      placeholder="0XX XXX XXXX"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setOtpVerified(false); }}
                      disabled={otpVerified}
                      className="pl-11 pr-24 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                      data-testid="register-phone"
                    />
                    {otpVerified ? (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 text-sm flex items-center gap-1">
                        <CheckCircle size={14} /> Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={isLoading || !phone}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-300 text-sm font-medium px-2 py-1"
                      >
                        {isLoading ? '...' : 'Get OTP'}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300 text-sm">Business Name</Label>
                  <div className="relative mt-1.5">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="text"
                      placeholder="Your Business Name"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="pl-11 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                      data-testid="register-business"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300 text-sm">Owner Name</Label>
                    <div className="relative mt-1.5">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <Input
                        type="text"
                        placeholder="Full name"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="pl-11 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                        data-testid="register-owner"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300 text-sm">Business Type</Label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="mt-1.5 w-full h-12 bg-slate-900/50 border border-slate-700/50 text-white rounded-xl px-4 focus:border-emerald-500"
                    >
                      <option value="">Select type</option>
                      {businessTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300 text-sm">Password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                      data-testid="register-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300 text-sm">Email (Optional)</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="email"
                      placeholder="business@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300 text-sm">Business Address (Optional)</Label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="text"
                      placeholder="Location / Address"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      className="pl-11 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !otpVerified}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                  data-testid="register-submit"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Register Business'}
                </Button>

                {/* Legal Agreement */}
                <p className="text-slate-500 text-xs text-center">
                  By registering, you agree to SDM REWARDS{' '}
                  <a href="/merchant-terms" className="text-emerald-400 hover:underline">Merchant Terms</a>
                  {' '}and{' '}
                  <a href="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</a>.
                </p>

                <div className="text-center">
                  <p className="text-slate-400">
                    Already registered?{' '}
                    <button 
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* Desktop: Back button */}
            <div className="hidden lg:block mt-8 text-center">
              <button 
                onClick={() => navigate('/')}
                className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-2 mx-auto"
              >
                <ArrowLeft size={16} />
                Back to home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Calendar,
  Gift,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Sparkles,
  CheckCircle,
  KeyRound
} from 'lucide-react';
import ForgotPassword from '../components/ForgotPassword';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";
const CLIENT_AUTH_BG = "https://static.prod-images.emergentagent.com/jobs/2b0d7634-108c-4eb1-b22d-82f976c95531/images/207daf83f82a55f47111e751686f3de6ea3fcca80fa23b164735e236b05fd349.png";
const CLIENT_HERO_IMG = "https://static.prod-images.emergentagent.com/jobs/2b0d7634-108c-4eb1-b22d-82f976c95531/images/b0e8ab2c52e936ba4ba8cb24553108b356c076b6a695a0ea5e6ff499110168d9.png";

export default function ClientAuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Mode: 'login', 'register', 'otp', 'forgot'
  const [mode, setMode] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  // OTP states
  const [otpCode, setOtpCode] = useState('');
  const [requestId, setRequestId] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [ussdCode, setUssdCode] = useState('');

  useEffect(() => {
    // Check for referral code in URL
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref);
      setMode('register');
    }
    
    // Check if already logged in
    const token = localStorage.getItem('sdm_client_token');
    if (token) {
      navigate('/client/dashboard');
    }
  }, [searchParams, navigate]);

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
      const response = await axios.post(`${API_URL}/api/auth/client/login`, {
        phone: normalizePhone(phone),
        password
      });

      localStorage.setItem('sdm_client_token', response.data.access_token);
      localStorage.setItem('sdm_client_data', JSON.stringify(response.data.client));
      
      toast.success('Welcome back!');
      
      // Check if there's a pending merchant payment from QR scan
      const pendingMerchant = sessionStorage.getItem('pending_merchant_payment');
      if (pendingMerchant) {
        sessionStorage.removeItem('pending_merchant_payment');
        navigate('/client/dashboard', { 
          state: { payMerchant: true, merchantQR: pendingMerchant }
        });
      } else {
        navigate('/client/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    toast.loading('Sending OTP...', { id: 'otp-send' });
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/otp/send`, {
        phone: normalizePhone(phone)
      });

      toast.dismiss('otp-send');
      setRequestId(response.data.request_id);
      setUssdCode(response.data.ussd_code || '');
      setMode('otp');
      toast.success('OTP sent! Check your phone for the code.');
      
      if (response.data.test_mode) {
        toast.info('Test mode: Use code 123456');
      }
    } catch (error) {
      toast.dismiss('otp-send');
      const errorMsg = error.response?.data?.detail || 'Unable to send OTP. Please try again.';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode) {
      toast.error('Please enter the OTP code');
      return;
    }
    
    if (otpCode.length < 6) {
      toast.error('OTP code must be 6 digits');
      return;
    }

    setIsLoading(true);
    toast.loading('Verifying code...', { id: 'otp-verify' });
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/otp/verify`, {
        phone: normalizePhone(phone),
        otp_code: otpCode,
        request_id: requestId
      });

      toast.dismiss('otp-verify');
      console.log('OTP verification response:', response.data);
      
      if (response.data.success) {
        setOtpVerified(true);
        toast.success('Phone verified successfully!');
        
        // Automatically go back to registration form after short delay
        setTimeout(() => {
          setMode('register');
        }, 1000);
      }
    } catch (error) {
      toast.dismiss('otp-verify');
      console.error('OTP verification error:', error.response?.data);
      const errorMsg = error.response?.data?.detail || 'Invalid OTP code. Please try again.';
      toast.error(errorMsg);
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

    if (!otpVerified) {
      toast.error('Please verify your phone number with OTP first');
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
        otp_code: otpCode,
        request_id: requestId
      });

      localStorage.setItem('sdm_client_token', response.data.access_token);
      localStorage.setItem('sdm_client_data', JSON.stringify(response.data.client));
      
      toast.success(response.data.message || 'Registration successful!');
      
      // Check if there's a pending merchant payment from QR scan
      const pendingMerchant = sessionStorage.getItem('pending_merchant_payment');
      if (pendingMerchant) {
        sessionStorage.removeItem('pending_merchant_payment');
        navigate('/client/dashboard', { 
          state: { payMerchant: true, merchantQR: pendingMerchant }
        });
      } else {
        navigate('/client/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] flex">
      {/* Left Side - Image/Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${mode === 'login' ? CLIENT_AUTH_BG : CLIENT_HERO_IMG})` }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E17] via-[#0A0E17]/80 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 max-w-xl">
          {/* Logo */}
          <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-20 h-20 rounded-2xl mb-8 shadow-2xl" />
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Every Purchase<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Becomes a Reward
            </span>
          </h1>
          
          <p className="text-slate-400 text-lg mb-8">
            Join thousands of Ghanaians earning cashback on every purchase. Shop smarter, save more.
          </p>
          
          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: Sparkles, text: "Instant cashback on purchases" },
              { icon: Shield, text: "Secure Mobile Money payments" },
              { icon: Gift, text: "Exclusive VIP member rewards" }
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <feature.icon className="text-amber-400" size={20} />
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
                {mode === 'login' ? 'Welcome Back' : mode === 'otp' ? 'Verify Phone' : 'Create Account'}
              </h2>
              <p className="text-slate-400">
                {mode === 'login' 
                  ? 'Sign in to access your cashback rewards'
                  : mode === 'otp'
                  ? 'Enter the code sent to your phone'
                  : 'Join SDM Rewards and start earning'}
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
                      className="pl-11 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl focus:border-amber-500 focus:ring-amber-500/20"
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
                      className="pl-11 pr-11 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl focus:border-amber-500 focus:ring-amber-500/20"
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
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25"
                  data-testid="login-submit"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
                </Button>

                <div className="text-center">
                  <p className="text-slate-400">
                    Don't have an account?{' '}
                    <button 
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-amber-400 hover:text-amber-300 font-medium"
                    >
                      Sign up
                    </button>
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-slate-500 hover:text-amber-400 text-sm mt-3 flex items-center justify-center gap-1 mx-auto transition-colors"
                  >
                    <KeyRound size={14} />
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {/* Forgot Password */}
            {mode === 'forgot' && (
              <ForgotPassword
                userType="client"
                onBack={() => setMode('login')}
                onSuccess={() => {
                  setMode('login');
                  toast.success('Password reset! Please login with your new password.');
                }}
              />
            )}

            {/* OTP Verification */}
            {mode === 'otp' && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Phone className="text-amber-400" size={28} />
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
                        className="mt-1.5 h-14 text-center text-2xl tracking-[0.5em] bg-slate-900/50 border-slate-700/50 text-white rounded-xl focus:border-amber-500"
                        data-testid="otp-code"
                      />
                    </div>

                    <Button
                      onClick={handleVerifyOTP}
                      disabled={isLoading || otpCode.length < 6}
                      className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl"
                      data-testid="verify-otp"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Verify Code'}
                    </Button>

                    {/* USSD Code fallback */}
                    {ussdCode && (
                      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <p className="text-blue-400 text-sm text-center">
                          <span className="font-medium">Didn't receive the OTP?</span><br />
                          Dial <span className="font-bold text-white">{ussdCode}</span> to get your code
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="text-emerald-400" size={32} />
                    </div>
                    <p className="text-emerald-400 font-medium mb-4">Phone Verified!</p>
                    <Button
                      onClick={() => setMode('register')}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl"
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
                  <p className="text-slate-500 text-xs mt-0.5 mb-1">You will receive an OTP code via SMS</p>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="tel"
                      placeholder="0XX XXX XXXX"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setOtpVerified(false); }}
                      disabled={otpVerified}
                      className="pl-11 pr-28 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
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
                        disabled={isLoading || !phone || phone.length < 10}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 hover:text-amber-300 text-sm font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? 'Sending...' : 'Send OTP'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300 text-sm">Full Name</Label>
                    <div className="relative mt-1.5">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <Input
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-11 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                        data-testid="register-fullname"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300 text-sm">Username</Label>
                    <Input
                      type="text"
                      placeholder="johndoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      className="mt-1.5 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                      data-testid="register-username"
                    />
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300 text-sm">Email (Optional)</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-11 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300 text-sm">Birthday (Optional)</Label>
                    <div className="relative mt-1.5">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <Input
                        type="date"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="pl-11 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Referral Code */}
                <div>
                  <Label className="text-slate-300 text-sm">Referral Code (Optional)</Label>
                  <div className="relative mt-1.5">
                    <Gift className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input
                      type="text"
                      placeholder="Enter code"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="pl-11 h-12 bg-slate-900/50 border-slate-700/50 text-white rounded-xl"
                      data-testid="register-referral"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !otpVerified}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 disabled:opacity-50"
                  data-testid="register-submit"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
                </Button>

                {/* Legal Agreement */}
                <p className="text-slate-500 text-xs text-center">
                  By creating an account, you agree to SDM REWARDS{' '}
                  <a href="/terms" className="text-amber-400 hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" className="text-amber-400 hover:underline">Privacy Policy</a>.
                </p>

                <div className="text-center">
                  <p className="text-slate-400">
                    Already have an account?{' '}
                    <button 
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-amber-400 hover:text-amber-300 font-medium"
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

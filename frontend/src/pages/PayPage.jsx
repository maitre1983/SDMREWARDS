import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, Store, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

// API URL imported from config
import { API_URL } from '@/config/api';
const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function PayPage() {
  const navigate = useNavigate();
  const { merchantCode } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [merchant, setMerchant] = useState(null);
  const [error, setError] = useState(null);
  
  const token = localStorage.getItem('sdm_client_token');

  useEffect(() => {
    if (!merchantCode) {
      setError('Invalid QR code');
      setIsLoading(false);
      return;
    }
    
    // Fetch merchant info
    fetchMerchant();
  }, [merchantCode]);

  const fetchMerchant = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/merchants/by-qr/${merchantCode}`);
      if (res.data.merchant) {
        setMerchant(res.data.merchant);
        
        // If user is logged in, redirect to dashboard with merchant info
        if (token) {
          navigate('/client/dashboard', { 
            state: { 
              payMerchant: true, 
              merchantQR: merchantCode,
              merchantName: res.data.merchant.business_name 
            },
            replace: true
          });
        }
      } else {
        setError('Merchant not found');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to find merchant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    // Store merchant code in sessionStorage for after login
    sessionStorage.setItem('pending_merchant_payment', merchantCode);
    navigate('/client');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-amber-500 mx-auto mb-4" size={48} />
          <p className="text-white">Loading merchant...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 border border-red-500/30 rounded-2xl p-8 text-center max-w-md w-full">
          <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="text-white text-xl font-bold mb-2">Invalid QR Code</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Button 
            onClick={() => navigate('/')}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900"
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  // Show merchant info and prompt to login
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={SDM_LOGO_URL} alt="SDM" className="w-16 h-16 rounded-xl" />
        </div>
        
        {/* Merchant Info */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Store className="text-emerald-400" size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Pay to</p>
              <h3 className="text-white font-bold text-lg">{merchant?.business_name}</h3>
            </div>
          </div>
        </div>
        
        {/* Login Prompt */}
        <div className="text-center space-y-4">
          <p className="text-slate-300">
            Sign in to your SDM Rewards account to complete this payment
          </p>
          
          <Button 
            onClick={handleLogin}
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold rounded-xl"
            data-testid="login-to-pay-btn"
          >
            Sign In to Pay
          </Button>
          
          <p className="text-slate-500 text-sm">
            Don't have an account?{' '}
            <button 
              onClick={() => navigate('/client')}
              className="text-amber-400 hover:underline"
            >
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

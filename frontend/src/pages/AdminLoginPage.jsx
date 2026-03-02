import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "/sdm-logo.png";

// Generate dynamic admin URL based on current date (DDMMYY format)
const getAdminPath = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  return `/${day}${month}${year}`;
};

export default function AdminLoginPage({ adminPath }) {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  const dynamicAdminPath = adminPath || getAdminPath();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, credentials);
      login(response.data.access_token);
      toast.success('Login successful');
      navigate(dynamicAdminPath);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4" data-testid="admin-login-page">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <img 
              src={LOGO_URL} 
              alt="Smart Digital Solutions" 
              className="h-20 w-auto object-contain bg-white rounded-xl p-2"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{t('admin_login')}</h1>
          <p className="text-slate-400">Smart Digital Solutions</p>
        </div>

        {/* Form */}
        <form 
          onSubmit={handleSubmit}
          className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-800"
          data-testid="admin-login-form"
        >
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('admin_username')}
            </label>
            <Input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              required
              placeholder="admin"
              className="h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:border-blue-500"
              data-testid="admin-username-input"
            />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('admin_password')}
            </label>
            <Input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              required
              placeholder="••••••••"
              className="h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:border-blue-500"
              data-testid="admin-password-input"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all"
            data-testid="admin-login-button"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Lock size={18} className="mr-2" />
                {t('admin_signin')}
              </>
            )}
          </Button>
        </form>

        {/* Back to home */}
        <div className="text-center mt-6">
          <a href="/" className="text-sm text-slate-500 hover:text-blue-400 transition-colors">
            &larr; Back to website
          </a>
        </div>
      </div>
    </div>
  );
}

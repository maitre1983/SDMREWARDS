import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Home, AlertTriangle } from 'lucide-react';

const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <img 
          src={SDM_LOGO_URL} 
          alt="SDM Rewards" 
          className="w-20 h-20 mx-auto mb-6 rounded-2xl opacity-50"
        />
        
        {/* 404 Icon */}
        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="text-red-400" size={48} />
        </div>
        
        {/* Error Text */}
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-slate-300 mb-4">Page Not Found</h2>
        <p className="text-slate-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        {/* Action Button */}
        <Button
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-8 py-6"
        >
          <Home className="mr-2" size={20} />
          Back to Home
        </Button>
      </div>
    </div>
  );
}

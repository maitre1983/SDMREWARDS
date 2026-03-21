/**
 * PWA Install Prompt Component - Modern & Trustworthy
 * ====================================================
 * Shows a beautiful, secure-looking install prompt.
 * Compatible with all Android versions and iOS.
 */

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Shield, Zap, Wifi, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';

// Store the deferred prompt globally
let deferredPrompt = null;

export default function PWAInstallPrompt({ variant = 'banner' }) {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Don't show if dismissed recently
    const dismissedAt = localStorage.getItem('pwa-dismissed-at');
    if (dismissedAt) {
      const hoursSinceDismiss = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 24) return; // Don't show for 24 hours after dismiss
    }

    // Show for iOS if not standalone
    if (isIOSDevice && !isStandaloneMode) {
      setTimeout(() => setShowInstallPrompt(true), 2000); // Delay for better UX
    }

    // Listen for beforeinstallprompt (Chrome, Edge, Samsung, etc.)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (!isStandaloneMode) {
        setTimeout(() => setShowInstallPrompt(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setShowInstallPrompt(false);
      deferredPrompt = null;
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    deferredPrompt = null;
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setShowIOSInstructions(false);
    localStorage.setItem('pwa-dismissed-at', Date.now().toString());
  };

  if (isStandalone || !showInstallPrompt) return null;

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-center relative">
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-white/70 hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg">
              <img src="/icons/icon-96x96.png" alt="SDM" className="w-12 h-12 rounded-xl" />
            </div>
            <h2 className="text-white font-bold text-xl">Install SDM Rewards</h2>
            <p className="text-emerald-100 text-sm mt-1">Add to your home screen</p>
          </div>
          
          {/* Instructions */}
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 text-blue-400 font-bold">1</div>
              <div>
                <p className="text-white font-medium">Tap the Share button</p>
                <p className="text-slate-400 text-sm">Look for the <span className="inline-flex items-center bg-slate-800 px-2 py-0.5 rounded">□↑</span> icon at the bottom of Safari</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 text-blue-400 font-bold">2</div>
              <div>
                <p className="text-white font-medium">Scroll and tap "Add to Home Screen"</p>
                <p className="text-slate-400 text-sm">It has a <span className="inline-flex items-center bg-slate-800 px-2 py-0.5 rounded">＋</span> icon</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 text-emerald-400 font-bold">3</div>
              <div>
                <p className="text-white font-medium">Tap "Add" to confirm</p>
                <p className="text-slate-400 text-sm">The app will appear on your home screen</p>
              </div>
            </div>
          </div>
          
          <div className="px-6 pb-6">
            <Button onClick={handleDismiss} className="w-full bg-slate-800 hover:bg-slate-700 text-white">
              Got it
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Compact button variant
  if (variant === 'button') {
    return (
      <Button
        onClick={handleInstallClick}
        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white gap-2 shadow-lg shadow-emerald-500/25"
        size="sm"
      >
        <Download size={16} />
        <span className="hidden sm:inline">Install App</span>
      </Button>
    );
  }

  // Icon variant
  if (variant === 'icon') {
    return (
      <button
        onClick={handleInstallClick}
        className="relative p-2 text-emerald-400 hover:text-emerald-300 transition-colors"
        title="Install App"
      >
        <Download size={20} />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
      </button>
    );
  }

  // Full banner variant (default) - Modern & Trustworthy Design
  return (
    <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-bottom-6 duration-500">
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 border border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
        {/* Dismiss button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-500 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors z-10"
        >
          <X size={16} />
        </button>
        
        {/* Main content */}
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* App icon */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <img src="/icons/icon-96x96.png" alt="SDM" className="w-12 h-12 rounded-xl" onError={(e) => { e.target.style.display = 'none'; }} />
                <Smartphone className="text-white w-8 h-8" style={{ display: 'none' }} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle2 size={14} className="text-white" />
              </div>
            </div>
            
            {/* Text content */}
            <div className="flex-1 min-w-0 pr-6">
              <h3 className="text-white font-bold text-lg leading-tight">Install SDM Rewards</h3>
              <p className="text-slate-400 text-sm mt-1">
                Get instant access with our free app
              </p>
            </div>
          </div>
          
          {/* Trust badges */}
          <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-emerald-500" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              <span>Fast</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wifi size={14} className="text-blue-500" />
              <span>Works offline</span>
            </div>
          </div>
          
          {/* Install button */}
          <Button
            onClick={handleInstallClick}
            className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold h-12 rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02]"
          >
            <Download size={18} className="mr-2" />
            Install Free
          </Button>
          
          {/* Small note */}
          <p className="text-center text-slate-600 text-[11px] mt-3">
            No app store needed • Installs in seconds
          </p>
        </div>
      </div>
    </div>
  );
}

// Export hook for programmatic access
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS && !isStandalone) {
      setCanInstall(true);
    }

    const handler = () => setCanInstall(true);
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      return outcome === 'accepted';
    }
    return false;
  };

  return { canInstall, install };
}

/**
 * PWA Install Prompt Component
 * ============================
 * Shows a visible "Install App" button when the PWA can be installed.
 * Works on Chrome, Edge, Samsung Internet, and other Chromium-based browsers.
 */

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from './ui/button';

// Store the deferred prompt globally so it persists
let deferredPrompt = null;

export default function PWAInstallPrompt({ variant = 'banner' }) {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // If iOS and not standalone, show the prompt
    if (isIOSDevice && !isStandaloneMode) {
      setShowInstallPrompt(true);
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (!isStandaloneMode) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
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
      // iOS doesn't support beforeinstallprompt, show instructions
      alert('To install SDM Rewards:\n\n1. Tap the Share button (□↑)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"');
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    
    deferredPrompt = null;
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Remember dismissal for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already installed or dismissed
  if (isStandalone || !showInstallPrompt) {
    return null;
  }

  // Check session dismissal
  if (sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  // Compact button variant (for headers/navs)
  if (variant === 'button') {
    return (
      <Button
        onClick={handleInstallClick}
        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white gap-2"
        size="sm"
      >
        <Download size={16} />
        <span className="hidden sm:inline">Install App</span>
      </Button>
    );
  }

  // Icon-only variant
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

  // Full banner variant (default)
  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl shadow-emerald-500/20">
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-slate-400 hover:text-white p-1"
        >
          <X size={16} />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone className="text-white" size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">Install SDM Rewards</h3>
            <p className="text-slate-400 text-xs mt-0.5 mb-3">
              {isIOS 
                ? 'Add to your home screen for quick access'
                : 'Get the app for a better experience'}
            </p>
            <Button
              onClick={handleInstallClick}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white h-9 text-sm"
            >
              <Download size={16} className="mr-2" />
              {isIOS ? 'How to Install' : 'Install Now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export a hook for programmatic access
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

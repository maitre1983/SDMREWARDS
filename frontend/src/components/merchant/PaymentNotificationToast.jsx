/**
 * PaymentNotificationToast Component
 * ===================================
 * Shows real-time payment notifications to merchants.
 * Includes sound alerts and visual notifications.
 */

import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { DollarSign, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { useSSENotifications } from '../../hooks/useSSENotifications';

// Simple notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVQGAAAAAABAAIAAwP//AABAAIAAwP//AABAAIAAwP//AABAAIAAwP//AABAAIAAwP//AABAAIAAwP//AABAAIAAwP//AABAAIAAwP//';

export default function PaymentNotificationToast({ token, onNotification }) {
  const audioRef = useRef(null);
  
  // Initialize audio on mount
  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play notification sound
  const playSound = () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => {
          // Browser may block autoplay, ignore silently
          console.debug('Could not play notification sound:', e.message);
        });
      }
    } catch (e) {
      console.debug('Audio play error:', e);
    }
  };

  // Handle payment received notification
  const handlePaymentReceived = (notification) => {
    const { title, message, data } = notification;
    
    // Play sound
    playSound();
    
    // Show toast notification
    toast.success(
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
          <DollarSign className="text-white" size={20} />
        </div>
        <div>
          <p className="font-bold text-emerald-400">{title || 'Payment Received!'}</p>
          <p className="text-slate-300 text-sm">{message}</p>
          {data?.cashback > 0 && (
            <p className="text-purple-400 text-xs mt-1">
              Cashback given: GHS {data.cashback.toFixed(2)}
            </p>
          )}
        </div>
      </div>,
      {
        duration: 8000,
        position: 'top-right',
        style: {
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid #10b981',
          borderRadius: '12px',
          padding: '16px',
        }
      }
    );
    
    // Notify parent component
    onNotification?.(notification);
  };

  // Handle connection status
  const handleConnected = () => {
    console.log('[Notification] SSE connected');
  };

  // Handle errors
  const handleError = (error) => {
    console.error('[Notification] SSE error:', error);
  };

  // Use SSE notifications hook
  const { isConnected, connectionState } = useSSENotifications({
    token,
    enabled: !!token,
    onPaymentReceived: handlePaymentReceived,
    onConnected: handleConnected,
    onError: handleError
  });

  // Connection indicator (small dot in corner)
  return (
    <div 
      className="fixed bottom-20 right-4 z-50"
      title={`Real-time notifications: ${connectionState}`}
    >
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
        isConnected 
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
          : connectionState === 'connecting'
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
          : 'bg-slate-700/50 text-slate-500 border border-slate-600'
      }`}>
        {isConnected ? (
          <>
            <Wifi size={12} />
            <span className="hidden sm:inline">Live</span>
          </>
        ) : connectionState === 'connecting' ? (
          <>
            <Wifi size={12} className="animate-pulse" />
            <span className="hidden sm:inline">Connecting...</span>
          </>
        ) : (
          <>
            <WifiOff size={12} />
            <span className="hidden sm:inline">Offline</span>
          </>
        )}
      </div>
    </div>
  );
}

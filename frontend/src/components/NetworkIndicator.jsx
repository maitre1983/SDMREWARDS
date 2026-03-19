/**
 * Network Status Indicator
 * Shows connection quality to users
 */
import React from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useNetwork } from '../hooks/useNetwork';

export default function NetworkIndicator({ showAlways = false }) {
  const { quality, pingTime, isOnline, isSlow } = useNetwork();

  // Only show when there's a problem (unless showAlways is true)
  if (!showAlways && quality === 'excellent') return null;
  if (!showAlways && quality === 'good') return null;

  const getIndicatorStyle = () => {
    switch (quality) {
      case 'excellent':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'good':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'slow':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'very_slow':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'offline':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getMessage = () => {
    switch (quality) {
      case 'excellent':
        return 'Excellent connection';
      case 'good':
        return 'Good connection';
      case 'slow':
        return 'Slow connection - Please wait';
      case 'very_slow':
        return 'Very slow connection';
      case 'offline':
        return 'No internet connection';
      default:
        return 'Checking connection...';
    }
  };

  const getIcon = () => {
    if (!isOnline) return <WifiOff size={14} />;
    if (isSlow) return <AlertTriangle size={14} />;
    return <Wifi size={14} />;
  };

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-1.5 px-4 text-xs font-medium border-b ${getIndicatorStyle()} backdrop-blur-sm transition-all duration-300`}
      style={{ animation: 'slideDown 0.3s ease-out' }}
    >
      <span className="flex items-center gap-2">
        {getIcon()}
        {getMessage()}
        {pingTime && quality !== 'offline' && (
          <span className="opacity-70">({Math.round(pingTime)}ms)</span>
        )}
      </span>
      
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

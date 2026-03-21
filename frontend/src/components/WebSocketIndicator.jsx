/**
 * SDM REWARDS - WebSocket Connection Indicator
 * =============================================
 * Shows real-time connection status in dashboard headers.
 */

import React, { memo } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

const WebSocketIndicator = memo(function WebSocketIndicator({ 
  isConnected, 
  connectionState,
  reconnectAttempt = 0,
  showLabel = false,
  className = ''
}) {
  // Determine status and styling
  const getStatus = () => {
    switch (connectionState) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          label: 'Live',
          animate: false
        };
      case 'connecting':
      case 'reconnecting':
        return {
          icon: Loader2,
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          label: reconnectAttempt > 0 ? `Reconnecting (${reconnectAttempt})` : 'Connecting',
          animate: true
        };
      case 'disconnected':
      case 'failed':
      default:
        return {
          icon: WifiOff,
          color: 'text-slate-500',
          bgColor: 'bg-slate-500/10',
          label: 'Offline',
          animate: false
        };
    }
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <div 
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${status.bgColor} ${className}`}
      title={`Real-time sync: ${status.label}`}
    >
      <Icon 
        size={14} 
        className={`${status.color} ${status.animate ? 'animate-spin' : ''}`} 
      />
      {showLabel && (
        <span className={`text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      )}
      {/* Pulse animation for connected state */}
      {isConnected && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      )}
    </div>
  );
});

export default WebSocketIndicator;

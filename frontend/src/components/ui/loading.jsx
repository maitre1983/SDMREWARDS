import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Lightweight loading component for SDM REWARDS
 * Optimized for low-bandwidth connections
 */

export function LoadingSpinner({ size = 24, className = '' }) {
  return (
    <Loader2 
      className={`animate-spin text-amber-500 ${className}`} 
      size={size} 
    />
  );
}

export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50">
      <LoadingSpinner size={40} />
      <p className="mt-4 text-slate-400 text-sm">{message}</p>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="bg-slate-800 rounded-lg p-4 animate-pulse">
      <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-slate-700 rounded w-1/2"></div>
    </div>
  );
}

export function LoadingList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}

export function LoadingSkeleton({ className = '', height = 'h-4' }) {
  return (
    <div className={`bg-slate-700 rounded animate-pulse ${height} ${className}`}></div>
  );
}

// Inline loading indicator for buttons
export function ButtonLoading({ children, isLoading, className = '' }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      {isLoading && <LoadingSpinner size={16} />}
      {children}
    </span>
  );
}

export default {
  LoadingSpinner,
  LoadingScreen,
  LoadingCard,
  LoadingList,
  LoadingSkeleton,
  ButtonLoading
};

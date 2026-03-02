import React, { useRef, useEffect, useState } from 'react';
import { Input } from './ui/input';
import { Loader2, Smartphone } from 'lucide-react';

/**
 * OTP Input Component with Web OTP API support
 * 
 * Features:
 * - Auto-fills OTP from SMS on supported browsers (Chrome Android)
 * - Fallback to manual input on unsupported browsers
 * - Shows status indicator for Web OTP API support
 * - Auto-submits form when OTP is received
 */
export default function OTPInput({ 
  value, 
  onChange, 
  onAutoFill,
  length = 4, 
  placeholder = "Enter code",
  className = "",
  autoFocus = true,
  disabled = false,
  testId = "otp-input"
}) {
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [webOTPSupported, setWebOTPSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Check Web OTP API support
  useEffect(() => {
    const isSupported = 'OTPCredential' in window;
    setWebOTPSupported(isSupported);
    
    if (isSupported) {
      console.log('[OTPInput] Web OTP API is supported');
    } else {
      console.log('[OTPInput] Web OTP API not supported - manual input required');
    }
  }, []);

  // Start listening for OTP when component mounts
  useEffect(() => {
    if (!webOTPSupported || disabled) return;

    const startOTPListener = async () => {
      // Create abort controller for cleanup
      abortControllerRef.current = new AbortController();
      
      try {
        setIsListening(true);
        console.log('[OTPInput] Starting Web OTP listener...');
        
        const content = await navigator.credentials.get({
          otp: { transport: ['sms'] },
          signal: abortControllerRef.current.signal
        });

        if (content && content.code) {
          console.log('[OTPInput] OTP received via Web OTP API');
          
          // Update input value
          onChange({ target: { value: content.code } });
          
          // Notify parent component for auto-submit
          if (onAutoFill) {
            onAutoFill(content.code);
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('[OTPInput] OTP listener aborted');
        } else {
          console.log('[OTPInput] Web OTP error:', error.message);
        }
      } finally {
        setIsListening(false);
      }
    };

    startOTPListener();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [webOTPSupported, disabled, onChange, onAutoFill]);

  // Focus input on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern={`\\d{${length}}`}
        autoComplete="one-time-code"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={length}
        disabled={disabled}
        className={`h-14 bg-slate-800/50 border-slate-700 text-white rounded-xl text-center text-2xl tracking-[0.5em] font-mono ${className}`}
        data-testid={testId}
      />
      
      {/* Web OTP Status Indicator */}
      {webOTPSupported && isListening && (
        <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-2 text-xs text-cyan-400">
          <Smartphone size={14} className="animate-pulse" />
          <span>Waiting for SMS...</span>
        </div>
      )}
      
      {/* Auto-fill hint for supported browsers */}
      {webOTPSupported && !isListening && !value && (
        <p className="text-xs text-slate-500 text-center mt-2">
          Code will auto-fill when SMS arrives
        </p>
      )}
    </div>
  );
}

/**
 * Simple OTP Display for showing the code with individual digit boxes
 */
export function OTPDisplay({ code, length = 4 }) {
  const digits = code.padEnd(length, ' ').split('');
  
  return (
    <div className="flex justify-center gap-3">
      {digits.map((digit, index) => (
        <div
          key={index}
          className="w-12 h-14 flex items-center justify-center bg-slate-800/50 border border-slate-700 rounded-xl text-2xl font-mono text-white"
        >
          {digit !== ' ' ? digit : ''}
        </div>
      ))}
    </div>
  );
}

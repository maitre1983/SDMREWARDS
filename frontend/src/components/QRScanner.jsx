import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, FlipHorizontal, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

export default function QRScanner({ onScan, onClose, scanTitle = "Scan QR Code", scanHint = "Position the QR code within the frame" }) {
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' = back camera
  const html5QrCodeRef = useRef(null);

  // Extract merchant QR code from various formats
  const extractQRCode = (decodedText) => {
    let qrCode = decodedText;
    
    // Handle URL format: https://xxx/pay/SDM-M-XXXX
    if (decodedText.includes('/pay/')) {
      const match = decodedText.match(/\/pay\/([A-Z0-9-]+)/i);
      if (match) {
        qrCode = match[1];
      }
    }
    // Handle SDM: prefix format
    else if (decodedText.startsWith('SDM:')) {
      qrCode = decodedText.replace('SDM:', '');
    }
    // Handle full URL with ref parameter
    else if (decodedText.includes('ref=')) {
      const url = new URL(decodedText);
      qrCode = url.searchParams.get('ref') || decodedText;
    }
    
    return qrCode;
  };

  const startScanner = async () => {
    setError(null);
    setIsScanning(true);

    try {
      // Initialize scanner
      html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCodeRef.current.start(
        { facingMode },
        config,
        (decodedText) => {
          // Extract QR code from decoded text
          const qrCode = extractQRCode(decodedText);
          console.log('QR Scanned:', decodedText, '→ Extracted:', qrCode);
          
          // Stop scanner and return result
          stopScanner();
          onScan(qrCode);
        },
        (errorMessage) => {
          // Ignore scan errors (no QR found), only log
        }
      );
    } catch (err) {
      console.error('Scanner error:', err);
      setError(err.message || 'Unable to access camera. Please check permissions.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const switchCamera = async () => {
    await stopScanner();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  useEffect(() => {
    startScanner();
    
    return () => {
      stopScanner();
    };
  }, [facingMode]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black" data-testid="qr-scanner-modal">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Camera size={20} />
            {scanTitle}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            data-testid="close-scanner-btn"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Scanner Area */}
      <div className="flex items-center justify-center h-full">
        <div className="relative">
          {/* QR Reader Container */}
          <div 
            id="qr-reader" 
            ref={scannerRef}
            className="w-[320px] h-[320px] overflow-hidden rounded-2xl"
          />
          
          {/* Scanning Frame Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-4 border-cyan-400 rounded-2xl animate-pulse" />
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-cyan-400 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-cyan-400 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-cyan-400 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-cyan-400 rounded-br-2xl" />
              {/* Scan line animation */}
              <div className="absolute left-4 right-4 h-0.5 bg-cyan-400 animate-scan" />
            </div>
          )}
          
          {/* Loading State */}
          {!isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-2xl">
              <Loader2 className="animate-spin text-cyan-400" size={40} />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 rounded-2xl p-6 text-center">
              <Camera size={48} className="text-slate-500 mb-4" />
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <Button
                onClick={startScanner}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-900"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
        <div className="max-w-lg mx-auto">
          <p className="text-center text-white/60 text-sm mb-4">
            {scanHint}
          </p>
          <div className="flex justify-center gap-4">
            <Button
              onClick={switchCamera}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              data-testid="switch-camera-btn"
            >
              <FlipHorizontal size={18} className="mr-2" />
              Switch Camera
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Custom CSS for scan animation */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 85%; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        #qr-reader video {
          border-radius: 16px;
          object-fit: cover;
        }
        #qr-reader__dashboard {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

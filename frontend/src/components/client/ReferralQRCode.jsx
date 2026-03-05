import React, { useRef, useState } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import { 
  Download, Share2, Copy, Phone, Mail, MessageSquare,
  Users, QrCode, ExternalLink, Check
} from 'lucide-react';
import { Button } from '../ui/button';

export default function ReferralQRCode({ referralCode, clientName }) {
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // Generate the referral URL that will be encoded in the QR code
  const referralUrl = `${window.location.origin}/client?ref=${referralCode}`;

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success('Code copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralUrl);
    toast.success('Lien copié !');
  };

  const downloadQRCode = () => {
    // Create a canvas from the QR code
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 400;
    const padding = 40;
    
    canvas.width = size + padding * 2;
    canvas.height = size + padding * 2 + 80; // Extra space for text

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw SDM logo text
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SDM REWARDS', canvas.width / 2, 30);

    // Get the QR code SVG and draw it
    const svgElement = qrRef.current?.querySelector('svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, padding, padding + 10, size, size);
        
        // Draw referral code text below
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`Code: ${referralCode}`, canvas.width / 2, size + padding + 50);
        
        ctx.font = '14px Arial';
        ctx.fillStyle = '#6b7280';
        ctx.fillText('Scannez pour rejoindre SDM', canvas.width / 2, size + padding + 75);

        // Download
        const link = document.createElement('a');
        link.download = `SDM-Referral-${referralCode}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('QR Code téléchargé !');
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const shareVia = (platform) => {
    const message = `Rejoins SDM REWARDS et gagne du cashback sur tous tes achats ! Utilise mon code: ${referralCode}`;
    const fullMessage = `${message}\n\nInscris-toi ici: ${referralUrl}`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(fullMessage)}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent('Rejoins SDM REWARDS !')}&body=${encodeURIComponent(fullMessage)}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'native':
        if (navigator.share) {
          navigator.share({
            title: 'SDM REWARDS - Code de parrainage',
            text: message,
            url: referralUrl
          }).catch(() => {});
        } else {
          copyReferralLink();
        }
        break;
      default:
        copyReferralLink();
    }
  };

  return (
    <div className="space-y-6">
      {/* QR Code Display */}
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <QrCode className="text-purple-400" size={24} />
            <h3 className="text-white font-semibold text-lg">Votre QR Code de Parrainage</h3>
          </div>
          <p className="text-slate-400 text-sm">
            Faites scanner ce code pour parrainer vos amis
          </p>
        </div>

        {/* QR Code */}
        <div 
          ref={qrRef}
          className="bg-white rounded-xl p-4 mx-auto w-fit shadow-lg"
        >
          <QRCodeSVG 
            value={referralUrl}
            size={180}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: "/sdm-logo.png",
              height: 40,
              width: 40,
              excavate: true
            }}
          />
        </div>

        {/* Referral Code Text */}
        <div className="mt-4 text-center">
          <p className="text-slate-400 text-sm mb-1">Code de parrainage</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-2xl font-bold text-white font-mono tracking-wider">
              {referralCode}
            </p>
            <button 
              onClick={copyReferralCode}
              className={`p-2 rounded-lg transition-all ${
                copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <p className="text-emerald-400 text-sm mt-2">
            Gagnez GHS 3 pour chaque ami qui rejoint !
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={downloadQRCode}
            className="flex-1 bg-purple-500 hover:bg-purple-600"
            data-testid="download-qr-btn"
          >
            <Download size={18} className="mr-2" />
            Télécharger
          </Button>
          <Button
            onClick={() => shareVia('native')}
            variant="outline"
            className="flex-1 border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            data-testid="share-qr-btn"
          >
            <Share2 size={18} className="mr-2" />
            Partager
          </Button>
        </div>
      </div>

      {/* Share Options */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Share2 size={18} /> Partagez votre code
        </h3>
        <div className="grid grid-cols-5 gap-3">
          <button
            onClick={() => shareVia('whatsapp')}
            className="flex flex-col items-center gap-2 p-3 bg-emerald-500/10 rounded-xl hover:bg-emerald-500/20 transition-colors"
            data-testid="share-whatsapp"
          >
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
              <Phone size={20} className="text-white" />
            </div>
            <span className="text-slate-300 text-xs">WhatsApp</span>
          </button>
          
          <button
            onClick={() => shareVia('sms')}
            className="flex flex-col items-center gap-2 p-3 bg-blue-500/10 rounded-xl hover:bg-blue-500/20 transition-colors"
            data-testid="share-sms"
          >
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <MessageSquare size={20} className="text-white" />
            </div>
            <span className="text-slate-300 text-xs">SMS</span>
          </button>
          
          <button
            onClick={() => shareVia('email')}
            className="flex flex-col items-center gap-2 p-3 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors"
            data-testid="share-email"
          >
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
              <Mail size={20} className="text-white" />
            </div>
            <span className="text-slate-300 text-xs">Email</span>
          </button>
          
          <button
            onClick={() => shareVia('telegram')}
            className="flex flex-col items-center gap-2 p-3 bg-sky-500/10 rounded-xl hover:bg-sky-500/20 transition-colors"
            data-testid="share-telegram"
          >
            <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center">
              <ExternalLink size={20} className="text-white" />
            </div>
            <span className="text-slate-300 text-xs">Telegram</span>
          </button>
          
          <button
            onClick={copyReferralLink}
            className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors"
            data-testid="copy-link"
          >
            <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
              <Copy size={20} className="text-white" />
            </div>
            <span className="text-slate-300 text-xs">Copier</span>
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h4 className="text-white font-medium mb-3">Comment ça marche ?</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <p className="text-slate-300">Partagez votre QR Code ou lien avec vos amis</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <p className="text-slate-300">Ils scannent le code ou cliquent sur le lien</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <p className="text-slate-300">Ils s'inscrivent avec votre code pré-rempli</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
            <p className="text-slate-300">Vous recevez GHS 3 quand ils achètent une carte !</p>
          </div>
        </div>
      </div>
    </div>
  );
}

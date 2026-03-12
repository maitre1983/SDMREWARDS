import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { QRCodeSVG } from 'qrcode.react';
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Mail,
  Send,
  Smartphone,
  Users,
  Gift,
  Crown,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Loader2,
  Award,
  TrendingUp,
  X
} from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function ReferralShare({ clientToken, language = 'en', onClose }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const t = {
    en: {
      title: 'Invite Friends',
      subtitle: 'Earn rewards for every friend who joins',
      yourCode: 'Your Referral Code',
      yourLink: 'Your Referral Link',
      copy: 'Copy',
      copied: 'Copied!',
      shareVia: 'Share Via',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
      email: 'Email',
      telegram: 'Telegram',
      showQR: 'Show QR Code',
      hideQR: 'Hide QR Code',
      stats: 'Your Stats',
      invited: 'Friends Invited',
      earned: 'Total Earned',
      ambassador: 'Ambassador Status',
      progress: 'Progress to Ambassador',
      benefits: 'Ambassador Benefits',
      referralsNeeded: 'referrals needed',
      youAreAmbassador: "You're an Ambassador!",
      shareMessage: 'Share message'
    },
    fr: {
      title: 'Inviter des Amis',
      subtitle: 'Gagnez des récompenses pour chaque ami qui rejoint',
      yourCode: 'Votre Code de Parrainage',
      yourLink: 'Votre Lien de Parrainage',
      copy: 'Copier',
      copied: 'Copié!',
      shareVia: 'Partager Via',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
      email: 'Email',
      telegram: 'Telegram',
      showQR: 'Afficher QR Code',
      hideQR: 'Masquer QR Code',
      stats: 'Vos Stats',
      invited: 'Amis Invités',
      earned: 'Total Gagné',
      ambassador: 'Statut Ambassadeur',
      progress: 'Progression vers Ambassadeur',
      benefits: 'Avantages Ambassadeur',
      referralsNeeded: 'parrainages requis',
      youAreAmbassador: 'Vous êtes Ambassadeur!',
      shareMessage: 'Message de partage'
    }
  };

  const text = t[language] || t.en;

  useEffect(() => {
    loadReferralData();
  }, [clientToken]);

  const loadReferralData = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/growth/referral/prompt?language=${language}`, {
        headers: { Authorization: `Bearer ${clientToken}` }
      });
      setData(response.data);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success(t[language]?.copied || 'Copied!');
      setTimeout(() => setCopied(false), 2000);
      trackShare('copy');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const trackShare = async (platform) => {
    try {
      await axios.post(
        `${API_URL}/api/growth/referral/track-share`,
        { platform, success: true },
        { headers: { Authorization: `Bearer ${clientToken}` } }
      );
    } catch (error) {
      console.error('Failed to track share:', error);
    }
  };

  const shareWhatsApp = () => {
    const message = encodeURIComponent(data?.messages?.whatsapp || '');
    const url = `https://wa.me/?text=${message}%20${encodeURIComponent(data?.referral_link || '')}`;
    window.open(url, '_blank');
    trackShare('whatsapp');
  };

  const shareSMS = () => {
    const message = encodeURIComponent(`${data?.messages?.sms || ''} ${data?.referral_link || ''}`);
    window.open(`sms:?body=${message}`, '_blank');
    trackShare('sms');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(data?.messages?.email_subject || 'Join SDM REWARDS');
    const body = encodeURIComponent(`${data?.messages?.email_body || ''}\n\n${data?.referral_link || ''}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    trackShare('email');
  };

  const shareTelegram = () => {
    const message = encodeURIComponent(`${data?.messages?.telegram || ''} ${data?.referral_link || ''}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(data?.referral_link || '')}&text=${message}`, '_blank');
    trackShare('telegram');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Share2 className="w-12 h-12 text-amber-400 animate-pulse" />
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  const ambassador = data?.ambassador_status || {};

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/20 to-green-500/20 rounded-xl p-4 border border-amber-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-green-500 flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{text.title}</h2>
              <p className="text-sm text-slate-400">{text.subtitle}</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Referral Code & Link */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 space-y-3">
        {/* Code */}
        <div>
          <label className="text-xs text-slate-500 mb-1 block">{text.yourCode}</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-900 rounded-lg px-4 py-3 font-mono text-xl text-amber-400 text-center tracking-wider">
              {data?.referral_code || '------'}
            </div>
            <Button
              onClick={() => copyToClipboard(data?.referral_code, 'code')}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4"
            >
              {copied === 'code' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Link */}
        <div>
          <label className="text-xs text-slate-500 mb-1 block">{text.yourLink}</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-900 rounded-lg px-3 py-2 text-sm text-slate-300 truncate">
              {data?.referral_link || 'https://sdmrewards.com/join?ref=...'}
            </div>
            <Button
              onClick={() => copyToClipboard(data?.referral_link, 'link')}
              variant="outline"
              className="border-slate-700 text-slate-300 px-4"
            >
              {copied === 'link' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* QR Code Toggle */}
        <Button
          onClick={() => setShowQR(!showQR)}
          variant="outline"
          className="w-full border-slate-700 text-slate-300"
        >
          {showQR ? text.hideQR : text.showQR}
        </Button>

        {showQR && data?.referral_link && (
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCodeSVG value={data.referral_link} size={180} />
          </div>
        )}
      </div>

      {/* Share Buttons */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <h3 className="text-white font-medium mb-3">{text.shareVia}</h3>
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={shareWhatsApp}
            className="flex flex-col items-center gap-2 p-3 bg-green-500/20 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            <MessageCircle className="w-6 h-6 text-green-400" />
            <span className="text-xs text-green-400">{text.whatsapp}</span>
          </button>
          
          <button
            onClick={shareSMS}
            className="flex flex-col items-center gap-2 p-3 bg-blue-500/20 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            <Smartphone className="w-6 h-6 text-blue-400" />
            <span className="text-xs text-blue-400">{text.sms}</span>
          </button>
          
          <button
            onClick={shareEmail}
            className="flex flex-col items-center gap-2 p-3 bg-purple-500/20 rounded-lg hover:bg-purple-500/30 transition-colors"
          >
            <Mail className="w-6 h-6 text-purple-400" />
            <span className="text-xs text-purple-400">{text.email}</span>
          </button>
          
          <button
            onClick={shareTelegram}
            className="flex flex-col items-center gap-2 p-3 bg-sky-500/20 rounded-lg hover:bg-sky-500/30 transition-colors"
          >
            <Send className="w-6 h-6 text-sky-400" />
            <span className="text-xs text-sky-400">{text.telegram}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <h3 className="text-white font-medium mb-3">{text.stats}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <Users className="w-6 h-6 text-amber-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{data?.referral_count || 0}</p>
            <p className="text-xs text-slate-500">{text.invited}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <Gift className="w-6 h-6 text-green-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-400">GHS {data?.total_earnings?.toFixed(2) || '0.00'}</p>
            <p className="text-xs text-slate-500">{text.earned}</p>
          </div>
        </div>
      </div>

      {/* Ambassador Status */}
      <div className={`rounded-xl border p-4 ${
        ambassador.is_ambassador 
          ? 'bg-gradient-to-r from-amber-500/20 to-purple-500/20 border-amber-500/30'
          : 'bg-slate-800/50 border-slate-700/50'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            ambassador.is_ambassador ? 'bg-amber-500/30' : 'bg-slate-700'
          }`}>
            <Crown className={`w-5 h-5 ${ambassador.is_ambassador ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium">{text.ambassador}</h3>
            {ambassador.is_ambassador ? (
              <p className="text-sm text-amber-400">{text.youAreAmbassador}</p>
            ) : (
              <p className="text-sm text-slate-400">
                {ambassador.referrals_needed} {text.referralsNeeded}
              </p>
            )}
          </div>
        </div>

        {!ambassador.is_ambassador && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{text.progress}</span>
              <span>{ambassador.referral_count}/{ambassador.threshold}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${ambassador.progress || 0}%` }}
              />
            </div>
          </div>
        )}

        {ambassador.is_ambassador && ambassador.benefits?.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-400">{text.benefits}:</p>
            {ambassador.benefits.slice(0, 3).map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                {benefit}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

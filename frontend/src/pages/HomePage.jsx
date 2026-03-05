import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import {
  Wallet,
  Users,
  Store,
  Shield,
  CreditCard,
  QrCode,
  Gift,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Globe,
  Clock,
  Star,
  Sparkles,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  Zap,
  Heart,
  Award,
  BadgeCheck,
  Share2,
  Facebook,
  Twitter,
  MessageCircle
} from 'lucide-react';

// SDM Logo URL - Stored externally
const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

// AI Generated Images
const IMAGES = {
  heroCustomer: "https://static.prod-images.emergentagent.com/jobs/2b0d7634-108c-4eb1-b22d-82f976c95531/images/3bc26256f284229dfbc342c0efeb60357d57a98a41b6c8197e35fdde94cfe5a7.png",
  paymentScene: "https://static.prod-images.emergentagent.com/jobs/2b0d7634-108c-4eb1-b22d-82f976c95531/images/3633d37a7a9cfe2587ac3913dff44d1f729eb7b9fb65b87e6f6277418d72f94f.png",
  entrepreneurs: "https://static.prod-images.emergentagent.com/jobs/2b0d7634-108c-4eb1-b22d-82f976c95531/images/09414d93e545e492689c931b237901f59acb69158ea892835163b1339e46a235.png",
  merchantShop: "https://static.prod-images.emergentagent.com/jobs/2b0d7634-108c-4eb1-b22d-82f976c95531/images/32b7932b2b95d080215c94d6e723c4ac047a31a96f0074ba3ffa8a0bfa43dcf6.png"
};

// Payment Logos
const PAYMENT_LOGOS = {
  visa: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png",
  mastercard: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png",
  mtn: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.svg/200px-New-mtn-logo.svg.png",
  vodafone: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Vodafone_icon.svg/200px-Vodafone_icon.svg.png",
};

export default function HomePage() {
  const navigate = useNavigate();
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch card types from API
  const [cardTypes, setCardTypes] = useState([]);
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/public/card-types`);
        const data = await res.json();
        setCardTypes(data.card_types || []);
      } catch (error) {
        console.error('Error fetching card types:', error);
      }
    };
    fetchCards();
  }, []);

  // Stats counter animation
  const [stats, setStats] = useState({ members: 0, merchants: 0, cashback: 0 });
  useEffect(() => {
    const targets = { members: 2500, merchants: 150, cashback: 45000 };
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setStats({
        members: Math.floor((targets.members / steps) * step),
        merchants: Math.floor((targets.merchants / steps) * step),
        cashback: Math.floor((targets.cashback / steps) * step)
      });
      if (step >= steps) clearInterval(timer);
    }, interval);
    
    return () => clearInterval(timer);
  }, []);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  // Social sharing functions
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sdmrewards.com';
  const shareText = language === 'fr' 
    ? 'Rejoignez SDM Rewards et gagnez du cashback sur chaque achat ! 🎁💰'
    : 'Join SDM Rewards and earn cashback on every purchase! 🎁💰';

  const handleShare = (platform) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    
    const shareLinks = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
    };
    
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* SEO Meta Tags would be in index.html */}
      
      {/* ============== NAVIGATION ============== */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-slate-900/95 backdrop-blur-lg shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('hero')}>
              <img src={SDM_LOGO_URL} alt="SDM Rewards" className="h-12 w-12 object-contain rounded-lg" />
              <span className="font-bold text-xl hidden sm:block">SDM Rewards</span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-slate-300 hover:text-white transition-colors">{t('nav_about')}</button>
              <button onClick={() => scrollToSection('cards')} className="text-slate-300 hover:text-white transition-colors">{t('nav_cards')}</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-slate-300 hover:text-white transition-colors">{t('nav_how_it_works')}</button>
              <button onClick={() => scrollToSection('merchants-section')} className="text-slate-300 hover:text-white transition-colors">{t('nav_partners')}</button>
            </div>
            
            {/* Language & CTA */}
            <div className="hidden lg:flex items-center gap-4">
              {/* Language Switcher */}
              <div className="flex items-center gap-2 bg-slate-800/50 rounded-full px-3 py-1">
                {availableLanguages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`px-2 py-1 rounded-full text-sm transition-colors ${
                      language === lang.code ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang.flag}
                  </button>
                ))}
              </div>
              
              <Button variant="ghost" onClick={() => navigate('/client')} className="text-white">
                {t('nav_login')}
              </Button>
              <Button onClick={() => navigate('/client')} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                {t('nav_get_started')}
              </Button>
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-white p-2"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 p-4">
            <div className="flex flex-col gap-4">
              <button onClick={() => scrollToSection('features')} className="text-left py-2 text-slate-300">{t('nav_about')}</button>
              <button onClick={() => scrollToSection('cards')} className="text-left py-2 text-slate-300">{t('nav_cards')}</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-left py-2 text-slate-300">{t('nav_how_it_works')}</button>
              <button onClick={() => scrollToSection('merchants-section')} className="text-left py-2 text-slate-300">{t('nav_partners')}</button>
              <div className="flex gap-2 py-2">
                {availableLanguages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`px-3 py-1 rounded-full ${language === lang.code ? 'bg-amber-500' : 'bg-slate-800'}`}
                  >
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
              <Button onClick={() => navigate('/client')} className="w-full bg-amber-500 hover:bg-amber-600">
                {t('nav_get_started')}
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* ============== HERO SECTION ============== */}
      <section id="hero" className="relative min-h-screen flex items-center pt-20">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          <div className="absolute top-0 right-0 w-1/2 h-full">
            <img 
              src={IMAGES.heroCustomer} 
              alt="Happy SDM customer" 
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent" />
          </div>
          {/* Animated particles */}
          <div className="absolute inset-0 opacity-20">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-amber-400 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 4}s`
                }}
              />
            ))}
          </div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-full px-4 py-2 mb-6">
                <Sparkles className="text-amber-400" size={16} />
                <span className="text-amber-400 text-sm font-medium">{t('hero_tagline')}</span>
              </div>
              
              {/* Main Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                {t('hero_title').split(' ').slice(0, 2).join(' ')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                  {t('hero_title').split(' ').slice(2).join(' ')}
                </span>
              </h1>
              
              {/* Subtitle */}
              <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto lg:mx-0">
                {t('hero_subtitle')}
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
                <Button
                  onClick={() => navigate('/client')}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-6 text-lg rounded-xl"
                  data-testid="hero-cta-client"
                >
                  <Users className="mr-2" size={20} />
                  {t('hero_cta_client')}
                </Button>
                <Button
                  onClick={() => navigate('/merchant')}
                  variant="outline"
                  className="border-2 border-amber-500/50 text-white hover:bg-amber-500/10 px-8 py-6 text-lg rounded-xl"
                  data-testid="hero-cta-merchant"
                >
                  <Store className="mr-2" size={20} />
                  {t('hero_cta_merchant')}
                </Button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0">
                <div className="text-center p-4 bg-slate-800/50 rounded-xl backdrop-blur-sm">
                  <p className="text-2xl sm:text-3xl font-bold text-amber-400">{stats.members.toLocaleString()}+</p>
                  <p className="text-slate-400 text-sm">{t('hero_stats_members')}</p>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-xl backdrop-blur-sm">
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-400">{stats.merchants}+</p>
                  <p className="text-slate-400 text-sm">{t('hero_stats_merchants')}</p>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-xl backdrop-blur-sm">
                  <p className="text-2xl sm:text-3xl font-bold text-purple-400">GHS {(stats.cashback / 1000).toFixed(0)}K+</p>
                  <p className="text-slate-400 text-sm">{t('hero_stats_cashback')}</p>
                </div>
              </div>
            </div>
            
            {/* Hero Image - Mobile */}
            <div className="hidden lg:block relative">
              <div className="relative">
                <img 
                  src={IMAGES.heroCustomer} 
                  alt="Happy SDM customer"
                  className="w-full rounded-2xl shadow-2xl"
                />
                {/* Floating card */}
                <div className="absolute -bottom-6 -left-6 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                      <Wallet className="text-white" size={24} />
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">{t('cashback_balance')}</p>
                      <p className="text-white font-bold text-xl">GHS 125.50</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight className="rotate-90 text-slate-500" size={32} />
        </div>
      </section>

      {/* ============== VALUE PROPOSITION ============== */}
      <section id="features" className="py-20 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('value_title')}</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">{t('value_subtitle')}</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: t('value_instant'), desc: t('value_instant_desc'), color: 'amber' },
              { icon: Globe, title: t('value_partners'), desc: t('value_partners_desc'), color: 'emerald' },
              { icon: Gift, title: t('value_referral'), desc: t('value_referral_desc'), color: 'purple' },
              { icon: Shield, title: t('value_secure'), desc: t('value_secure_desc'), color: 'blue' },
              { icon: QrCode, title: t('value_easy'), desc: t('value_easy_desc'), color: 'pink' },
              { icon: Clock, title: t('value_support'), desc: t('value_support_desc'), color: 'teal' }
            ].map((item, idx) => (
              <div 
                key={idx}
                className="group bg-slate-900/50 border border-slate-700 rounded-2xl p-6 hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 bg-${item.color}-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <item.icon className={`text-${item.color}-400`} size={28} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== MEMBERSHIP CARDS ============== */}
      <section id="cards" className="py-20 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('cards_title')}</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">{t('cards_subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Silver Card */}
            <div className="relative bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-3xl overflow-hidden hover:border-slate-500 transition-all group">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-slate-400 to-slate-300" />
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold">{t('card_silver_name')}</h3>
                    <p className="text-3xl font-bold text-slate-300 mt-2">
                      {cardTypes.find(c => c.slug === 'silver')?.price 
                        ? `GHS ${cardTypes.find(c => c.slug === 'silver')?.price}` 
                        : t('card_silver_price')}
                    </p>
                    <p className="text-slate-400 text-sm mt-1 flex items-center gap-1">
                      <Clock size={14} />
                      {cardTypes.find(c => c.slug === 'silver')?.duration_label || '1 an'}
                    </p>
                  </div>
                  <img src={SDM_LOGO_URL} alt="SDM" className="w-16 h-16 object-contain opacity-50" />
                </div>
                <ul className="space-y-3 mb-8">
                  {[t('card_silver_benefit1'), t('card_silver_benefit2'), t('card_silver_benefit3'), t('card_silver_benefit4'), t('card_silver_benefit5')].map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="text-slate-400 shrink-0 mt-0.5" size={18} />
                      <span className="text-slate-300 text-sm">{b}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => navigate('/client')}
                  className="w-full bg-slate-600 hover:bg-slate-500 py-6"
                >
                  {t('card_cta')} <ArrowRight className="ml-2" size={18} />
                </Button>
              </div>
            </div>
            
            {/* Gold Card - Popular */}
            <div className="relative bg-gradient-to-br from-amber-900/50 to-amber-950/50 border-2 border-amber-500/50 rounded-3xl overflow-hidden transform lg:-translate-y-4 shadow-xl shadow-amber-500/10">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 to-yellow-500" />
              <div className="absolute top-4 right-4">
                <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">{t('card_popular')}</span>
              </div>
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-amber-300">{t('card_gold_name')}</h3>
                    <p className="text-3xl font-bold text-amber-400 mt-2">
                      {cardTypes.find(c => c.slug === 'gold')?.price 
                        ? `GHS ${cardTypes.find(c => c.slug === 'gold')?.price}` 
                        : t('card_gold_price')}
                    </p>
                    <p className="text-amber-300/70 text-sm mt-1 flex items-center gap-1">
                      <Clock size={14} />
                      {cardTypes.find(c => c.slug === 'gold')?.duration_label || '1 an'}
                    </p>
                  </div>
                  <img src={SDM_LOGO_URL} alt="SDM" className="w-16 h-16 object-contain" />
                </div>
                <ul className="space-y-3 mb-8">
                  {[t('card_gold_benefit1'), t('card_gold_benefit2'), t('card_gold_benefit3'), t('card_gold_benefit4'), t('card_gold_benefit5'), t('card_gold_benefit6')].map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                      <span className="text-slate-200 text-sm">{b}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => navigate('/client')}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 py-6"
                >
                  {t('card_cta')} <ArrowRight className="ml-2" size={18} />
                </Button>
              </div>
            </div>
            
            {/* Platinum Card */}
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-500 rounded-3xl overflow-hidden hover:border-slate-400 transition-all">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-slate-300 to-white" />
              <div className="absolute top-4 right-4">
                <span className="bg-slate-500 text-white text-xs font-bold px-3 py-1 rounded-full">{t('card_premium')}</span>
              </div>
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold">{t('card_platinum_name')}</h3>
                    <p className="text-3xl font-bold text-slate-200 mt-2">
                      {cardTypes.find(c => c.slug === 'platinum')?.price 
                        ? `GHS ${cardTypes.find(c => c.slug === 'platinum')?.price}` 
                        : t('card_platinum_price')}
                    </p>
                    <p className="text-slate-400 text-sm mt-1 flex items-center gap-1">
                      <Clock size={14} />
                      {cardTypes.find(c => c.slug === 'platinum')?.duration_label || '2 ans'}
                    </p>
                  </div>
                  <img src={SDM_LOGO_URL} alt="SDM" className="w-16 h-16 object-contain opacity-70" />
                </div>
                <ul className="space-y-3 mb-8">
                  {[t('card_platinum_benefit1'), t('card_platinum_benefit2'), t('card_platinum_benefit3'), t('card_platinum_benefit4'), t('card_platinum_benefit5'), t('card_platinum_benefit6'), t('card_platinum_benefit7')].map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="text-slate-300 shrink-0 mt-0.5" size={18} />
                      <span className="text-slate-300 text-sm">{b}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => navigate('/client')}
                  className="w-full bg-slate-700 hover:bg-slate-600 py-6"
                >
                  {t('card_cta')} <ArrowRight className="ml-2" size={18} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== HOW IT WORKS ============== */}
      <section id="how-it-works" className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('how_title')}</h2>
            <p className="text-slate-400 text-lg">{t('how_subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 1, icon: CreditCard, title: t('how_step1_title'), desc: t('how_step1_desc') },
              { step: 2, icon: QrCode, title: t('how_step2_title'), desc: t('how_step2_desc') },
              { step: 3, icon: Wallet, title: t('how_step3_title'), desc: t('how_step3_desc') }
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center relative z-10">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                    {item.step}
                  </div>
                  <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 mt-4">
                    <item.icon className="text-amber-400" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-1/2 left-full w-full h-0.5 bg-gradient-to-r from-amber-500 to-transparent -translate-y-1/2 z-0" style={{ width: '50%', left: '100%' }} />
                )}
              </div>
            ))}
          </div>
          
          {/* Payment Scene Image */}
          <div className="mt-16 max-w-4xl mx-auto">
            <img 
              src={IMAGES.paymentScene} 
              alt="Customer making QR payment"
              className="w-full rounded-2xl shadow-2xl border border-slate-700"
            />
          </div>
        </div>
      </section>

      {/* ============== FOR MERCHANTS ============== */}
      <section id="merchants-section" className="py-20 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('merchants_title')}</h2>
              <p className="text-slate-400 text-lg mb-8">{t('merchants_subtitle')}</p>
              
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {[
                  { icon: Users, title: t('merchants_benefit1'), desc: t('merchants_benefit1_desc') },
                  { icon: TrendingUp, title: t('merchants_benefit2'), desc: t('merchants_benefit2_desc') },
                  { icon: Heart, title: t('merchants_benefit3'), desc: t('merchants_benefit3_desc') },
                  { icon: Star, title: t('merchants_benefit4'), desc: t('merchants_benefit4_desc') },
                  { icon: Award, title: t('merchants_benefit5'), desc: t('merchants_benefit5_desc') },
                  { icon: Zap, title: t('merchants_benefit6'), desc: t('merchants_benefit6_desc') }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <item.icon className="text-emerald-400" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                      <p className="text-slate-400 text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Testimonial */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="text-amber-400 fill-amber-400" size={16} />)}
                </div>
                <p className="text-slate-300 italic mb-4">"{t('merchants_testimonial')}"</p>
                <p className="text-slate-400 text-sm">— {t('merchants_testimonial_author')}</p>
              </div>
              
              <Button 
                onClick={() => navigate('/merchant')}
                className="bg-emerald-500 hover:bg-emerald-600 px-8 py-6 text-lg"
              >
                <Store className="mr-2" size={20} />
                {t('merchants_cta')}
              </Button>
            </div>
            
            <div className="relative">
              <img 
                src={IMAGES.merchantShop} 
                alt="Partner merchant"
                className="w-full rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -right-6 bg-emerald-500 text-white rounded-xl p-4 shadow-xl">
                <p className="text-2xl font-bold">+35%</p>
                <p className="text-sm opacity-90">Sales Increase</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== FOR CUSTOMERS ============== */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <img 
                src={IMAGES.entrepreneurs} 
                alt="Happy customers"
                className="w-full rounded-2xl shadow-2xl"
              />
            </div>
            
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('customers_title')}</h2>
              <p className="text-slate-400 text-lg mb-8">{t('customers_subtitle')}</p>
              
              <div className="space-y-4 mb-8">
                {[
                  { icon: Wallet, title: t('customers_benefit1'), desc: t('customers_benefit1_desc') },
                  { icon: MapPin, title: t('customers_benefit2'), desc: t('customers_benefit2_desc') },
                  { icon: Zap, title: t('customers_benefit3'), desc: t('customers_benefit3_desc') },
                  { icon: Gift, title: t('customers_benefit4'), desc: t('customers_benefit4_desc') }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <item.icon className="text-purple-400" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-slate-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={() => navigate('/client')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-6 text-lg"
              >
                {t('customers_cta')} <ArrowRight className="ml-2" size={20} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============== TRUST & SECURITY ============== */}
      <section className="py-16 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2">{t('trust_title')}</h2>
            <p className="text-slate-400">{t('trust_subtitle')}</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            <div className="flex items-center gap-3 bg-slate-900/50 rounded-xl px-6 py-4">
              <Shield className="text-emerald-400" size={24} />
              <span className="text-slate-300">{t('trust_secure_payments')}</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-900/50 rounded-xl px-6 py-4">
              <BadgeCheck className="text-blue-400" size={24} />
              <span className="text-slate-300">{t('trust_data_protection')}</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-900/50 rounded-xl px-6 py-4">
              <Store className="text-amber-400" size={24} />
              <span className="text-slate-300">{t('trust_verified_merchants')}</span>
            </div>
          </div>
          
          {/* Payment Partners */}
          <div className="text-center">
            <p className="text-slate-500 text-sm mb-4">{t('trust_powered_by')}</p>
            <div className="flex flex-wrap justify-center items-center gap-8">
              <img src={PAYMENT_LOGOS.visa} alt="Visa" className="h-8 opacity-60 hover:opacity-100 transition-opacity" />
              <img src={PAYMENT_LOGOS.mastercard} alt="Mastercard" className="h-10 opacity-60 hover:opacity-100 transition-opacity" />
              <img src={PAYMENT_LOGOS.mtn} alt="MTN MoMo" className="h-10 opacity-60 hover:opacity-100 transition-opacity" />
              <img src={PAYMENT_LOGOS.vodafone} alt="Vodafone Cash" className="h-10 opacity-60 hover:opacity-100 transition-opacity" />
              <span className="text-slate-400 font-semibold">BulkClix</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============== SHARE SECTION ============== */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-2 mb-6">
            <Share2 className="text-purple-400" size={16} />
            <span className="text-purple-400 text-sm font-medium">{t('share_tagline')}</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">{t('share_title')}</h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">{t('share_subtitle')}</p>
          
          <div className="flex flex-wrap justify-center gap-4">
            {/* WhatsApp */}
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-colors"
              data-testid="share-whatsapp"
            >
              <MessageCircle size={20} />
              <span>WhatsApp</span>
            </button>
            
            {/* Facebook */}
            <button
              onClick={() => handleShare('facebook')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-colors"
              data-testid="share-facebook"
            >
              <Facebook size={20} />
              <span>Facebook</span>
            </button>
            
            {/* Twitter/X */}
            <button
              onClick={() => handleShare('twitter')}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl transition-colors"
              data-testid="share-twitter"
            >
              <Twitter size={20} />
              <span>Twitter</span>
            </button>
            
            {/* Telegram */}
            <button
              onClick={() => handleShare('telegram')}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl transition-colors"
              data-testid="share-telegram"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              <span>Telegram</span>
            </button>
          </div>
        </div>
      </section>

      {/* ============== FINAL CTA ============== */}
      <section className="py-20 bg-gradient-to-r from-amber-600 to-orange-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-24 h-24 mx-auto mb-6 rounded-2xl" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('cta_title')}</h2>
          <p className="text-lg text-amber-100 mb-8 max-w-2xl mx-auto">{t('cta_subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/client')}
              className="bg-white text-amber-600 hover:bg-slate-100 px-8 py-6 text-lg font-semibold"
            >
              <Users className="mr-2" size={20} />
              {t('hero_cta_client')}
            </Button>
            <Button
              onClick={() => navigate('/merchant')}
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg"
            >
              <Store className="mr-2" size={20} />
              {t('hero_cta_merchant')}
            </Button>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="bg-slate-900 border-t border-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src={SDM_LOGO_URL} alt="SDM Rewards" className="h-14 w-14 object-contain rounded-lg" />
                <span className="font-bold text-2xl">SDM Rewards</span>
              </div>
              <p className="text-slate-400 mb-6 max-w-md">{t('footer_description')}</p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                  <Globe size={20} />
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                  <Phone size={20} />
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                  <Mail size={20} />
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">{t('footer_quick_links')}</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('features')} className="text-slate-400 hover:text-white">{t('nav_about')}</button></li>
                <li><button onClick={() => scrollToSection('cards')} className="text-slate-400 hover:text-white">{t('nav_cards')}</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="text-slate-400 hover:text-white">{t('nav_how_it_works')}</button></li>
                <li><button onClick={() => scrollToSection('merchants-section')} className="text-slate-400 hover:text-white">{t('nav_partners')}</button></li>
              </ul>
            </div>
            
            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">{t('footer_legal')}</h4>
              <ul className="space-y-2">
                <li><a href="/terms" className="text-slate-400 hover:text-white">{t('footer_terms')}</a></li>
                <li><a href="/privacy" className="text-slate-400 hover:text-white">{t('footer_privacy')}</a></li>
                <li><a href="/merchant-terms" className="text-slate-400 hover:text-white">{t('footer_merchant_terms')}</a></li>
                <li><a href="/referral-terms" className="text-slate-400 hover:text-white">{t('footer_referral_terms')}</a></li>
                <li><a href="/cashback-rules" className="text-slate-400 hover:text-white">{t('footer_cashback_rules')}</a></li>
                <li><a href="/abuse-policy" className="text-slate-400 hover:text-white">{t('footer_abuse_policy')}</a></li>
                <li><a href="/faq" className="text-slate-400 hover:text-white">{t('footer_faq')}</a></li>
                <li><a href="mailto:support@sdmrewards.com" className="text-slate-400 hover:text-white">{t('footer_contact')}</a></li>
              </ul>
            </div>
          </div>
          
          {/* Legal Disclaimer */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-8 text-center">
            <p className="text-slate-500 text-sm">
              SDM REWARDS is a digital loyalty and cashback platform. It is not a bank, financial institution, or investment service provider.
            </p>
          </div>
          
          {/* Bottom */}
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">{t('footer_copyright')}</p>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <MapPin size={16} />
              <span>{t('footer_address')}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ============== CUSTOM STYLES ============== */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';

export const HeroSection = () => {
  const { t, direction } = useLanguage();

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section 
      className="relative min-h-screen flex items-center bg-slate-950 overflow-hidden"
      data-testid="hero-section"
    >
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,86,210,0.15)_0%,_transparent_70%)]" />
      </div>

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-32 md:py-40">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-medium text-blue-400">{t('hero_subtitle')}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6"
            >
              {t('hero_title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg text-slate-400 leading-relaxed mb-8 max-w-xl"
            >
              {t('hero_description')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-wrap gap-4 mb-10"
            >
              <Button 
                onClick={scrollToContact}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 text-base font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:-translate-y-1"
                data-testid="hero-cta-button"
              >
                {t('hero_cta')}
                <ArrowRight size={18} className={`ml-2 ${direction === 'rtl' ? 'rtl-flip' : ''}`} />
              </Button>
              <Button 
                variant="outline"
                onClick={scrollToContact}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-full px-8 py-6 text-base font-medium transition-all"
                data-testid="hero-audit-button"
              >
                <Play size={18} className="mr-2" />
                {t('hero_audit')}
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-wrap gap-6"
            >
              {[t('commitment_delivery'), t('commitment_support'), t('commitment_international')].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-500">
                  <CheckCircle2 size={16} className="text-blue-500" />
                  <span>{item}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              {/* Main card */}
              <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-8 shadow-2xl">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 animate-float">
                  <span className="text-3xl font-bold text-white">14</span>
                </div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{t('delivery_title')}</p>
                <p className="text-lg text-white font-semibold mb-6">{t('delivery_time')}</p>
                
                <div className="space-y-3">
                  {[t('delivery_analysis'), t('delivery_design'), t('delivery_development'), t('delivery_testing')].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {i + 1}
                      </div>
                      <span className="text-sm text-slate-400">{step}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <p className="text-center text-sm font-medium gradient-text">{t('delivery_motto')}</p>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -bottom-6 -left-6 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800 px-5 py-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">100+</p>
                    <p className="text-sm font-semibold text-white">Projects Delivered</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Smartphone } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';

export const PricingSection = () => {
  const { t } = useLanguage();

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const packages = [
    {
      key: 'starter',
      icon: Zap,
      price: t('pricing_starter_price'),
      features: ['showcase', 'responsive', 'contact_form', 'whatsapp', 'seo_basic'],
      popular: false,
    },
    {
      key: 'business',
      icon: Star,
      price: t('pricing_business_price'),
      features: ['multipage', 'booking', 'payment', 'gallery', 'seo_advanced', 'security'],
      popular: true,
    },
    {
      key: 'premium',
      icon: Star,
      price: t('pricing_premium_price'),
      features: ['custom_design', 'member_area', 'custom_features', 'marketing', 'performance', 'support'],
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-32 bg-slate-50" data-testid="pricing-section">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            {t('pricing_title')}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('pricing_subtitle')}
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {packages.map((pkg, index) => {
            const Icon = pkg.icon;
            return (
              <motion.div
                key={pkg.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className={`relative rounded-2xl p-8 transition-all duration-300 ${
                  pkg.popular 
                    ? 'bg-slate-900 text-white scale-105 shadow-2xl shadow-slate-900/20' 
                    : 'bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xl'
                }`}
                data-testid={`pricing-card-${pkg.key}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                      {t('pricing_popular')}
                    </span>
                  </div>
                )}

                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${
                  pkg.popular ? 'bg-blue-600' : 'bg-blue-100'
                }`}>
                  <Icon size={24} className={pkg.popular ? 'text-white' : 'text-blue-600'} />
                </div>

                <h3 className={`text-xl font-bold mb-2 ${pkg.popular ? 'text-white' : 'text-slate-900'}`}>
                  {t(`pricing_${pkg.key}`)}
                </h3>
                <p className={`text-sm mb-4 ${pkg.popular ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t(`pricing_${pkg.key}_desc`)}
                </p>
                <p className={`text-2xl font-bold mb-6 ${pkg.popular ? 'text-white' : 'text-blue-600'}`}>
                  {pkg.price}
                </p>

                <ul className="space-y-3 mb-8">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check size={18} className={`flex-shrink-0 mt-0.5 ${pkg.popular ? 'text-cyan-400' : 'text-blue-600'}`} />
                      <span className={`text-sm ${pkg.popular ? 'text-slate-300' : 'text-slate-600'}`}>
                        {t(`feature_${feature}`)}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={scrollToContact}
                  className={`w-full rounded-full py-6 font-semibold transition-all hover:-translate-y-1 ${
                    pkg.popular 
                      ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-lg' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
                  }`}
                  data-testid={`pricing-cta-${pkg.key}`}
                >
                  {t('pricing_cta')}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile Apps Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12"
          data-testid="pricing-card-mobile"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mb-6">
                <Smartphone size={28} className="text-white" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {t('pricing_mobile')}
              </h3>
              <p className="text-slate-400 mb-6">
                {t('pricing_mobile_desc')}
              </p>
              <p className="text-3xl font-bold text-white mb-6">
                {t('pricing_mobile_price')}
              </p>
              <Button
                onClick={scrollToContact}
                className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-8 py-6 font-semibold shadow-lg transition-all hover:-translate-y-1"
                data-testid="pricing-cta-mobile"
              >
                {t('pricing_cta')}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['android', 'ios', 'hybrid', 'api', 'modern_ui'].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <Check size={18} className="text-cyan-400 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{t(`feature_${feature}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

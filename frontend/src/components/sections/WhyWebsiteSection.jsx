import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Users, Clock, ShoppingCart, Calendar, 
  Palette, TrendingUp, Rocket 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const WhyWebsiteSection = () => {
  const { t } = useLanguage();

  const benefits = [
    { icon: Shield, key: 'credibility', color: 'from-blue-500 to-blue-600' },
    { icon: Users, key: 'clients', color: 'from-cyan-500 to-cyan-600' },
    { icon: Clock, key: 'visible', color: 'from-violet-500 to-violet-600' },
    { icon: ShoppingCart, key: 'sell', color: 'from-emerald-500 to-emerald-600' },
    { icon: Calendar, key: 'automate', color: 'from-orange-500 to-orange-600' },
    { icon: Palette, key: 'brand', color: 'from-pink-500 to-pink-600' },
    { icon: TrendingUp, key: 'revenue', color: 'from-amber-500 to-amber-600' },
    { icon: Rocket, key: 'growth', color: 'from-indigo-500 to-indigo-600' },
  ];

  return (
    <section className="py-20 md:py-32 bg-slate-50" data-testid="why-section">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold tracking-wider uppercase text-blue-600 mb-4">
            {t('why_subtitle')}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            {t('why_title')}
          </h2>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`group bg-white rounded-2xl p-6 border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 cursor-default ${
                  index === 0 || index === 7 ? 'md:col-span-2 lg:col-span-2' : ''
                }`}
                data-testid={`why-card-${benefit.key}`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {t(`why_${benefit.key}`)}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t(`why_${benefit.key}_desc`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { motion } from 'framer-motion';
import { Newspaper } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const BonusSection = () => {
  const { t } = useLanguage();

  const mediaOutlets = [
    'Yahoo Finance',
    'Digital News',
    'Associated Press',
    'Benzinga',
    'Business Insider',
    'MarketWatch',
  ];

  return (
    <section className="py-20 md:py-32 bg-slate-950" data-testid="bonus-section">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
            <Newspaper size={18} className="text-amber-500" />
            <span className="text-sm font-medium text-amber-400">BONUS</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t('bonus_title')}
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12">
            {t('bonus_subtitle')}
          </p>

          {/* Media Logos */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {mediaOutlets.map((outlet, index) => (
              <motion.div
                key={outlet}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="px-6 py-4 bg-slate-900/50 border border-slate-800 rounded-xl"
              >
                <span className="text-slate-300 font-medium">{outlet}</span>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg font-semibold gradient-text"
          >
            {t('bonus_cta')}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

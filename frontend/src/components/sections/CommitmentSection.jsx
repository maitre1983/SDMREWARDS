import React from 'react';
import { motion } from 'framer-motion';
import { 
  BadgeCheck, Truck, Headphones, Users, Globe 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const CommitmentSection = () => {
  const { t } = useLanguage();

  const commitments = [
    { icon: BadgeCheck, key: 'price' },
    { icon: Truck, key: 'delivery' },
    { icon: Headphones, key: 'support' },
    { icon: Users, key: 'team' },
    { icon: Globe, key: 'international' },
  ];

  return (
    <section className="py-20 md:py-32 bg-white" data-testid="commitment-section">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {t('commitment_title')}
          </h2>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-8">
          {commitments.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Icon size={20} className="text-blue-600" />
                </div>
                <span className="font-medium text-slate-700">{t(`commitment_${item.key}`)}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

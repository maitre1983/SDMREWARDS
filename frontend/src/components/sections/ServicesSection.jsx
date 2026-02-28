import React from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, UtensilsCrossed, Scissors, ShoppingBag, 
  GraduationCap, Smartphone, Rocket, Settings 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const ServicesSection = () => {
  const { t } = useLanguage();

  const services = [
    { icon: Building2, key: 'enterprise', color: 'bg-blue-500' },
    { icon: UtensilsCrossed, key: 'restaurant', color: 'bg-orange-500' },
    { icon: Scissors, key: 'beauty', color: 'bg-pink-500' },
    { icon: ShoppingBag, key: 'ecommerce', color: 'bg-emerald-500' },
    { icon: GraduationCap, key: 'education', color: 'bg-violet-500' },
    { icon: Smartphone, key: 'mobile', color: 'bg-cyan-500' },
    { icon: Rocket, key: 'startup', color: 'bg-amber-500' },
    { icon: Settings, key: 'custom', color: 'bg-slate-700' },
  ];

  return (
    <section id="services" className="py-20 md:py-32 bg-white" data-testid="services-section">
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
            {t('services_title')}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('services_subtitle')}
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="service-card group bg-white rounded-2xl p-6 border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 text-center cursor-default"
                data-testid={`service-card-${service.key}`}
              >
                <div className={`service-icon mx-auto ${service.color} bg-opacity-10`}>
                  <Icon size={28} className={service.color.replace('bg-', 'text-')} />
                </div>
                <h3 className="text-sm md:text-base font-semibold text-slate-900">
                  {t(`service_${service.key}`)}
                </h3>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const PortfolioSection = () => {
  const { t } = useLanguage();

  const projects = [
    { 
      name: 'Russophonie Afrique', 
      url: 'https://russophonie-afrique.com/',
      category: 'Education',
      color: 'from-blue-600 to-indigo-600'
    },
    { 
      name: 'Centre Linguistique', 
      url: 'https://centrelinguistiqueducameroun.com/',
      category: 'Education',
      color: 'from-emerald-600 to-teal-600'
    },
    { 
      name: 'TrumpBot Wallet', 
      url: 'https://trumpbotwallet.com/',
      category: 'Crypto',
      color: 'from-amber-600 to-orange-600'
    },
    { 
      name: 'Best in Singapore', 
      url: 'https://bestinsingapore.store/',
      category: 'E-commerce',
      color: 'from-pink-600 to-rose-600'
    },
    { 
      name: 'Smart HHS', 
      url: 'https://smarthhs.com/',
      category: 'Healthcare',
      color: 'from-cyan-600 to-blue-600'
    },
    { 
      name: 'Estate Slice NFT', 
      url: 'https://estateslicenft.net/',
      category: 'Real Estate',
      color: 'from-violet-600 to-purple-600'
    },
  ];

  return (
    <section id="portfolio" className="py-20 md:py-32 bg-white" data-testid="portfolio-section">
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
            {t('portfolio_title')}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('portfolio_subtitle')}
          </p>
        </motion.div>

        {/* Portfolio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <motion.a
              key={project.name}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 hover:border-transparent transition-all duration-300"
              data-testid={`portfolio-item-${index}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${project.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <div className="relative p-8 bg-slate-50 group-hover:bg-transparent transition-colors duration-300">
                <span className="inline-block text-xs font-medium text-blue-600 group-hover:text-white/80 bg-blue-50 group-hover:bg-white/20 px-3 py-1 rounded-full mb-4 transition-colors duration-300">
                  {project.category}
                </span>
                
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-white mb-3 transition-colors duration-300">
                  {project.name}
                </h3>
                
                <div className="flex items-center gap-2 text-sm text-slate-500 group-hover:text-white/70 transition-colors duration-300">
                  <span className="truncate">{project.url.replace('https://', '')}</span>
                  <ExternalLink size={14} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

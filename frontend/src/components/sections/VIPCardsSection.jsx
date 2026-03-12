import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Star, Sparkles, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';
import axios from 'axios';

// API URL imported from config
import { API_URL } from '@/config/api';

// Tier icons and colors
const tierConfig = {
  BRONZE: { icon: Star, gradient: 'from-amber-700 to-amber-900', badge: 'bg-amber-700' },
  SILVER: { icon: Star, gradient: 'from-slate-400 to-slate-600', badge: 'bg-slate-500' },
  GOLD: { icon: Crown, gradient: 'from-yellow-500 to-amber-600', badge: 'bg-yellow-500' },
  PLATINUM: { icon: Sparkles, gradient: 'from-slate-300 to-slate-500', badge: 'bg-gradient-to-r from-slate-300 to-slate-400' },
};

export const VIPCardsSection = () => {
  const { language } = useLanguage();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/sdm/vip-cards`);
        setCards(response.data.cards || []);
      } catch (error) {
        console.error('Error fetching VIP cards:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-slate-50">
        <div className="flex justify-center">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      </section>
    );
  }

  if (cards.length === 0) return null;

  return (
    <section id="vip-cards" className="py-16 md:py-24 bg-slate-50" data-testid="vip-cards-section">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 border border-amber-200 mb-4">
            <Crown size={18} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">
              {language === 'fr' ? 'CARTES VIP SDM' : 'SDM VIP CARDS'}
            </span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {language === 'fr' ? 'Choisissez Votre Carte VIP' : 'Choose Your VIP Card'}
          </h2>
          
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
            {language === 'fr' 
              ? 'Débloquez des avantages exclusifs et maximisez vos gains avec nos cartes VIP.'
              : 'Unlock exclusive benefits and maximize your earnings with our VIP cards.'}
          </p>
        </motion.div>

        {/* Cards Grid - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {cards.map((card, index) => {
            const config = tierConfig[card.tier] || tierConfig.BRONZE;
            const Icon = config.icon;
            
            return (
              <motion.div
                key={card.id || index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative rounded-2xl overflow-hidden ${
                  card.tier === 'GOLD' ? 'ring-2 ring-yellow-400 shadow-xl' : 'shadow-lg'
                }`}
                data-testid={`vip-card-${card.tier.toLowerCase()}`}
              >
                {/* Card Header */}
                <div className={`bg-gradient-to-br ${config.gradient} p-4 md:p-6 text-white`}>
                  {card.tier === 'GOLD' && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
                        {language === 'fr' ? 'Populaire' : 'Popular'}
                      </span>
                    </div>
                  )}
                  
                  <Icon size={28} className="mb-3 opacity-90" />
                  <h3 className="text-lg md:text-xl font-bold mb-1">{card.name}</h3>
                  <p className="text-2xl md:text-3xl font-bold">
                    {card.price} <span className="text-sm font-normal opacity-80">GHS</span>
                  </p>
                  <p className="text-xs opacity-70 mt-1">
                    {card.validity_days} {language === 'fr' ? 'jours' : 'days'}
                  </p>
                </div>

                {/* Benefits List */}
                <div className="bg-white p-4 md:p-6">
                  <ul className="space-y-2 mb-4">
                    {(card.benefits_list || []).slice(0, 5).map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-600 text-xs md:text-sm">{benefit}</span>
                      </li>
                    ))}
                    {(card.benefits_list || []).length > 5 && (
                      <li className="text-xs text-slate-400 pl-6">
                        +{card.benefits_list.length - 5} {language === 'fr' ? 'autres' : 'more'}
                      </li>
                    )}
                  </ul>

                  {/* Key Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4 pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">+{card.cashback_boost}%</p>
                      <p className="text-xs text-slate-500">Cashback</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">x{card.lottery_multiplier}</p>
                      <p className="text-xs text-slate-500">Lottery</p>
                    </div>
                  </div>

                  <Link to="/sdm/client" className="block">
                    <Button 
                      className={`w-full rounded-xl py-3 font-semibold text-sm ${
                        card.tier === 'GOLD' 
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-slate-900' 
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {language === 'fr' ? 'Obtenir' : 'Get Card'}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, QrCode, Store, CreditCard, Smartphone, 
  TrendingUp, Users, Shield, ArrowRight 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';
import axios from 'axios';

// API URL imported from config
import { API_URL } from '@/config/api';

export const SDMSection = () => {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState({
    total_users: 0,
    total_partners: 100,
    total_transactions: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/sdm/stats`);
        setStats(response.data);
      } catch (error) {
        console.log('Stats fetch error:', error);
      }
    };
    fetchStats();
  }, []);

  const features = [
    { 
      icon: QrCode, 
      title: language === 'fr' ? 'QR Code Unique' : 'Unique QR Code',
      desc: language === 'fr' ? 'Scannez et gagnez du cashback instantanément' : 'Scan and earn cashback instantly'
    },
    { 
      icon: Wallet, 
      title: language === 'fr' ? 'Wallet Central' : 'Central Wallet',
      desc: language === 'fr' ? 'Gérez vos gains en un seul endroit' : 'Manage all your earnings in one place'
    },
    { 
      icon: Store, 
      title: language === 'fr' ? 'Multi-Commerces' : 'Multi-Merchants',
      desc: language === 'fr' ? 'Restaurants, salons, hôtels et plus' : 'Restaurants, salons, hotels & more'
    },
    { 
      icon: Smartphone, 
      title: 'Mobile Money',
      desc: language === 'fr' ? 'Retirez vers MTN, Vodafone, AirtelTigo' : 'Withdraw to MTN, Vodafone, AirtelTigo'
    },
  ];

  const displayStats = [
    { value: '5%', label: language === 'fr' ? 'Cashback moyen' : 'Average Cashback' },
    { value: `${stats.total_partners || 100}+`, label: language === 'fr' ? 'Commerces partenaires' : 'Partner Merchants' },
    { value: '24/7', label: language === 'fr' ? 'Disponible' : 'Available' },
  ];

  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-900 relative overflow-hidden" data-testid="sdm-section">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 mb-6">
            <Wallet size={18} className="text-blue-400" />
            <span className="text-sm font-semibold text-blue-400">SMART DEVELOPMENT MEMBERSHIP</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            {language === 'fr' ? 'Gagnez du Cashback Partout' : 'Earn Cashback Everywhere'}
          </h2>
          
          <p className="text-lg text-slate-300 max-w-3xl mx-auto mb-8">
            {language === 'fr' 
              ? 'SDM connecte restaurants, salons, spas, hôtels et commerces au Ghana. Scannez votre QR code et gagnez du cashback sur chaque achat.'
              : 'SDM connects restaurants, salons, spas, hotels and businesses across Ghana. Scan your QR code and earn cashback on every purchase.'}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-12">
            {displayStats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <p className="text-4xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-blue-500/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* For Customers */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <Users size={40} className="text-white/80 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-3">
              {language === 'fr' ? 'Pour les Clients' : 'For Customers'}
            </h3>
            <p className="text-blue-100 mb-6">
              {language === 'fr' 
                ? 'Créez votre compte gratuit, obtenez votre QR code et commencez à gagner du cashback.'
                : 'Create your free account, get your QR code and start earning cashback.'}
            </p>
            <Link to="/sdm/client">
              <Button className="bg-white text-blue-600 hover:bg-blue-50 rounded-full px-6 font-semibold">
                {language === 'fr' ? 'Créer un compte' : 'Create Account'}
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
          </div>

          {/* For Merchants */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <Store size={40} className="text-cyan-400 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-3">
              {language === 'fr' ? 'Pour les Commerçants' : 'For Merchants'}
            </h3>
            <p className="text-slate-300 mb-6">
              {language === 'fr' 
                ? 'Rejoignez le réseau SDM et fidélisez vos clients avec notre système de cashback.'
                : 'Join the SDM network and reward your customers with our cashback system.'}
            </p>
            <Link to="/sdm/merchant">
              <Button className="bg-cyan-500 text-slate-900 hover:bg-cyan-400 rounded-full px-6 font-semibold">
                {language === 'fr' ? 'Devenir partenaire' : 'Become a Partner'}
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-8 mt-12"
        >
          {[
            { icon: Shield, text: language === 'fr' ? 'Sécurisé' : 'Secure' },
            { icon: CreditCard, text: 'Mobile Money' },
            { icon: TrendingUp, text: language === 'fr' ? 'Cashback réel' : 'Real Cashback' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-400">
              <item.icon size={18} className="text-blue-400" />
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

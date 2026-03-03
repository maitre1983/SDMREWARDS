import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Crown, Gift, Wallet, Users, Store, Ticket, 
  CheckCircle, Smartphone, Shield, Globe, TrendingUp, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useLanguage } from '../context/LanguageContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "/sdm-logo.png";

// Tier styling configuration
const tierStyles = {
  BRONZE: {
    color: 'from-amber-700 to-amber-600',
    textColor: 'text-white',
    borderColor: 'border-amber-500',
  },
  SILVER: {
    color: 'from-slate-400 to-slate-300',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-400',
  },
  GOLD: {
    color: 'from-amber-500 to-yellow-400',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-300',
    popular: true,
  },
  PLATINUM: {
    color: 'from-slate-700 to-slate-500',
    textColor: 'text-white',
    borderColor: 'border-slate-400',
  }
};

export default function SDMRewardsPage() {
  const { t, language } = useLanguage();
  const [vipCards, setVipCards] = useState([]);
  const [stats, setStats] = useState({ total_partners: 100, total_users: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch VIP cards and stats from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cardsRes, statsRes] = await Promise.all([
          axios.get(`${API_URL}/api/sdm/vip-cards`),
          axios.get(`${API_URL}/api/sdm/stats`)
        ]);
        setVipCards(cardsRes.data.cards || []);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Format card benefits for display
  const formatCard = (card) => {
    const style = tierStyles[card.tier] || tierStyles.SILVER;
    return {
      ...card,
      ...style,
      benefits: card.benefits_list || [
        `+${card.cashback_boost}% cashback boost`,
        `x${card.lottery_multiplier} lottery chances`,
        `GHS ${card.monthly_withdrawal_limit}/month limit`
      ]
    };
  };

  const features = [
    {
      icon: Wallet,
      title: 'Cashback Rewards',
      description: 'Earn cashback on every purchase at partner merchants. Your rewards accumulate automatically.'
    },
    {
      icon: Store,
      title: 'Partner Network',
      description: 'Access to hundreds of partner merchants including restaurants, shops, hotels, and more.'
    },
    {
      icon: Ticket,
      title: 'Monthly Lottery',
      description: 'VIP members are automatically entered into monthly draws with prizes up to GHS 500.'
    },
    {
      icon: Users,
      title: 'Referral Program',
      description: 'Earn GHS 3 for every friend you refer who buys a VIP card. They get GHS 1 bonus too!'
    },
    {
      icon: Smartphone,
      title: 'Super App Services',
      description: 'Buy airtime, data bundles, pay bills, and withdraw to Mobile Money directly from your balance.'
    },
    {
      icon: Shield,
      title: 'Secure & Trusted',
      description: 'Your data and transactions are protected. SDM Rewards is built on trust and transparency.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[150px]" />
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px]" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <img src={LOGO_URL} alt="SDM Rewards" className="w-24 h-24 rounded-3xl object-cover shadow-2xl" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                SDM Rewards
              </span>
            </h1>
            
            <p className="text-xl text-slate-300 mb-4">
              Smart Development Membership
            </p>
            
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
              A network of friends and loyal consumers earning cashback, winning prizes, and accessing exclusive benefits at partner merchants across Ghana.
            </p>
            
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 max-w-xl mx-auto mb-10">
              <p className="text-amber-400 text-sm font-medium">
                ⚠️ Important: SDM is not a bank or financial service. It is a loyalty and rewards program.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/sdm/client">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg gap-2">
                  <Crown size={20} />
                  Join SDM Rewards
                </Button>
              </Link>
              <Link to="/sdm/merchant">
                <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg gap-2">
                  <Store size={20} />
                  Become a Partner
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Join SDM Rewards?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Discover the benefits of being part of Ghana's leading loyalty and rewards network.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700 hover:border-blue-500/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center mb-4">
                  <feature.icon className="text-blue-400" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VIP Cards Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Choose Your VIP Card
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Select the membership level that suits your lifestyle. Upgrade anytime!
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {vipCards.map((card) => {
                const formattedCard = formatCard(card);
                return (
                  <div 
                    key={card.id}
                    className={`relative bg-slate-800/50 backdrop-blur rounded-3xl p-8 border ${
                      formattedCard.popular ? 'border-amber-500 scale-105' : 'border-slate-700'
                    }`}
                    data-testid={`rewards-card-${card.tier.toLowerCase()}`}
                  >
                    {formattedCard.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="bg-amber-500 text-amber-900 px-4 py-1 rounded-full text-sm font-semibold">
                          Most Popular
                        </span>
                      </div>
                    )}
                    
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${formattedCard.color} flex items-center justify-center mx-auto mb-6`}>
                      <Crown className={formattedCard.textColor} size={32} />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white text-center mb-2">
                      {card.name}
                    </h3>
                    
                    <div className="text-center mb-6">
                      <span className="text-4xl font-bold text-white">GHS {card.price}</span>
                      <span className="text-slate-400">/{card.validity_days} days</span>
                    </div>

                    {/* Key Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-6 py-4 border-y border-slate-700">
                      <div className="text-center">
                        <p className="text-xl font-bold text-emerald-400">+{card.cashback_boost}%</p>
                        <p className="text-xs text-slate-400">Cashback Boost</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-blue-400">x{card.lottery_multiplier}</p>
                        <p className="text-xs text-slate-400">Lottery Chances</p>
                      </div>
                    </div>
                    
                    <ul className="space-y-3 mb-8">
                      {(card.benefits_list || formattedCard.benefits).slice(0, 5).map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300">
                          <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={18} />
                          <span className="text-sm">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Link to="/sdm/client" className="block">
                      <Button 
                        className={`w-full py-6 ${
                          formattedCard.popular 
                            ? 'bg-amber-500 hover:bg-amber-600 text-amber-900' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        Get {card.tier} Card
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: '1', title: 'Sign Up', desc: 'Create your account with your phone number' },
                { step: '2', title: 'Buy VIP Card', desc: 'Choose Silver, Gold, or Platinum' },
                { step: '3', title: 'Shop & Earn', desc: 'Show your QR code at partner merchants' },
                { step: '4', title: 'Enjoy Rewards', desc: 'Use cashback for services or withdraw' }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-14 h-14 rounded-full bg-blue-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">{item.title}</h4>
                  <p className="text-slate-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Monthly Lottery Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-3xl p-10 border border-purple-500/30">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-24 h-24 rounded-2xl bg-purple-600 flex items-center justify-center shrink-0">
                <Ticket className="text-white" size={48} />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold text-white mb-2">Monthly VIP Lottery</h3>
                <p className="text-purple-200 mb-4">
                  Every month, we draw 5 lucky winners from our VIP members! Prize pool starts at GHS 500.
                  Higher VIP tiers get more chances: Silver (x1), Gold (x2), Platinum (x3).
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <span className="bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full text-sm">
                    🥇 1st: 40%
                  </span>
                  <span className="bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full text-sm">
                    🥈 2nd: 25%
                  </span>
                  <span className="bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full text-sm">
                    🥉 3rd: 15%
                  </span>
                  <span className="bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full text-sm">
                    4th: 12%
                  </span>
                  <span className="bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full text-sm">
                    5th: 8%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-cyan-500">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Earning?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of Ghanaians who are already saving money with SDM Rewards.
          </p>
          <Link to="/sdm/client">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-10 py-6 text-lg">
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

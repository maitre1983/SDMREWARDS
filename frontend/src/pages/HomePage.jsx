import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
  CreditCard, 
  Gift, 
  Users, 
  Store, 
  QrCode, 
  Smartphone,
  ArrowRight,
  CheckCircle,
  Sparkles
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: CreditCard,
      title: "Digital Membership Card",
      description: "Get your personalized digital card with unique QR code"
    },
    {
      icon: Gift,
      title: "Instant Cashback",
      description: "Earn cashback on every purchase at partner merchants"
    },
    {
      icon: Users,
      title: "Referral Rewards",
      description: "Invite friends and earn GHS 3 for each successful referral"
    },
    {
      icon: QrCode,
      title: "Easy QR Payments",
      description: "Scan to pay or get paid instantly"
    }
  ];

  const cards = [
    { name: "Silver Card", price: 25, color: "#C0C0C0", gradient: "from-slate-400 to-slate-300" },
    { name: "Gold Card", price: 50, color: "#FFD700", gradient: "from-amber-400 to-yellow-300" },
    { name: "Platinum Card", price: 100, color: "#E5E4E2", gradient: "from-slate-600 to-slate-400" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Sparkles className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold text-white">SDM REWARDS</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                className="text-slate-300 hover:text-white"
                onClick={() => navigate('/merchant')}
              >
                Merchant
              </Button>
              <Button 
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                onClick={() => navigate('/client')}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-2 mb-6">
            <Sparkles className="text-amber-400" size={16} />
            <span className="text-amber-300 text-sm font-medium">Ghana's #1 Loyalty Platform</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Earn <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Cashback</span> on
            <br />Every Purchase
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Join SDM Rewards and get instant cashback when you shop at partner merchants. 
            The more you spend, the more you earn!
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-6 text-lg rounded-xl"
              onClick={() => navigate('/client')}
              data-testid="hero-get-started-btn"
            >
              Get Started <ArrowRight className="ml-2" size={20} />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg rounded-xl"
              onClick={() => navigate('/merchant')}
              data-testid="hero-merchant-btn"
            >
              <Store className="mr-2" size={20} /> Partner with Us
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Why Choose SDM Rewards?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-amber-500/50 transition-all"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="text-white" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cards Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Choose Your Membership Card
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
            Purchase a membership card to unlock all benefits and start earning cashback instantly
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {cards.map((card, idx) => (
              <div 
                key={idx}
                className="relative bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden hover:scale-105 transition-transform cursor-pointer"
                onClick={() => navigate('/client')}
              >
                <div className={`h-32 bg-gradient-to-br ${card.gradient}`}></div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{card.name}</h3>
                  <p className="text-3xl font-bold text-amber-400">GHS {card.price}</p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center gap-2 text-slate-400 text-sm">
                      <CheckCircle className="text-emerald-400" size={16} />
                      All partner merchants
                    </li>
                    <li className="flex items-center gap-2 text-slate-400 text-sm">
                      <CheckCircle className="text-emerald-400" size={16} />
                      Instant cashback
                    </li>
                    <li className="flex items-center gap-2 text-slate-400 text-sm">
                      <CheckCircle className="text-emerald-400" size={16} />
                      Referral bonuses
                    </li>
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Sign Up & Get Card</h3>
              <p className="text-slate-400">Register and purchase your membership card</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Shop at Partners</h3>
              <p className="text-slate-400">Scan QR code when paying at partner merchants</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Earn Cashback</h3>
              <p className="text-slate-400">Get instant cashback credited to your account</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-3xl p-8 sm:p-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Join thousands of Ghanaians who are earning cashback on their everyday purchases
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-6 text-lg rounded-xl w-full sm:w-auto"
                onClick={() => navigate('/client')}
              >
                <Smartphone className="mr-2" size={20} /> Join as Customer
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10 px-8 py-6 text-lg rounded-xl w-full sm:w-auto"
                onClick={() => navigate('/merchant')}
              >
                <Store className="mr-2" size={20} /> Become a Partner
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Sparkles className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold text-white">SDM REWARDS</span>
            </div>
            
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} SDM Rewards by GIT NFT GHANA Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

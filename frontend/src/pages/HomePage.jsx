import React, { useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { HeroSection } from '../components/sections/HeroSection';
import { WhyWebsiteSection } from '../components/sections/WhyWebsiteSection';
import { ServicesSection } from '../components/sections/ServicesSection';
import { PricingSection } from '../components/sections/PricingSection';
import { PortfolioSection } from '../components/sections/PortfolioSection';
import { BonusSection } from '../components/sections/BonusSection';
import { CommitmentSection } from '../components/sections/CommitmentSection';
import { ContactSection } from '../components/sections/ContactSection';
import { SDMSection } from '../components/sections/SDMSection';
import { VIPCardsSection } from '../components/sections/VIPCardsSection';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function HomePage() {
  // Track page visit
  useEffect(() => {
    const trackVisit = async () => {
      try {
        await axios.post(`${API_URL}/api/track`, {
          page: window.location.pathname,
          referrer: document.referrer || null
        });
      } catch (error) {
        console.log('Tracking error:', error);
      }
    };
    trackVisit();
  }, []);

  return (
    <div className="min-h-screen" data-testid="home-page">
      <Navbar />
      <main>
        <HeroSection />
        <WhyWebsiteSection />
        <ServicesSection />
        <SDMSection />
        <VIPCardsSection />
        <PricingSection />
        <PortfolioSection />
        <BonusSection />
        <CommitmentSection />
        <ContactSection />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

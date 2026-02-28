import React from 'react';
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

export default function HomePage() {
  return (
    <div className="min-h-screen" data-testid="home-page">
      <Navbar />
      <main>
        <HeroSection />
        <WhyWebsiteSection />
        <ServicesSection />
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

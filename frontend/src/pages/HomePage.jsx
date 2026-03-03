import React, { useEffect, lazy, Suspense } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { HeroSection } from '../components/sections/HeroSection';
import axios from 'axios';

// Lazy load non-critical sections for better performance
const WhyWebsiteSection = lazy(() => import('../components/sections/WhyWebsiteSection').then(m => ({ default: m.WhyWebsiteSection })));
const ServicesSection = lazy(() => import('../components/sections/ServicesSection').then(m => ({ default: m.ServicesSection })));
const SDMSection = lazy(() => import('../components/sections/SDMSection').then(m => ({ default: m.SDMSection })));
const VIPCardsSection = lazy(() => import('../components/sections/VIPCardsSection').then(m => ({ default: m.VIPCardsSection })));
const PricingSection = lazy(() => import('../components/sections/PricingSection').then(m => ({ default: m.PricingSection })));
const PortfolioSection = lazy(() => import('../components/sections/PortfolioSection').then(m => ({ default: m.PortfolioSection })));
const BonusSection = lazy(() => import('../components/sections/BonusSection').then(m => ({ default: m.BonusSection })));
const CommitmentSection = lazy(() => import('../components/sections/CommitmentSection').then(m => ({ default: m.CommitmentSection })));
const ContactSection = lazy(() => import('../components/sections/ContactSection').then(m => ({ default: m.ContactSection })));

// Loading placeholder for lazy components
const SectionLoader = () => (
  <div className="py-20 flex justify-center">
    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
);

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
        <Suspense fallback={<SectionLoader />}>
          <WhyWebsiteSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <ServicesSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <SDMSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <VIPCardsSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <PricingSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <PortfolioSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <BonusSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <CommitmentSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <ContactSection />
        </Suspense>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

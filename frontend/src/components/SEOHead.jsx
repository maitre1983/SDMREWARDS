import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * SEO Component for SDM REWARDS
 * Provides comprehensive meta tags, structured data, and Open Graph tags
 */
export const SEOHead = ({ 
  title = "SDM REWARDS - Earn Cashback on Every Purchase in Ghana",
  description = "Ghana's #1 loyalty rewards platform. Get up to 5% cashback on every purchase at partner merchants. Join 2500+ members earning rewards daily.",
  keywords = "cashback ghana, rewards program ghana, loyalty rewards, momo rewards, mobile money cashback, shopping rewards accra, merchant rewards",
  image = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg",
  url = "https://sdmrewards.com",
  type = "website",
  locale = "en_GH",
  siteName = "SDM REWARDS",
  twitterCard = "summary_large_image",
  twitterSite = "@sdmrewards",
  jsonLd = null
}) => {
  // Default JSON-LD for organization
  const defaultJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SDM REWARDS",
    "url": "https://sdmrewards.com",
    "logo": "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg",
    "description": "Ghana's leading loyalty rewards and cashback platform",
    "sameAs": [
      "https://facebook.com/sdmrewards",
      "https://twitter.com/sdmrewards",
      "https://instagram.com/sdmrewards"
    ],
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Accra",
      "addressCountry": "GH"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+233-XX-XXX-XXXX",
      "contactType": "customer service",
      "availableLanguage": ["English", "French"]
    }
  };

  const langCode = locale ? locale.split('_')[0] : 'en';

  return (
    <Helmet>
      <title>{String(title)}</title>
      <meta name="title" content={String(title)} />
      <meta name="description" content={String(description)} />
      <meta name="keywords" content={String(keywords)} />
      <link rel="canonical" href={String(url)} />
      <meta property="og:locale" content={String(locale)} />
      <meta httpEquiv="content-language" content={langCode} />
      <meta property="og:type" content={String(type)} />
      <meta property="og:url" content={String(url)} />
      <meta property="og:title" content={String(title)} />
      <meta property="og:description" content={String(description)} />
      <meta property="og:image" content={String(image)} />
      <meta property="og:site_name" content={String(siteName)} />
      <meta name="twitter:card" content={String(twitterCard)} />
      <meta name="twitter:url" content={String(url)} />
      <meta name="twitter:title" content={String(title)} />
      <meta name="twitter:description" content={String(description)} />
      <meta name="twitter:image" content={String(image)} />
      {twitterSite && <meta name="twitter:site" content={String(twitterSite)} />}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#0f172a" />
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <script type="application/ld+json">
        {JSON.stringify(jsonLd || defaultJsonLd)}
      </script>
    </Helmet>
  );
};

/**
 * Generate JSON-LD for membership card products
 */
export const generateCardProductJsonLd = (cards) => {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "SDM REWARDS Membership Cards",
    "description": "Choose your membership card and start earning cashback today",
    "url": "https://sdmrewards.com/#cards",
    "numberOfItems": cards.length,
    "itemListElement": cards.map((card, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": `SDM ${card.name || card.type?.toUpperCase()} Card`,
        "description": `${card.duration_label || '12 months'} membership with ${card.cashback_rate || 5}% cashback rate. Welcome bonus: GHS ${card.welcome_bonus || 1}`,
        "sku": `SDM-${card.type?.toUpperCase()}`,
        "offers": {
          "@type": "Offer",
          "price": card.price,
          "priceCurrency": "GHS",
          "availability": "https://schema.org/InStock",
          "seller": {
            "@type": "Organization",
            "name": "SDM REWARDS"
          }
        }
      }
    }))
  };
};

/**
 * Generate JSON-LD for FAQ page
 */
export const generateFAQJsonLd = (faqs) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
};

/**
 * Generate JSON-LD for local business (for partner merchants)
 */
export const generateLocalBusinessJsonLd = (merchant) => {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": merchant.business_name,
    "description": `Partner merchant accepting SDM REWARDS. Earn cashback on purchases.`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": merchant.address,
      "addressLocality": merchant.city || "Accra",
      "addressCountry": "GH"
    },
    "telephone": merchant.phone,
    "paymentAccepted": ["Mobile Money", "Cash", "SDM Cashback"],
    "makesOffer": {
      "@type": "Offer",
      "description": "Cashback rewards for SDM members"
    }
  };
};

export default SEOHead;

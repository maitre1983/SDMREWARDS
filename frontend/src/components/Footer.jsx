import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const LOGO_URL = "/sdm-logo.png";

export const Footer = () => {
  const { t } = useLanguage();

  const references = [
    'russophonie-afrique.com',
    'centrelinguistiqueducameroun.com',
    'trumpbotwallet.com',
    'bestinsingapore.store',
    'smarthhs.com',
  ];

  return (
    <footer className="bg-slate-950 text-slate-300" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <img 
                src={LOGO_URL} 
                alt="Smart Digital Solutions" 
                className="h-16 w-auto object-contain rounded-lg"
              />
            </div>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {t('footer_description')}
            </p>
            <div className="flex gap-4">
              <a 
                href="mailto:Contact@smartdigitalsolutions.com"
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors"
              >
                <Mail size={18} />
              </a>
              <a 
                href="tel:+233555861556"
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors"
              >
                <Phone size={18} />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-white mb-6">{t('footer_services')}</h4>
            <ul className="space-y-3 text-sm">
              <li><span className="hover:text-white transition-colors cursor-default">{t('service_enterprise')}</span></li>
              <li><span className="hover:text-white transition-colors cursor-default">{t('service_ecommerce')}</span></li>
              <li><span className="hover:text-white transition-colors cursor-default">{t('service_mobile')}</span></li>
              <li><span className="hover:text-white transition-colors cursor-default">{t('service_startup')}</span></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white mb-6">{t('footer_company')}</h4>
            <ul className="space-y-3 text-sm">
              <li><span className="hover:text-white transition-colors cursor-default">{t('footer_about')}</span></li>
              <li><span className="hover:text-white transition-colors cursor-default">{t('footer_careers')}</span></li>
              <li><span className="hover:text-white transition-colors cursor-default">{t('footer_privacy')}</span></li>
              <li><span className="hover:text-white transition-colors cursor-default">{t('footer_terms')}</span></li>
              <li>
                <Link to="/admin" className="hover:text-white transition-colors">
                  {t('nav_admin')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-6">{t('footer_contact')}</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Mail size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <a href="mailto:Contact@smartdigitalsolutions.com" className="hover:text-white transition-colors break-all">
                  Contact@smartdigitalsolutions.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <a href="tel:+233244774451" className="hover:text-white transition-colors">
                    +233 24 477 4451 (Appel)
                  </a>
                  <a href="https://wa.me/233555861556" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    +233 55 586 1556 (WhatsApp)
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Ghana & India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* References */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <h4 className="font-semibold text-white mb-4 text-center">{t('portfolio_title')}</h4>
          <div className="flex flex-wrap justify-center gap-4">
            {references.map((ref) => (
              <a
                key={ref}
                href={`https://${ref}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors"
              >
                {ref}
                <ExternalLink size={10} />
              </a>
            ))}
          </div>
        </div>

        {/* We Are Hiring Section */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="max-w-3xl mx-auto text-center">
            <h4 className="font-bold text-xl text-white mb-4 flex items-center justify-center gap-2">
              <span className="text-2xl">🚀</span> We Are Hiring – Join the SDMREWARDS Team
            </h4>
            <p className="text-slate-400 mb-6">
              SDMREWARDS is expanding and looking for passionate professionals to join our commercial team.
            </p>
            
            <div className="bg-slate-900/50 rounded-xl p-6 mb-6">
              <h5 className="font-semibold text-purple-400 mb-4">Open Positions:</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                <span className="bg-slate-800 px-3 py-2 rounded-lg text-slate-300">Sales Manager</span>
                <span className="bg-slate-800 px-3 py-2 rounded-lg text-slate-300">Business Dev Managers</span>
                <span className="bg-slate-800 px-3 py-2 rounded-lg text-slate-300">Field Sales Agents</span>
                <span className="bg-slate-800 px-3 py-2 rounded-lg text-slate-300">Merchant Onboarding</span>
                <span className="bg-slate-800 px-3 py-2 rounded-lg text-slate-300">Telemarketing Agents</span>
                <span className="bg-slate-800 px-3 py-2 rounded-lg text-slate-300">Partnership Manager</span>
                <span className="bg-slate-800 px-3 py-2 rounded-lg text-slate-300">Brand Ambassadors</span>
              </div>
            </div>
            
            <p className="text-slate-400 text-sm mb-4">
              Your mission will be to onboard shops, restaurants, hotels, and businesses into the SDMREWARDS ecosystem, 
              sell membership cards and help grow one of the fastest-growing rewards networks.
            </p>
            
            <a 
              href="mailto:careers@sdmrewards.com" 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-all transform hover:scale-105"
            >
              <Mail size={18} />
              Send your CV to careers@sdmrewards.com
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-800 text-center">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Smart Digital Solutions. {t('footer_rights')}
          </p>
        </div>
      </div>
    </footer>
  );
};

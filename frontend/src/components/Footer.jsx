import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/v049n7cg_WhatsApp%20Image%202026-02-28%20at%2014.31.59.jpeg";

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
                className="h-16 w-auto object-contain bg-white rounded-lg p-2"
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
                <a href="tel:+233555861556" className="hover:text-white transition-colors">
                  +233 55 586 1556
                </a>
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

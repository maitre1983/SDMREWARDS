import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, CheckCircle2, MessageCircle, FileText, Rocket, Phone } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

// API URL imported from config
import { API_URL } from '@/config/api';

export const ContactSection = () => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service_type: '',
    message: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await axios.post(`${API_URL}/api/contact`, formData);
      toast.success(t('contact_success'));
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        service_type: '',
        message: '',
      });
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error(t('contact_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const serviceOptions = [
    { value: 'starter', label: t('pricing_starter') },
    { value: 'business', label: t('pricing_business') },
    { value: 'premium', label: t('pricing_premium') },
    { value: 'mobile', label: t('pricing_mobile') },
    { value: 'other', label: t('service_custom') },
  ];

  return (
    <section id="contact" className="py-20 md:py-32 bg-slate-50" data-testid="contact-section">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              {t('contact_title')}
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              {t('contact_subtitle')}
            </p>

            {/* Benefits */}
            <div className="space-y-4 mb-8">
              {[
                { icon: MessageCircle, text: t('contact_whatsapp') },
                { icon: FileText, text: t('contact_audit') },
                { icon: Rocket, text: t('contact_start') },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <item.icon size={22} className="text-blue-600" />
                  </div>
                  <span className="font-medium text-slate-700">{item.text}</span>
                </div>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <div className="space-y-3">
              <a
                href="https://wa.me/233555861556?text=Hello!%20I%20am%20interested%20in%20your%20services."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-4 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#20BD5A] transition-colors shadow-lg shadow-green-500/20 w-full sm:w-auto"
                data-testid="contact-whatsapp-button"
              >
                <MessageCircle size={22} />
                WhatsApp: +233 55 586 1556
              </a>
              <a
                href="tel:+233244774451"
                className="inline-flex items-center gap-3 px-6 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 w-full sm:w-auto"
                data-testid="contact-phone-button"
              >
                <Phone size={22} />
                Appel: +233 24 477 4451
              </a>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <form 
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100"
              data-testid="contact-form"
            >
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('contact_name')} *
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="John Doe"
                    className="h-12 rounded-xl border-slate-200 focus:border-blue-500"
                    data-testid="contact-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('contact_email')} *
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="john@example.com"
                    className="h-12 rounded-xl border-slate-200 focus:border-blue-500"
                    data-testid="contact-email-input"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('contact_phone')}
                  </label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+233 XX XXX XXXX"
                    className="h-12 rounded-xl border-slate-200 focus:border-blue-500"
                    data-testid="contact-phone-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('contact_company')}
                  </label>
                  <Input
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Your Company"
                    className="h-12 rounded-xl border-slate-200 focus:border-blue-500"
                    data-testid="contact-company-input"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('contact_service')}
                </label>
                <select
                  name="service_type"
                  value={formData.service_type}
                  onChange={handleChange}
                  className="w-full h-12 rounded-xl border border-slate-200 px-4 bg-white text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  data-testid="contact-service-select"
                >
                  <option value="">-- Select --</option>
                  {serviceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('contact_message')} *
                </label>
                <Textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Tell us about your project..."
                  className="rounded-xl border-slate-200 focus:border-blue-500 resize-none"
                  data-testid="contact-message-input"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="contact-submit-button"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Send size={18} className="mr-2" />
                    {t('contact_send')}
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

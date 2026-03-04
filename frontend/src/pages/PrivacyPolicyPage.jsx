import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck } from 'lucide-react';

const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const lastUpdated = "March 4, 2026";

  return (
    <div className="min-h-screen bg-[#0A0E17]">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-10 h-10 rounded-xl" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="text-blue-400" size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-slate-400">SDM REWARDS – Smart Development Membership</p>
          <p className="text-slate-500 text-sm mt-2">Operated by GIT NFT Ghana Ltd</p>
          <p className="text-slate-600 text-sm mt-1">Last Updated: {lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Introduction</h2>
            <p className="text-slate-300 leading-relaxed">
              SDM REWARDS respects the privacy of its users and is committed to protecting personal data.
              This Privacy Policy explains how we collect, use, store, and protect your personal information when you use the SDM REWARDS platform.
            </p>
          </section>

          {/* Legal Disclaimer */}
          <section className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Lock className="text-blue-400" size={24} />
              Important Legal Clarification
            </h2>
            <p className="text-white font-semibold mb-4">
              SDM REWARDS is not a bank, not a financial institution, and not an investment company.
            </p>
            <p className="text-slate-300 leading-relaxed">
              The platform operates strictly as a digital loyalty and cashback technology platform.
              SDM REWARDS does not hold financial deposits or provide banking services.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Database className="text-amber-400" size={24} />
              Information We Collect
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">When you register, we may collect:</p>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                'Full Name',
                'Phone Number',
                'Email Address',
                'Username',
                'Date of Birth (optional)',
                'Device information',
                'Transaction history within the platform'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Eye className="text-emerald-400" size={24} />
              How We Use Your Information
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">Your information is used to:</p>
            <ul className="space-y-3 text-slate-400">
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                Create and manage your account
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                Process cashback rewards
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                Manage referral bonuses
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                Improve platform performance
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                Prevent fraud and abuse
              </li>
            </ul>
            <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-emerald-400 font-medium">We do not sell your personal data.</p>
            </div>
          </section>

          {/* Data Protection */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Shield className="text-blue-400" size={24} />
              Data Protection
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              We implement technical and organizational measures to protect your data including:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Shield className="text-blue-400" size={20} />
                </div>
                <p className="text-slate-300 text-sm">Secure Servers</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Lock className="text-blue-400" size={20} />
                </div>
                <p className="text-slate-300 text-sm">Encrypted Data Storage</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <UserCheck className="text-blue-400" size={20} />
                </div>
                <p className="text-slate-300 text-sm">Restricted Access</p>
              </div>
            </div>
          </section>

          {/* Sharing of Data */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Sharing of Data</h2>
            <p className="text-slate-300 leading-relaxed mb-4">Your information may only be shared:</p>
            <ul className="space-y-3 text-slate-400">
              <li className="flex items-start gap-3">
                <span className="text-amber-400 mt-1">•</span>
                With payment providers (Mobile Money / banks)
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-400 mt-1">•</span>
                With regulatory authorities when legally required
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-400 mt-1">•</span>
                With technical service providers supporting the platform
              </li>
            </ul>
          </section>

          {/* User Rights */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4">User Rights</h2>
            <p className="text-slate-300 leading-relaxed mb-4">Users have the right to:</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-amber-400 font-medium">Access</p>
                <p className="text-slate-400 text-sm mt-1">View your personal data</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-amber-400 font-medium">Correct</p>
                <p className="text-slate-400 text-sm mt-1">Request corrections</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-amber-400 font-medium">Delete</p>
                <p className="text-slate-400 text-sm mt-1">Request account deletion</p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-6 md:p-8 border border-blue-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Contact</h2>
            <p className="text-slate-300 leading-relaxed mb-4">For privacy inquiries:</p>
            <a href="mailto:support@sdmrewards.com" className="text-blue-400 hover:text-blue-300 font-medium text-lg">
              support@sdmrewards.com
            </a>
          </section>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="border-t border-slate-800 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            SDM REWARDS is a digital loyalty and cashback platform. It is not a bank, financial institution, or investment service provider.
          </p>
        </div>
      </footer>
    </div>
  );
}

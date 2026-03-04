import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Scale, AlertTriangle } from 'lucide-react';

const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function TermsOfServicePage() {
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
          <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileText className="text-amber-400" size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-slate-400">SDM REWARDS – Smart Development Membership</p>
          <p className="text-slate-500 text-sm mt-2">Operated by GIT NFT Ghana Ltd</p>
          <p className="text-slate-600 text-sm mt-1">Last Updated: {lastUpdated}</p>
        </div>

        {/* Terms Content */}
        <div className="prose prose-invert prose-slate max-w-none">
          {/* Section 1 */}
          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">1</span>
              Introduction
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Welcome to SDM REWARDS, a digital loyalty and cashback platform designed to connect consumers with partner merchants.
            </p>
            <p className="text-slate-300 leading-relaxed mt-4">
              By accessing or using the SDM REWARDS platform, website, mobile applications, or services, you agree to be bound by these Terms of Service.
            </p>
            <p className="text-slate-400 mt-4 font-medium">
              If you do not agree with these terms, you must not use the platform.
            </p>
          </section>

          {/* Section 2 - Important Disclaimer */}
          <section className="mb-10 bg-red-500/10 border border-red-500/30 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-red-400" size={18} />
              </span>
              Important Legal Disclaimer
            </h2>
            <p className="text-white font-semibold mb-4">
              SDM REWARDS is NOT a bank, financial institution, investment company, or payment processor.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              The platform operates solely as a digital loyalty and cashback technology platform.
            </p>
            <p className="text-slate-300 mb-2">SDM REWARDS does not:</p>
            <ul className="text-slate-400 space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                hold deposits
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                offer banking services
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                provide financial investment services
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                manage savings accounts
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                act as a financial intermediary
              </li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-4">
              All payments made by users are processed directly between customers and merchants through external payment systems such as Mobile Money or bank payment networks.
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">3</span>
              Description of the Service
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              SDM REWARDS is a digital rewards ecosystem that allows users to:
            </p>
            <ul className="text-slate-400 space-y-2 ml-4 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                receive cashback rewards when shopping at partner merchants
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                participate in promotional reward programs
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                refer new users and earn referral bonuses
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                use cashback for selected services such as airtime or data purchases
              </li>
            </ul>
            <div className="bg-slate-900/50 rounded-xl p-4 mt-4">
              <p className="text-slate-400 text-sm">
                <strong className="text-white">Important:</strong> SDM REWARDS does not hold merchant funds or customer deposits. Payments are transferred directly to merchants using external payment methods.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">4</span>
              Eligibility
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">To use SDM REWARDS, users must:</p>
            <ul className="text-slate-400 space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                be at least 18 years old
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                provide accurate personal information
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                register using a valid mobile phone number
              </li>
            </ul>
            <p className="text-slate-400 mt-4">
              Each user is allowed one account per phone number. The platform may suspend or delete duplicate or fraudulent accounts.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">5</span>
              Membership Cards
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Access to the cashback ecosystem requires purchasing a digital membership card.
            </p>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                <p className="text-slate-400 text-sm">Silver Card</p>
                <p className="text-2xl font-bold text-white">25 GHS</p>
              </div>
              <div className="bg-amber-500/20 rounded-xl p-4 text-center border border-amber-500/30">
                <p className="text-amber-400 text-sm">Gold Card</p>
                <p className="text-2xl font-bold text-white">50 GHS</p>
              </div>
              <div className="bg-slate-600/50 rounded-xl p-4 text-center">
                <p className="text-slate-300 text-sm">Platinum Card</p>
                <p className="text-2xl font-bold text-white">100 GHS</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm mt-4">
              Membership fees are non-refundable.
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">6</span>
              Cashback System
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Partner merchants may offer cashback rewards ranging from <strong className="text-white">1% to 20%</strong>.
            </p>
            <div className="bg-slate-900/50 rounded-xl p-4 mt-4">
              <p className="text-slate-400 text-sm mb-2">Example:</p>
              <p className="text-slate-300">Purchase: <span className="text-white font-medium">1000 GHS</span></p>
              <p className="text-slate-300">Merchant cashback: <span className="text-white font-medium">10%</span></p>
              <p className="text-emerald-400 font-medium mt-2">User receives: 100 GHS cashback</p>
            </div>
            <p className="text-slate-400 mt-4 text-sm">
              Cashback rewards are credited to the user's SDM digital wallet balance. Cashback does not represent bank money, deposits, or savings accounts.
            </p>
          </section>

          {/* Section 7-9 */}
          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">7</span>
              Platform Commissions
            </h2>
            <p className="text-slate-300 leading-relaxed">
              SDM REWARDS may apply commissions on certain cashback transactions. These commissions may include percentage-based fees and fixed service charges. No commission applies when purchasing membership cards.
            </p>
          </section>

          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">8</span>
              Cashback Usage
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">Users may use their cashback balance for:</p>
            <ul className="text-slate-400 space-y-2 ml-4">
              <li>• Airtime purchases</li>
              <li>• Internet data purchases</li>
              <li>• Selected service payments</li>
              <li>• Purchases with partner merchants</li>
              <li>• Promotional campaigns</li>
            </ul>
          </section>

          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">9</span>
              Referral Program
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">Users may invite new members through a referral program.</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                <p className="text-emerald-400 font-medium">Referrer Bonus</p>
                <p className="text-2xl font-bold text-white">3 GHS</p>
              </div>
              <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
                <p className="text-amber-400 font-medium">New Member Bonus</p>
                <p className="text-2xl font-bold text-white">1 GHS</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm mt-4">
              Rewards are granted only after the new user purchases a membership card. Fraudulent referral activity may result in account suspension.
            </p>
          </section>

          {/* Section 10-16 */}
          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">10</span>
              Merchant Participation
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Merchants may join SDM REWARDS as partner merchants. Merchants agree to provide cashback incentives to customers, respect platform rules, and process transactions honestly. SDM REWARDS reserves the right to approve or reject merchant registrations.
            </p>
          </section>

          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">11</span>
              Account Suspension
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">Accounts may be suspended or terminated for:</p>
            <ul className="text-slate-400 space-y-2 ml-4">
              <li>• Fraud or abuse</li>
              <li>• Manipulation of cashback or referral systems</li>
              <li>• Duplicate accounts</li>
              <li>• Violation of these Terms</li>
            </ul>
          </section>

          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">12</span>
              Security
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Users are responsible for maintaining the security of their accounts. SDM REWARDS is not responsible for losses caused by password sharing, unauthorized account access, or user negligence.
            </p>
          </section>

          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">13</span>
              Limitation of Liability
            </h2>
            <p className="text-slate-300 leading-relaxed">
              SDM REWARDS provides services "as is". The platform does not guarantee uninterrupted service, merchant behavior, or permanent cashback availability. Disputes between customers and merchants must be resolved between those parties.
            </p>
          </section>

          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">14</span>
              Changes to Terms
            </h2>
            <p className="text-slate-300 leading-relaxed">
              SDM REWARDS may modify these Terms at any time. Updates will be communicated through platform notifications, website updates, and email announcements. Continued use of the platform means acceptance of updated terms.
            </p>
          </section>

          <section className="mb-10 bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">15</span>
              Governing Law
            </h2>
            <p className="text-slate-300 leading-relaxed">
              These Terms are governed by the laws of the <strong className="text-white">Republic of Ghana</strong>.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-10 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-6 md:p-8 border border-amber-500/30">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">16</span>
              Contact
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">For questions regarding these Terms:</p>
            <div className="text-slate-300">
              <p className="font-medium text-white">SDM REWARDS</p>
              <p>Smart Development Membership</p>
              <p>Operated by GIT NFT Ghana Ltd</p>
              <p className="mt-4">
                <span className="text-slate-400">Email:</span>{' '}
                <a href="mailto:support@sdmrewards.com" className="text-amber-400 hover:text-amber-300">
                  support@sdmrewards.com
                </a>
              </p>
            </div>
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

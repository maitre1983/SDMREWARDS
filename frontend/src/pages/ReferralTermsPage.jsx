import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Users, Shield, AlertTriangle, Ban, CheckCircle } from 'lucide-react';

const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function ReferralTermsPage() {
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
          <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Gift className="text-pink-400" size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Referral Program Legal Terms</h1>
          <p className="text-slate-400">SDM REWARDS – Smart Development Membership</p>
          <p className="text-slate-500 text-sm mt-2">Operated by GIT NFT Ghana Ltd</p>
          <p className="text-slate-600 text-sm mt-1">Last Updated: {lastUpdated}</p>
        </div>

        {/* Important Notice */}
        <div className="bg-pink-500/10 border border-pink-500/30 rounded-2xl p-6 mb-8 text-center">
          <p className="text-pink-400 font-medium">
            Referral rewards are promotional bonuses within the SDM Rewards loyalty ecosystem and do not represent financial income or investment returns.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Section 1 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 text-sm font-bold">1</span>
              Introduction
            </h2>
            <p className="text-slate-300 leading-relaxed">
              The SDM REWARDS Referral Program allows registered users to invite new members to join the SDM REWARDS ecosystem and receive referral rewards.
            </p>
            <p className="text-slate-300 leading-relaxed mt-4">
              By participating in the referral program, users agree to comply with these Referral Program Legal Terms, as well as the general Terms of Service of the platform.
            </p>
          </section>

          {/* Section 2 - Legal Disclaimer */}
          <section className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <AlertTriangle className="text-red-400" size={24} />
              Important Legal Clarification
            </h2>
            <p className="text-white font-semibold mb-4">
              SDM REWARDS is not a bank, financial institution, or investment company.
            </p>
            <p className="text-slate-300 leading-relaxed">
              The platform operates strictly as a digital loyalty and cashback technology platform designed to reward users for participating in the SDM ecosystem.
            </p>
            <p className="text-slate-300 leading-relaxed mt-4">
              Referral rewards are promotional incentives and should not be interpreted as financial income, deposits, or investment returns.
            </p>
          </section>

          {/* Section 3 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 text-sm font-bold">3</span>
              Eligibility
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">To participate in the referral program, a user must:</p>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-3">
                <CheckCircle className="text-pink-400 mt-1 flex-shrink-0" size={16} />
                Have a valid SDM REWARDS account
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="text-pink-400 mt-1 flex-shrink-0" size={16} />
                Purchase a valid SDM membership card
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="text-pink-400 mt-1 flex-shrink-0" size={16} />
                Comply with all platform rules and policies
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="text-pink-400 mt-1 flex-shrink-0" size={16} />
                Be at least 18 years old
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 text-sm font-bold">4</span>
              Referral Mechanism
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">Each registered user receives:</p>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <p className="text-pink-400 font-medium">Unique Referral Code</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <p className="text-pink-400 font-medium">Referral QR Code</p>
              </div>
            </div>
            <p className="text-slate-300 leading-relaxed mb-2">Users may share their referral code via:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• Social media</li>
              <li>• Messaging platforms</li>
              <li>• Direct invitation</li>
            </ul>
          </section>

          {/* Section 5 - Rewards */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 text-sm font-bold">5</span>
              Referral Rewards
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              When a referred user registers and purchases a membership card, the rewards are distributed as follows:
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <p className="text-slate-400 text-sm">Referrer receives</p>
                <p className="text-3xl font-bold text-emerald-400">3 GHS</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                <p className="text-slate-400 text-sm">New member receives</p>
                <p className="text-3xl font-bold text-amber-400">1 GHS</p>
                <p className="text-slate-500 text-xs mt-1">Welcome bonus</p>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 mt-4">
              <p className="text-slate-400 text-sm">
                <strong className="text-white">Note:</strong> If the referred user registers but does not purchase a membership card, no referral rewards will be granted.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 text-sm font-bold">6</span>
              Reward Distribution
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Referral rewards are credited directly to the user's SDM cashback balance.
            </p>
            <p className="text-slate-300 leading-relaxed mb-2">These rewards may be used within the platform for:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• Cashback spending</li>
              <li>• Airtime purchases</li>
              <li>• Data purchases</li>
              <li>• Purchases with partner merchants</li>
            </ul>
            <p className="text-slate-400 text-sm mt-4 italic">
              Referral rewards are not guaranteed cash payments and remain part of the platform's loyalty ecosystem.
            </p>
          </section>

          {/* Section 7 - Prohibited */}
          <section className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">7</span>
              Prohibited Activities
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">Users may not:</p>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Create multiple accounts to generate referral rewards
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Refer themselves using multiple phone numbers
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Use bots or automated systems
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Manipulate the referral system
              </li>
            </ul>
            <div className="bg-red-500/20 rounded-xl p-4 mt-4">
              <p className="text-red-300 text-sm">
                <strong>Consequences:</strong> Any attempt to abuse the system will result in cancellation of rewards, account suspension, or permanent account termination.
              </p>
            </div>
          </section>

          {/* Sections 8-11 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 text-sm font-bold">8</span>
              Referral Limits
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">SDM REWARDS may introduce limits on referral rewards including:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• Maximum referrals per day</li>
              <li>• Maximum referrals per account</li>
              <li>• Promotional referral campaigns</li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">These limits may change at any time.</p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 text-sm font-bold">9</span>
              Program Modifications
            </h2>
            <p className="text-slate-300 leading-relaxed">
              SDM REWARDS reserves the right to modify the referral program, change reward amounts, or suspend/terminate the program at any time. Users will be notified through platform announcements.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 text-sm font-bold">10</span>
              Fraud Prevention
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">The platform uses monitoring systems to detect suspicious activity, including:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• Abnormal referral patterns</li>
              <li>• Duplicate registrations</li>
              <li>• Coordinated fraudulent behavior</li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">Accounts involved in suspicious activities may be investigated.</p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 text-sm font-bold">11</span>
              Limitation of Liability
            </h2>
            <p className="text-slate-300 leading-relaxed">
              SDM REWARDS does not guarantee that referral rewards will always be available. The platform may suspend or adjust referral rewards based on operational requirements.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 text-sm font-bold">12</span>
              Governing Law
            </h2>
            <p className="text-slate-300 leading-relaxed">
              These Referral Program Terms are governed by the laws of the <strong className="text-white">Republic of Ghana</strong>.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-2xl p-6 md:p-8 border border-pink-500/30">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 text-sm font-bold">13</span>
              Contact
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">For questions regarding the referral program:</p>
            <div className="text-slate-300">
              <p className="font-medium text-white">SDM REWARDS</p>
              <p>Smart Development Membership</p>
              <p>Operated by GIT NFT Ghana Ltd</p>
              <p className="mt-4">
                <span className="text-slate-400">Email:</span>{' '}
                <a href="mailto:support@sdmrewards.com" className="text-pink-400 hover:text-pink-300">
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

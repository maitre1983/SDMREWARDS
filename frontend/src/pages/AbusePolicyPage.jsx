import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle, Ban, Eye, Lock, UserX, Scale } from 'lucide-react';

const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function AbusePolicyPage() {
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
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="text-red-400" size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Platform Abuse & User Conduct Policy</h1>
          <p className="text-slate-400">SDM REWARDS – Smart Development Membership</p>
          <p className="text-slate-500 text-sm mt-2">Operated by GIT NFT Ghana Ltd</p>
          <p className="text-slate-600 text-sm mt-1">Last Updated: {lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Section 1 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">1</span>
              Purpose of this Policy
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              This Platform Abuse & User Conduct Policy defines the rules governing the use of the SDM REWARDS platform.
            </p>
            <p className="text-slate-300 leading-relaxed mb-2">The purpose of this policy is to:</p>
            <ul className="text-slate-400 space-y-2">
              <li>• Protect the integrity of the SDM REWARDS ecosystem</li>
              <li>• Prevent fraud and abuse</li>
              <li>• Ensure fair participation for all users and merchants</li>
            </ul>
            <p className="text-slate-400 mt-4 font-medium">All users and merchants must comply with these rules.</p>
          </section>

          {/* Section 2 - Legal Status */}
          <section className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <AlertTriangle className="text-red-400" size={24} />
              Legal Status of the Platform
            </h2>
            <p className="text-white font-semibold mb-4">
              SDM REWARDS is not a bank, not a financial institution, and not an investment company.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              The platform operates solely as a digital loyalty and cashback technology platform connecting customers with partner merchants.
            </p>
            <p className="text-slate-300 mb-2">Cashback rewards and referral bonuses are promotional incentives within the SDM ecosystem. They do not represent:</p>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Bank deposits
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Investment products
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Guaranteed financial returns
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">3</span>
              Acceptable Use of the Platform
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Users and merchants must use the platform in a lawful and responsible manner.
            </p>
            <p className="text-slate-300 leading-relaxed mb-2">All activities must comply with:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• The Terms of Service</li>
              <li>• Local laws</li>
              <li>• SDM platform policies</li>
            </ul>
          </section>

          {/* Section 4 - Prohibited Activities */}
          <section className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Ban className="text-red-400" size={24} />
              Prohibited Activities
            </h2>
            <p className="text-white font-semibold mb-4">The following activities are strictly prohibited:</p>

            {/* Account Manipulation */}
            <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
              <h3 className="text-red-400 font-semibold mb-2">Account Manipulation</h3>
              <ul className="text-slate-400 space-y-1 text-sm">
                <li>• Creating multiple user accounts</li>
                <li>• Registering multiple accounts using different phone numbers or identities</li>
                <li>• Using fake identities</li>
              </ul>
            </div>

            {/* Referral Abuse */}
            <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
              <h3 className="text-red-400 font-semibold mb-2">Referral Abuse</h3>
              <ul className="text-slate-400 space-y-1 text-sm">
                <li>• Self-referrals</li>
                <li>• Creating fake accounts to generate referral bonuses</li>
                <li>• Using automated systems or bots</li>
              </ul>
            </div>

            {/* Cashback Abuse */}
            <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
              <h3 className="text-red-400 font-semibold mb-2">Cashback Abuse</h3>
              <ul className="text-slate-400 space-y-1 text-sm">
                <li>• Generating fake transactions to earn cashback</li>
                <li>• Colluding with merchants to create artificial purchases</li>
                <li>• Manipulating transaction values</li>
              </ul>
            </div>

            {/* Merchant Abuse */}
            <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
              <h3 className="text-red-400 font-semibold mb-2">Merchant Abuse</h3>
              <ul className="text-slate-400 space-y-1 text-sm">
                <li>• Registering fake businesses</li>
                <li>• Issuing fraudulent transactions</li>
                <li>• Attempting to manipulate cashback percentages</li>
              </ul>
            </div>

            {/* Platform Exploitation */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <h3 className="text-red-400 font-semibold mb-2">Platform Exploitation</h3>
              <ul className="text-slate-400 space-y-1 text-sm">
                <li>• Attempting to hack or bypass the system</li>
                <li>• Exploiting technical vulnerabilities</li>
                <li>• Using automated scripts or bots</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Eye className="text-amber-400" size={24} />
              Monitoring and Investigation
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              SDM REWARDS actively monitors the platform for suspicious behavior.
            </p>
            <p className="text-slate-300 leading-relaxed mb-2">This includes monitoring:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• Transaction patterns</li>
              <li>• Referral activity</li>
              <li>• Merchant interactions</li>
              <li>• Account creation patterns</li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">The platform may launch investigations at any time.</p>
          </section>

          {/* Section 6 - Absolute Authority */}
          <section className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Scale className="text-amber-400" size={24} />
              Absolute Platform Authority
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              SDM REWARDS reserves the full and absolute right to take any action necessary to protect the platform.
            </p>
            <p className="text-slate-300 leading-relaxed mb-2">This includes the right to:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• Suspend user accounts</li>
              <li>• Suspend merchant accounts</li>
              <li>• Restrict account activity</li>
              <li>• Cancel cashback rewards</li>
              <li>• Cancel referral bonuses</li>
              <li>• Freeze account balances</li>
            </ul>
            <div className="bg-amber-500/20 rounded-xl p-4 mt-4">
              <p className="text-amber-300 text-sm">
                <strong>Notice:</strong> These actions may occur at any time and without prior notice if suspicious activity is detected.
              </p>
            </div>
          </section>

          {/* Section 7 - Suspension */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Lock className="text-red-400" size={24} />
              Account Suspension
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              SDM REWARDS may suspend accounts temporarily while investigating suspicious activity.
            </p>
            <p className="text-slate-300 leading-relaxed mb-2">During suspension:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• Account access may be restricted</li>
              <li>• Cashback may be frozen</li>
              <li>• Transactions may be blocked</li>
            </ul>
            <p className="text-red-400 text-sm mt-4 font-medium">
              Suspension may occur without prior notification.
            </p>
          </section>

          {/* Section 8 - Termination */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <UserX className="text-red-400" size={24} />
              Account Termination
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              SDM REWARDS reserves the right to permanently terminate accounts in cases of:
            </p>
            <ul className="text-slate-400 space-y-1">
              <li>• Fraud</li>
              <li>• Abuse of platform systems</li>
              <li>• Repeated violations of policies</li>
              <li>• Activities that threaten the security of the platform</li>
            </ul>
            <div className="bg-red-500/20 rounded-xl p-4 mt-4">
              <p className="text-red-300 text-sm">
                <strong>Warning:</strong> Termination may result in the permanent loss of cashback rewards and referral bonuses.
              </p>
            </div>
          </section>

          {/* Section 9-11 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">9</span>
              Cancellation or Adjustment of Rewards
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">SDM REWARDS may at any time:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• Reverse cashback rewards</li>
              <li>• Cancel referral bonuses</li>
              <li>• Adjust balances</li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">
              ...if the platform determines that rewards were obtained improperly.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">10</span>
              Platform Integrity Protection
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">The platform reserves the right to implement:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• Transaction limits</li>
              <li>• Referral limits</li>
              <li>• Merchant verification processes</li>
              <li>• Account verification procedures</li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">
              These measures are designed to protect the platform and its users.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">11</span>
              No Guarantee of Platform Availability
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">SDM REWARDS does not guarantee that the platform will be:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• Uninterrupted</li>
              <li>• Error-free</li>
              <li>• Continuously available</li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">
              Temporary service interruptions may occur due to maintenance or technical issues.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">12</span>
              Limitation of Liability
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">SDM REWARDS is not responsible for:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• Disputes between customers and merchants</li>
              <li>• Merchant business practices</li>
              <li>• External payment provider errors</li>
              <li>• System interruptions</li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">
              The platform operates as a digital technology service only.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">13</span>
              Policy Updates
            </h2>
            <p className="text-slate-300 leading-relaxed">
              SDM REWARDS reserves the right to modify this policy at any time. Users are responsible for reviewing updates. Continued use of the platform constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">14</span>
              Governing Law
            </h2>
            <p className="text-slate-300 leading-relaxed">
              This policy is governed by the laws of the <strong className="text-white">Republic of Ghana</strong>.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-2xl p-6 md:p-8 border border-red-500/30">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">15</span>
              Contact
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">For inquiries regarding this policy:</p>
            <div className="text-slate-300">
              <p className="font-medium text-white">SDM REWARDS</p>
              <p>Smart Development Membership</p>
              <p>Operated by GIT NFT Ghana Ltd</p>
              <p className="mt-4">
                <span className="text-slate-400">Email:</span>{' '}
                <a href="mailto:support@sdmrewards.com" className="text-red-400 hover:text-red-300">
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

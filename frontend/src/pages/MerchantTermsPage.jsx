import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Handshake, TrendingUp, Shield, AlertTriangle, Ban } from 'lucide-react';

const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function MerchantTermsPage() {
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
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Handshake className="text-emerald-400" size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Merchant Agreement</h1>
          <p className="text-slate-400">SDM REWARDS Merchant Partnership Agreement</p>
          <p className="text-slate-500 text-sm mt-2">Operated by GIT NFT Ghana Ltd</p>
          <p className="text-slate-600 text-sm mt-1">Last Updated: {lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Store className="text-emerald-400" size={24} />
              Introduction
            </h2>
            <p className="text-slate-300 leading-relaxed">
              This agreement governs the relationship between SDM REWARDS and merchants participating in the SDM cashback ecosystem.
            </p>
          </section>

          {/* Legal Status */}
          <section className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Shield className="text-emerald-400" size={24} />
              Legal Status of the Platform
            </h2>
            <p className="text-white font-semibold mb-4">
              SDM REWARDS is not a bank and not a financial institution.
            </p>
            <p className="text-slate-300 leading-relaxed">
              The platform operates as a technology platform facilitating loyalty rewards between merchants and customers.
              Merchants remain fully responsible for their business operations.
            </p>
          </section>

          {/* Merchant Responsibilities */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Merchant Responsibilities</h2>
            <p className="text-slate-300 leading-relaxed mb-4">Merchants agree to:</p>
            <ul className="space-y-3 text-slate-400">
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                Offer cashback incentives between 1% and 20%
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                Accept transactions recorded through SDM systems
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                Provide accurate business information
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                Comply with local commercial laws
              </li>
            </ul>
          </section>

          {/* Payments */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Payments</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              <strong className="text-white">Payments from customers go directly to the merchant.</strong>
            </p>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-2">SDM REWARDS does not:</p>
              <ul className="text-slate-400 space-y-2">
                <li>• Hold merchant funds</li>
                <li>• Manage merchant bank accounts</li>
                <li>• Act as a payment processor</li>
              </ul>
            </div>
            <p className="text-slate-400 text-sm mt-4">
              The platform only records transactions for cashback calculation.
            </p>
          </section>

          {/* Merchant Benefits */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <TrendingUp className="text-emerald-400" size={24} />
              Merchant Benefits
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">Merchants receive:</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-emerald-400 font-medium">New Customers</p>
                <p className="text-slate-400 text-sm mt-1">Access to SDM member base</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-emerald-400 font-medium">Customer Loyalty</p>
                <p className="text-slate-400 text-sm mt-1">Increased repeat visits</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-emerald-400 font-medium">Marketing Exposure</p>
                <p className="text-slate-400 text-sm mt-1">Visibility in SDM network</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-emerald-400 font-medium">Business Analytics</p>
                <p className="text-slate-400 text-sm mt-1">Insights and reports</p>
              </div>
            </div>
          </section>

          {/* Termination */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Termination</h2>
            <p className="text-slate-300 leading-relaxed mb-4">SDM REWARDS may suspend merchants who:</p>
            <ul className="space-y-3 text-slate-400">
              <li className="flex items-start gap-3">
                <span className="text-red-400 mt-1">•</span>
                Commit fraud
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-400 mt-1">•</span>
                Abuse the cashback system
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-400 mt-1">•</span>
                Violate platform policies
              </li>
            </ul>
          </section>

          {/* Anti-Fraud Policy */}
          <section className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <AlertTriangle className="text-red-400" size={24} />
              Anti-Fraud & Abuse Policy
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              To maintain a fair ecosystem, SDM REWARDS enforces strict anti-fraud rules.
            </p>
            
            <h3 className="text-white font-semibold mt-6 mb-3">Prohibited Activities</h3>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Creating multiple accounts
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Manipulating referral bonuses
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Fake merchant transactions
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Artificial cashback generation
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Automated or bot activity
              </li>
            </ul>

            <h3 className="text-white font-semibold mt-6 mb-3">Fraud Detection</h3>
            <p className="text-slate-400 mb-4">The platform uses systems to detect:</p>
            <ul className="space-y-2 text-slate-400">
              <li>• Abnormal transactions</li>
              <li>• Suspicious referrals</li>
              <li>• Duplicate accounts</li>
            </ul>

            <h3 className="text-white font-semibold mt-6 mb-3">Consequences of Fraud</h3>
            <p className="text-slate-400">Fraudulent activity may result in:</p>
            <ul className="space-y-2 text-slate-400 mt-2">
              <li>• Account suspension</li>
              <li>• Loss of cashback rewards</li>
              <li>• Permanent account termination</li>
            </ul>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 md:p-8 border border-emerald-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Contact</h2>
            <p className="text-slate-300 leading-relaxed mb-4">For merchant inquiries:</p>
            <a href="mailto:support@sdmrewards.com" className="text-emerald-400 hover:text-emerald-300 font-medium text-lg">
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

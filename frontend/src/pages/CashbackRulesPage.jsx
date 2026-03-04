import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, AlertTriangle, Shield, Ban, Calculator, Settings } from 'lucide-react';

const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

export default function CashbackRulesPage() {
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
            <Wallet className="text-emerald-400" size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Cashback Program Legal Rules</h1>
          <p className="text-slate-400">SDM REWARDS – Smart Development Membership</p>
          <p className="text-slate-500 text-sm mt-2">Operated by GIT NFT Ghana Ltd</p>
          <p className="text-slate-600 text-sm mt-1">Last Updated: {lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Section 1 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 text-sm font-bold">1</span>
              Introduction
            </h2>
            <p className="text-slate-300 leading-relaxed">
              The SDM REWARDS Cashback Program is a promotional loyalty program that allows registered users to receive cashback rewards when purchasing goods or services from partner merchants within the SDM REWARDS ecosystem.
            </p>
            <p className="text-slate-300 leading-relaxed mt-4">
              By using the platform or participating in the cashback program, users agree to comply with these Cashback Program Legal Rules, as well as the SDM REWARDS Terms of Service.
            </p>
          </section>

          {/* Section 2 - Important Disclaimer */}
          <section className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <AlertTriangle className="text-red-400" size={24} />
              Important Legal Disclaimer
            </h2>
            <p className="text-white font-semibold mb-4">
              SDM REWARDS is not a bank, not a financial institution, and not an investment company.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              The platform operates strictly as a digital loyalty and promotional rewards platform designed to encourage commerce between users and partner merchants.
            </p>
            <p className="text-slate-300 mb-2">Cashback rewards are promotional incentives only and do not represent:</p>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Financial deposits
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Bank balances
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Investment returns
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Savings accounts
              </li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-4">
              All payments made through the platform occur directly between customers and merchants through external payment systems such as Mobile Money or bank payment providers.
            </p>
          </section>

          {/* Section 3 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 text-sm font-bold">3</span>
              Nature of Cashback Rewards
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Cashback rewards are promotional bonuses granted by partner merchants through the SDM REWARDS platform.
            </p>
            <p className="text-slate-300 mb-2">Cashback rewards:</p>
            <ul className="text-slate-400 space-y-2">
              <li>• Have no guaranteed monetary value outside the platform ecosystem</li>
              <li>• May be used only within services offered by the SDM platform</li>
              <li>• May be subject to platform commissions or service fees</li>
            </ul>
            <p className="text-slate-400 text-sm mt-4 italic">
              The platform reserves the right to modify cashback conditions at any time.
            </p>
          </section>

          {/* Section 4 - Calculation */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Calculator className="text-emerald-400" size={24} />
              Cashback Calculation
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Partner merchants may define cashback percentages ranging between <strong className="text-white">1% and 20%</strong>.
            </p>
            <div className="bg-slate-900/50 rounded-xl p-6">
              <p className="text-slate-400 text-sm mb-3">Example:</p>
              <div className="space-y-2">
                <p className="text-slate-300">Purchase: <span className="text-white font-medium">1,000 GHS</span></p>
                <p className="text-slate-300">Cashback offered: <span className="text-white font-medium">10%</span></p>
                <div className="border-t border-slate-700 pt-2 mt-2">
                  <p className="text-emerald-400 font-medium text-lg">User receives: 100 GHS cashback</p>
                  <p className="text-slate-500 text-xs">(subject to applicable platform fees)</p>
                </div>
              </div>
            </div>
            <p className="text-slate-400 text-sm mt-4">
              Cashback rewards are credited to the user's SDM wallet balance.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 text-sm font-bold">5</span>
              Cashback Usage
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">Users may use cashback rewards for services such as:</p>
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <p className="text-emerald-400">Purchasing airtime</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <p className="text-emerald-400">Purchasing internet data</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <p className="text-emerald-400">Paying selected digital services</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <p className="text-emerald-400">Purchasing from partner merchants</p>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-amber-300 text-sm">
                <strong>Note:</strong> The platform may apply transaction commissions when cashback is used. These may include percentage-based fees or fixed service charges.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Settings className="text-emerald-400" size={24} />
              Platform Rights and Discretion
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              SDM REWARDS reserves full and exclusive discretion over the operation of the cashback program. The platform may at any time:
            </p>
            <ul className="text-slate-400 space-y-2">
              <li>• Modify cashback percentages</li>
              <li>• Modify commission structures</li>
              <li>• Modify cashback eligibility</li>
              <li>• Introduce limits on cashback usage</li>
              <li>• Suspend or terminate cashback campaigns</li>
            </ul>
            <p className="text-slate-400 text-sm mt-4 italic">
              Users acknowledge that cashback rewards are not guaranteed.
            </p>
          </section>

          {/* Section 7 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 text-sm font-bold">7</span>
              Account Monitoring and Fraud Prevention
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              To maintain platform integrity, SDM REWARDS continuously monitors activity including:
            </p>
            <ul className="text-slate-400 space-y-1">
              <li>• Transaction behavior</li>
              <li>• Referral activity</li>
              <li>• Merchant interactions</li>
              <li>• Account registrations</li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">
              The platform may investigate accounts that appear suspicious.
            </p>
          </section>

          {/* Section 8 - Suspension */}
          <section className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Shield className="text-red-400" size={24} />
              Account Suspension and Termination
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              SDM REWARDS reserves the absolute right to suspend, restrict, or terminate any account at any time if the platform suspects:
            </p>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Fraudulent behavior
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Abuse of cashback systems
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Referral manipulation
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Multiple account creation
              </li>
              <li className="flex items-start gap-3">
                <Ban className="text-red-400 mt-1 flex-shrink-0" size={16} />
                Suspicious transaction patterns
              </li>
            </ul>
            <div className="bg-red-500/20 rounded-xl p-4 mt-4">
              <p className="text-red-300 text-sm">
                <strong>Warning:</strong> Suspension may occur without prior notice. During investigations, the platform may temporarily restrict cashback usage, account access, and referral rewards.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 text-sm font-bold">9</span>
              Cancellation of Rewards
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">SDM REWARDS reserves the right to:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• Cancel cashback rewards</li>
              <li>• Reverse transactions</li>
              <li>• Remove referral bonuses</li>
              <li>• Adjust account balances</li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">
              ...if any suspicious or fraudulent activity is detected. Users acknowledge that cashback rewards are conditional promotional benefits and may be withdrawn if misuse is detected.
            </p>
          </section>

          {/* Section 10-12 */}
          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 text-sm font-bold">10</span>
              Limitation of Liability
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">SDM REWARDS is not responsible for:</p>
            <ul className="text-slate-400 space-y-1">
              <li>• Merchant business performance</li>
              <li>• Transaction disputes between customers and merchants</li>
              <li>• Technical interruptions</li>
              <li>• Cashback calculation errors due to third-party systems</li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">The platform provides services "as is".</p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 text-sm font-bold">11</span>
              Changes to the Cashback Program
            </h2>
            <p className="text-slate-300 leading-relaxed">
              SDM REWARDS may modify the cashback program at any time, including reward percentages, commission structures, and usage rules. Continued use of the platform constitutes acceptance of updated rules.
            </p>
          </section>

          <section className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 text-sm font-bold">12</span>
              Governing Law
            </h2>
            <p className="text-slate-300 leading-relaxed">
              These Cashback Program Legal Rules are governed by the laws of the <strong className="text-white">Republic of Ghana</strong>.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 md:p-8 border border-emerald-500/30">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 text-sm font-bold">13</span>
              Contact
            </h2>
            <p className="text-slate-300 leading-relaxed mb-4">For questions regarding the cashback program:</p>
            <div className="text-slate-300">
              <p className="font-medium text-white">SDM REWARDS</p>
              <p>Smart Development Membership</p>
              <p>Operated by GIT NFT Ghana Ltd</p>
              <p className="mt-4">
                <span className="text-slate-400">Email:</span>{' '}
                <a href="mailto:support@sdmrewards.com" className="text-emerald-400 hover:text-emerald-300">
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

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  CreditCard,
  Wallet,
  Users,
  Store,
  Shield,
  Phone,
  Gift,
  Banknote,
  QrCode,
  Clock
} from 'lucide-react';

const SDM_LOGO_URL = "https://customer-assets.emergentagent.com/job_web-boost-seo/artifacts/5mzvtg97_WhatsApp%20Image%202026-03-02%20at%2003.18.22.jpeg";

// FAQ Data organized by categories
const faqCategories = [
  {
    id: 'general',
    title: 'General Questions',
    titleFr: 'Questions Générales',
    icon: HelpCircle,
    color: 'amber',
    questions: [
      {
        q: "What is SDM Rewards?",
        qFr: "Qu'est-ce que SDM Rewards ?",
        a: "SDM Rewards is Ghana's premier digital loyalty and cashback platform. We connect consumers with partner merchants, allowing you to earn cashback rewards on every purchase. SDM Rewards is NOT a bank or financial institution - we are a technology platform that facilitates loyalty rewards.",
        aFr: "SDM Rewards est la première plateforme de fidélité et de cashback numérique au Ghana. Nous connectons les consommateurs aux commerçants partenaires, vous permettant de gagner des récompenses cashback sur chaque achat. SDM Rewards n'est PAS une banque ou une institution financière - nous sommes une plateforme technologique qui facilite les récompenses de fidélité."
      },
      {
        q: "Is SDM Rewards a bank?",
        qFr: "SDM Rewards est-elle une banque ?",
        a: "No. SDM Rewards is strictly a digital loyalty and cashback technology platform. We do not hold deposits, offer banking services, or act as a financial institution. All payments are processed directly between customers and merchants through external payment systems like Mobile Money.",
        aFr: "Non. SDM Rewards est strictement une plateforme technologique de fidélité et de cashback numérique. Nous ne détenons pas de dépôts, n'offrons pas de services bancaires et n'agissons pas en tant qu'institution financière. Tous les paiements sont traités directement entre les clients et les commerçants via des systèmes de paiement externes comme Mobile Money."
      },
      {
        q: "How do I get started?",
        qFr: "Comment commencer ?",
        a: "Getting started is easy! 1) Register with your phone number, 2) Verify your phone via OTP, 3) Purchase a membership card (Silver, Gold, or Platinum), 4) Start shopping at partner merchants and earn cashback!",
        aFr: "C'est facile de commencer ! 1) Inscrivez-vous avec votre numéro de téléphone, 2) Vérifiez votre téléphone via OTP, 3) Achetez une carte de membre (Silver, Gold ou Platinum), 4) Commencez à faire vos achats chez les commerçants partenaires et gagnez du cashback !"
      }
    ]
  },
  {
    id: 'cards',
    title: 'Membership Cards',
    titleFr: 'Cartes de Membre',
    icon: CreditCard,
    color: 'blue',
    questions: [
      {
        q: "What membership cards are available?",
        qFr: "Quelles cartes de membre sont disponibles ?",
        a: "We offer three membership tiers: Silver Card (GHS 25) - Basic cashback rates, Gold Card (GHS 50) - Enhanced cashback rates + priority support, Platinum Card (GHS 100) - Maximum cashback rates + VIP benefits + exclusive offers.",
        aFr: "Nous proposons trois niveaux d'adhésion : Carte Silver (25 GHS) - Taux de cashback de base, Carte Gold (50 GHS) - Taux de cashback améliorés + support prioritaire, Carte Platinum (100 GHS) - Taux de cashback maximum + avantages VIP + offres exclusives."
      },
      {
        q: "How do I purchase a membership card?",
        qFr: "Comment acheter une carte de membre ?",
        a: "After registering, go to your dashboard and select 'Get Your Card'. Choose your preferred card tier (Silver, Gold, or Platinum), enter your Mobile Money number, and complete the payment. Your card will be activated instantly!",
        aFr: "Après inscription, allez sur votre tableau de bord et sélectionnez 'Obtenir votre carte'. Choisissez votre niveau de carte préféré (Silver, Gold ou Platinum), entrez votre numéro Mobile Money et effectuez le paiement. Votre carte sera activée instantanément !"
      },
      {
        q: "Are membership fees refundable?",
        qFr: "Les frais d'adhésion sont-ils remboursables ?",
        a: "Membership fees are non-refundable. However, your membership gives you access to the entire SDM Rewards ecosystem and the ability to earn cashback on all your purchases at partner merchants.",
        aFr: "Les frais d'adhésion ne sont pas remboursables. Cependant, votre adhésion vous donne accès à tout l'écosystème SDM Rewards et la possibilité de gagner du cashback sur tous vos achats chez les commerçants partenaires."
      },
      {
        q: "Can I upgrade my card?",
        qFr: "Puis-je améliorer ma carte ?",
        a: "Yes! You can upgrade your card at any time by paying the difference between your current card and the new tier. Visit your dashboard to upgrade.",
        aFr: "Oui ! Vous pouvez améliorer votre carte à tout moment en payant la différence entre votre carte actuelle et le nouveau niveau. Visitez votre tableau de bord pour mettre à niveau."
      }
    ]
  },
  {
    id: 'cashback',
    title: 'Cashback & Rewards',
    titleFr: 'Cashback & Récompenses',
    icon: Wallet,
    color: 'emerald',
    questions: [
      {
        q: "How does cashback work?",
        qFr: "Comment fonctionne le cashback ?",
        a: "When you shop at SDM partner merchants, you earn a percentage of your purchase back as cashback. Rates vary from 1% to 20% depending on the merchant and your card tier. For example, if you spend GHS 100 at a merchant offering 10% cashback, you earn GHS 10!",
        aFr: "Lorsque vous faites vos achats chez les commerçants partenaires SDM, vous gagnez un pourcentage de votre achat sous forme de cashback. Les taux varient de 1% à 20% selon le commerçant et votre niveau de carte. Par exemple, si vous dépensez 100 GHS chez un commerçant offrant 10% de cashback, vous gagnez 10 GHS !"
      },
      {
        q: "When is cashback credited?",
        qFr: "Quand le cashback est-il crédité ?",
        a: "Cashback is credited to your SDM wallet instantly after your payment to the merchant is confirmed. You'll also receive an SMS notification.",
        aFr: "Le cashback est crédité sur votre portefeuille SDM instantanément après la confirmation de votre paiement au commerçant. Vous recevrez également une notification SMS."
      },
      {
        q: "What can I use my cashback for?",
        qFr: "À quoi puis-je utiliser mon cashback ?",
        a: "You can use your cashback balance for: Airtime purchases, Internet data bundles, Payments at partner merchants, Withdrawal to your Mobile Money account (minimum GHS 5).",
        aFr: "Vous pouvez utiliser votre solde cashback pour : Achats de crédit téléphonique, Forfaits de données Internet, Paiements chez les commerçants partenaires, Retrait vers votre compte Mobile Money (minimum 5 GHS)."
      },
      {
        q: "Is my cashback balance real money?",
        qFr: "Mon solde cashback est-il de l'argent réel ?",
        a: "Your cashback balance represents loyalty rewards, not bank deposits. However, you can withdraw your cashback to Mobile Money and use it as real money. Remember: SDM Rewards is a loyalty platform, not a savings account.",
        aFr: "Votre solde cashback représente des récompenses de fidélité, pas des dépôts bancaires. Cependant, vous pouvez retirer votre cashback vers Mobile Money et l'utiliser comme de l'argent réel. Rappelez-vous : SDM Rewards est une plateforme de fidélité, pas un compte d'épargne."
      }
    ]
  },
  {
    id: 'payments',
    title: 'Payments & Withdrawals',
    titleFr: 'Paiements & Retraits',
    icon: Banknote,
    color: 'purple',
    questions: [
      {
        q: "How do I pay at partner merchants?",
        qFr: "Comment payer chez les commerçants partenaires ?",
        a: "Open the SDM app, tap 'Scan QR', scan the merchant's QR code, enter the payment amount, and confirm via Mobile Money. Your cashback is credited instantly!",
        aFr: "Ouvrez l'application SDM, appuyez sur 'Scanner QR', scannez le code QR du commerçant, entrez le montant du paiement et confirmez via Mobile Money. Votre cashback est crédité instantanément !"
      },
      {
        q: "How do I withdraw my cashback?",
        qFr: "Comment retirer mon cashback ?",
        a: "Go to your dashboard, tap 'Withdraw to MoMo', enter the amount (minimum GHS 5), confirm your Mobile Money number, and submit. Funds are transferred to your MoMo account.",
        aFr: "Allez sur votre tableau de bord, appuyez sur 'Retirer vers MoMo', entrez le montant (minimum 5 GHS), confirmez votre numéro Mobile Money et soumettez. Les fonds sont transférés sur votre compte MoMo."
      },
      {
        q: "What payment methods are accepted?",
        qFr: "Quels modes de paiement sont acceptés ?",
        a: "We accept Mobile Money payments from all major Ghana networks: MTN MoMo, Telecel (ex-Vodafone), and AirtelTigo (AT) Money.",
        aFr: "Nous acceptons les paiements Mobile Money de tous les principaux réseaux du Ghana : MTN MoMo, Telecel (ex-Vodafone) et AirtelTigo (AT) Money."
      },
      {
        q: "Are there withdrawal fees?",
        qFr: "Y a-t-il des frais de retrait ?",
        a: "Currently, there are no fees for withdrawing your cashback to Mobile Money. The minimum withdrawal amount is GHS 5 and maximum is GHS 1,000 per transaction.",
        aFr: "Actuellement, il n'y a pas de frais pour retirer votre cashback vers Mobile Money. Le montant minimum de retrait est de 5 GHS et le maximum est de 1 000 GHS par transaction."
      }
    ]
  },
  {
    id: 'referral',
    title: 'Referral Program',
    titleFr: 'Programme de Parrainage',
    icon: Gift,
    color: 'pink',
    questions: [
      {
        q: "How does the referral program work?",
        qFr: "Comment fonctionne le programme de parrainage ?",
        a: "Share your unique referral code with friends. When they sign up and purchase a membership card, you earn GHS 3 and they receive GHS 1 welcome bonus!",
        aFr: "Partagez votre code de parrainage unique avec vos amis. Lorsqu'ils s'inscrivent et achètent une carte de membre, vous gagnez 3 GHS et ils reçoivent 1 GHS de bonus de bienvenue !"
      },
      {
        q: "Where do I find my referral code?",
        qFr: "Où trouver mon code de parrainage ?",
        a: "Your referral code is displayed on your dashboard. You can also share it directly via WhatsApp, Facebook, or Twitter using the share buttons.",
        aFr: "Votre code de parrainage est affiché sur votre tableau de bord. Vous pouvez également le partager directement via WhatsApp, Facebook ou Twitter en utilisant les boutons de partage."
      },
      {
        q: "When do I receive my referral bonus?",
        qFr: "Quand reçois-je mon bonus de parrainage ?",
        a: "Your GHS 3 referral bonus is credited to your wallet immediately after your referred friend purchases their first membership card.",
        aFr: "Votre bonus de parrainage de 3 GHS est crédité sur votre portefeuille immédiatement après que votre ami parrainé ait acheté sa première carte de membre."
      }
    ]
  },
  {
    id: 'merchants',
    title: 'For Merchants',
    titleFr: 'Pour les Commerçants',
    icon: Store,
    color: 'teal',
    questions: [
      {
        q: "How can my business join SDM Rewards?",
        qFr: "Comment mon entreprise peut-elle rejoindre SDM Rewards ?",
        a: "Visit our merchant registration page, fill in your business details, verify your phone number, and submit for approval. Our team will review and activate your account.",
        aFr: "Visitez notre page d'inscription commerçant, remplissez les détails de votre entreprise, vérifiez votre numéro de téléphone et soumettez pour approbation. Notre équipe examinera et activera votre compte."
      },
      {
        q: "What are the benefits for merchants?",
        qFr: "Quels sont les avantages pour les commerçants ?",
        a: "Partner merchants get: Access to thousands of SDM members, increased customer loyalty, marketing exposure in the SDM network, business analytics dashboard, and no setup fees.",
        aFr: "Les commerçants partenaires bénéficient de : Accès à des milliers de membres SDM, fidélisation accrue des clients, exposition marketing dans le réseau SDM, tableau de bord analytique, et aucun frais d'installation."
      },
      {
        q: "How do I receive payments?",
        qFr: "Comment recevoir les paiements ?",
        a: "Payments go directly to your Mobile Money account. SDM Rewards does not hold your funds - we only facilitate the loyalty rewards system.",
        aFr: "Les paiements vont directement sur votre compte Mobile Money. SDM Rewards ne détient pas vos fonds - nous facilitons uniquement le système de récompenses de fidélité."
      },
      {
        q: "How do I set my cashback rate?",
        qFr: "Comment définir mon taux de cashback ?",
        a: "You can set your cashback rate between 1% and 20% from your merchant dashboard. Higher rates attract more customers!",
        aFr: "Vous pouvez définir votre taux de cashback entre 1% et 20% depuis votre tableau de bord commerçant. Des taux plus élevés attirent plus de clients !"
      }
    ]
  },
  {
    id: 'security',
    title: 'Security & Support',
    titleFr: 'Sécurité & Support',
    icon: Shield,
    color: 'red',
    questions: [
      {
        q: "Is my data safe?",
        qFr: "Mes données sont-elles en sécurité ?",
        a: "Yes. We use industry-standard security measures including encrypted data storage, secure servers, and restricted access to personal information. We never sell your data.",
        aFr: "Oui. Nous utilisons des mesures de sécurité standard de l'industrie, notamment le stockage de données chiffrées, des serveurs sécurisés et un accès restreint aux informations personnelles. Nous ne vendons jamais vos données."
      },
      {
        q: "What if I suspect fraud on my account?",
        qFr: "Que faire si je suspecte une fraude sur mon compte ?",
        a: "Contact us immediately at support@sdmrewards.com. We take fraud very seriously and will investigate promptly. You can also change your password from your profile settings.",
        aFr: "Contactez-nous immédiatement à support@sdmrewards.com. Nous prenons la fraude très au sérieux et enquêterons rapidement. Vous pouvez également changer votre mot de passe depuis les paramètres de votre profil."
      },
      {
        q: "How do I contact support?",
        qFr: "Comment contacter le support ?",
        a: "Email us at support@sdmrewards.com. Our team responds within 24 hours on business days.",
        aFr: "Envoyez-nous un email à support@sdmrewards.com. Notre équipe répond dans les 24 heures les jours ouvrables."
      }
    ]
  }
];

// Accordion Item Component
const FAQItem = ({ question, answer, isOpen, onToggle }) => {
  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-white font-medium pr-4">{question}</span>
        {isOpen ? (
          <ChevronUp className="text-amber-400 flex-shrink-0" size={20} />
        ) : (
          <ChevronDown className="text-slate-400 flex-shrink-0" size={20} />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-4 text-slate-400 leading-relaxed border-t border-slate-700/30">
          <p className="pt-4">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default function FAQPage() {
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState({});
  const [activeCategory, setActiveCategory] = useState('general');
  const [language, setLanguage] = useState('en'); // 'en' or 'fr'

  const toggleItem = (categoryId, questionIndex) => {
    const key = `${categoryId}-${questionIndex}`;
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getColorClasses = (color) => {
    const colors = {
      amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
      blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
      emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
      purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
      pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
      teal: { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30' },
      red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' }
    };
    return colors[color] || colors.amber;
  };

  const activeData = faqCategories.find(c => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-[#0A0E17]">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  language === 'en' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('fr')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  language === 'fr' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                FR
              </button>
            </div>
            <img src={SDM_LOGO_URL} alt="SDM Rewards" className="w-10 h-10 rounded-xl" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-16 text-center px-4">
        <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <HelpCircle className="text-amber-400" size={32} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {language === 'en' ? 'Frequently Asked Questions' : 'Questions Fréquemment Posées'}
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          {language === 'en' 
            ? 'Find answers to common questions about SDM Rewards, cashback, membership cards, and more.'
            : 'Trouvez des réponses aux questions courantes sur SDM Rewards, le cashback, les cartes de membre et plus encore.'}
        </p>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Category Navigation */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-2">
              <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-4 px-3">
                {language === 'en' ? 'Categories' : 'Catégories'}
              </h3>
              {faqCategories.map(category => {
                const colors = getColorClasses(category.color);
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      isActive 
                        ? `${colors.bg} ${colors.border} border` 
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors.bg}`}>
                      <category.icon className={colors.text} size={18} />
                    </div>
                    <span className={isActive ? 'text-white font-medium' : 'text-slate-400'}>
                      {language === 'en' ? category.title : category.titleFr}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Questions */}
          <div className="flex-1">
            {activeData && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getColorClasses(activeData.color).bg}`}>
                    <activeData.icon className={getColorClasses(activeData.color).text} size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    {language === 'en' ? activeData.title : activeData.titleFr}
                  </h2>
                </div>

                <div className="space-y-3">
                  {activeData.questions.map((item, idx) => (
                    <FAQItem
                      key={idx}
                      question={language === 'en' ? item.q : item.qFr}
                      answer={language === 'en' ? item.a : item.aFr}
                      isOpen={openItems[`${activeData.id}-${idx}`]}
                      onToggle={() => toggleItem(activeData.id, idx)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Contact Section */}
        <section className="mt-16 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">
            {language === 'en' ? "Still have questions?" : "Vous avez encore des questions ?"}
          </h3>
          <p className="text-slate-400 mb-6">
            {language === 'en' 
              ? "Our support team is here to help you"
              : "Notre équipe de support est là pour vous aider"}
          </p>
          <a 
            href="mailto:support@sdmrewards.com"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-all"
          >
            <Phone size={18} />
            {language === 'en' ? 'Contact Support' : 'Contacter le Support'}
          </a>
        </section>
      </main>

      {/* Footer Disclaimer */}
      <footer className="border-t border-slate-800 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            SDM REWARDS is a digital loyalty and cashback platform. It is not a bank, financial institution, or investment service provider.
          </p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="/terms" className="text-slate-500 hover:text-amber-400 text-sm">Terms of Service</a>
            <a href="/privacy" className="text-slate-500 hover:text-amber-400 text-sm">Privacy Policy</a>
            <a href="/" className="text-slate-500 hover:text-amber-400 text-sm">Back to Home</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

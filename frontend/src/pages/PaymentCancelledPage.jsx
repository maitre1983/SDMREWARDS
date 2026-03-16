import React from "react";
import { useNavigate } from "react-router-dom";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";

const PaymentCancelledPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
              <XCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mt-6 mb-2">Paiement Annulé</h1>
          <p className="text-slate-400">Vous avez annulé le processus de paiement</p>
        </div>

        {/* Info Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Pas de souci!</h3>
              <p className="text-slate-400 text-sm">
                Votre achat n'a pas été finalisé. Vous pouvez réessayer à tout moment depuis votre tableau de bord.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Reminder */}
        <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl p-4 border border-purple-500/20 mb-6">
          <h4 className="text-white font-medium mb-3">Avantages de la carte SDM:</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
              Cashback sur tous vos achats
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
              Accès à tous les marchands partenaires
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
              Bonus de parrainage attractifs
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate("/client/dashboard")}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/20"
          >
            Réessayer l'achat
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelledPage;

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, CreditCard, Gift, Clock, ArrowRight, Sparkles, Home, RefreshCw } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading, success, pending, failed
  const [paymentData, setPaymentData] = useState(null);
  const [cardData, setCardData] = useState(null);
  const clientReference = searchParams.get("ref");

  useEffect(() => {
    if (clientReference) {
      checkPaymentStatus();
    } else {
      setStatus("no_ref");
    }
  }, [clientReference]);

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments/cards/check-status/${clientReference}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      const data = await response.json();
      
      if (data.status === "completed") {
        setStatus("success");
        setCardData(data.card);
      } else if (data.status === "pending") {
        setStatus("pending");
      } else {
        setStatus("failed");
      }
      setPaymentData(data);
    } catch (error) {
      console.error("Error checking payment:", error);
      setStatus("error");
    }
  };

  const getCardColor = (cardType) => {
    const colors = {
      silver: "from-slate-400 to-slate-600",
      gold: "from-yellow-400 to-amber-600",
      platinum: "from-slate-300 to-slate-500"
    };
    return colors[cardType] || "from-purple-500 to-indigo-600";
  };

  const getWelcomeBonus = (cardType) => {
    const bonuses = { silver: 1, gold: 2, platinum: 3 };
    return bonuses[cardType] || 1;
  };

  // Loading State
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Vérification du paiement...</p>
        </div>
      </div>
    );
  }

  // No Reference
  if (status === "no_ref") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Page de confirmation</h2>
          <p className="text-slate-400 mb-6">Cette page affiche le résultat de votre achat de carte après paiement.</p>
          <button
            onClick={() => navigate("/client")}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Payment Success
  if (status === "success") {
    const cardType = cardData?.card_type || "silver";
    const welcomeBonus = getWelcomeBonus(cardType);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mt-6 mb-2">Payment Successful!</h1>
            <p className="text-slate-400">Your SDM Rewards card is now active</p>
          </div>

          {/* Card Preview */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 mb-6">
            <div className={`bg-gradient-to-br ${getCardColor(cardType)} rounded-xl p-6 relative overflow-hidden mb-6`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-white/80 text-sm font-medium">SDM REWARDS</span>
                  <Sparkles className="w-6 h-6 text-white/80" />
                </div>
                
                <div className="mb-4">
                  <p className="text-white/60 text-xs mb-1">Card Number</p>
                  <p className="text-white text-lg font-mono tracking-wider">
                    {cardData?.card_number || "SDM-****-****"}
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-xs mb-1">Type</p>
                    <p className="text-white font-semibold capitalize">{cardType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-xs mb-1">Expires</p>
                    <p className="text-white font-medium">
                      {cardData?.expires_at 
                        ? new Date(cardData.expires_at).toLocaleDateString('en-US')
                        : "---"
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Welcome Bonus */}
            <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Gift className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">Welcome bonus credited!</p>
                  <p className="text-slate-400 text-sm">GHS {welcomeBonus.toFixed(2)} added to your cashback balance</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-400">+{welcomeBonus}</span>
                  <p className="text-slate-500 text-xs">GHS</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate("/client/dashboard")}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
            >
              Go to my dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Payment Pending
  if (status === "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-10 h-10 text-amber-400 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment in progress...</h1>
            <p className="text-slate-400">Please confirm the payment on your phone</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Reference</span>
                <span className="text-white font-mono text-sm">{clientReference}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <span className="text-amber-400 font-medium">Pending</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={checkPaymentStatus}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Check status
            </button>
            <button
              onClick={() => navigate("/client")}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Payment Failed or Error
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment Failed</h1>
        <p className="text-slate-400 mb-6">
          {paymentData?.message || "An error occurred while processing your payment."}
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => navigate("/client/dashboard")}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-semibold transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;

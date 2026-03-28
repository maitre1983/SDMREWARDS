import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, CreditCard, Gift, Clock, ArrowRight, Sparkles, Home, RefreshCw, XCircle } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading, success, pending, failed
  const [paymentData, setPaymentData] = useState(null);
  const [cardData, setCardData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const clientReference = searchParams.get("ref");
  const isUpgrade = searchParams.get("upgrade") === "true";

  useEffect(() => {
    if (clientReference) {
      checkPaymentStatus();
    } else {
      setStatus("no_ref");
    }
  }, [clientReference]);

  // Auto-retry for pending payments
  useEffect(() => {
    if (status === "pending" && retryCount < 10) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        checkPaymentStatus();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, retryCount]);

  const checkPaymentStatus = async () => {
    try {
      // Try the checkout callback verification endpoint first
      const response = await fetch(`${API_URL}/api/payments/verify-checkout/${clientReference}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      
      const data = await response.json();
      
      if (data.status === "completed" || data.status === "success") {
        setStatus("success");
        setCardData(data.card);
      } else if (data.status === "pending" || data.status === "checkout_initiated" || data.status === "processing") {
        setStatus("pending");
      } else if (data.status === "failed") {
        setStatus("failed");
      } else {
        // If still unknown, try again
        setStatus("pending");
      }
      setPaymentData(data);
    } catch (error) {
      console.error("Error checking payment:", error);
      // On error, try the legacy endpoint
      try {
        const legacyRes = await fetch(`${API_URL}/api/payments/check-status/${clientReference}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        const legacyData = await legacyRes.json();
        if (legacyData.status === "completed") {
          setStatus("success");
          setCardData(legacyData.card);
        } else {
          setStatus("pending");
        }
        setPaymentData(legacyData);
      } catch (e) {
        setStatus("error");
      }
    }
  };

  const getCardColor = (cardType) => {
    const colors = {
      silver: "from-slate-400 to-slate-600",
      gold: "from-yellow-400 to-amber-600",
      platinum: "from-slate-300 to-slate-500"
    };
    return colors[cardType?.toLowerCase()] || "from-purple-500 to-indigo-600";
  };

  const getWelcomeBonus = (cardType) => {
    const bonuses = { silver: 1, gold: 2, platinum: 3 };
    return bonuses[cardType?.toLowerCase()] || 1;
  };

  // Loading State
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Verifying payment...</p>
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
          <h2 className="text-xl text-white font-semibold mb-2">Payment Reference Not Found</h2>
          <p className="text-slate-400 mb-6">Please check your payment link or return to your dashboard.</p>
          <button
            onClick={() => navigate("/client/dashboard")}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Error State
  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl text-white font-semibold mb-2">Verification Error</h2>
          <p className="text-slate-400 mb-6">Unable to verify your payment. Please check your dashboard or contact support.</p>
          <button
            onClick={() => navigate("/client/dashboard")}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Pending State
  if (status === "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 max-w-md w-full text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-amber-400" />
            </div>
            <div className="absolute inset-0 w-20 h-20 mx-auto border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl text-white font-bold mb-2">Payment Processing</h2>
          <p className="text-slate-400 mb-6">
            Your payment is being processed. This page will update automatically.
          </p>
          <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
            <p className="text-slate-300 text-sm">
              Reference: <span className="text-white font-mono">{clientReference}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={checkPaymentStatus}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Check Status
            </button>
            <button
              onClick={() => navigate("/client/dashboard")}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Failed State
  if (status === "failed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl text-white font-bold mb-2">Payment Failed</h2>
          <p className="text-slate-400 mb-6">
            {paymentData?.message || "Your payment could not be completed. Please try again."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/client/dashboard")}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate("/client/dashboard")}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success State
  const cardType = cardData?.card_type || paymentData?.card_type || "silver";
  const welcomeBonus = getWelcomeBonus(cardType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">
            {isUpgrade ? "Card Upgraded!" : "Payment Successful!"}
          </h1>
          <p className="text-slate-400">
            {isUpgrade 
              ? "Your card has been upgraded successfully"
              : "Your membership card is now active"
            }
          </p>
        </div>

        {/* Card Preview */}
        <div className={`bg-gradient-to-br ${getCardColor(cardType)} rounded-2xl p-6 mb-6 shadow-2xl`}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-white/80" />
              <span className="text-white/80 font-semibold">SDM REWARDS</span>
            </div>
            <span className="text-white font-bold uppercase">{cardType}</span>
          </div>
          <div className="mb-6">
            <div className="text-white/60 text-sm mb-1">Card Member</div>
            <div className="text-white text-lg font-semibold">
              {paymentData?.client_name || "Member"}
            </div>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-white/60 text-xs">Valid For</div>
              <div className="text-white font-medium">{cardData?.duration_days || 365} Days</div>
            </div>
            <CreditCard className="w-10 h-10 text-white/40" />
          </div>
        </div>

        {/* Welcome Bonus */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl p-4 mb-6 border border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500/30 rounded-full flex items-center justify-center">
              <Gift className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Welcome Bonus!</h3>
              <p className="text-amber-300 text-sm">GHS {welcomeBonus} added to your cashback balance</p>
            </div>
          </div>
        </div>

        {/* Card Benefits */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">Your {cardType.charAt(0).toUpperCase() + cardType.slice(1)} Benefits</h3>
          <ul className="space-y-3 text-slate-300 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Cashback on all purchases at partner merchants
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Access to exclusive deals and promotions
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Earn GHS 3 for each friend you refer
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Digital card - no physical card needed
            </li>
          </ul>
        </div>

        {/* Actions */}
        <button
          onClick={() => navigate("/client/dashboard")}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
        >
          Go to Dashboard
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          onClick={() => navigate("/")}
          className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;

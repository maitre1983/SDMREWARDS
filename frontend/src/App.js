import "@/App.css";
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { LanguageProvider } from "./context/LanguageContext";

// Loading Spinner Component
const PageLoader = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  </div>
);

// Lazy load all pages for better initial load time
const HomePage = lazy(() => import("./pages/HomePage"));
const ClientAuthPage = lazy(() => import("./pages/ClientAuthPage"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientProfilePage = lazy(() => import("./pages/ClientProfilePage"));
const PartnersPage = lazy(() => import("./pages/PartnersPage"));
const PayPage = lazy(() => import("./pages/PayPage"));
const MerchantAuthPage = lazy(() => import("./pages/MerchantAuthPage"));
const MerchantDashboard = lazy(() => import("./pages/MerchantDashboard"));
const MerchantHistoryPage = lazy(() => import("./pages/MerchantHistoryPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// Legal Pages - Lazy loaded
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const MerchantTermsPage = lazy(() => import("./pages/MerchantTermsPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const ReferralTermsPage = lazy(() => import("./pages/ReferralTermsPage"));
const CashbackRulesPage = lazy(() => import("./pages/CashbackRulesPage"));
const AbusePolicyPage = lazy(() => import("./pages/AbusePolicyPage"));

// Generate admin paths with date-based security (format: DDMMYY)
const getAdminPaths = () => {
  const paths = [];
  for (let offset = -1; offset <= 1; offset++) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    paths.push(`/admin${day}${month}${year}`);
  }
  return paths;
};

function App() {
  const adminPaths = getAdminPaths();
  
  return (
    <LanguageProvider>
      <div className="App">
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          toastOptions={{
            style: {
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            },
          }}
        />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Landing Page */}
              <Route path="/" element={<HomePage />} />
              
              {/* Client Routes */}
              <Route path="/client" element={<ClientAuthPage />} />
              <Route path="/client/dashboard" element={<ClientDashboard />} />
              <Route path="/client/profile" element={<ClientProfilePage />} />
              <Route path="/client/partners" element={<PartnersPage />} />
              
              {/* Pay Route */}
              <Route path="/pay/:merchantCode" element={<PayPage />} />
              
              {/* Registration with referral */}
              <Route path="/register" element={<ClientAuthPage />} />
              
              {/* Merchant Routes */}
              <Route path="/merchant" element={<MerchantAuthPage />} />
              <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
              <Route path="/merchant/history" element={<MerchantHistoryPage />} />
              
              {/* Legal Pages */}
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/merchant-terms" element={<MerchantTermsPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/referral-terms" element={<ReferralTermsPage />} />
              <Route path="/cashback-rules" element={<CashbackRulesPage />} />
              <Route path="/abuse-policy" element={<AbusePolicyPage />} />
              
              {/* Admin Routes */}
              {adminPaths.map(path => (
                <Route key={path} path={path} element={<AdminDashboard />} />
              ))}
              
              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </div>
    </LanguageProvider>
  );
}

export default App;

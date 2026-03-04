import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { LanguageProvider } from "./context/LanguageContext";

// Pages
import HomePage from "./pages/HomePage";
import ClientAuthPage from "./pages/ClientAuthPage";
import ClientDashboard from "./pages/ClientDashboard";
import PartnersPage from "./pages/PartnersPage";
import MerchantAuthPage from "./pages/MerchantAuthPage";
import MerchantDashboard from "./pages/MerchantDashboard";
import AdminDashboard from "./pages/AdminDashboard";

// Generate admin paths with date-based security
const getAdminPaths = () => {
  const paths = [];
  for (let offset = -1; offset <= 1; offset++) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    paths.push(`/admin${day}${month}${year}`);
  }
  return paths;
};

const getTodayAdminPath = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `/admin${day}${month}${year}`;
};

function App() {
  const adminPaths = getAdminPaths();
  const todayAdminPath = getTodayAdminPath();
  
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
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<HomePage />} />
            
            {/* Client Routes */}
            <Route path="/client" element={<ClientAuthPage />} />
            <Route path="/client/dashboard" element={<ClientDashboard />} />
            <Route path="/client/partners" element={<PartnersPage />} />
            
            {/* Merchant Routes */}
            <Route path="/merchant" element={<MerchantAuthPage />} />
            <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<Navigate to={todayAdminPath} replace />} />
            {adminPaths.map(path => (
              <Route key={path} path={path} element={<AdminDashboard />} />
            ))}
            
            {/* Legacy redirects */}
            <Route path="/sdm/client" element={<Navigate to="/client" replace />} />
            <Route path="/sdm/merchant" element={<Navigate to="/merchant" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </LanguageProvider>
  );
}

export default App;

import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import SDMClientPage from "./pages/SDMClientPage";
import SDMMerchantPage from "./pages/SDMMerchantPage";
import SDMRewardsPage from "./pages/SDMRewardsPage";

// Generate dynamic admin URL based on current date (DDMMYY format)
const getAdminPath = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  return `/admin${day}${month}${year}`;
};

function App() {
  const adminPath = getAdminPath();
  
  return (
    <LanguageProvider>
      <AuthProvider>
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
              <Route path="/" element={<HomePage />} />
              {/* Dynamic admin route - shows login or dashboard based on auth state */}
              <Route path={adminPath} element={<AdminPage />} />
              {/* Redirect any other admin* routes to home */}
              <Route path="/admin*" element={<Navigate to="/" replace />} />
              <Route path="/sdm/client" element={<SDMClientPage />} />
              <Route path="/sdm/merchant" element={<SDMMerchantPage />} />
              <Route path="/sdm/rewards" element={<SDMRewardsPage />} />
            </Routes>
          </BrowserRouter>
        </div>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;

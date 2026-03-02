import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import SDMClientPage from "./pages/SDMClientPage";
import SDMMerchantPage from "./pages/SDMMerchantPage";
import SDMRewardsPage from "./pages/SDMRewardsPage";

// Generate dynamic admin URL based on current date (DDMMYY format)
const getAdminPath = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  return `/${day}${month}${year}`;
};

// Admin route component that checks the dynamic path
const DynamicAdminRoute = () => {
  const currentPath = window.location.pathname;
  const validAdminPath = getAdminPath();
  
  if (currentPath === validAdminPath) {
    return <AdminDashboardPage />;
  }
  return <Navigate to="/" replace />;
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
              <Route path="/admin" element={<AdminLoginPage adminPath={adminPath} />} />
              <Route path={adminPath} element={<AdminDashboardPage />} />
              {/* Fallback for old admin routes */}
              <Route path="/admin*" element={<Navigate to="/admin" replace />} />
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

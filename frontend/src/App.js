import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import SDMClientPage from "./pages/SDMClientPage";
import SDMMerchantPage from "./pages/SDMMerchantPage";
import SDMRewardsPage from "./pages/SDMRewardsPage";

// Generate possible admin paths for current and adjacent days
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

// Get today's admin path
const getTodayAdminPath = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  return `/admin${day}${month}${year}`;
};

function App() {
  const adminPaths = getAdminPaths();
  const todayAdminPath = getTodayAdminPath();
  
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
              {/* Admin login redirect */}
              <Route path="/admin" element={<Navigate to={todayAdminPath} replace />} />
              {/* Admin routes - today's date plus buffer */}
              {adminPaths.map(path => (
                <Route key={path} path={path} element={<AdminPage />} />
              ))}
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

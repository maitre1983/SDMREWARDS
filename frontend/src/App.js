import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
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

function App() {
  const adminPaths = getAdminPaths();
  
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

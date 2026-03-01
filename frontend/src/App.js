import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import SDMClientPage from "./pages/SDMClientPage";
import SDMMerchantPage from "./pages/SDMMerchantPage";

function App() {
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
              <Route path="/admin" element={<AdminLoginPage />} />
              <Route path="/admin280226" element={<AdminDashboardPage />} />
              <Route path="/sdm/client" element={<SDMClientPage />} />
              <Route path="/sdm/merchant" element={<SDMMerchantPage />} />
            </Routes>
          </BrowserRouter>
        </div>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;

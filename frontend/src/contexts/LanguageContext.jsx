import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// API URL imported from config
import { API_URL } from '@/config/api';

// Language Context
const LanguageContext = createContext();

// Default translations (fallback)
const defaultTranslations = {
  common: {
    home: "Home",
    history: "History",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close"
  },
  dashboard: {
    cashback_balance: "Cashback Balance",
    total_earned: "Total Earned",
    total_spent: "Total Spent",
    recent_activity: "Recent Activity",
    services: "Services",
    withdraw: "Withdraw"
  },
  ai: {
    assistant: "AI Assistant",
    analyzing: "Analyzing your data...",
    recommendations: "Recommendations"
  }
};

export function LanguageProvider({ children }) {
  // Force English as the default and only language
  const [language, setLanguage] = useState('en');
  
  const [translations, setTranslations] = useState(defaultTranslations);
  const [isLoading, setIsLoading] = useState(false);

  // Set language to English on mount
  useEffect(() => {
    setLanguage('en');
    localStorage.setItem('sdm_language', 'en');
  }, []);

  // Load translations when language changes
  useEffect(() => {
    loadTranslations(language);
    localStorage.setItem('sdm_language', language);
    
    // Update HTML lang attribute
    document.documentElement.lang = language;
  }, [language]);

  const detectAndSyncLanguage = async () => {
    try {
      // Get browser languages
      const browserLanguages = navigator.languages || [navigator.language];
      
      // Call detection API
      const response = await axios.post(`${API_URL}/api/language/detect`, {
        browser_languages: browserLanguages
      });
      
      if (response.data.success) {
        const detected = response.data.detected_language;
        
        // Only update if no saved preference
        const saved = localStorage.getItem('sdm_language');
        if (!saved && detected !== language) {
          setLanguage(detected);
        }
      }
    } catch (error) {
      console.error('Language detection error:', error);
    }
  };

  const loadTranslations = async (lang) => {
    try {
      const response = await axios.get(`${API_URL}/api/language/translations/${lang}`);
      if (response.data.success) {
        setTranslations(response.data.translations);
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
      // Keep default translations
    }
  };

  const syncLanguageWithServer = async (token) => {
    if (!token) return;
    
    try {
      // Auto-detect and set for authenticated user
      const response = await axios.post(
        `${API_URL}/api/language/auto-detect`,
        { browser_languages: navigator.languages || [navigator.language] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        const serverLang = response.data.language;
        if (serverLang !== language) {
          setLanguage(serverLang);
        }
        if (response.data.translations) {
          setTranslations(response.data.translations);
        }
      }
    } catch (error) {
      console.error('Failed to sync language with server:', error);
    }
  };

  const changeLanguage = async (newLang, token = null) => {
    setLanguage(newLang);
    localStorage.setItem('sdm_language', newLang);
    
    // If authenticated, save to server
    if (token) {
      try {
        await axios.put(
          `${API_URL}/api/language/preference`,
          { language: newLang },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        console.error('Failed to save language preference:', error);
      }
    }
  };

  // Translation helper function
  const t = (key, fallback = null) => {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }
    
    return value || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage: changeLanguage,
      translations,
      t,
      isLoading,
      syncLanguageWithServer,
      supportedLanguages: [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'fr', name: 'French', nativeName: 'Français' }
      ]
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Simple language selector component
export function LanguageSelector({ token = null, className = '' }) {
  const { language, setLanguage, supportedLanguages } = useLanguage();
  
  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value, token)}
      className={`bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm ${className}`}
    >
      {supportedLanguages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
}

export default LanguageContext;

import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations, getLanguageFromStorage, setLanguageInStorage } from '../translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Default to English
  const [language, setLanguageState] = useState(() => {
    const stored = getLanguageFromStorage();
    return stored || 'en';
  });

  useEffect(() => {
    // Set HTML lang attribute
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang) => {
    if (translations[lang]) {
      setLanguageState(lang);
      setLanguageInStorage(lang);
      document.documentElement.lang = lang;
    }
  };

  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'fr' : 'en';
    setLanguage(newLang);
  };

  const availableLanguages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      toggleLanguage,
      availableLanguages,
      isEnglish: language === 'en',
      isFrench: language === 'fr'
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;

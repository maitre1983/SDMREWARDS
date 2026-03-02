import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, getDirection, languageInfo } from '../translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('sds_language');
    return saved || 'en';
  });

  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('sds_language', lang);
  };

  useEffect(() => {
    const direction = getDirection(language);
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage: changeLanguage, 
      t, 
      direction: getDirection(language),
      isRTL: getDirection(language) === 'rtl',
      languageInfo,
      languages: ['en', 'fr', 'ar', 'zh']
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

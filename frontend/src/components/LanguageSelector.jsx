import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import { Globe, ChevronDown, Check } from 'lucide-react';

const LanguageSelector = ({ variant = 'dropdown', className = '' }) => {
  const { language, setLanguage, languageInfo, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', ...languageInfo.en },
    { code: 'fr', ...languageInfo.fr },
    { code: 'ar', ...languageInfo.ar },
    { code: 'zh', ...languageInfo.zh },
  ];

  if (variant === 'buttons') {
    return (
      <div className={`flex gap-1 ${className}`}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              language === lang.code
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={lang.name}
          >
            {lang.flag} {lang.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        data-testid="language-selector"
      >
        <Globe size={16} className="text-slate-500" />
        <span className="text-sm font-medium text-slate-700">
          {languageInfo[language]?.flag} {languageInfo[language]?.nativeName}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="py-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                    language === lang.code ? 'bg-emerald-50' : ''
                  }`}
                  data-testid={`lang-option-${lang.code}`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{lang.nativeName}</p>
                    <p className="text-xs text-slate-500">{lang.name}</p>
                  </div>
                  {language === lang.code && (
                    <Check size={16} className="text-emerald-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;

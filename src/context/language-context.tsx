
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import en from '@/locales/en.json';
import gu from '@/locales/gu.json';

type Language = 'en' | 'gu';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

const translations = { en, gu };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useLocalStorage<Language>('language', 'en');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: string, options?: { [key: string]: string | number }): string => {
    let langToUse: Language = language;

    // On initial server render, language from local storage is not available yet, default to 'en'
    if (!isMounted) {
        langToUse = 'en';
    }

    const langTranslations = translations[langToUse];
    let translation = key.split('.').reduce((obj: any, k: string) => obj && obj[k], langTranslations);

    if (!translation) {
      // Fallback to English if translation is missing in the current language
      translation = key.split('.').reduce((obj: any, k: string) => obj && obj[k], translations.en);
    }
    
    if (translation && options) {
        Object.keys(options).forEach(optionKey => {
            translation = translation.replace(`{{${optionKey}}}`, String(options[optionKey]));
        });
    }

    return translation || key;
  }, [language, isMounted]);

  const value = { language, setLanguage, t };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

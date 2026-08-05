"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { TRANSLATIONS, Language } from "@/lib/i18n/translations";

export type { Language };

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  language: "VI",
  setLanguage: () => {},
  t: (key, fallback) => fallback ?? key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>("VI");

  useEffect(() => {
    const saved = localStorage.getItem("lightstory_language") as Language | null;
    if (saved === "EN" || saved === "VI") {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("lightstory_language", lang);
  };

  const t = (key: string, fallback?: string): string => {
    return TRANSLATIONS[language]?.[key] ?? TRANSLATIONS["EN"]?.[key] ?? fallback ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dict, Lang, DictKey } from "@/lib/i18n";

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: DictKey) => string;
};

const LangContext = createContext<LangContextValue>({
  lang: "fr",
  setLang: () => {},
  t: (k) => k,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const saved = window.localStorage.getItem("lang") as Lang | null;
    if (saved === "fr" || saved === "ar") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    window.localStorage.setItem("lang", lang);
  }, [lang]);

  const value: LangContextValue = {
    lang,
    setLang: setLangState,
    t: (k) => dict[lang][k] ?? dict.fr[k],
  };

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

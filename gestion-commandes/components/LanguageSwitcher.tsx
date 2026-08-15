"use client";

import { useLang } from "./LangProvider";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <div className="lang-switcher">
      <button
        className={lang === "fr" ? "active" : ""}
        onClick={() => setLang("fr")}
        type="button"
      >
        FR
      </button>
      <button
        className={lang === "ar" ? "active" : ""}
        onClick={() => setLang("ar")}
        type="button"
      >
        عربي
      </button>
    </div>
  );
}

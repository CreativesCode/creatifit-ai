"use client";
import { useTranslation } from "react-i18next";
import { Button } from "./button";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  const setLanguage = (lng: "en" | "es") => {
    i18n.changeLanguage(lng);
    localStorage.setItem("lang", lng);
    document.documentElement.lang = lng;
  };

  return (
    <div className="inline-flex gap-2">
      <Button
        variant={i18n.language === "en" ? "default" : "outline"}
        size="sm"
        onClick={() => setLanguage("en")}
        className="px-2 py-1 text-xs"
      >
        EN
      </Button>
      <Button
        variant={i18n.language === "es" ? "default" : "outline"}
        size="sm"
        onClick={() => setLanguage("es")}
        className="px-2 py-1 text-xs"
      >
        ES
      </Button>
    </div>
  );
}

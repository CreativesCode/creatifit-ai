"use client";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import { FlagIcon } from "./flags";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation("common");

  const setLanguage = (lng: "en" | "es") => {
    i18n.changeLanguage(lng);
    localStorage.setItem("lang", lng);
    document.documentElement.lang = lng;
  };

  return (
    <div className="inline-flex gap-1">
      <Button
        variant={i18n.language === "en" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("en")}
        className="p-2 h-auto touch-manipulation"
        aria-label={t("ui.switch_to_english")}
      >
        <FlagIcon country="en" size={18} />
      </Button>
      <Button
        variant={i18n.language === "es" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("es")}
        className="p-2 h-auto touch-manipulation"
        aria-label={t("ui.switch_to_spanish")}
      >
        <FlagIcon country="es" size={18} />
      </Button>
    </div>
  );
}

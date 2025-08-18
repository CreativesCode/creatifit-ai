import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";

const prefer = () => {
  if (typeof window === "undefined") return "en";
  
  try {
    const ls = localStorage.getItem("lang");
    if (ls === "en" || ls === "es") return ls;
    
    // Solo usar navigator.language si localStorage no tiene valor
    if (navigator.language.startsWith("es")) return "es";
    return "en";
  } catch (error) {
    // Fallback seguro
    return "en";
  }
};

void i18n.use(initReactI18next).init({
  resources: { en: { common: en }, es: { common: es } },
  lng: prefer(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;

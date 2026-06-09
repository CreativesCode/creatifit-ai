"use client";
import { useMobileApp } from "@/hooks/useMobileApp";
import { MoreVertical } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Wordmark } from "./brand";
import { Button } from "./button";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader() {
  const { t } = useTranslation("common");
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const { isCapacitor } = useMobileApp();

  const toggleOptionsMenu = () => {
    setIsOptionsMenuOpen(!isOptionsMenuOpen);
  };

  return (
    <header
      className={`border-b border-border bg-surface/60 backdrop-blur-xl sticky top-0 z-50 safe-top ${
        isCapacitor ? "capacitor-header" : ""
      }`}
    >
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="flex items-center justify-between">
          {/* Marca */}
          <Link
            href="/dashboard"
            className="hover:opacity-80 transition-opacity active:scale-95"
            aria-label={t("app.title")}
          >
            <Wordmark size={28} />
          </Link>

          {/* Menú de Opciones */}
          <div className="flex items-center space-x-2">
            {/* Controles de Idioma y Tema */}
            <div className="hidden sm:flex items-center space-x-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>

            {/* Botón de Opciones (Tres Puntos) */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 touch-manipulation"
              onClick={toggleOptionsMenu}
              aria-label={t("ui.options")}
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Menú de Opciones Desplegable */}
        {isOptionsMenuOpen && (
          <div className="absolute top-full right-0 mt-1 mr-3 w-64 bg-surface border border-border rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
            <div className="p-2">
              {/* Acciones */}
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider px-3 py-2">
                  {t("actions.create_plan")}
                </h3>
                <Link
                  href="/onboarding"
                  onClick={() => setIsOptionsMenuOpen(false)}
                >
                  <Button
                    size="sm"
                    className="w-full bg-primary hover:bg-primary/90 text-white gap-3 px-3 py-2 touch-manipulation shadow-sm"
                  >
                    {t("actions.create_plan_emoji")}
                  </Button>
                </Link>
              </div>

              {/* Configuración */}
              <div className="border-t border-border pt-3">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider px-3 py-2 mb-2">
                  {t("settings.title")}
                </h3>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-muted">
                    {t("settings.language.title")}
                  </span>
                  <LanguageSwitcher />
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-muted">
                    {t("settings.theme.title")}
                  </span>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

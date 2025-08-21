"use client";
import { Calendar, Home, Menu, Target, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader() {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const navigationItems = [
    { href: "/dashboard", icon: Home, label: t("nav.dashboard") },
    { href: "/plans", icon: Calendar, label: t("nav.plans") },
    { href: "/exercises", icon: Target, label: t("nav.exercises") },
    {
      href: "/workout-history",
      icon: TrendingUp,
      label: t("nav.workoutHistory"),
    },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          {/* Logo y Título */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm md:text-base">
                  CF
                </span>
              </div>
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-txt hidden sm:block">
                {t("app.title")}
              </h1>
            </Link>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}

            {/* Botón Crear Plan */}
            <Link href="/onboarding">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white ml-2"
              >
                🏋️‍♂️ Crear Plan
              </Button>
            </Link>
          </nav>

          {/* Controles de Derecha */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
            <LanguageSwitcher />
            <ThemeToggle />

            {/* Botón Menú Móvil */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-1.5 sm:p-2"
              onClick={toggleMobileMenu}
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Menú Móvil */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border mt-3 pt-3">
            <nav className="flex flex-col space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive(item.href) ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-3 px-3 py-3"
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}

              {/* Botón Crear Plan en Móvil */}
              <Link
                href="/onboarding"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Button
                  size="sm"
                  className="w-full bg-primary hover:bg-primary/90 text-white gap-3 px-3 py-3"
                >
                  🏋️‍♂️ Crear Plan
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

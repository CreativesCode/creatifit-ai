"use client";
import { Calendar, Home, TrendingUp, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader() {
  const { t } = useTranslation("common");
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg"></div>
          <h1 className="text-xl font-bold text-txt">{t("app.title")}</h1>
        </div>

        {/* Navegación Principal */}
        <nav className="flex items-center space-x-2">
          <Link href="/dashboard">
            <Button
              variant={isActive("/dashboard") ? "default" : "ghost"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              {t("nav.dashboard")}
            </Button>
          </Link>

          <Link href="/plans">
            <Button
              variant={isActive("/plans") ? "default" : "ghost"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              {t("nav.plans")}
            </Button>
          </Link>

          <Link href="/exercises">
            <Button
              variant={isActive("/exercises") ? "default" : "ghost"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Target className="w-4 h-4" />
              {t("nav.exercises")}
            </Button>
          </Link>

          <Link href="/workout-history">
            <Button
              variant={isActive("/workout-history") ? "default" : "ghost"}
              size="sm"
              className="flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {t("nav.workoutHistory")}
            </Button>
          </Link>
        </nav>

        <div className="flex items-center space-x-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

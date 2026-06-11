"use client";
import { Calendar, Dumbbell, Home, Scale, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

export function BottomNavigation() {
  const { t } = useTranslation("common");
  const pathname = usePathname();

  const isActive = (path: string) => {
    const currentPath = pathname.split("?")[0].replace(/\/$/, "");
    const cleanPath = path.replace(/\/$/, "");
    return currentPath === cleanPath;
  };

  const navigationItems = [
    { href: "/plans", icon: Calendar, label: t("nav.plans") },
    { href: "/exercises", icon: Dumbbell, label: t("nav.exercises") },
    { href: "/dashboard", icon: Home, label: t("nav.dashboard") },
    {
      href: "/workout-history",
      icon: TrendingUp,
      label: t("nav.workoutHistory"),
    },
    { href: "/body", icon: Scale, label: t("nav.body", "Cuerpo") },
    { href: "/settings", icon: Settings, label: t("nav.settings", "Ajustes") },
  ];

  return (
    <nav className="cf-nav">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActiveItem = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActiveItem ? "page" : undefined}
            className={`cf-nav-item${isActiveItem ? " active" : ""}`}
          >
            <span className="cf-nav-ic">
              <Icon className="w-5 h-5" strokeWidth={isActiveItem ? 2.2 : 1.9} />
            </span>
            <span className="cf-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

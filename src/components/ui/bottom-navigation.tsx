"use client";
import { Calendar, Home, Settings, Target, TrendingUp } from "lucide-react";
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
    { href: "/exercises", icon: Target, label: t("nav.exercises") },
    { href: "/dashboard", icon: Home, label: t("nav.dashboard") },
    {
      href: "/workout-history",
      icon: TrendingUp,
      label: t("nav.workoutHistory"),
    },
    { href: "/settings", icon: Settings, label: t("settings.title") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-md border-t border-border safe-bottom bottom-navigation">
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActiveItem = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-all duration-200 touch-manipulation ${
                isActiveItem
                  ? "text-primary bg-primary/10"
                  : "text-muted hover:text-txt hover:bg-surface/50"
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-1 ${
                  isActiveItem ? "text-primary" : "text-muted"
                }`}
              />
              <span
                className={`text-xs font-medium text-center ${
                  isActiveItem ? "text-primary" : "text-muted"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

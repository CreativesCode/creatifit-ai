"use client";
import { Calendar, Dumbbell, Home, Settings, TrendingUp } from "lucide-react";
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
    { href: "/settings", icon: Settings, label: t("settings.title") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-t border-border safe-bottom bottom-navigation">
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActiveItem = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-1 transition-all duration-200 touch-manipulation ${
                isActiveItem ? "text-txt" : "text-faint hover:text-txt"
              }`}
            >
              <span
                className={`flex items-center justify-center w-[42px] h-[30px] rounded-[11px] transition-all duration-200 ${
                  isActiveItem
                    ? "bg-grad-brand text-white shadow-glow-brand"
                    : ""
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActiveItem ? 2.2 : 1.9} />
              </span>
              <span className="text-[10.5px] font-semibold text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

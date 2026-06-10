"use client";
import { Mark } from "@/components/ui/brand";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Calendar,
  Dumbbell,
  Home,
  Settings,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

/* Navegación lateral para tablet/escritorio (≥ lg). Reemplaza la bottom-nav. */
export function SideNav() {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", icon: Home, label: t("nav.dashboard") },
    { href: "/plans", icon: Calendar, label: t("nav.plans") },
    { href: "/exercises", icon: Dumbbell, label: t("nav.exercises") },
    { href: "/workout-history", icon: TrendingUp, label: t("nav.workoutHistory") },
    { href: "/settings", icon: Settings, label: t("nav.settings", "Ajustes") },
  ];

  const isActive = (href: string) => {
    const current = pathname.split("?")[0].replace(/\/$/, "");
    return current === href.replace(/\/$/, "");
  };

  const initial = (user?.email?.trim().charAt(0) || "A").toUpperCase();

  return (
    <aside
      className="hidden lg:flex flex-col shrink-0 border-r border-border bg-surface safe-top safe-bottom"
      style={{ width: 240, padding: "28px 18px" }}
    >
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 pb-6 hover:opacity-80 transition-opacity">
        <Mark size={36} />
        <span className="font-display font-bold text-[17px] tracking-tight">
          creati<span className="cf-grad-txt">fit</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-1.5">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-3 font-semibold text-[14.5px] transition-all"
              style={{
                padding: "13px 14px",
                borderRadius: 14,
                color: active ? "#fff" : "var(--muted)",
                background: active ? "var(--grad-brand)" : "transparent",
                boxShadow: active ? "var(--glow-brand)" : "none",
              }}
            >
              <Icon size={21} strokeWidth={active ? 2.2 : 1.9} />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-3 px-2">
        <div
          className="rounded-full flex items-center justify-center text-white font-display font-bold text-sm shrink-0"
          style={{ width: 38, height: 38, background: "var(--grad-brand-soft)" }}
        >
          {initial}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-[13.5px] truncate">{user?.email ?? "—"}</div>
        </div>
      </div>
    </aside>
  );
}

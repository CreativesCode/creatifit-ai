"use client";

import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Bell,
  ChevronRight,
  Globe,
  Heart,
  LogOut,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  Trophy,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

function Toggle({
  on,
  disabled = false,
  label,
  onToggle,
}: {
  on: boolean;
  disabled?: boolean;
  label?: string;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className="flex items-center"
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        padding: 3,
        justifyContent: on ? "flex-end" : "flex-start",
        background: on ? "var(--grad-brand)" : "var(--ring-track)",
        boxShadow: on ? "var(--glow-brand)" : "none",
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff" }} />
    </button>
  );
}

function Row({
  icon: Icon,
  label,
  sub,
  right,
  last,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  last?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className="flex items-center gap-3.5 w-full text-left"
      style={{
        padding: "13px 0",
        borderBottom: last ? "none" : "1px solid var(--border)",
      }}
    >
      <div className="cf-icon-tile bg-surface-2 border border-border text-txt-2" style={{ width: 38, height: 38 }}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14.5px]">{label}</div>
        {sub && <div className="cf-muted text-[11.5px] mt-px">{sub}</div>}
      </div>
      {right}
    </Comp>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation("common");
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme ?? "system" : "system";
  const themeOptions: [string, React.ElementType, string][] = [
    ["dark", Moon, t("settings.theme.dark", "Oscuro")],
    ["light", Sun, t("settings.theme.light", "Claro")],
    ["system", Monitor, t("settings.theme.auto", "Auto")],
  ];

  const initial = (user?.email?.trim().charAt(0) || "A").toUpperCase();

  return (
    <div className="container mx-auto max-w-xl lg:max-w-2xl px-4 lg:px-6 pt-4 lg:pt-8">
      {/* header */}
      <div className="pt-1 mb-4">
        <div className="cf-eyebrow">{t("settings.account.title", "Cuenta")}</div>
        <div className="cf-h1 text-[26px] mt-1.5">{t("settings.title")}</div>
      </div>

      {/* profile */}
      <div className="cf-card flex items-center gap-3.5 mb-4" style={{ padding: 16, borderRadius: 22 }}>
        <div
          className="rounded-full flex items-center justify-center text-white font-display font-bold text-xl shrink-0"
          style={{ width: 54, height: 54, background: "var(--grad-brand-soft)" }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="cf-h2 text-[16px] truncate">{user?.email ?? "—"}</div>
          <div className="cf-muted text-[12px] font-semibold mt-0.5">
            {t("settings.account.description", "Tu cuenta")}
          </div>
        </div>
        <button
          onClick={signOut}
          className="cf-icon-tile bg-surface-2 border border-border"
          style={{ width: 36, height: 36 }}
          aria-label={t("settings.account.sign_out")}
        >
          <LogOut size={17} />
        </button>
      </div>

      {/* theme segmented */}
      <div className="cf-card mb-3.5" style={{ padding: 16, borderRadius: 20 }}>
        <div className="font-bold text-[14px] mb-3">{t("settings.theme.title")}</div>
        <div className="flex gap-2" style={{ background: "var(--surface-2)", padding: 5, borderRadius: 14 }}>
          {themeOptions.map(([value, Icon, label]) => {
            const active = current === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className="flex-1 flex items-center justify-center gap-1.5 font-semibold text-[12.5px]"
                style={{
                  padding: "9px 0",
                  borderRadius: 10,
                  background: active ? "var(--grad-brand)" : "transparent",
                  color: active ? "#fff" : "var(--muted)",
                  boxShadow: active ? "var(--glow-brand)" : "none",
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* prefs */}
      <div className="cf-card mb-3.5" style={{ padding: "4px 16px", borderRadius: 20 }}>
        <Row
          icon={Globe}
          label={t("settings.language.title")}
          sub={t("settings.language.app_language")}
          right={<LanguageSwitcher />}
        />
        <Row
          icon={Bell}
          label={t("settings.notifications.workout_reminders")}
          sub={`${t("settings.notifications.workout_reminders_desc")} · ${t(
            "settings.coming_soon",
            "Próximamente"
          )}`}
          right={
            <Toggle
              on={false}
              disabled
              label={t("settings.notifications.workout_reminders")}
            />
          }
        />
        <Row
          icon={Trophy}
          label={t("settings.notifications.achievements_progress")}
          sub={`${t("settings.notifications.achievements_progress_desc")} · ${t(
            "settings.coming_soon",
            "Próximamente"
          )}`}
          right={
            <Toggle
              on={false}
              disabled
              label={t("settings.notifications.achievements_progress")}
            />
          }
          last
        />
      </div>

      {/* about */}
      <div className="cf-card" style={{ padding: "4px 16px", borderRadius: 20 }}>
        <Row
          icon={ShieldCheck}
          label={t("settings.about.title", "Privacidad")}
          right={<ChevronRight size={17} className="text-faint" />}
        />
        <Row
          icon={Heart}
          label={t("settings.about.developed_by", "Acerca de")}
          sub={`CreatiFit AI · v1.0.0`}
          right={<ChevronRight size={17} className="text-faint" />}
          last
        />
      </div>
    </div>
  );
}

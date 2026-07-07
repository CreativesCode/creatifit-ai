"use client";

import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useAuth } from "@/lib/auth/auth-context";
import { useRevenueCat } from "@/lib/revenuecat/revenuecat-context";
import { deleteOwnAccount } from "@/lib/account/delete-account";
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Crown,
  FileText,
  Globe,
  Heart,
  LifeBuoy,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  RefreshCw,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Trophy,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { isPro, isNative, presentPaywall, openCustomerCenter, restorePurchases } =
    useRevenueCat();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Borrado de cuenta.
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Acciones asíncronas con feedback de carga.
  const [signingOut, setSigningOut] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      await restorePurchases();
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteOwnAccount();
      await signOut();
      router.replace("/welcome");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "No se pudo eliminar la cuenta");
      setDeleting(false);
    }
  };

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
          onClick={handleSignOut}
          disabled={signingOut}
          className="cf-icon-tile bg-surface-2 border border-border disabled:opacity-60"
          style={{ width: 36, height: 36 }}
          aria-label={t("settings.account.sign_out")}
        >
          {signingOut ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />}
        </button>
      </div>

      {/* subscription */}
      {isPro ? (
        <div
          className="cf-card mb-3.5 relative overflow-hidden"
          style={{ padding: 16, borderRadius: 20, border: "1.5px solid var(--primary)" }}
        >
          <div className="absolute inset-0 bg-grad-brand" style={{ opacity: 0.08 }} aria-hidden />
          <div className="relative">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="cf-icon-tile" style={{ width: 38, height: 38, background: "var(--grad-brand)", color: "#fff" }}>
                <Crown size={18} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-[15px]">{t("subscription.pro_active", "CreatiFit AI Pro")}</div>
                <div className="cf-muted text-[12px]">{t("subscription.pro_desc", "Planes con IA ilimitados")}</div>
              </div>
            </div>
            {isNative && (
              <button className="cf-btn cf-btn-ghost cf-btn-block" onClick={openCustomerCenter} style={{ gap: 8 }}>
                <Settings2 size={16} />
                {t("subscription.manage", "Gestionar suscripción")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          className="cf-card mb-3.5 relative overflow-hidden"
          style={{ padding: 16, borderRadius: 20, border: "1.5px solid var(--primary)", boxShadow: "var(--glow-brand)" }}
        >
          <div className="absolute inset-0 bg-grad-brand" style={{ opacity: 0.1 }} aria-hidden />
          <div className="relative">
            <div className="flex items-center gap-2.5 mb-1.5">
              <Sparkles size={18} className="text-primary" fill="currentColor" />
              <div className="font-bold text-[15px]">{t("subscription.upgrade_title", "Mejora a Pro")}</div>
            </div>
            <div className="cf-muted text-[12.5px] mb-3.5">
              {t("subscription.upgrade_desc", "Genera planes con IA ilimitados y desbloquea las analíticas avanzadas.")}
            </div>
            {isNative ? (
              <div className="flex flex-col gap-2">
                <button className="cf-btn cf-btn-primary cf-btn-block" onClick={presentPaywall} style={{ gap: 8 }}>
                  <Crown size={16} />
                  {t("subscription.see_plans", "Ver planes Pro")}
                </button>
                <button
                  className="cf-btn cf-btn-ghost cf-btn-sm cf-btn-block"
                  onClick={handleRestore}
                  disabled={restoring}
                  style={{ gap: 6 }}
                >
                  {restoring ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  {restoring
                    ? t("subscription.restoring", "Restaurando…")
                    : t("subscription.restore", "Restaurar compras")}
                </button>
              </div>
            ) : (
              <div className="cf-muted text-[12px] font-semibold">
                {t("subscription.mobile_only", "Disponible en la app móvil.")}
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* about / legal */}
      <div className="cf-card mb-3.5" style={{ padding: "4px 16px", borderRadius: 20 }}>
        <Row
          icon={ShieldCheck}
          label={t("settings.legal.privacy", "Política de privacidad")}
          right={<ChevronRight size={17} className="text-faint" />}
          onClick={() => router.push("/privacy")}
        />
        <Row
          icon={ScrollText}
          label={t("settings.legal.terms", "Términos de servicio")}
          right={<ChevronRight size={17} className="text-faint" />}
          onClick={() => router.push("/terms")}
        />
        <Row
          icon={LifeBuoy}
          label={t("settings.legal.support", "Soporte y contacto")}
          right={<ChevronRight size={17} className="text-faint" />}
          onClick={() => router.push("/support")}
        />
        <Row
          icon={Heart}
          label={t("settings.about.developed_by", "Acerca de")}
          sub={`CreatiFit AI · v1.0.3`}
          right={<FileText size={16} className="text-faint" />}
          last
        />
      </div>

      {/* danger zone */}
      <div className="cf-card" style={{ padding: "4px 16px", borderRadius: 20 }}>
        <Row
          icon={Trash2}
          label={t("settings.account.delete", "Eliminar cuenta")}
          sub={t("settings.account.delete_desc", "Borra tu cuenta y todos tus datos")}
          right={<ChevronRight size={17} className="text-faint" />}
          onClick={() => {
            setDeleteError(null);
            setShowDeleteConfirm(true);
          }}
          last
        />
      </div>

      {/* modal de confirmación de borrado */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            className="cf-card w-full max-w-sm"
            style={{ padding: 22, borderRadius: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="cf-icon-tile mx-auto mb-3"
              style={{ width: 52, height: 52, background: "color-mix(in srgb, #ef4444 16%, transparent)", color: "#ef4444" }}
            >
              <AlertTriangle size={24} />
            </div>
            <div className="cf-h2 text-[19px] text-center">
              {t("settings.account.delete_confirm_title", "¿Eliminar tu cuenta?")}
            </div>
            <p className="cf-muted text-[13.5px] leading-relaxed text-center mt-2">
              {t(
                "settings.account.delete_confirm_desc",
                "Se borrarán de forma permanente tu perfil, tus planes y todo tu historial de entrenamiento. Esta acción no se puede deshacer."
              )}
            </p>

            {deleteError && (
              <div
                className="text-[12.5px] font-semibold text-center mt-3"
                style={{ color: "#ef4444" }}
              >
                {deleteError}
              </div>
            )}

            <div className="flex flex-col gap-2 mt-5">
              <button
                className="cf-btn cf-btn-block"
                disabled={deleting}
                onClick={handleDeleteAccount}
                style={{ background: "#ef4444", color: "#fff", gap: 8 }}
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t("settings.account.deleting", "Eliminando…")}
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    {t("settings.account.delete_confirm_cta", "Sí, eliminar mi cuenta")}
                  </>
                )}
              </button>
              <button
                className="cf-btn cf-btn-ghost cf-btn-block"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t("common.cancel", "Cancelar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

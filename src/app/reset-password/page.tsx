"use client";

import { AppIcon } from "@/components/ui/brand";
import { CFLoader } from "@/components/ui/loader";
import { supabase } from "@/lib/supabase-config";
import { Check, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type Phase = "checking" | "ready" | "invalid" | "done";

// Página pública a la que apunta el correo de "recuperar contraseña".
// Soporta dos formatos de enlace:
//  1) ?token_hash=...&type=recovery (plantilla recomendada): se verifica con
//     verifyOtp, funciona aunque el correo se abra en otro navegador/dispositivo
//     (no depende del code_verifier de PKCE guardado en localStorage).
//  2) Flujo clásico con ?code=... (PKCE): supabase-js lo procesa al cargar vía
//     detectSessionInUrl; solo vale en el navegador que pidió el enlace.
//  3) #access_token=...&refresh_token=... (sin PKCE): es el que envía la app;
//     se fija la sesión a mano. Ver `resetPassword` en auth-context.
export default function ResetPasswordPage() {
  const { t } = useTranslation("common");
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Enlace que abre la app instalada (esquema propio declarado en el manifest).
  // Solo en el navegador de un Android; dentro de la app no hace falta.
  const [openAppHref, setOpenAppHref] = useState<string | null>(null);
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!/android/i.test(navigator.userAgent)) return;
    const fallback = encodeURIComponent(`${window.location.origin}/login/`);
    setOpenAppHref(
      `intent://login#Intent;scheme=creatifit;package=com.creatifit.ai.app;S.browser_fallback_url=${fallback};end`
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const linkError =
      params.get("error_description") || hashParams.get("error_description");
    const tokenHash = params.get("token_hash");

    if (linkError) {
      setPhase("invalid");
      return;
    }

    // 3) Enlace sin PKCE (el que envía la app): la sesión de recuperación llega
    //    en el fragmento. Este cliente está en modo PKCE y no la recoge solo, así
    //    que se fija a mano. Funciona en cualquier navegador.
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (cancelled) return;
          // Los tokens no deben quedarse en la barra de direcciones ni en el historial.
          window.history.replaceState(null, "", window.location.pathname);
          setPhase(error ? "invalid" : "ready");
        });
      return () => {
        cancelled = true;
      };
    }

    if (tokenHash) {
      supabase.auth
        .verifyOtp({ type: "recovery", token_hash: tokenHash })
        .then(({ error }) => {
          if (!cancelled) setPhase(error ? "invalid" : "ready");
        });
      return () => {
        cancelled = true;
      };
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || session) setPhase("ready");
    });
    // Margen para que detectSessionInUrl procese el enlace; si tras esto no hay
    // sesión, el enlace es inválido o caducó.
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && !data.session) setPhase("invalid");
    }, 4000);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t("auth.errors.password_short"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.reset.mismatch", "Las contraseñas no coinciden"));
      return;
    }
    setBusy(true);
    const { error: updError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updError) {
      const m = updError.message.toLowerCase();
      setError(
        m.includes("different from the old")
          ? t("auth.reset.same_password", "La nueva contraseña debe ser distinta a la anterior")
          : updError.message
      );
      return;
    }
    setPhase("done");
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-bg overflow-hidden safe-top safe-bottom">
      <div className="cf-mesh fixed inset-0" aria-hidden />
      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col flex-1 px-6 justify-center py-10">
        {phase === "checking" && (
          <div className="flex flex-col items-center gap-4">
            <CFLoader size={36} />
            <p className="cf-muted text-sm">
              {t("auth.reset.checking", "Verificando el enlace…")}
            </p>
          </div>
        )}

        {phase === "invalid" && (
          <div className="flex flex-col items-center text-center gap-4">
            <AppIcon size={64} variant="gradient" />
            <h1 className="cf-h1 text-[22px]">
              {t("auth.reset.invalid_title", "Enlace no válido")}
            </h1>
            <p className="cf-muted text-sm leading-relaxed">
              {t(
                "auth.reset.invalid_body",
                "El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo desde la pantalla de inicio de sesión."
              )}
            </p>
            <button
              onClick={() => router.replace("/login")}
              className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg mt-2"
            >
              {t("auth.reset.go_login", "Ir a iniciar sesión")}
            </button>
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center text-center gap-4">
            <div
              className="cf-icon-tile bg-grad-brand text-white shadow-glow-brand"
              style={{ width: 64, height: 64, borderRadius: 20 }}
            >
              <Check size={28} strokeWidth={3} />
            </div>
            <h1 className="cf-h1 text-[22px]">
              {t("auth.reset.done_title", "Contraseña actualizada")}
            </h1>
            <p className="cf-muted text-sm leading-relaxed">
              {t(
                "auth.reset.done_body",
                "Ya puedes seguir entrenando con tu nueva contraseña."
              )}
            </p>
            {openAppHref ? (
              <>
                {/* En el navegador de un Android: volver a la app instalada. */}
                <a href={openAppHref} className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg mt-2">
                  {t("auth.reset.open_app", "Abrir la app")}
                </a>
                <button
                  onClick={() => router.replace("/dashboard")}
                  className="text-sm text-primary font-semibold"
                >
                  {t("auth.reset.continue_web", "Seguir en el navegador")}
                </button>
              </>
            ) : (
              <button
                onClick={() => router.replace("/dashboard")}
                className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg mt-2"
              >
                {t("auth.reset.go_app", "Entrar a la app")}
              </button>
            )}
          </div>
        )}

        {phase === "ready" && (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="flex flex-col items-center mb-7">
              <AppIcon size={64} variant="gradient" />
              <h1 className="cf-h1 text-[22px] mt-4">
                {t("auth.reset.title", "Nueva contraseña")}
              </h1>
              <p className="cf-muted text-[13.5px] mt-1.5 text-center">
                {t(
                  "auth.reset.subtitle",
                  "Elige una contraseña nueva para tu cuenta."
                )}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <PasswordField
                label={t("auth.reset.new_password", "Nueva contraseña")}
                value={password}
                onChange={setPassword}
                reveal={showPw}
                onReveal={() => setShowPw((s) => !s)}
                autoComplete="new-password"
              />
              <PasswordField
                label={t("auth.reset.confirm_password", "Repite la contraseña")}
                value={confirm}
                onChange={setConfirm}
                reveal={showPw}
                onReveal={() => setShowPw((s) => !s)}
                autoComplete="new-password"
              />

              {error && <p className="text-danger text-sm">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg mt-1"
                style={{ opacity: busy ? 0.7 : 1, gap: 8 }}
              >
                {busy ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t("auth.processing")}
                  </>
                ) : (
                  t("auth.reset.cta", "Guardar contraseña")
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  reveal,
  onReveal,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  reveal: boolean;
  onReveal: () => void;
  autoComplete?: string;
}) {
  return (
    <div>
      <div className="cf-muted text-[11.5px] font-bold mb-1.5 tracking-wide">
        {label}
      </div>
      <div
        className="cf-card cf-card-solid flex items-center gap-3"
        style={{ padding: "0 15px", height: 52, borderRadius: 15 }}
      >
        <Lock size={18} className="text-muted shrink-0" />
        <input
          type={reveal ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete={autoComplete}
          className="bg-transparent outline-none w-full text-[15px]"
          style={{ color: "var(--txt)" }}
        />
        <button
          type="button"
          onClick={onReveal}
          className="text-faint shrink-0"
          aria-label="toggle"
        >
          {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

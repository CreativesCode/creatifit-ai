"use client";

import { AppIcon } from "@/components/ui/brand";
import { CFLoader } from "@/components/ui/loader";
import { supabase } from "@/lib/supabase-config";
import { Check, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type Phase = "checking" | "ready" | "invalid" | "done";

// Página pública a la que apunta el correo de "recuperar contraseña".
// Soporta dos formatos de enlace:
//  1) ?token_hash=...&type=recovery (plantilla recomendada): se verifica con
//     verifyOtp, funciona aunque el correo se abra en otro navegador/dispositivo
//     (no depende del code_verifier de PKCE guardado en localStorage).
//  2) Flujo clásico (#access_token=... o ?code=...): supabase-js lo procesa al
//     cargar vía detectSessionInUrl; esperamos a que aparezca la sesión.
export default function ResetPasswordPage() {
  const { t } = useTranslation("common");
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            <button
              onClick={() => router.replace("/dashboard")}
              className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg mt-2"
            >
              {t("auth.reset.go_app", "Entrar a la app")}
            </button>
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

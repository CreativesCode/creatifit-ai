"use client";

import { AppIcon, Mark, Wordmark } from "@/components/ui/brand";
import { useAuth } from "@/lib/auth/auth-context";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type Mode = "signin" | "signup";

// Fuerza de contraseña 0..4
function passwordScore(pw: string): number {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

function Field({
  icon: Icon,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  reveal,
  onReveal,
}: {
  icon: React.ElementType;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  reveal?: boolean;
  onReveal?: () => void;
}) {
  return (
    <div>
      <div className="cf-muted text-[11.5px] font-bold mb-1.5 tracking-wide">{label}</div>
      <div
        className="cf-card cf-card-solid flex items-center gap-3"
        style={{ padding: "0 15px", height: 52, borderRadius: 15 }}
      >
        <Icon size={18} className="text-muted shrink-0" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="bg-transparent outline-none w-full text-[15px]"
          style={{ color: "var(--txt)" }}
        />
        {onReveal && (
          <button type="button" onClick={onReveal} className="text-faint shrink-0" aria-label="toggle">
            {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthScreen() {
  const { t } = useTranslation("common");
  const { signIn, signUp, resendConfirmation, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const score = useMemo(() => passwordScore(password), [password]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!email || !password) {
      setError(t("auth.errors.required"));
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError(t("auth.errors.password_short"));
      return;
    }
    if (mode === "signup" && !terms) {
      setError(t("auth.errors.required"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) setError(translateAuthError(error, t));
      } else {
        const { error, needsConfirmation } = await signUp(email, password, name || undefined);
        if (error) setError(translateAuthError(error, t));
        else if (needsConfirmation) setConfirmSent(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setBusy(true);
    setError(null);
    const { error } = await resendConfirmation(email);
    if (error) setError(translateAuthError(error, t));
    setBusy(false);
  };

  const handleForgot = async () => {
    if (!email) {
      setError(t("auth.errors.required"));
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await resetPassword(email);
    if (error) setError(translateAuthError(error, t));
    else setNotice(t("auth.reset_sent", "Te enviamos un enlace para restablecer tu contraseña."));
    setBusy(false);
  };

  // ---------- Confirmación de correo ----------
  if (confirmSent) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center gap-4 my-auto">
          <div
            className="cf-icon-tile bg-grad-brand text-white shadow-glow-brand"
            style={{ width: 64, height: 64, borderRadius: 20 }}
          >
            <Mail size={28} />
          </div>
          <h1 className="cf-h1 text-[24px]">{t("auth.confirm.title")}</h1>
          <p className="cf-muted text-sm leading-relaxed">
            {t("auth.confirm.body")}{" "}
            <span className="font-bold text-txt">{email}</span>
          </p>
          <p className="cf-muted text-xs">{t("auth.confirm.then_signin")}</p>
          {error && <p className="text-danger text-sm">{error}</p>}
          <div className="flex flex-col gap-2.5 w-full pt-2">
            <button onClick={handleResend} disabled={busy} className="cf-btn cf-btn-ghost cf-btn-block">
              {busy ? t("auth.sending") : t("auth.confirm.resend")}
            </button>
            <button
              type="button"
              onClick={() => { setConfirmSent(false); switchMode("signin"); }}
              className="text-sm text-primary font-semibold"
            >
              {t("auth.confirm.back_to_signin")}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- Registro ----------
  if (mode === "signup") {
    return (
      <Shell>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex items-center gap-3 pt-1 mb-5">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="cf-icon-tile bg-surface-2 border border-border"
              style={{ width: 40, height: 40 }}
              aria-label={t("auth.signin")}
            >
              <ArrowLeft size={20} />
            </button>
            <Wordmark size={22} />
          </div>

          <div className="mb-5">
            <span className="cf-chip cf-chip-brand">
              <Sparkles size={12} fill="currentColor" />
              {t("auth.free_badge", "Gratis para empezar")}
            </span>
            <div className="cf-h1 text-[27px] mt-3.5">{t("auth.signup_title", "Crea tu cuenta")}</div>
            <div className="cf-muted text-[13.5px] mt-1.5 leading-relaxed">
              {t("auth.signup_subtitle", "Tu entrenador con IA te espera. Sin tarjeta.")}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Field icon={User} label={t("auth.name", "Nombre")} value={name} onChange={setName} autoComplete="name" />
            <Field icon={Mail} label={t("auth.email")} type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="tu@correo.com" />
            <div>
              <Field
                icon={Lock}
                label={t("auth.password")}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                placeholder="••••••••"
                reveal={showPw}
                onReveal={() => setShowPw((s) => !s)}
              />
              {password.length > 0 && (
                <div className="flex gap-1.5 mt-2.5 items-center">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background: i < score ? "var(--grad-brand)" : "var(--ring-track)",
                      }}
                    />
                  ))}
                  <span className={`cf-chip ${score >= 3 ? "cf-chip-mint" : ""}`} style={{ marginLeft: 4, padding: "2px 8px", fontSize: 10 }}>
                    {[t("auth.pw_weak", "Débil"), t("auth.pw_weak", "Débil"), t("auth.pw_ok", "Media"), t("auth.pw_strong", "Fuerte"), t("auth.pw_strong", "Fuerte")][score]}
                  </span>
                </div>
              )}
            </div>
          </div>

          <label className="flex items-start gap-3 mt-4 cursor-pointer">
            <button
              type="button"
              onClick={() => setTerms((v) => !v)}
              className="flex items-center justify-center shrink-0 mt-0.5"
              style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                background: terms ? "var(--grad-brand)" : "transparent",
                border: terms ? "none" : "2px solid var(--border-2)",
                boxShadow: terms ? "var(--glow-brand)" : "none",
              }}
              aria-label={t("auth.terms_accept", "Aceptar términos")}
            >
              {terms && <Check size={13} color="#fff" strokeWidth={3} />}
            </button>
            <span className="cf-txt2 text-[12.5px] leading-relaxed">
              {t("auth.terms_prefix", "Acepto los")}{" "}
              <span className="text-primary font-semibold">{t("auth.terms", "Términos")}</span>{" "}
              {t("auth.and", "y la")}{" "}
              <span className="text-primary font-semibold">{t("auth.privacy", "Política de privacidad")}</span>.
            </span>
          </label>

          {error && <p className="text-danger text-sm mt-3">{error}</p>}

          <div className="flex-1 min-h-[16px]" />
          <button type="submit" disabled={busy} className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg" style={{ opacity: busy ? 0.7 : 1 }}>
            {busy ? t("auth.processing") : t("auth.signup_cta", "Crear cuenta")}
            <ArrowRight size={18} />
          </button>
          <div className="text-center py-4 text-[13.5px] cf-muted font-semibold">
            {t("auth.have_account", "¿Ya tienes cuenta?")}{" "}
            <button type="button" onClick={() => switchMode("signin")} className="text-primary">
              {t("auth.signin")}
            </button>
          </div>
        </form>
      </Shell>
    );
  }

  // ---------- Login ----------
  return (
    <Shell>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex flex-col items-center pt-7 mb-7">
          <AppIcon size={72} variant="gradient" />
          <div className="cf-h1 text-[24px] mt-4">{t("auth.signin_title", "Bienvenido de nuevo")}</div>
          <div className="cf-muted text-[13.5px] mt-1.5">
            {t("auth.signin_subtitle", "Entra para seguir tu progreso")}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Field icon={Mail} label={t("auth.email")} type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="tu@correo.com" />
          <Field
            icon={Lock}
            label={t("auth.password")}
            type={showPw ? "text" : "password"}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder="••••••••"
            reveal={showPw}
            onReveal={() => setShowPw((s) => !s)}
          />
          <div className="flex justify-end">
            <button type="button" onClick={handleForgot} className="text-[12.5px] font-semibold text-primary">
              {t("auth.forgot", "¿Olvidaste tu contraseña?")}
            </button>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}
          {notice && <p className="text-[13px]" style={{ color: "var(--mint)" }}>{notice}</p>}

          <button type="submit" disabled={busy} className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg mt-1" style={{ opacity: busy ? 0.7 : 1 }}>
            {busy ? t("auth.processing") : t("auth.signin")}
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-[24px]" />
        <div className="text-center pb-6 text-[13.5px] cf-muted font-semibold">
          {t("auth.no_account", "¿No tienes cuenta?")}{" "}
          <button type="button" onClick={() => switchMode("signup")} className="text-primary">
            {t("auth.signup_link", "Regístrate")}
          </button>
        </div>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");
  const features = [
    t("auth.feature_ai", "Planes generados por IA"),
    t("auth.feature_track", "Volumen, RPE y récords"),
    t("auth.feature_streak", "Rachas y recordatorios"),
  ];
  return (
    <div className="relative min-h-screen flex bg-bg overflow-hidden">
      {/* Panel de marca (solo escritorio) */}
      <div
        className="hidden lg:flex lg:w-[44%] xl:w-[42%] relative overflow-hidden flex-col justify-between"
        style={{ background: "var(--grad-brand)", padding: 48 }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 90% at 25% 15%, rgba(255,255,255,0.22), transparent 55%)",
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <Mark size={34} mono="#fff" />
          <span className="font-display font-bold text-white text-[22px] tracking-tight">
            creatifit
          </span>
        </div>

        <div className="relative">
          <div
            className="font-display font-bold text-white"
            style={{ fontSize: 42, lineHeight: 1.08, letterSpacing: "-0.03em" }}
          >
            {t("auth.brand_headline", "Entrena con inteligencia")}
          </div>
          <p className="text-white/85 mt-4 text-[15px] max-w-sm leading-relaxed">
            {t(
              "auth.brand_subtitle",
              "Planes personalizados con IA, seguimiento real de tu progreso y metas que se cumplen más rápido."
            )}
          </p>
          <div className="flex flex-col gap-3 mt-8">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-3 text-white/90 text-[14.5px] font-semibold">
                <span
                  className="flex items-center justify-center rounded-full bg-white/20 shrink-0"
                  style={{ width: 26, height: 26 }}
                >
                  <Check size={14} strokeWidth={3} />
                </span>
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-white/60 text-xs font-semibold">
          © CreatiFit AI
        </div>
      </div>

      {/* Panel del formulario */}
      <div className="relative flex-1 flex flex-col lg:items-center lg:justify-center bg-bg overflow-hidden safe-top safe-bottom">
        <div className="cf-mesh fixed inset-0 lg:hidden" aria-hidden />
        <div className="cf-mesh-3 fixed lg:hidden" aria-hidden />
        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col min-h-screen lg:min-h-0 px-6 lg:py-12">
          {children}
        </div>
      </div>
    </div>
  );
}

// Traduce los mensajes de error más comunes de Supabase Auth.
function translateAuthError(msg: string, t: (k: string) => string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return t("auth.errors.invalid_credentials");
  if (m.includes("email not confirmed")) return t("auth.errors.not_confirmed");
  if (m.includes("already registered") || m.includes("already been registered")) return t("auth.errors.already_registered");
  if (m.includes("rate limit") || m.includes("too many")) return t("auth.errors.rate_limit");
  return msg;
}

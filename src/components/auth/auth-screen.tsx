"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";

type Mode = "signin" | "signup";

export function AuthScreen() {
  const { t } = useTranslation("common");
  const { signIn, signUp, resendConfirmation } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(t("auth.errors.required"));
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError(t("auth.errors.password_short"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) setError(translateAuthError(error, t));
      } else {
        const { error, needsConfirmation } = await signUp(email, password);
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

  // Pantalla "revisa tu correo" tras registrarse
  if (confirmSent) {
    return (
      <Shell>
        <div className="text-center space-y-4">
          <div className="text-5xl">📧</div>
          <h1 className="text-xl font-bold text-txt">{t("auth.confirm.title")}</h1>
          <p className="text-muted text-sm">
            {t("auth.confirm.body")} <span className="font-medium text-txt">{email}</span>
          </p>
          <p className="text-muted text-xs">{t("auth.confirm.then_signin")}</p>
          {error && <p className="text-danger text-sm">{error}</p>}
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleResend} disabled={busy} variant="outline" className="w-full">
              {busy ? t("auth.sending") : t("auth.confirm.resend")}
            </Button>
            <button
              type="button"
              onClick={() => { setConfirmSent(false); setMode("signin"); }}
              className="text-sm text-primary hover:underline"
            >
              {t("auth.confirm.back_to_signin")}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-txt">CreatiFit AI</h1>
        <p className="text-muted text-sm mt-1">{t("auth.tagline")}</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-surface p-1 mb-6 border border-border">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === m ? "bg-primary text-white" : "text-muted hover:text-txt"
            }`}
          >
            {m === "signin" ? t("auth.signin") : t("auth.signup")}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-txt mb-1">{t("auth.email")}</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="tu@correo.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-txt mb-1">{t("auth.password")}</label>
          <input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="••••••••"
          />
          {mode === "signup" && (
            <p className="text-muted text-xs mt-1">{t("auth.password_hint")}</p>
          )}
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary/90 text-white" size="lg">
          {busy ? t("auth.processing") : mode === "signin" ? t("auth.signin") : t("auth.signup")}
        </Button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 safe-top safe-bottom">
      <div className="w-full max-w-sm">{children}</div>
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

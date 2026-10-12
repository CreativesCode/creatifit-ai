"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfig } from "../supabase-config";
import { setCacheUser } from "../local-cache";
import { clearUserLocalData } from "../local-data";
import { envConfig } from "../env-config";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SIGN_OUT_WAIT_MS = 3000;

const storedSessionKey = () =>
  `sb-${new URL(supabaseConfig.url).hostname.split(".")[0]}-auth-token`;

// Sesión que auth-js persiste en localStorage (clave sb-<ref>-auth-token).
function readStoredSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(storedSessionKey());
    const parsed = raw ? (JSON.parse(raw) as Session) : null;
    return parsed?.user?.id && parsed.refresh_token ? parsed : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // `onAuthStateChange` emite `INITIAL_SESSION` al suscribirse (con la sesión
    // restaurada del storage) y luego login/logout/refresh/confirmación. Con eso
    // basta para fijar el estado inicial: evitamos el doble setSession/setLoading
    // de un getSession() paralelo y el flicker asociado.
    //
    // Sin red y con el token caducado, INITIAL_SESSION tarda (espera al refresh) y
    // llega con sesión null aunque el usuario siga logueado. Por eso arrancamos con
    // la sesión guardada en el dispositivo y solo la damos por cerrada si auth-js
    // la borró del storage (cierre real o refresh token inválido).
    const stored = readStoredSession();
    if (stored) {
      setCacheUser(stored.user.id);
      setSession(stored);
      setLoading(false);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      if (!newSession && event !== "SIGNED_OUT") {
        const kept = readStoredSession();
        if (kept) {
          setCacheUser(kept.user.id);
          setSession(kept);
          setLoading(false);
          return;
        }
      }
      setCacheUser(newSession?.user.id ?? null);
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // El enlace de confirmación vuelve a la app web; tras confirmar, el usuario inicia sesión.
        emailRedirectTo: `${envConfig.APP_URL}/`,
        ...(name ? { data: { full_name: name } } : {}),
      },
    });
    if (error) return { error: error.message, needsConfirmation: false };
    // Con confirmación de correo activada, Supabase responde "éxito" a un correo
    // ya registrado (sin identidades y sin enviar nada): no decir "revisa tu correo".
    if (!data.session && data.user && (data.user.identities?.length ?? 0) === 0) {
      return { error: "User already registered", needsConfirmation: false };
    }
    // Si la confirmación de correo está activada, no hay sesión hasta confirmar.
    const needsConfirmation = !data.session;
    return { error: null, needsConfirmation };
  };

  // Cerrar sesión funciona siempre, también sin red: auth-js no borra la sesión
  // si no consigue avisar al servidor, y el botón parecía no hacer nada. Se le
  // da un margen corto y después se cierra en el teléfono pase lo que pase.
  const signOut: AuthContextValue["signOut"] = async () => {
    const uid = session?.user.id ?? readStoredSession()?.user.id ?? null;
    await Promise.race([
      supabase.auth.signOut().catch(() => null),
      new Promise((resolve) => setTimeout(resolve, SIGN_OUT_WAIT_MS)),
    ]);
    try {
      window.localStorage.removeItem(storedSessionKey());
    } catch {
      /* almacenamiento bloqueado: el estado en memoria se limpia igual */
    }
    if (uid) clearUserLocalData(uid);
    setCacheUser(null);
    setSession(null);
  };

  const resendConfirmation: AuthContextValue["resendConfirmation"] = async (email) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${envConfig.APP_URL}/` },
    });
    return { error: error?.message ?? null };
  };

  const resetPassword: AuthContextValue["resetPassword"] = async (email) => {
    // Se llama al endpoint directamente, SIN PKCE. Con PKCE (lo que hace
    // `resetPasswordForEmail` en este cliente) el enlace solo vale en el mismo
    // navegador que lo pidió, y aquí se pide desde la app y se abre en el
    // navegador del teléfono: siempre salía "enlace no válido". Sin PKCE el
    // enlace llega a /reset-password con la sesión de recuperación en la URL y
    // funciona en cualquier dispositivo.
    // La URL debe estar en la allowlist de Redirect URLs del proyecto Supabase.
    const redirectTo = `${envConfig.PUBLIC_WEB_URL}/reset-password/`;
    try {
      const res = await fetch(
        `${supabaseConfig.url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
        {
          method: "POST",
          headers: { apikey: supabaseConfig.anonKey, "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      if (res.ok) return { error: null };
      const body = (await res.json().catch(() => ({}))) as { msg?: string; message?: string };
      return { error: body.msg ?? body.message ?? `Error ${res.status}` };
    } catch {
      return { error: "Failed to fetch" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signIn,
        signUp,
        signOut,
        resendConfirmation,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

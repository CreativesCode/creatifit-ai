"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase-config";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // `onAuthStateChange` emite `INITIAL_SESSION` al suscribirse (con la sesión
    // restaurada del storage) y luego login/logout/refresh/confirmación. Con eso
    // basta para fijar el estado inicial: evitamos el doble setSession/setLoading
    // de un getSession() paralelo y el flicker asociado.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
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
    // Si la confirmación de correo está activada, no hay sesión hasta confirmar.
    const needsConfirmation = !data.session;
    return { error: null, needsConfirmation };
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    await supabase.auth.signOut();
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
    // La página /reset-password verifica el enlace y pide la nueva contraseña.
    // La URL debe estar en la allowlist de Redirect URLs del proyecto Supabase.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${envConfig.APP_URL}/reset-password/`,
    });
    return { error: error?.message ?? null };
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

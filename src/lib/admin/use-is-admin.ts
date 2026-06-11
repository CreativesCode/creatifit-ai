"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { supabase } from "@/lib/supabase-config";

// Indica si el usuario logueado es administrador. Lee `profiles.is_admin` (RLS
// permite leer el propio perfil). Devuelve null mientras comprueba.
// Solo para UX (mostrar/ocultar la entrada de admin); la barrera real está en
// la Edge Function `admin-api`, que revalida is_admin en cada acción.
export function useIsAdmin(): boolean | null {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (!cancelled) setIsAdmin(Boolean(data?.is_admin));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return isAdmin;
}

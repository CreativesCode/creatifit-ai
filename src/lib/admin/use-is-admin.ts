"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useProfileFlags } from "@/lib/profile-flags";

// Indica si el usuario logueado es administrador. Lee `profiles.is_admin` (RLS
// permite leer el propio perfil). Devuelve null mientras comprueba.
// Solo para UX (mostrar/ocultar la entrada de admin); la barrera real está en
// la Edge Function `admin-api`, que revalida is_admin en cada acción.
export function useIsAdmin(): boolean | null {
  const { user } = useAuth();
  const { flags, failed } = useProfileFlags();
  if (!user) return false;
  if (flags) return flags.isAdmin;
  return failed ? false : null;
}

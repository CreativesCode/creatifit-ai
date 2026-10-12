// Cliente del panel de administración. Llama a la Edge Function `admin-api`
// (service role) con el access token del admin logueado. Toda la autorización
// real ocurre en el servidor; aquí solo adjuntamos el JWT.

import { supabase } from "../supabase-config";
import { envConfig } from "../env-config";

const FN_URL = `${envConfig.SUPABASE_URL}/functions/v1/admin-api`;

export type Tier = "free" | "pro_monthly" | "pro_annual";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  tier: Tier;
  is_admin: boolean;
  created_at: string;
  plan_count: number;
  // Actividad (seguimiento del piloto)
  session_count: number;
  set_count: number;
  last_workout: string | null;
  generation_count: number;
  last_sign_in: string | null;
}

async function callAdmin<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("No autenticado");

  // Con límite de tiempo y mensaje legible: sin red el panel mostraba
  // "Failed to fetch" o se quedaba cargando.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: envConfig.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });
  } catch {
    throw new Error("Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.");
  } finally {
    clearTimeout(timeout);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string })?.error ?? `Error ${res.status}`);
  }
  return body as T;
}

export const adminApi = {
  listUsers: () => callAdmin<{ users: AdminUser[] }>("list").then((r) => r.users),
  setTier: (userId: string, tier: Tier) => callAdmin("setTier", { userId, tier }),
  deleteUser: (userId: string) => callAdmin("deleteUser", { userId }),
};
